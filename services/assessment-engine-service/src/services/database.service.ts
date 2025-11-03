import { Pool, PoolClient } from 'pg';
import config from '../config/config';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      logger.info('Connected to PostgreSQL database');
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error', { text, params, error });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
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

  async initializeSchema(): Promise<void> {
    const client = await this.getClient();
    try {
      // Create assessments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS assessments (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          instructions TEXT,
          questions JSONB NOT NULL DEFAULT '[]',
          settings JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(50) NOT NULL DEFAULT 'draft',
          tags TEXT[] DEFAULT '{}',
          created_by VARCHAR(255) NOT NULL,
          organization_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create assessment_submissions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS assessment_submissions (
          id VARCHAR(255) PRIMARY KEY,
          assessment_id VARCHAR(255) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL,
          responses JSONB NOT NULL DEFAULT '[]',
          started_at TIMESTAMP WITH TIME ZONE NOT NULL,
          submitted_at TIMESTAMP WITH TIME ZONE,
          score INTEGER,
          max_score INTEGER NOT NULL,
          feedback JSONB DEFAULT '[]',
          status VARCHAR(50) NOT NULL DEFAULT 'not_started',
          metadata JSONB DEFAULT '{}'
        );
      `);

      // Create question_banks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS question_banks (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(500) NOT NULL,
          description TEXT,
          tags TEXT[] DEFAULT '{}',
          organization_id VARCHAR(255),
          is_public BOOLEAN DEFAULT false,
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create questions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          content JSONB NOT NULL,
          points INTEGER NOT NULL DEFAULT 1,
          difficulty VARCHAR(50) NOT NULL,
          tags TEXT[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Create question_bank_questions junction table
      await client.query(`
        CREATE TABLE IF NOT EXISTS question_bank_questions (
          question_bank_id VARCHAR(255) REFERENCES question_banks(id) ON DELETE CASCADE,
          question_id VARCHAR(255) REFERENCES questions(id) ON DELETE CASCADE,
          added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (question_bank_id, question_id)
        );
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
        CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
        CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
        CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user_id ON assessment_submissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_submissions_status ON assessment_submissions(status);
        CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
        CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
        CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
        CREATE INDEX IF NOT EXISTS idx_question_banks_organization_id ON question_banks(organization_id);
        CREATE INDEX IF NOT EXISTS idx_question_banks_is_public ON question_banks(is_public);
      `);

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

export const databaseService = DatabaseService.getInstance();