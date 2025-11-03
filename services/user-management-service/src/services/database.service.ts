import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis
    });

    this.pool.on('connect', () => {
      logger.info('Database client connected');
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database:', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error as Error);
      throw error;
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text,
        params: params ? '[REDACTED]' : undefined,
        duration: `${duration}ms`,
        rowCount: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', error as Error, {
        query: text,
        params: params ? '[REDACTED]' : undefined,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return {
        healthy: true,
        details: {
          connected: this.isConnected,
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingConnections: this.pool.waitingCount
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

export const databaseService = new DatabaseService();