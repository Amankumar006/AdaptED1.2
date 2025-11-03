import { EventEmitter } from 'events';
import { LearningEvent, EventType, LearningMetrics, AnalyticsAggregation, AnalyticsLevel } from '../types/analytics.types';
import { databaseService } from './database.service';
import { redisService } from './redis.service';
import { kafkaService } from './kafka.service';
import { logger } from '../utils/logger';
import config from '../config/config';

interface ProcessingStats {
  eventsProcessed: number;
  averageProcessingTime: number;
  lastProcessedAt: Date;
  errorCount: number;
  queueLength: number;
}

class RealTimeAnalyticsService extends EventEmitter {
  private processingStats: ProcessingStats = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    lastProcessedAt: new Date(),
    errorCount: 0,
    queueLength: 0,
  };

  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsCache = new Map<string, LearningMetrics>();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    try {
      // Connect to services
      await redisService.connect();
      await kafkaService.connect();

      // Register Kafka event handlers
      this.registerKafkaHandlers();

      // Start consuming events
      await kafkaService.startConsuming();

      // Start batch processing
      this.startBatchProcessing();

      logger.info('Real-time analytics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize real-time analytics service', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.on('event_processed', (event: LearningEvent, processingTime: number) => {
      this.updateProcessingStats(processingTime);
    });

    this.on('processing_error', (error: Error, event: LearningEvent) => {
      this.processingStats.errorCount++;
      logger.error('Event processing error', { error, eventId: event.id });
    });
  }

  private registerKafkaHandlers(): void {
    // Register handlers for different event types
    Object.values(EventType).forEach(eventType => {
      kafkaService.registerEventHandler(eventType, async (event: LearningEvent) => {
        await this.processEvent(event);
      });
    });
  }

  async processEvent(event: LearningEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate event
      if (!this.validateEvent(event)) {
        throw new Error(`Invalid event structure: ${event.id}`);
      }

      // Store raw event
      await this.storeRawEvent(event);

      // Update real-time metrics
      await this.updateRealTimeMetrics(event);

      // Update aggregations
      await this.updateAggregations(event);

      // Check for alerts
      await this.checkAlerts(event);

      // Cache processed event for batch processing
      await this.cacheForBatchProcessing(event);

      const processingTime = Date.now() - startTime;
      this.emit('event_processed', event, processingTime);

      // Check if processing time exceeds SLO
      if (processingTime > config.analytics.realTimeLagThreshold) {
        logger.warn('Processing time exceeded SLO threshold', {
          eventId: event.id,
          processingTime,
          threshold: config.analytics.realTimeLagThreshold,
        });
      }

    } catch (error) {
      this.emit('processing_error', error, event);
      throw error;
    }
  }

  private validateEvent(event: LearningEvent): boolean {
    return !!(
      event.id &&
      event.userId &&
      event.sessionId &&
      event.eventType &&
      event.timestamp &&
      event.eventData &&
      event.context
    );
  }

  private async storeRawEvent(event: LearningEvent): Promise<void> {
    try {
      await databaseService.query(`
        INSERT INTO learning_events (
          id, user_id, session_id, event_type, event_data, context, metadata, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        event.id,
        event.userId,
        event.sessionId,
        event.eventType,
        JSON.stringify(event.eventData),
        JSON.stringify(event.context),
        JSON.stringify(event.metadata || {}),
        event.timestamp,
      ]);
    } catch (error) {
      logger.error('Failed to store raw event', { error, eventId: event.id });
      throw error;
    }
  }

  private async updateRealTimeMetrics(event: LearningEvent): Promise<void> {
    try {
      // Get or create user metrics
      let metrics = this.metricsCache.get(event.userId);
      if (!metrics) {
        metrics = await this.getUserMetrics(event.userId);
        this.metricsCache.set(event.userId, metrics);
      }

      // Update metrics based on event type
      switch (event.eventType) {
        case EventType.CONTENT_VIEW:
          await this.updateContentViewMetrics(metrics, event);
          break;
        case EventType.CONTENT_COMPLETE:
          await this.updateContentCompleteMetrics(metrics, event);
          break;
        case EventType.ASSESSMENT_SUBMIT:
          await this.updateAssessmentMetrics(metrics, event);
          break;
        case EventType.SESSION_START:
          await this.updateSessionMetrics(metrics, event);
          break;
        case EventType.AI_QUESTION_ASK:
          await this.updateAIInteractionMetrics(metrics, event);
          break;
        case EventType.DISCUSSION_POST:
          await this.updateCollaborationMetrics(metrics, event);
          break;
        default:
          await this.updateGeneralMetrics(metrics, event);
      }

      // Cache updated metrics
      await redisService.cacheMetrics(event.userId, metrics, 300); // 5 minutes TTL

      // Update database periodically (not on every event to avoid performance issues)
      if (Math.random() < 0.1) { // 10% chance to persist to database
        await this.persistUserMetrics(metrics);
      }

    } catch (error) {
      logger.error('Failed to update real-time metrics', { error, eventId: event.id });
      throw error;
    }
  }

  private async getUserMetrics(userId: string): Promise<LearningMetrics> {
    try {
      // Try cache first
      const cached = await redisService.getCachedMetrics<LearningMetrics>(userId);
      if (cached) {
        return cached;
      }

      // Get from database
      const result = await databaseService.query(`
        SELECT * FROM learning_metrics WHERE user_id = $1
      `, [userId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          userId: row.user_id,
          timeSpent: parseInt(row.time_spent),
          completionRate: parseFloat(row.completion_rate),
          engagementScore: parseFloat(row.engagement_score),
          masteryLevel: parseFloat(row.mastery_level),
          strugglingIndicators: row.struggling_indicators || [],
          learningVelocity: parseFloat(row.learning_velocity),
          retentionScore: parseFloat(row.retention_score),
          collaborationScore: parseFloat(row.collaboration_score),
          aiInteractionScore: parseFloat(row.ai_interaction_score),
          lastUpdated: row.last_updated,
        };
      }

      // Create new metrics
      const newMetrics: LearningMetrics = {
        userId,
        timeSpent: 0,
        completionRate: 0,
        engagementScore: 0,
        masteryLevel: 0,
        strugglingIndicators: [],
        learningVelocity: 0,
        retentionScore: 0,
        collaborationScore: 0,
        aiInteractionScore: 0,
        lastUpdated: new Date(),
      };

      await this.persistUserMetrics(newMetrics);
      return newMetrics;

    } catch (error) {
      logger.error('Failed to get user metrics', { error, userId });
      throw error;
    }
  }

  private async updateContentViewMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    const duration = event.eventData.duration || 0;
    metrics.timeSpent += duration;
    
    // Update engagement score based on view duration
    const expectedDuration = event.eventData.expectedDuration || 300; // 5 minutes default
    const engagementRatio = Math.min(duration / expectedDuration, 1);
    metrics.engagementScore = (metrics.engagementScore * 0.9) + (engagementRatio * 0.1);
    
    metrics.lastUpdated = new Date();
  }

  private async updateContentCompleteMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    // Increment completion rate
    const currentCompletions = metrics.completionRate * 100; // Assuming this tracks total completions
    metrics.completionRate = (currentCompletions + 1) / 101; // Simple increment

    // Update mastery level based on completion
    const score = event.eventData.score || 0.5;
    metrics.masteryLevel = (metrics.masteryLevel * 0.8) + (score * 0.2);

    // Update learning velocity
    const timeSpent = event.eventData.duration || 0;
    if (timeSpent > 0) {
      const velocity = 1 / (timeSpent / 3600); // completions per hour
      metrics.learningVelocity = (metrics.learningVelocity * 0.7) + (velocity * 0.3);
    }

    metrics.lastUpdated = new Date();
  }

  private async updateAssessmentMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    const score = event.eventData.score || 0;
    const attempts = event.eventData.attempts || 1;

    // Update mastery level
    metrics.masteryLevel = (metrics.masteryLevel * 0.7) + (score * 0.3);

    // Check for struggling indicators
    if (score < 0.6 || attempts > 3) {
      const indicator = `assessment_difficulty_${event.eventData.assessmentId}`;
      if (!metrics.strugglingIndicators.includes(indicator)) {
        metrics.strugglingIndicators.push(indicator);
      }
    }

    // Update retention score based on performance
    const retentionFactor = Math.max(0, (score - 0.5) * 2); // 0-1 scale
    metrics.retentionScore = (metrics.retentionScore * 0.8) + (retentionFactor * 0.2);

    metrics.lastUpdated = new Date();
  }

  private async updateSessionMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    // Update engagement score based on session frequency
    const now = new Date();
    const lastUpdate = new Date(metrics.lastUpdated);
    const hoursSinceLastSession = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    // Reward frequent sessions
    const sessionFrequencyScore = Math.max(0, 1 - (hoursSinceLastSession / 24));
    metrics.engagementScore = (metrics.engagementScore * 0.9) + (sessionFrequencyScore * 0.1);

    metrics.lastUpdated = new Date();
  }

  private async updateAIInteractionMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    // Update AI interaction score
    const interactionQuality = event.eventData.helpful ? 1 : 0.5;
    metrics.aiInteractionScore = (metrics.aiInteractionScore * 0.8) + (interactionQuality * 0.2);

    // Update engagement score
    metrics.engagementScore = (metrics.engagementScore * 0.95) + (0.1 * 0.05);

    metrics.lastUpdated = new Date();
  }

  private async updateCollaborationMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    // Update collaboration score
    const collaborationValue = event.eventData.type === 'helpful_response' ? 1 : 0.7;
    metrics.collaborationScore = (metrics.collaborationScore * 0.8) + (collaborationValue * 0.2);

    // Update engagement score
    metrics.engagementScore = (metrics.engagementScore * 0.95) + (0.15 * 0.05);

    metrics.lastUpdated = new Date();
  }

  private async updateGeneralMetrics(metrics: LearningMetrics, event: LearningEvent): Promise<void> {
    // General engagement update for any activity
    metrics.engagementScore = (metrics.engagementScore * 0.98) + (0.05 * 0.02);
    metrics.lastUpdated = new Date();
  }

  private async persistUserMetrics(metrics: LearningMetrics): Promise<void> {
    try {
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id) DO UPDATE SET
          time_spent = EXCLUDED.time_spent,
          completion_rate = EXCLUDED.completion_rate,
          engagement_score = EXCLUDED.engagement_score,
          mastery_level = EXCLUDED.mastery_level,
          struggling_indicators = EXCLUDED.struggling_indicators,
          learning_velocity = EXCLUDED.learning_velocity,
          retention_score = EXCLUDED.retention_score,
          collaboration_score = EXCLUDED.collaboration_score,
          ai_interaction_score = EXCLUDED.ai_interaction_score,
          last_updated = EXCLUDED.last_updated
      `, [
        metrics.userId,
        metrics.timeSpent,
        metrics.completionRate,
        metrics.engagementScore,
        metrics.masteryLevel,
        metrics.strugglingIndicators,
        metrics.learningVelocity,
        metrics.retentionScore,
        metrics.collaborationScore,
        metrics.aiInteractionScore,
        metrics.lastUpdated,
      ]);
    } catch (error) {
      logger.error('Failed to persist user metrics', { error, userId: metrics.userId });
      throw error;
    }
  }

  private async updateAggregations(event: LearningEvent): Promise<void> {
    try {
      // Update micro-level (individual) aggregations
      await this.updateMicroAggregations(event);

      // Update meso-level (classroom/cohort) aggregations if context available
      if (event.context.courseId) {
        await this.updateMesoAggregations(event);
      }

      // Update macro-level (institutional) aggregations if context available
      if (event.context.organizationId) {
        await this.updateMacroAggregations(event);
      }
    } catch (error) {
      logger.error('Failed to update aggregations', { error, eventId: event.id });
      throw error;
    }
  }

  private async updateMicroAggregations(event: LearningEvent): Promise<void> {
    // Update hourly, daily, and weekly aggregations for the user
    const now = new Date();
    const timeframes = [
      { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()), granularity: 'hour' },
      { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), granularity: 'day' },
      { start: this.getWeekStart(now), granularity: 'week' },
    ];

    for (const timeframe of timeframes) {
      const cacheKey = `micro:${event.userId}:${timeframe.granularity}:${timeframe.start.getTime()}`;
      
      // Try to get from cache first
      let aggregation = await redisService.getCachedAggregation<AnalyticsAggregation>(cacheKey);
      
      if (!aggregation) {
        // Create new aggregation
        aggregation = {
          id: `${event.userId}_${timeframe.granularity}_${timeframe.start.getTime()}`,
          level: AnalyticsLevel.MICRO,
          entityId: event.userId,
          timeframe: {
            start: timeframe.start,
            end: this.getTimeframeEnd(timeframe.start, timeframe.granularity as any),
            granularity: timeframe.granularity as any,
          },
          metrics: {
            totalEvents: 0,
            uniqueSessions: new Set(),
            totalTimeSpent: 0,
            eventTypes: {},
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      // Update aggregation
      aggregation.metrics.totalEvents = (aggregation.metrics.totalEvents || 0) + 1;
      (aggregation.metrics.uniqueSessions as Set<string>).add(event.sessionId);
      aggregation.metrics.totalTimeSpent = (aggregation.metrics.totalTimeSpent || 0) + (event.eventData.duration || 0);
      
      if (!aggregation.metrics.eventTypes) {
        aggregation.metrics.eventTypes = {};
      }
      aggregation.metrics.eventTypes[event.eventType] = (aggregation.metrics.eventTypes[event.eventType] || 0) + 1;
      
      aggregation.updatedAt = now;

      // Cache updated aggregation
      await redisService.cacheAggregation(cacheKey, aggregation, 1800); // 30 minutes TTL
    }
  }

  private async updateMesoAggregations(event: LearningEvent): Promise<void> {
    // Similar to micro but for course/classroom level
    const courseId = event.context.courseId!;
    const now = new Date();
    
    const cacheKey = `meso:${courseId}:day:${now.toDateString()}`;
    let aggregation = await redisService.getCachedAggregation<AnalyticsAggregation>(cacheKey);
    
    if (!aggregation) {
      aggregation = {
        id: `${courseId}_day_${now.getTime()}`,
        level: AnalyticsLevel.MESO,
        entityId: courseId,
        timeframe: {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          granularity: 'day',
        },
        metrics: {
          totalEvents: 0,
          uniqueUsers: new Set(),
          uniqueSessions: new Set(),
          totalTimeSpent: 0,
          eventTypes: {},
        },
        createdAt: now,
        updatedAt: now,
      };
    }

    // Update meso aggregation
    aggregation.metrics.totalEvents = (aggregation.metrics.totalEvents || 0) + 1;
    (aggregation.metrics.uniqueUsers as Set<string>).add(event.userId);
    (aggregation.metrics.uniqueSessions as Set<string>).add(event.sessionId);
    aggregation.metrics.totalTimeSpent = (aggregation.metrics.totalTimeSpent || 0) + (event.eventData.duration || 0);
    
    if (!aggregation.metrics.eventTypes) {
      aggregation.metrics.eventTypes = {};
    }
    aggregation.metrics.eventTypes[event.eventType] = (aggregation.metrics.eventTypes[event.eventType] || 0) + 1;
    
    aggregation.updatedAt = now;

    await redisService.cacheAggregation(cacheKey, aggregation, 3600); // 1 hour TTL
  }

  private async updateMacroAggregations(event: LearningEvent): Promise<void> {
    // Similar to meso but for organization level
    const organizationId = event.context.organizationId!;
    const now = new Date();
    
    const cacheKey = `macro:${organizationId}:day:${now.toDateString()}`;
    let aggregation = await redisService.getCachedAggregation<AnalyticsAggregation>(cacheKey);
    
    if (!aggregation) {
      aggregation = {
        id: `${organizationId}_day_${now.getTime()}`,
        level: AnalyticsLevel.MACRO,
        entityId: organizationId,
        timeframe: {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          granularity: 'day',
        },
        metrics: {
          totalEvents: 0,
          uniqueUsers: new Set(),
          uniqueSessions: new Set(),
          totalTimeSpent: 0,
          eventTypes: {},
        },
        createdAt: now,
        updatedAt: now,
      };
    }

    // Update macro aggregation
    aggregation.metrics.totalEvents = (aggregation.metrics.totalEvents || 0) + 1;
    (aggregation.metrics.uniqueUsers as Set<string>).add(event.userId);
    (aggregation.metrics.uniqueSessions as Set<string>).add(event.sessionId);
    aggregation.metrics.totalTimeSpent = (aggregation.metrics.totalTimeSpent || 0) + (event.eventData.duration || 0);
    
    if (!aggregation.metrics.eventTypes) {
      aggregation.metrics.eventTypes = {};
    }
    aggregation.metrics.eventTypes[event.eventType] = (aggregation.metrics.eventTypes[event.eventType] || 0) + 1;
    
    aggregation.updatedAt = now;

    await redisService.cacheAggregation(cacheKey, aggregation, 7200); // 2 hours TTL
  }

  private async checkAlerts(event: LearningEvent): Promise<void> {
    // This would check for configured alerts and trigger notifications
    // For now, we'll implement basic struggling student detection
    
    if (event.eventType === EventType.ASSESSMENT_SUBMIT) {
      const score = event.eventData.score || 0;
      const attempts = event.eventData.attempts || 1;
      
      if (score < 0.5 && attempts >= 3) {
        logger.warn('Struggling student detected', {
          userId: event.userId,
          assessmentId: event.eventData.assessmentId,
          score,
          attempts,
        });
        
        // In a real implementation, this would trigger an alert
        await redisService.publish('analytics:alerts', {
          type: 'struggling_student',
          userId: event.userId,
          data: { score, attempts, assessmentId: event.eventData.assessmentId },
          timestamp: new Date(),
        });
      }
    }
  }

  private async cacheForBatchProcessing(event: LearningEvent): Promise<void> {
    // Add event to batch processing queue
    await redisService.addToProcessingQueue('batch_processing', event);
  }

  private startBatchProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processBatch();
      }
    }, config.analytics.processingInterval);
  }

  private async processBatch(): Promise<void> {
    this.isProcessing = true;
    
    try {
      const batchSize = config.analytics.batchSize;
      const events: LearningEvent[] = [];
      
      // Collect events from queue
      for (let i = 0; i < batchSize; i++) {
        const event = await redisService.getFromProcessingQueue<LearningEvent>('batch_processing');
        if (!event) break;
        events.push(event);
      }
      
      if (events.length === 0) {
        return;
      }
      
      // Process batch
      await this.processBatchEvents(events);
      
      logger.debug('Batch processed successfully', { eventCount: events.length });
      
    } catch (error) {
      logger.error('Batch processing failed', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatchEvents(events: LearningEvent[]): Promise<void> {
    // Persist cached aggregations to database
    await this.persistCachedAggregations();
    
    // Update processing stats
    this.processingStats.queueLength = await redisService.getQueueLength('batch_processing');
  }

  private async persistCachedAggregations(): Promise<void> {
    try {
      // Get all cached aggregations
      const keys = await redisService.keys('aggregation:*');
      
      for (const key of keys) {
        const aggregation = await redisService.getCachedAggregation<AnalyticsAggregation>(key.replace('aggregation:', ''));
        if (aggregation) {
          // Convert Sets to arrays for JSON serialization
          const metrics = { ...aggregation.metrics };
          if (metrics.uniqueUsers instanceof Set) {
            metrics.uniqueUsers = metrics.uniqueUsers.size;
          }
          if (metrics.uniqueSessions instanceof Set) {
            metrics.uniqueSessions = metrics.uniqueSessions.size;
          }
          
          await databaseService.query(`
            INSERT INTO analytics_aggregations (
              id, level, entity_id, timeframe_start, timeframe_end, granularity, metrics, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (level, entity_id, timeframe_start, timeframe_end, granularity) 
            DO UPDATE SET
              metrics = EXCLUDED.metrics,
              updated_at = EXCLUDED.updated_at
          `, [
            aggregation.id,
            aggregation.level,
            aggregation.entityId,
            aggregation.timeframe.start,
            aggregation.timeframe.end,
            aggregation.timeframe.granularity,
            JSON.stringify(metrics),
            aggregation.createdAt,
            aggregation.updatedAt,
          ]);
        }
      }
    } catch (error) {
      logger.error('Failed to persist cached aggregations', error);
    }
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.eventsProcessed++;
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.eventsProcessed - 1) + processingTime) / 
      this.processingStats.eventsProcessed;
    this.processingStats.lastProcessedAt = new Date();
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  private getTimeframeEnd(start: Date, granularity: 'hour' | 'day' | 'week' | 'month'): Date {
    const end = new Date(start);
    switch (granularity) {
      case 'hour':
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case 'month':
        end.setMonth(end.getMonth() + 1);
        break;
    }
    return end;
  }

  async getProcessingStats(): Promise<ProcessingStats> {
    this.processingStats.queueLength = await redisService.getQueueLength('batch_processing');
    return { ...this.processingStats };
  }

  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    await kafkaService.disconnect();
    await redisService.disconnect();
    
    logger.info('Real-time analytics service shut down');
  }
}

export const realTimeAnalyticsService = new RealTimeAnalyticsService();
export default realTimeAnalyticsService;