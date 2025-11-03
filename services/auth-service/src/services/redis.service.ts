import { createClient, RedisClientType, createCluster, RedisClusterType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType | RedisClusterType;
  private isConnected = false;

  constructor() {
    if (config.redis.cluster) {
      this.client = createCluster({
        rootNodes: config.redis.clusterNodes.map(node => {
          const [host, port] = node.split(':');
          return { url: `redis://${host}:${port}` };
        }),
        defaults: {
          password: config.redis.password,
        }
      });
    } else {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Redis service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  private getKey(key: string): string {
    return `${config.redis.keyPrefix}${key}`;
  }

  // Token storage methods
  async storeRefreshToken(tokenId: string, userId: string, expiresIn: number): Promise<void> {
    const key = this.getKey(`refresh_token:${tokenId}`);
    await this.client.setEx(key, expiresIn, userId);
    logger.debug(`Stored refresh token for user ${userId}`);
  }

  async getRefreshTokenUserId(tokenId: string): Promise<string | null> {
    const key = this.getKey(`refresh_token:${tokenId}`);
    return await this.client.get(key);
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    const key = this.getKey(`refresh_token:${tokenId}`);
    await this.client.del(key);
    logger.debug(`Deleted refresh token ${tokenId}`);
  }

  // Token blacklisting methods
  async blacklistToken(tokenId: string, expiresIn: number): Promise<void> {
    const key = this.getKey(`blacklist:${tokenId}`);
    await this.client.setEx(key, expiresIn, 'blacklisted');
    logger.debug(`Blacklisted token ${tokenId}`);
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const key = this.getKey(`blacklist:${tokenId}`);
    const result = await this.client.get(key);
    return result === 'blacklisted';
  }

  // User session management
  async storeUserSession(userId: string, sessionData: any, expiresIn: number): Promise<void> {
    const key = this.getKey(`session:${userId}`);
    await this.client.setEx(key, expiresIn, JSON.stringify(sessionData));
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = this.getKey(`session:${userId}`);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    const key = this.getKey(`session:${userId}`);
    await this.client.del(key);
  }

  // Login attempt tracking
  async incrementLoginAttempts(identifier: string): Promise<number> {
    const key = this.getKey(`login_attempts:${identifier}`);
    const attempts = await this.client.incr(key);
    
    if (attempts === 1) {
      // Set expiry on first attempt
      await this.client.expire(key, config.security.lockoutDuration / 1000);
    }
    
    return attempts;
  }

  async getLoginAttempts(identifier: string): Promise<number> {
    const key = this.getKey(`login_attempts:${identifier}`);
    const attempts = await this.client.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = this.getKey(`login_attempts:${identifier}`);
    await this.client.del(key);
  }

  // Account lockout
  async lockAccount(identifier: string): Promise<void> {
    const key = this.getKey(`locked:${identifier}`);
    await this.client.setEx(key, config.security.lockoutDuration / 1000, 'locked');
    logger.warn(`Account locked: ${identifier}`);
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    const key = this.getKey(`locked:${identifier}`);
    const result = await this.client.get(key);
    return result === 'locked';
  }

  // MFA temporary storage
  async storeMFAChallenge(userId: string, challenge: any, expiresIn: number = 300): Promise<void> {
    const key = this.getKey(`mfa_challenge:${userId}`);
    await this.client.setEx(key, expiresIn, JSON.stringify(challenge));
  }

  async getMFAChallenge(userId: string): Promise<any | null> {
    const key = this.getKey(`mfa_challenge:${userId}`);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteMFAChallenge(userId: string): Promise<void> {
    const key = this.getKey(`mfa_challenge:${userId}`);
    await this.client.del(key);
  }

  // Generic cache methods
  async set(key: string, value: any, expiresIn?: number): Promise<void> {
    const redisKey = this.getKey(key);
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (expiresIn) {
      await this.client.setEx(redisKey, expiresIn, serializedValue);
    } else {
      await this.client.set(redisKey, serializedValue);
    }
  }

  async get(key: string): Promise<any | null> {
    const redisKey = this.getKey(key);
    const value = await this.client.get(redisKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async delete(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    await this.client.del(redisKey);
  }

  async exists(key: string): Promise<boolean> {
    const redisKey = this.getKey(key);
    const result = await this.client.exists(redisKey);
    return result === 1;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService();