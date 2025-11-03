import { createClient, RedisClientType } from 'redis';
import { LLMRequest, LLMResponse, CacheKey } from '../types/ai.types';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Disconnected from Redis');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      logger.info('Cache service connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Cache service disconnected from Redis');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
    }
  }

  async getCachedResponse(request: LLMRequest): Promise<LLMResponse | null> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache lookup');
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(request);
      const cachedData = await this.client.get(cacheKey);
      
      if (cachedData) {
        const response: LLMResponse = JSON.parse(cachedData);
        response.cached = true;
        
        logger.info(`Cache hit for request ${request.id}`);
        
        // Update cache statistics
        await this.incrementCacheHit();
        
        return response;
      }
      
      logger.debug(`Cache miss for request ${request.id}`);
      await this.incrementCacheMiss();
      
      return null;
    } catch (error) {
      logger.error('Error retrieving from cache:', error);
      return null;
    }
  }

  async cacheResponse(request: LLMRequest, response: LLMResponse): Promise<void> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache storage');
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(request);
      const ttl = this.calculateTTL(request, response);
      
      // Don't cache responses that should escalate or have safety concerns
      if (response.metadata?.escalationRecommended || 
          response.safetyLevel === 'critical' || 
          response.safetyLevel === 'high') {
        logger.debug(`Skipping cache for request ${request.id} due to safety/escalation concerns`);
        return;
      }

      const cacheData = JSON.stringify({
        ...response,
        cached: false, // Will be set to true when retrieved
      });

      await this.client.setEx(cacheKey, ttl, cacheData);
      
      logger.debug(`Cached response for request ${request.id} with TTL ${ttl}s`);
    } catch (error) {
      logger.error('Error caching response:', error);
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache invalidation');
      return;
    }

    try {
      const pattern = `llm:response:*:user:${userId}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error invalidating user cache:', error);
    }
  }

  async invalidateSessionCache(sessionId: string): Promise<void> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache invalidation');
      return;
    }

    try {
      const pattern = `llm:response:*:session:${sessionId}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries for session ${sessionId}`);
      }
    } catch (error) {
      logger.error('Error invalidating session cache:', error);
    }
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
  }> {
    if (!this.connected) {
      return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0 };
    }

    try {
      const hits = parseInt(await this.client.get('cache:stats:hits') || '0', 10);
      const misses = parseInt(await this.client.get('cache:stats:misses') || '0', 10);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      
      const keys = await this.client.keys('llm:response:*');
      const totalKeys = keys.length;

      return {
        hits,
        misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0 };
    }
  }

  async clearCache(): Promise<void> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache clear');
      return;
    }

    try {
      const keys = await this.client.keys('llm:response:*');
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Cleared ${keys.length} cache entries`);
      }
      
      // Reset stats
      await this.client.del(['cache:stats:hits', 'cache:stats:misses']);
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  private generateCacheKey(request: LLMRequest): string {
    // Create a deterministic cache key based on request characteristics
    const keyComponents: CacheKey = {
      query: this.normalizeQuery(request.query),
      context: this.serializeContext(request),
      userProfile: this.serializeUserProfile(request.userProfile),
      provider: request.queryType as any, // Use query type as part of key
      model: 'default', // Will be updated by orchestrator if needed
    };

    const keyString = JSON.stringify(keyComponents);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `llm:response:${hash}:user:${request.userId}:session:${request.sessionId}`;
  }

  private normalizeQuery(query: string): string {
    // Normalize query for consistent caching
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove punctuation for similarity
  }

  private serializeContext(request: LLMRequest): string {
    const contextData = {
      queryType: request.queryType,
      inputType: request.inputType,
      courseId: request.courseContext?.courseId,
      subject: request.courseContext?.subject,
      gradeLevel: request.courseContext?.gradeLevel,
      currentLesson: request.courseContext?.currentLesson,
    };

    return JSON.stringify(contextData);
  }

  private serializeUserProfile(userProfile?: any): string {
    if (!userProfile) return '';

    const profileData = {
      age: userProfile.age,
      gradeLevel: userProfile.gradeLevel,
      learningStyle: userProfile.learningStyle,
      language: userProfile.language,
    };

    return JSON.stringify(profileData);
  }

  private calculateTTL(request: LLMRequest, response: LLMResponse): number {
    let baseTTL = config.caching.responseCacheTTL;

    // Adjust TTL based on query type
    switch (request.queryType) {
      case 'general_question':
        baseTTL *= 2; // General questions can be cached longer
        break;
      case 'homework_help':
        baseTTL *= 0.5; // Homework help should be cached for shorter time
        break;
      case 'concept_explanation':
        baseTTL *= 1.5; // Concept explanations are relatively stable
        break;
      case 'problem_solving':
        baseTTL *= 0.3; // Problem solving is often context-specific
        break;
      default:
        // Use base TTL
        break;
    }

    // Adjust based on response confidence
    if (response.confidence < 0.7) {
      baseTTL *= 0.5; // Cache low-confidence responses for shorter time
    }

    // Adjust based on user age (younger users might need more personalized responses)
    if (request.userProfile?.age && request.userProfile.age < 13) {
      baseTTL *= 0.7;
    }

    return Math.max(300, Math.min(baseTTL, 86400)); // Min 5 minutes, max 24 hours
  }

  private async incrementCacheHit(): Promise<void> {
    try {
      await this.client.incr('cache:stats:hits');
    } catch (error) {
      logger.error('Error incrementing cache hit counter:', error);
    }
  }

  private async incrementCacheMiss(): Promise<void> {
    try {
      await this.client.incr('cache:stats:misses');
    } catch (error) {
      logger.error('Error incrementing cache miss counter:', error);
    }
  }

  // Method to warm up cache with common queries
  async warmUpCache(commonQueries: Array<{ request: LLMRequest; response: LLMResponse }>): Promise<void> {
    if (!this.connected) {
      logger.warn('Cache not available, skipping cache warm-up');
      return;
    }

    logger.info(`Warming up cache with ${commonQueries.length} common queries`);

    for (const { request, response } of commonQueries) {
      try {
        await this.cacheResponse(request, response);
      } catch (error) {
        logger.error(`Error warming up cache for query ${request.id}:`, error);
      }
    }

    logger.info('Cache warm-up completed');
  }

  // Method to get cache key for external use (e.g., cache invalidation)
  getCacheKeyForRequest(request: LLMRequest): string {
    return this.generateCacheKey(request);
  }
}