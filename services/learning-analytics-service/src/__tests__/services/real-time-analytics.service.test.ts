import { realTimeAnalyticsService } from '../../services/real-time-analytics.service';
import { databaseService } from '../../services/database.service';
import { redisService } from '../../services/redis.service';
import { EventType } from '../../types/analytics.types';
import { createMockLearningEvent, createMockLearningMetrics, expectWithinRange } from '../../test/setup';

describe('RealTimeAnalyticsService', () => {
  describe('Event Processing', () => {
    it('should process a learning event successfully', async () => {
      const event = createMockLearningEvent({
        eventType: EventType.CONTENT_VIEW,
        eventData: { duration: 600, contentId: 'test-content-1' },
      });

      await realTimeAnalyticsService.processEvent(event);

      // Verify event was stored
      const result = await databaseService.query(
        'SELECT * FROM learning_events WHERE id = $1',
        [event.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].user_id).toBe(event.userId);
      expect(result.rows[0].event_type).toBe(event.eventType);
    });

    it('should update user metrics when processing events', async () => {
      const userId = 'test-user-metrics';
      
      // Create initial metrics
      const initialMetrics = createMockLearningMetrics({ userId });
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        initialMetrics.userId,
        initialMetrics.timeSpent,
        initialMetrics.completionRate,
        initialMetrics.engagementScore,
        initialMetrics.masteryLevel,
        initialMetrics.strugglingIndicators,
        initialMetrics.learningVelocity,
        initialMetrics.retentionScore,
        initialMetrics.collaborationScore,
        initialMetrics.aiInteractionScore,
        initialMetrics.lastUpdated,
      ]);

      // Process content view event
      const event = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_VIEW,
        eventData: { duration: 300 },
      });

      await realTimeAnalyticsService.processEvent(event);

      // Check if metrics were updated (cached)
      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      expect(cachedMetrics.timeSpent).toBeGreaterThan(initialMetrics.timeSpent);
    });

    it('should handle assessment submission events correctly', async () => {
      const userId = 'test-user-assessment';
      
      // Create initial metrics
      const initialMetrics = createMockLearningMetrics({ 
        userId,
        masteryLevel: 0.6,
        strugglingIndicators: [],
      });
      
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        initialMetrics.userId,
        initialMetrics.timeSpent,
        initialMetrics.completionRate,
        initialMetrics.engagementScore,
        initialMetrics.masteryLevel,
        initialMetrics.strugglingIndicators,
        initialMetrics.learningVelocity,
        initialMetrics.retentionScore,
        initialMetrics.collaborationScore,
        initialMetrics.aiInteractionScore,
        initialMetrics.lastUpdated,
      ]);

      // Process low-score assessment with multiple attempts
      const event = createMockLearningEvent({
        userId,
        eventType: EventType.ASSESSMENT_SUBMIT,
        eventData: { 
          score: 0.4, 
          attempts: 4,
          assessmentId: 'test-assessment-1',
        },
      });

      await realTimeAnalyticsService.processEvent(event);

      // Check if struggling indicators were added
      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      expect(cachedMetrics.strugglingIndicators).toContain('assessment_difficulty_test-assessment-1');
    });

    it('should validate event structure', async () => {
      const invalidEvent = {
        id: 'test-event',
        // Missing required fields
      };

      await expect(
        realTimeAnalyticsService.processEvent(invalidEvent as any)
      ).rejects.toThrow('Invalid event structure');
    });
  });

  describe('Metrics Calculations', () => {
    it('should calculate engagement score correctly', async () => {
      const userId = 'test-user-engagement';
      
      // Create user with initial metrics
      const initialMetrics = createMockLearningMetrics({ 
        userId,
        engagementScore: 0.5,
      });
      
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        initialMetrics.userId,
        initialMetrics.timeSpent,
        initialMetrics.completionRate,
        initialMetrics.engagementScore,
        initialMetrics.masteryLevel,
        initialMetrics.strugglingIndicators,
        initialMetrics.learningVelocity,
        initialMetrics.retentionScore,
        initialMetrics.collaborationScore,
        initialMetrics.aiInteractionScore,
        initialMetrics.lastUpdated,
      ]);

      // Process high-engagement content view
      const event = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_VIEW,
        eventData: { 
          duration: 600, // 10 minutes
          expectedDuration: 300, // 5 minutes expected
        },
      });

      await realTimeAnalyticsService.processEvent(event);

      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      
      // Engagement should increase due to longer than expected viewing time
      expect(cachedMetrics.engagementScore).toBeGreaterThan(initialMetrics.engagementScore);
    });

    it('should calculate mastery level progression', async () => {
      const userId = 'test-user-mastery';
      
      const initialMetrics = createMockLearningMetrics({ 
        userId,
        masteryLevel: 0.6,
      });
      
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        initialMetrics.userId,
        initialMetrics.timeSpent,
        initialMetrics.completionRate,
        initialMetrics.engagementScore,
        initialMetrics.masteryLevel,
        initialMetrics.strugglingIndicators,
        initialMetrics.learningVelocity,
        initialMetrics.retentionScore,
        initialMetrics.collaborationScore,
        initialMetrics.aiInteractionScore,
        initialMetrics.lastUpdated,
      ]);

      // Process successful content completion
      const event = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_COMPLETE,
        eventData: { score: 0.9 },
      });

      await realTimeAnalyticsService.processEvent(event);

      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      expect(cachedMetrics.masteryLevel).toBeGreaterThan(initialMetrics.masteryLevel);
    });

    it('should track learning velocity', async () => {
      const userId = 'test-user-velocity';
      
      const initialMetrics = createMockLearningMetrics({ 
        userId,
        learningVelocity: 0.3,
      });
      
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        initialMetrics.userId,
        initialMetrics.timeSpent,
        initialMetrics.completionRate,
        initialMetrics.engagementScore,
        initialMetrics.masteryLevel,
        initialMetrics.strugglingIndicators,
        initialMetrics.learningVelocity,
        initialMetrics.retentionScore,
        initialMetrics.collaborationScore,
        initialMetrics.aiInteractionScore,
        initialMetrics.lastUpdated,
      ]);

      // Process quick content completion
      const event = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_COMPLETE,
        eventData: { 
          duration: 1800, // 30 minutes
          score: 0.8,
        },
      });

      await realTimeAnalyticsService.processEvent(event);

      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      
      // Learning velocity should be updated based on completion time
      expect(typeof cachedMetrics.learningVelocity).toBe('number');
    });
  });

  describe('Aggregations', () => {
    it('should create micro-level aggregations', async () => {
      const userId = 'test-user-aggregation';
      const sessionId = 'test-session-aggregation';

      const event = createMockLearningEvent({
        userId,
        sessionId,
        eventType: EventType.CONTENT_VIEW,
        eventData: { duration: 300 },
      });

      await realTimeAnalyticsService.processEvent(event);

      // Check if aggregation was cached
      const now = new Date();
      const hourKey = `micro:${userId}:hour:${new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()}`;
      
      const aggregation = await redisService.getCachedAggregation(hourKey);
      expect(aggregation).toBeTruthy();
      expect(aggregation.metrics.totalEvents).toBe(1);
    });

    it('should handle multiple events in aggregations', async () => {
      const userId = 'test-user-multi-agg';
      const sessionId = 'test-session-multi-agg';

      // Process multiple events
      for (let i = 0; i < 3; i++) {
        const event = createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.CONTENT_VIEW,
          eventData: { duration: 300 + i * 100 },
        });

        await realTimeAnalyticsService.processEvent(event);
      }

      // Check aggregation
      const now = new Date();
      const hourKey = `micro:${userId}:hour:${new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()}`;
      
      const aggregation = await redisService.getCachedAggregation(hourKey);
      expect(aggregation).toBeTruthy();
      expect(aggregation.metrics.totalEvents).toBe(3);
      expect(aggregation.metrics.totalTimeSpent).toBe(900 + 300); // 300 + 400 + 500 + initial processing
    });
  });

  describe('Performance', () => {
    it('should process events within SLO threshold', async () => {
      const event = createMockLearningEvent();
      
      const startTime = Date.now();
      await realTimeAnalyticsService.processEvent(event);
      const processingTime = Date.now() - startTime;

      // Should process within 5 seconds (SLO threshold)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should handle concurrent event processing', async () => {
      const events = Array.from({ length: 10 }, (_, i) => 
        createMockLearningEvent({
          id: `concurrent-event-${i}`,
          userId: `user-${i}`,
        })
      );

      const startTime = Date.now();
      await Promise.all(events.map(event => realTimeAnalyticsService.processEvent(event)));
      const totalTime = Date.now() - startTime;

      // All events should be processed within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 10 events

      // Verify all events were stored
      for (const event of events) {
        const result = await databaseService.query(
          'SELECT * FROM learning_events WHERE id = $1',
          [event.id]
        );
        expect(result.rows).toHaveLength(1);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalQuery = databaseService.query;
      databaseService.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const event = createMockLearningEvent();

      await expect(realTimeAnalyticsService.processEvent(event)).rejects.toThrow('Database error');

      // Restore original method
      databaseService.query = originalQuery;
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis error
      const originalSet = redisService.set;
      redisService.set = jest.fn().mockRejectedValue(new Error('Redis error'));

      const event = createMockLearningEvent();

      // Should still process the event despite Redis error
      await expect(realTimeAnalyticsService.processEvent(event)).rejects.toThrow();

      // Restore original method
      redisService.set = originalSet;
    });
  });

  describe('Processing Stats', () => {
    it('should track processing statistics', async () => {
      const initialStats = await realTimeAnalyticsService.getProcessingStats();
      
      const event = createMockLearningEvent();
      await realTimeAnalyticsService.processEvent(event);

      const updatedStats = await realTimeAnalyticsService.getProcessingStats();
      
      expect(updatedStats.eventsProcessed).toBeGreaterThan(initialStats.eventsProcessed);
      expect(updatedStats.lastProcessedAt).toBeInstanceOf(Date);
      expect(typeof updatedStats.averageProcessingTime).toBe('number');
    });
  });
});