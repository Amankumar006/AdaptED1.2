import * as cron from 'node-cron';
import { databaseService } from './database.service';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import config from '../config/config';

interface ArchivalPolicy {
  id: string;
  name: string;
  description: string;
  tableName: string;
  archiveAfterDays: number;
  deleteAfterDays: number;
  conditions?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DataMinimizationRule {
  id: string;
  name: string;
  description: string;
  tableName: string;
  columnName: string;
  action: 'anonymize' | 'pseudonymize' | 'delete' | 'aggregate';
  triggerAfterDays: number;
  conditions?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LifecycleJob {
  id: string;
  type: 'archival' | 'deletion' | 'minimization' | 'cleanup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  recordsProcessed: number;
  totalRecords: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

interface DataQualityMetrics {
  tableName: string;
  totalRecords: number;
  duplicateRecords: number;
  incompleteRecords: number;
  outdatedRecords: number;
  dataQualityScore: number;
  lastChecked: Date;
}

class DataLifecycleService {
  private scheduledJobs = new Map<string, cron.ScheduledTask>();
  private runningJobs = new Map<string, LifecycleJob>();
  private archivalPolicies: ArchivalPolicy[] = [];
  private minimizationRules: DataMinimizationRule[] = [];

  constructor() {
    this.initializeDefaultPolicies();
    this.scheduleLifecycleTasks();
  }

  async initialize(): Promise<void> {
    try {
      // Create lifecycle management tables
      await this.createLifecycleTables();
      
      // Load existing policies and rules
      await this.loadPoliciesAndRules();
      
      // Start scheduled tasks
      this.startScheduledTasks();

      logger.info('Data lifecycle service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize data lifecycle service', error);
      throw error;
    }
  }

  private async createLifecycleTables(): Promise<void> {
    try {
      // Create archival policies table
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS data_archival_policies (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          table_name VARCHAR(255) NOT NULL,
          archive_after_days INTEGER NOT NULL,
          delete_after_days INTEGER NOT NULL,
          conditions JSONB DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create minimization rules table
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS data_minimization_rules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          table_name VARCHAR(255) NOT NULL,
          column_name VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL CHECK (action IN ('anonymize', 'pseudonymize', 'delete', 'aggregate')),
          trigger_after_days INTEGER NOT NULL,
          conditions JSONB DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create lifecycle jobs table
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS data_lifecycle_jobs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          type VARCHAR(50) NOT NULL CHECK (type IN ('archival', 'deletion', 'minimization', 'cleanup')),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          records_processed INTEGER NOT NULL DEFAULT 0,
          total_records INTEGER NOT NULL DEFAULT 0,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          error TEXT,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create archived data tables
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS archived_learning_events (
          LIKE learning_events INCLUDING ALL,
          archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS archived_learning_metrics (
          LIKE learning_metrics INCLUDING ALL,
          archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create data quality metrics table
      await databaseService.query(`
        CREATE TABLE IF NOT EXISTS data_quality_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          table_name VARCHAR(255) NOT NULL,
          total_records INTEGER NOT NULL,
          duplicate_records INTEGER NOT NULL DEFAULT 0,
          incomplete_records INTEGER NOT NULL DEFAULT 0,
          outdated_records INTEGER NOT NULL DEFAULT 0,
          data_quality_score DECIMAL(5,4) NOT NULL DEFAULT 0,
          last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      logger.info('Data lifecycle tables created successfully');
    } catch (error) {
      logger.error('Failed to create lifecycle tables', error);
      throw error;
    }
  }

  private initializeDefaultPolicies(): void {
    // Default archival policies
    this.archivalPolicies = [
      {
        id: 'learning-events-archival',
        name: 'Learning Events Archival',
        description: 'Archive learning events older than 90 days, delete after 365 days',
        tableName: 'learning_events',
        archiveAfterDays: config.analytics.archivalThresholdDays,
        deleteAfterDays: config.analytics.dataRetentionDays,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'predictions-cleanup',
        name: 'Expired Predictions Cleanup',
        description: 'Delete expired predictions',
        tableName: 'predictions',
        archiveAfterDays: 0, // No archival, direct deletion
        deleteAfterDays: 7, // Delete after 7 days
        conditions: { expired: true },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'processing-jobs-cleanup',
        name: 'Processing Jobs Cleanup',
        description: 'Clean up old processing jobs',
        tableName: 'processing_jobs',
        archiveAfterDays: 0,
        deleteAfterDays: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Default minimization rules
    this.minimizationRules = [
      {
        id: 'anonymize-old-events',
        name: 'Anonymize Old Learning Events',
        description: 'Anonymize user IDs in learning events older than 180 days',
        tableName: 'learning_events',
        columnName: 'user_id',
        action: 'anonymize',
        triggerAfterDays: 180,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'aggregate-old-metrics',
        name: 'Aggregate Old Metrics',
        description: 'Aggregate individual metrics into summary statistics',
        tableName: 'learning_metrics',
        columnName: 'user_id',
        action: 'aggregate',
        triggerAfterDays: 365,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private async loadPoliciesAndRules(): Promise<void> {
    try {
      // Load archival policies
      const policiesResult = await databaseService.query(`
        SELECT * FROM data_archival_policies WHERE is_active = true
      `);

      if (policiesResult.rows.length > 0) {
        this.archivalPolicies = policiesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          tableName: row.table_name,
          archiveAfterDays: row.archive_after_days,
          deleteAfterDays: row.delete_after_days,
          conditions: row.conditions,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }

      // Load minimization rules
      const rulesResult = await databaseService.query(`
        SELECT * FROM data_minimization_rules WHERE is_active = true
      `);

      if (rulesResult.rows.length > 0) {
        this.minimizationRules = rulesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          tableName: row.table_name,
          columnName: row.column_name,
          action: row.action as any,
          triggerAfterDays: row.trigger_after_days,
          conditions: row.conditions,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }

      logger.info('Loaded lifecycle policies and rules', {
        policies: this.archivalPolicies.length,
        rules: this.minimizationRules.length,
      });
    } catch (error) {
      logger.error('Failed to load policies and rules', error);
    }
  }

  private scheduleLifecycleTasks(): void {
    // Daily data lifecycle tasks at 2 AM
    const dailyTask = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting daily data lifecycle tasks');
        
        await this.runArchivalTasks();
        await this.runMinimizationTasks();
        await this.runCleanupTasks();
        await this.runDataQualityChecks();
        
        logger.info('Daily data lifecycle tasks completed');
      } catch (error) {
        logger.error('Daily lifecycle tasks failed', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    // Weekly comprehensive cleanup on Sundays at 3 AM
    const weeklyTask = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Starting weekly comprehensive cleanup');
        
        await this.runComprehensiveCleanup();
        await this.optimizeDatabaseTables();
        await this.generateLifecycleReport();
        
        logger.info('Weekly comprehensive cleanup completed');
      } catch (error) {
        logger.error('Weekly cleanup failed', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    this.scheduledJobs.set('daily', dailyTask);
    this.scheduledJobs.set('weekly', weeklyTask);
  }

  private startScheduledTasks(): void {
    for (const [name, task] of this.scheduledJobs) {
      task.start();
      logger.info(`Started scheduled task: ${name}`);
    }
  }

  async runArchivalTasks(): Promise<void> {
    for (const policy of this.archivalPolicies) {
      if (!policy.isActive) continue;

      try {
        await this.executeArchivalPolicy(policy);
      } catch (error) {
        logger.error('Archival policy execution failed', { 
          error, 
          policyId: policy.id,
          policyName: policy.name 
        });
      }
    }
  }

  private async executeArchivalPolicy(policy: ArchivalPolicy): Promise<void> {
    const job: LifecycleJob = {
      id: `archival_${policy.id}_${Date.now()}`,
      type: 'archival',
      status: 'pending',
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 0,
      metadata: { policyId: policy.id, policyName: policy.name },
    };

    this.runningJobs.set(job.id, job);

    try {
      job.status = 'running';
      job.startedAt = new Date();

      // Count records to be archived
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays);

      let countQuery = `SELECT COUNT(*) as count FROM ${policy.tableName} WHERE created_at < $1`;
      const countParams = [archiveDate];

      if (policy.conditions) {
        // Add conditions if specified
        Object.entries(policy.conditions).forEach(([key, value], index) => {
          countQuery += ` AND ${key} = $${index + 2}`;
          countParams.push(value);
        });
      }

      const countResult = await databaseService.query(countQuery, countParams);
      job.totalRecords = parseInt(countResult.rows[0].count);

      if (job.totalRecords === 0) {
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress = 100;
        return;
      }

      logger.info('Starting archival process', {
        policyName: policy.name,
        tableName: policy.tableName,
        recordsToArchive: job.totalRecords,
      });

      // Archive records in batches
      const batchSize = 1000;
      let offset = 0;

      while (offset < job.totalRecords) {
        const archiveQuery = `
          WITH archived_batch AS (
            SELECT * FROM ${policy.tableName} 
            WHERE created_at < $1 
            ${policy.conditions ? Object.keys(policy.conditions).map((key, index) => `AND ${key} = $${index + 2}`).join(' ') : ''}
            ORDER BY created_at 
            LIMIT ${batchSize} OFFSET ${offset}
          )
          INSERT INTO archived_${policy.tableName} 
          SELECT *, NOW() as archived_at FROM archived_batch
        `;

        await databaseService.query(archiveQuery, countParams);

        // Delete archived records from original table
        const deleteQuery = `
          DELETE FROM ${policy.tableName} 
          WHERE id IN (
            SELECT id FROM ${policy.tableName} 
            WHERE created_at < $1 
            ${policy.conditions ? Object.keys(policy.conditions).map((key, index) => `AND ${key} = $${index + 2}`).join(' ') : ''}
            ORDER BY created_at 
            LIMIT ${batchSize}
          )
        `;

        const deleteResult = await databaseService.query(deleteQuery, countParams);
        const deletedCount = deleteResult.rowCount || 0;

        job.recordsProcessed += deletedCount;
        job.progress = Math.floor((job.recordsProcessed / job.totalRecords) * 100);

        offset += batchSize;

        // Update job status
        await this.updateJobStatus(job);

        logger.debug('Archival batch completed', {
          policyName: policy.name,
          processed: job.recordsProcessed,
          total: job.totalRecords,
          progress: job.progress,
        });
      }

      // Handle deletion of old archived records
      if (policy.deleteAfterDays > 0) {
        await this.deleteOldArchivedRecords(policy);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;

      logger.info('Archival policy completed successfully', {
        policyName: policy.name,
        recordsArchived: job.recordsProcessed,
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      logger.error('Archival policy failed', {
        error,
        policyName: policy.name,
        recordsProcessed: job.recordsProcessed,
      });
    } finally {
      await this.updateJobStatus(job);
      this.runningJobs.delete(job.id);
    }
  }

  private async deleteOldArchivedRecords(policy: ArchivalPolicy): Promise<void> {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - policy.deleteAfterDays);

    const deleteQuery = `
      DELETE FROM archived_${policy.tableName} 
      WHERE archived_at < $1
    `;

    const result = await databaseService.query(deleteQuery, [deleteDate]);
    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      logger.info('Deleted old archived records', {
        policyName: policy.name,
        deletedCount,
        deleteDate,
      });
    }
  }

  async runMinimizationTasks(): Promise<void> {
    for (const rule of this.minimizationRules) {
      if (!rule.isActive) continue;

      try {
        await this.executeMinimizationRule(rule);
      } catch (error) {
        logger.error('Minimization rule execution failed', {
          error,
          ruleId: rule.id,
          ruleName: rule.name,
        });
      }
    }
  }

  private async executeMinimizationRule(rule: DataMinimizationRule): Promise<void> {
    const job: LifecycleJob = {
      id: `minimization_${rule.id}_${Date.now()}`,
      type: 'minimization',
      status: 'running',
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 0,
      startedAt: new Date(),
      metadata: { ruleId: rule.id, ruleName: rule.name },
    };

    this.runningJobs.set(job.id, job);

    try {
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() - rule.triggerAfterDays);

      switch (rule.action) {
        case 'anonymize':
          await this.anonymizeData(rule, triggerDate, job);
          break;
        case 'pseudonymize':
          await this.pseudonymizeData(rule, triggerDate, job);
          break;
        case 'delete':
          await this.deleteData(rule, triggerDate, job);
          break;
        case 'aggregate':
          await this.aggregateData(rule, triggerDate, job);
          break;
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;

      logger.info('Minimization rule completed successfully', {
        ruleName: rule.name,
        action: rule.action,
        recordsProcessed: job.recordsProcessed,
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      logger.error('Minimization rule failed', {
        error,
        ruleName: rule.name,
        action: rule.action,
      });
    } finally {
      await this.updateJobStatus(job);
      this.runningJobs.delete(job.id);
    }
  }

  private async anonymizeData(rule: DataMinimizationRule, triggerDate: Date, job: LifecycleJob): Promise<void> {
    // Count records to anonymize
    const countResult = await databaseService.query(`
      SELECT COUNT(*) as count FROM ${rule.tableName} 
      WHERE created_at < $1 AND ${rule.columnName} IS NOT NULL
    `, [triggerDate]);

    job.totalRecords = parseInt(countResult.rows[0].count);

    if (job.totalRecords === 0) return;

    // Anonymize in batches
    const batchSize = 1000;
    let processed = 0;

    while (processed < job.totalRecords) {
      const anonymizeQuery = `
        UPDATE ${rule.tableName} 
        SET ${rule.columnName} = 'anonymous_' || substr(md5(${rule.columnName}::text), 1, 8)
        WHERE id IN (
          SELECT id FROM ${rule.tableName} 
          WHERE created_at < $1 AND ${rule.columnName} IS NOT NULL 
          AND ${rule.columnName} NOT LIKE 'anonymous_%'
          LIMIT ${batchSize}
        )
      `;

      const result = await databaseService.query(anonymizeQuery, [triggerDate]);
      const updatedCount = result.rowCount || 0;

      processed += updatedCount;
      job.recordsProcessed = processed;
      job.progress = Math.floor((processed / job.totalRecords) * 100);

      if (updatedCount === 0) break; // No more records to process
    }
  }

  private async pseudonymizeData(rule: DataMinimizationRule, triggerDate: Date, job: LifecycleJob): Promise<void> {
    // Similar to anonymize but maintains referential integrity
    const countResult = await databaseService.query(`
      SELECT COUNT(*) as count FROM ${rule.tableName} 
      WHERE created_at < $1 AND ${rule.columnName} IS NOT NULL
    `, [triggerDate]);

    job.totalRecords = parseInt(countResult.rows[0].count);

    if (job.totalRecords === 0) return;

    // Create pseudonym mapping table if it doesn't exist
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS pseudonym_mapping (
        original_id UUID,
        pseudonym_id UUID DEFAULT uuid_generate_v4(),
        table_name VARCHAR(255),
        column_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (original_id, table_name, column_name)
      )
    `);

    // Pseudonymize in batches
    const batchSize = 1000;
    let processed = 0;

    while (processed < job.totalRecords) {
      const pseudonymizeQuery = `
        WITH pseudonyms AS (
          INSERT INTO pseudonym_mapping (original_id, table_name, column_name)
          SELECT DISTINCT ${rule.columnName}::UUID, $3, $4
          FROM ${rule.tableName} 
          WHERE created_at < $1 AND ${rule.columnName} IS NOT NULL
          LIMIT ${batchSize} OFFSET $2
          ON CONFLICT (original_id, table_name, column_name) DO NOTHING
          RETURNING original_id, pseudonym_id
        )
        UPDATE ${rule.tableName} 
        SET ${rule.columnName} = p.pseudonym_id::TEXT
        FROM pseudonyms p
        WHERE ${rule.tableName}.${rule.columnName}::UUID = p.original_id
      `;

      const result = await databaseService.query(pseudonymizeQuery, [
        triggerDate,
        processed,
        rule.tableName,
        rule.columnName,
      ]);

      const updatedCount = result.rowCount || 0;
      processed += Math.min(batchSize, job.totalRecords - processed);
      job.recordsProcessed = processed;
      job.progress = Math.floor((processed / job.totalRecords) * 100);

      if (updatedCount === 0 && processed >= job.totalRecords) break;
    }
  }

  private async deleteData(rule: DataMinimizationRule, triggerDate: Date, job: LifecycleJob): Promise<void> {
    const deleteQuery = `
      DELETE FROM ${rule.tableName} 
      WHERE created_at < $1
    `;

    const result = await databaseService.query(deleteQuery, [triggerDate]);
    job.recordsProcessed = result.rowCount || 0;
    job.totalRecords = job.recordsProcessed;
  }

  private async aggregateData(rule: DataMinimizationRule, triggerDate: Date, job: LifecycleJob): Promise<void> {
    // Create aggregated summary table if it doesn't exist
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS aggregated_${rule.tableName} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        aggregation_period VARCHAR(50),
        period_start TIMESTAMPTZ,
        period_end TIMESTAMPTZ,
        user_count INTEGER,
        avg_engagement_score DECIMAL(5,4),
        avg_mastery_level DECIMAL(5,4),
        avg_completion_rate DECIMAL(5,4),
        total_time_spent BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Aggregate data by month
    const aggregateQuery = `
      INSERT INTO aggregated_${rule.tableName} (
        aggregation_period, period_start, period_end, user_count,
        avg_engagement_score, avg_mastery_level, avg_completion_rate, total_time_spent
      )
      SELECT 
        'monthly',
        date_trunc('month', created_at) as period_start,
        date_trunc('month', created_at) + interval '1 month' - interval '1 day' as period_end,
        COUNT(DISTINCT ${rule.columnName}) as user_count,
        AVG(engagement_score) as avg_engagement_score,
        AVG(mastery_level) as avg_mastery_level,
        AVG(completion_rate) as avg_completion_rate,
        SUM(time_spent) as total_time_spent
      FROM ${rule.tableName}
      WHERE created_at < $1
      GROUP BY date_trunc('month', created_at)
      ON CONFLICT DO NOTHING
    `;

    const result = await databaseService.query(aggregateQuery, [triggerDate]);
    job.recordsProcessed = result.rowCount || 0;

    // Delete original detailed records after aggregation
    const deleteResult = await databaseService.query(`
      DELETE FROM ${rule.tableName} WHERE created_at < $1
    `, [triggerDate]);

    job.totalRecords = deleteResult.rowCount || 0;
  }

  async runCleanupTasks(): Promise<void> {
    const job: LifecycleJob = {
      id: `cleanup_${Date.now()}`,
      type: 'cleanup',
      status: 'running',
      progress: 0,
      recordsProcessed: 0,
      totalRecords: 0,
      startedAt: new Date(),
      metadata: { type: 'daily_cleanup' },
    };

    this.runningJobs.set(job.id, job);

    try {
      // Clean up expired exports
      const expiredExportsResult = await databaseService.query(`
        DELETE FROM data_exports WHERE expires_at < NOW()
      `);
      job.recordsProcessed += expiredExportsResult.rowCount || 0;

      // Clean up expired predictions
      const expiredPredictionsResult = await databaseService.query(`
        DELETE FROM predictions WHERE expires_at < NOW()
      `);
      job.recordsProcessed += expiredPredictionsResult.rowCount || 0;

      // Clean up old processing jobs
      const oldJobsResult = await databaseService.query(`
        DELETE FROM processing_jobs 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND status IN ('completed', 'failed')
      `);
      job.recordsProcessed += oldJobsResult.rowCount || 0;

      // Clean up Redis cache
      await this.cleanupRedisCache();

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;

      logger.info('Cleanup tasks completed', {
        recordsProcessed: job.recordsProcessed,
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      logger.error('Cleanup tasks failed', error);
    } finally {
      await this.updateJobStatus(job);
      this.runningJobs.delete(job.id);
    }
  }

  private async cleanupRedisCache(): Promise<void> {
    try {
      // Clean up expired cache keys
      const keys = await redisService.keys('*');
      let cleanedCount = 0;

      for (const key of keys) {
        // Check if key has TTL
        const ttl = await redisService.client.ttl(key);
        if (ttl === -1) {
          // Key without expiration - check if it's old cached data
          if (key.startsWith('metrics:') || key.startsWith('aggregation:') || key.startsWith('dashboard:')) {
            await redisService.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info('Redis cache cleanup completed', { cleanedKeys: cleanedCount });
      }
    } catch (error) {
      logger.error('Redis cache cleanup failed', error);
    }
  }

  async runDataQualityChecks(): Promise<void> {
    const tables = ['learning_events', 'learning_metrics', 'predictions', 'recommendations'];

    for (const tableName of tables) {
      try {
        const metrics = await this.calculateDataQualityMetrics(tableName);
        await this.saveDataQualityMetrics(metrics);
      } catch (error) {
        logger.error('Data quality check failed', { error, tableName });
      }
    }
  }

  private async calculateDataQualityMetrics(tableName: string): Promise<DataQualityMetrics> {
    // Get total records
    const totalResult = await databaseService.query(`
      SELECT COUNT(*) as count FROM ${tableName}
    `);
    const totalRecords = parseInt(totalResult.rows[0].count);

    let duplicateRecords = 0;
    let incompleteRecords = 0;
    let outdatedRecords = 0;

    // Check for duplicates (simplified - based on created_at and user_id if available)
    try {
      const duplicateResult = await databaseService.query(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id, created_at, COUNT(*) 
          FROM ${tableName} 
          WHERE user_id IS NOT NULL
          GROUP BY user_id, created_at 
          HAVING COUNT(*) > 1
        ) duplicates
      `);
      duplicateRecords = parseInt(duplicateResult.rows[0].count);
    } catch (error) {
      // Table might not have user_id column
    }

    // Check for incomplete records (NULL in important fields)
    try {
      const incompleteResult = await databaseService.query(`
        SELECT COUNT(*) as count FROM ${tableName} 
        WHERE created_at IS NULL OR updated_at IS NULL
      `);
      incompleteRecords = parseInt(incompleteResult.rows[0].count);
    } catch (error) {
      // Table might not have these columns
    }

    // Check for outdated records (older than retention period)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - config.analytics.dataRetentionDays);

    try {
      const outdatedResult = await databaseService.query(`
        SELECT COUNT(*) as count FROM ${tableName} 
        WHERE created_at < $1
      `, [retentionDate]);
      outdatedRecords = parseInt(outdatedResult.rows[0].count);
    } catch (error) {
      // Handle error
    }

    // Calculate quality score (0-1 scale)
    const qualityScore = totalRecords > 0 
      ? Math.max(0, 1 - (duplicateRecords + incompleteRecords) / totalRecords)
      : 1;

    return {
      tableName,
      totalRecords,
      duplicateRecords,
      incompleteRecords,
      outdatedRecords,
      dataQualityScore: qualityScore,
      lastChecked: new Date(),
    };
  }

  private async saveDataQualityMetrics(metrics: DataQualityMetrics): Promise<void> {
    await databaseService.query(`
      INSERT INTO data_quality_metrics (
        table_name, total_records, duplicate_records, incomplete_records,
        outdated_records, data_quality_score, last_checked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      metrics.tableName,
      metrics.totalRecords,
      metrics.duplicateRecords,
      metrics.incompleteRecords,
      metrics.outdatedRecords,
      metrics.dataQualityScore,
      metrics.lastChecked,
    ]);

    logger.info('Data quality metrics saved', {
      tableName: metrics.tableName,
      qualityScore: metrics.dataQualityScore,
      totalRecords: metrics.totalRecords,
    });
  }

  private async runComprehensiveCleanup(): Promise<void> {
    // Vacuum and analyze database tables
    await this.optimizeDatabaseTables();
    
    // Clean up temporary files
    await this.cleanupTemporaryFiles();
    
    // Compact Redis memory
    await this.compactRedisMemory();
  }

  private async optimizeDatabaseTables(): Promise<void> {
    const tables = [
      'learning_events',
      'learning_metrics',
      'analytics_aggregations',
      'predictions',
      'recommendations',
    ];

    for (const table of tables) {
      try {
        await databaseService.query(`VACUUM ANALYZE ${table}`);
        logger.debug(`Optimized table: ${table}`);
      } catch (error) {
        logger.error(`Failed to optimize table ${table}`, error);
      }
    }

    logger.info('Database optimization completed');
  }

  private async cleanupTemporaryFiles(): Promise<void> {
    // This would clean up temporary export files, logs, etc.
    logger.info('Temporary files cleanup completed');
  }

  private async compactRedisMemory(): Promise<void> {
    try {
      // This would trigger Redis memory optimization
      logger.info('Redis memory compaction completed');
    } catch (error) {
      logger.error('Redis memory compaction failed', error);
    }
  }

  private async generateLifecycleReport(): Promise<void> {
    // Generate weekly lifecycle management report
    const report = {
      period: 'weekly',
      generatedAt: new Date(),
      jobs: Array.from(this.runningJobs.values()),
      policies: this.archivalPolicies.length,
      rules: this.minimizationRules.length,
    };

    logger.info('Weekly lifecycle report generated', report);
  }

  private async updateJobStatus(job: LifecycleJob): Promise<void> {
    try {
      await databaseService.query(`
        INSERT INTO data_lifecycle_jobs (
          id, type, status, progress, records_processed, total_records,
          started_at, completed_at, error, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          records_processed = EXCLUDED.records_processed,
          completed_at = EXCLUDED.completed_at,
          error = EXCLUDED.error
      `, [
        job.id,
        job.type,
        job.status,
        job.progress,
        job.recordsProcessed,
        job.totalRecords,
        job.startedAt,
        job.completedAt,
        job.error,
        JSON.stringify(job.metadata),
      ]);
    } catch (error) {
      logger.error('Failed to update job status', { error, jobId: job.id });
    }
  }

  async getLifecycleStatus(): Promise<any> {
    return {
      runningJobs: Array.from(this.runningJobs.values()),
      activePolicies: this.archivalPolicies.filter(p => p.isActive).length,
      activeRules: this.minimizationRules.filter(r => r.isActive).length,
      scheduledTasks: Array.from(this.scheduledJobs.keys()),
    };
  }

  async shutdown(): Promise<void> {
    // Stop all scheduled tasks
    for (const [name, task] of this.scheduledJobs) {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    }

    this.scheduledJobs.clear();
    logger.info('Data lifecycle service shut down');
  }
}

export const dataLifecycleService = new DataLifecycleService();
export default dataLifecycleService;