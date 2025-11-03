import { Pool, PoolClient } from 'pg';
import config from '../config/config';
import { logger } from '../utils/logger';

class DatabaseService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: config.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async initializeSchema(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create extensions
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "btree_gin";
      `);

      // Create learning_events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS learning_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          session_id UUID NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          event_data JSONB NOT NULL DEFAULT '{}',
          context JSONB NOT NULL DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes for learning_events
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_learning_events_user_id ON learning_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_learning_events_session_id ON learning_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_learning_events_event_type ON learning_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_learning_events_timestamp ON learning_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_learning_events_processed_at ON learning_events(processed_at);
        CREATE INDEX IF NOT EXISTS idx_learning_events_event_data ON learning_events USING GIN(event_data);
        CREATE INDEX IF NOT EXISTS idx_learning_events_context ON learning_events USING GIN(context);
      `);

      // Create learning_metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS learning_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL UNIQUE,
          time_spent BIGINT NOT NULL DEFAULT 0,
          completion_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
          engagement_score DECIMAL(5,4) NOT NULL DEFAULT 0,
          mastery_level DECIMAL(5,4) NOT NULL DEFAULT 0,
          struggling_indicators TEXT[] DEFAULT '{}',
          learning_velocity DECIMAL(10,4) NOT NULL DEFAULT 0,
          retention_score DECIMAL(5,4) NOT NULL DEFAULT 0,
          collaboration_score DECIMAL(5,4) NOT NULL DEFAULT 0,
          ai_interaction_score DECIMAL(5,4) NOT NULL DEFAULT 0,
          last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create analytics_aggregations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_aggregations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          level VARCHAR(10) NOT NULL CHECK (level IN ('micro', 'meso', 'macro')),
          entity_id UUID NOT NULL,
          timeframe_start TIMESTAMPTZ NOT NULL,
          timeframe_end TIMESTAMPTZ NOT NULL,
          granularity VARCHAR(10) NOT NULL CHECK (granularity IN ('hour', 'day', 'week', 'month', 'quarter', 'year')),
          metrics JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes for analytics_aggregations
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_level ON analytics_aggregations(level);
        CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_entity_id ON analytics_aggregations(entity_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_timeframe ON analytics_aggregations(timeframe_start, timeframe_end);
        CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_granularity ON analytics_aggregations(granularity);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_aggregations_unique 
          ON analytics_aggregations(level, entity_id, timeframe_start, timeframe_end, granularity);
      `);

      // Create predictive_models table
      await client.query(`
        CREATE TABLE IF NOT EXISTS predictive_models (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          version VARCHAR(50) NOT NULL,
          features TEXT[] NOT NULL,
          accuracy DECIMAL(5,4) NOT NULL DEFAULT 0,
          parameters JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT false,
          last_trained TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create predictions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS predictions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          model_id UUID NOT NULL REFERENCES predictive_models(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          prediction_type VARCHAR(50) NOT NULL,
          prediction JSONB NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          features JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );
      `);

      // Create indexes for predictions
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_predictions_model_id ON predictions(model_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);
        CREATE INDEX IF NOT EXISTS idx_predictions_expires_at ON predictions(expires_at);
      `);

      // Create recommendations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS recommendations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          content_id UUID,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          reason TEXT,
          confidence DECIMAL(5,4) NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          is_viewed BOOLEAN NOT NULL DEFAULT false,
          is_accepted BOOLEAN,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );
      `);

      // Create indexes for recommendations
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
        CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);
        CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);
        CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority DESC);
      `);

      // Create analytics_reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          level VARCHAR(10) NOT NULL CHECK (level IN ('micro', 'meso', 'macro')),
          filters JSONB NOT NULL DEFAULT '{}',
          visualizations JSONB NOT NULL DEFAULT '[]',
          schedule JSONB,
          recipients TEXT[] DEFAULT '{}',
          created_by UUID NOT NULL,
          last_generated TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create data_exports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_exports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'xlsx', 'json', 'pdf')),
          filters JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
          file_url TEXT,
          record_count INTEGER,
          file_size BIGINT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ NOT NULL
        );
      `);

      // Create analytics_alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_alerts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          condition JSONB NOT NULL,
          threshold DECIMAL(10,4) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          recipients TEXT[] NOT NULL,
          last_triggered TIMESTAMPTZ,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create processing_jobs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS processing_jobs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
          progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          data JSONB NOT NULL DEFAULT '{}',
          result JSONB,
          error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ
        );
      `);

      // Create indexes for processing_jobs
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(type);
        CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at);
      `);

      await client.query('COMMIT');
      this.isInitialized = true;
      logger.info('Database schema initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to initialize database schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
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

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
export default databaseService;