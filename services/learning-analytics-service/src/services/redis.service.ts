import { createClient, RedisClientType } from 'redis';
import config from '../config/config';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Cache operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.setEx(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  // Hash operations for metrics
  async hSet(key: string, field: string, value: any): Promise<void> {
    await this.client.hSet(key, field, JSON.stringify(value));
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hGet(key, field);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  }

  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    const values = await this.client.hGetAll(key);
    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(values)) {
      result[field] = JSON.parse(value) as T;
    }
    return result;
  }

  async hDel(key: string, field: string): Promise<void> {
    await this.client.hDel(key, field);
  }

  // List operations for event queues
  async lPush(key: string, value: any): Promise<void> {
    await this.client.lPush(key, JSON.stringify(value));
  }

  async rPop<T>(key: string): Promise<T | null> {
    const value = await this.client.rPop(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  }

  async lLen(key: string): Promise<number> {
    return await this.client.lLen(key);
  }

  async lRange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lRange(key, start, stop);
    return values.map(value => JSON.parse(value) as T);
  }

  // Sorted set operations for leaderboards and time-based data
  async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.client.zAdd(key, { score, value: member });
  }

  async zRange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    if (withScores) {
      return await this.client.zRangeWithScores(key, start, stop);
    }
    return await this.client.zRange(key, start, stop);
  }

  async zRevRange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    if (withScores) {
      return await this.client.zRevRangeWithScores(key, start, stop);
    }
    return await this.client.zRevRange(key, start, stop);
  }

  async zScore(key: string, member: string): Promise<number | null> {
    return await this.client.zScore(key, member);
  }

  async zRem(key: string, member: string): Promise<void> {
    await this.client.zRem(key, member);
  }

  // Set operations for unique collections
  async sAdd(key: string, member: string): Promise<void> {
    await this.client.sAdd(key, member);
  }

  async sMembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    return await this.client.sIsMember(key, member);
  }

  async sRem(key: string, member: string): Promise<void> {
    await this.client.sRem(key, member);
  }

  // Pub/Sub operations for real-time updates
  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        logger.error('Error parsing pub/sub message', { error, message });
      }
    });
  }

  // Increment operations for counters
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async incrBy(key: string, increment: number): Promise<number> {
    return await this.client.incrBy(key, increment);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async decrBy(key: string, decrement: number): Promise<number> {
    return await this.client.decrBy(key, decrement);
  }

  // Utility methods
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async flushDb(): Promise<void> {
    await this.client.flushDb();
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  // Analytics-specific cache methods
  async cacheMetrics(userId: string, metrics: any, ttl = 3600): Promise<void> {
    await this.set(`metrics:${userId}`, metrics, ttl);
  }

  async getCachedMetrics<T>(userId: string): Promise<T | null> {
    return await this.get<T>(`metrics:${userId}`);
  }

  async cacheAggregation(key: string, data: any, ttl = 1800): Promise<void> {
    await this.set(`aggregation:${key}`, data, ttl);
  }

  async getCachedAggregation<T>(key: string): Promise<T | null> {
    return await this.get<T>(`aggregation:${key}`);
  }

  async addToProcessingQueue(eventType: string, event: any): Promise<void> {
    await this.lPush(`queue:${eventType}`, event);
  }

  async getFromProcessingQueue<T>(eventType: string): Promise<T | null> {
    return await this.rPop<T>(`queue:${eventType}`);
  }

  async getQueueLength(eventType: string): Promise<number> {
    return await this.lLen(`queue:${eventType}`);
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService();
export default redisService;