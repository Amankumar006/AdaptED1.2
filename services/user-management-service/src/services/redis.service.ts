import { createClient, RedisClientType, RedisClusterType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class RedisService {
  private client: any; // Simplified to any to avoid complex Redis type issues
  private isConnected: boolean = false;

  constructor() {
    if (config.redis.cluster) {
      // Cluster configuration - disabled for now, use single instance
      logger.warn('Redis cluster mode requested but using single instance for compatibility');
      this.client = createClient({
        socket: {
          host: config.redis.host || 'localhost',
          port: config.redis.port || 6379
        },
        password: config.redis.password || undefined,
        database: config.redis.db || 0
      });
    } else {
      // Single instance configuration
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password || undefined,
        database: config.redis.db
      });
    }

    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client connected and ready');
    });

    this.client.on('error', (err: Error) => {
      this.isConnected = false;
      logger.error('Redis client error:', err);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client connection ended');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error as Error);
      throw error;
    }
  }

  private getKey(key: string): string {
    return `${config.redis.keyPrefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(this.getKey(key));
    } catch (error) {
      logger.error('Redis GET error:', error as Error, { key });
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(this.getKey(key), ttl, value);
      } else {
        await this.client.set(this.getKey(key), value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error as Error, { key, ttl });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(this.getKey(key));
    } catch (error) {
      logger.error('Redis DEL error:', error as Error, { key });
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(this.getKey(key));
    } catch (error) {
      logger.error('Redis EXISTS error:', error as Error, { key });
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      return await this.client.expire(this.getKey(key), ttl);
    } catch (error) {
      logger.error('Redis EXPIRE error:', error as Error, { key, ttl });
      throw error;
    }
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(this.getKey(key), field);
    } catch (error) {
      logger.error('Redis HGET error:', error as Error, { key, field });
      throw error;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(this.getKey(key), field, value);
    } catch (error) {
      logger.error('Redis HSET error:', error as Error, { key, field });
      throw error;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(this.getKey(key));
    } catch (error) {
      logger.error('Redis HGETALL error:', error as Error, { key });
      throw error;
    }
  }

  async hDel(key: string, field: string): Promise<number> {
    try {
      return await this.client.hDel(this.getKey(key), field);
    } catch (error) {
      logger.error('Redis HDEL error:', error as Error, { key, field });
      throw error;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sAdd(this.getKey(key), members);
    } catch (error) {
      logger.error('Redis SADD error:', error as Error, { key, members });
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sRem(this.getKey(key), members);
    } catch (error) {
      logger.error('Redis SREM error:', error as Error, { key, members });
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(this.getKey(key));
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error as Error, { key });
      throw error;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      return await this.client.sIsMember(this.getKey(key), member);
    } catch (error) {
      logger.error('Redis SISMEMBER error:', error as Error, { key, member });
      throw error;
    }
  }

  // Cache helper methods
  async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache GET error:', error as Error, { key });
      return null;
    }
  }

  async cacheSet<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      logger.error('Cache SET error:', error as Error, { key, ttl });
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error as Error, { pattern });
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const pong = await this.client.ping();
      return {
        healthy: pong === 'PONG',
        details: {
          connected: this.isConnected,
          response: pong
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: (error as Error).message,
          connected: this.isConnected
        }
      };
    }
  }
}

export const redisService = new RedisService();