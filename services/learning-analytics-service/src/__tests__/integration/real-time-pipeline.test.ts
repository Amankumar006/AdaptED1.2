import { realTimeAnalyticsService } from '../../services/real-time-analytics.service';
import { kafkaService } from '../../services/kafka.service';
import { databaseService } from '../../services/database.service';
import { redisService } from '../../services/redis.service';
import { EventType } from '../../types/analytics.types';
import { createMockLearningEvent, waitFor } from '../../test/setup';

describe('Real-Time Processing Pipeline Integration', () => {
  beforeAll(async () => {
    // Initialize services for integration testing
    await realTimeAnalyticsService.initialize();
  });

  afterAll(async () => {
    await realTimeAnalyticsService.shutdown();
  });

  describe('End-to-End Event Processing', () => {
    it('should process events from Kafka to database', async () => {
      const userId = 'e2e-test-user';
      const sessionId = 'e2e-test-session';

      // Create a learning event
      const event = createMockLearningEvent({
        userId,
        sessionId,
        eventType: EventType.CONTENT_VIEW,
        eventData: {
          contentId: 'test-content-123',
          duration: 450,
          progress: 0.75,
        },
      });

      // Publish event to Kafka (simulated)
      await kafkaService.publishLearningEvent(event);

      // Wait for event to be processed
      await waitFor(async () => {
        const result = await databaseService.query(
          'SELECT * FROM learning_events WHERE id = $1',
          [event.id]
        );
        return result.rows.length > 0;
      }, 10000);

      // Verify event was stored in database
      const result = await databaseService.query(
        'SELECT * FROM learning_events WHERE id = $1',
        [event.id]
      );

      expect(result.rows).toHaveLength(1);
      const storedEvent = result.rows[0];
      expect(storedEvent.user_id).toBe(userId);
      expect(storedEvent.session_id).toBe(sessionId);
      expect(storedEvent.event_type).toBe(EventType.CONTENT_VIEW);
      expect(JSON.parse(storedEvent.event_data).contentId).toBe('test-content-123');
    });

    it('should update metrics in real-time', async () => {
      const userId = 'metrics-update-user';

      // Create initial metrics
      await databaseService.query(`
        INSERT INTO learning_metrics (
          user_id, time_spent, completion_rate, engagement_score, mastery_level,
          struggling_indicators, learning_velocity, retention_score, 
          collaboration_score, ai_interaction_score, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        userId, 0, 0, 0.5, 0.5, [], 0, 0.5, 0.5, 0.5, new Date()
      ]);

      // Process multiple events
      const events = [
        createMockLearningEvent({
          userId,
          eventType: EventType.CONTENT_VIEW,
          eventData: { duration: 300 },
        }),
        createMockLearningEvent({
          userId,
          eventType: EventType.CONTENT_COMPLETE,
          eventData: { score: 0.8, duration: 600 },
        }),
        createMockLearningEvent({
          userId,
          eventType: EventType.ASSESSMENT_SUBMIT,
          eventData: { score: 0.9, attempts: 1 },
        }),
      ];

      // Process events sequentially
      for (const event of events) {
        await realTimeAnalyticsService.processEvent(event);
      }

      // Wait for metrics to be cached
      await waitFor(async () => {
        const cachedMetrics = await redisService.getCachedMetrics(userId);
        return cachedMetrics !== null;
      });

      // Verify metrics were updated
      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      expect(cachedMetrics.timeSpent).toBeGreaterThan(0);
      expect(cachedMetrics.masteryLevel).toBeGreaterThan(0.5);
      expect(cachedMetrics.engagementScore).toBeGreaterThan(0.5);
    });

    it('should create aggregations at multiple levels', async () => {
      const userId = 'aggregation-test-user';
      const courseId = 'test-course-123';
      const organizationId = 'test-org-456';

      const event = createMockLearningEvent({
        userId,
        eventType: EventType.LESSON_COMPLETE,
        eventData: { duration: 1200, score: 0.85 },
        context: {
          courseId,
          organizationId,
          deviceType: 'desktop',
          platform: 'web',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
          userRole: 'student',
        },
      });

      await realTimeAnalyticsService.processEvent(event);

      // Wait for aggregations to be created
      await waitFor(async () => {
        const now = new Date();
        const hourKey = `micro:${userId}:hour:${new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()}`;
        const microAgg = await redisService.getCachedAggregation(hourKey);
        return microAgg !== null;
      });

      // Check micro-level aggregation
      const now = new Date();
      const hourKey = `micro:${userId}:hour:${new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()}`;
      const microAgg = await redisService.getCachedAggregation(hourKey);
      
      expect(microAgg).toBeTruthy();
      expect(microAgg.level).toBe('micro');
      expect(microAgg.entityId).toBe(userId);
      expect(microAgg.metrics.totalEvents).toBeGreaterThan(0);

      // Check meso-level aggregation
      const dayKey = `meso:${courseId}:day:${now.toDateString()}`;
      const mesoAgg = await redisService.getCachedAggregation(dayKey);
      
      expect(mesoAgg).toBeTruthy();
      expect(mesoAgg.level).toBe('meso');
      expect(mesoAgg.entityId).toBe(courseId);

      // Check macro-level aggregation
      const macroKey = `macro:${organizationId}:day:${now.toDateString()}`;
      const macroAgg = await redisService.getCachedAggregation(macroKey);
      
      expect(macroAgg).toBeTruthy();
      expect(macroAgg.level).toBe('macro');
      expect(macroAgg.entityId).toBe(organizationId);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-volume event processing', async () => {
      const eventCount = 100;
      const userCount = 10;
      
      const events = Array.from({ length: eventCount }, (_, i) => 
        createMockLearningEvent({
          id: `load-test-event-${i}`,
          userId: `load-test-user-${i % userCount}`,
          sessionId: `load-test-session-${Math.floor(i / 10)}`,
          eventType: EventType.CONTENT_VIEW,
          eventData: { duration: Math.random() * 1000 + 100 },
        })
      );

      const startTime = Date.now();
      
      // Process events in batches to simulate realistic load
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await Promise.all(batch.map(event => realTimeAnalyticsService.processEvent(event)));
      }

      const processingTime = Date.now() - startTime;
      
      // Should process all events within reasonable time
      expect(processingTime).toBeLessThan(30000); // 30 seconds for 100 events

      // Verify all events were processed
      const result = await databaseService.query(
        'SELECT COUNT(*) as count FROM learning_events WHERE id LIKE $1',
        ['load-test-event-%']
      );

      expect(parseInt(result.rows[0].count)).toBe(eventCount);

      // Check processing stats
      const stats = await realTimeAnalyticsService.getProcessingStats();
      expect(stats.eventsProcessed).toBeGreaterThanOrEqual(eventCount);
      expect(stats.averageProcessingTime).toBeLessThan(5000); // Should be under 5s average
    });

    it('should maintain SLO under concurrent load', async () => {
      const concurrentUsers = 20;
      const eventsPerUser = 5;

      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userId = `concurrent-user-${userIndex}`;
        const userEvents = Array.from({ length: eventsPerUser }, (_, eventIndex) =>
          createMockLearningEvent({
            id: `concurrent-event-${userIndex}-${eventIndex}`,
            userId,
            eventType: EventType.CONTENT_VIEW,
            eventData: { duration: Math.random() * 500 + 200 },
          })
        );

        const userStartTime = Date.now();
        
        for (const event of userEvents) {
          await realTimeAnalyticsService.processEvent(event);
        }

        const userProcessingTime = Date.now() - userStartTime;
        
        // Each user's events should be processed within SLO
        expect(userProcessingTime).toBeLessThan(eventsPerUser * 5000); // 5s per event max
        
        return userProcessingTime;
      });

      const processingTimes = await Promise.all(userPromises);
      
      // Average processing time across all users should be reasonable
      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      expect(avgProcessingTime).toBeLessThan(10000); // 10s average per user
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across services', async () => {
      const userId = 'consistency-test-user';
      const sessionId = 'consistency-test-session';

      // Create a sequence of related events
      const events = [
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.SESSION_START,
          eventData: {},
        }),
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.LESSON_START,
          eventData: { lessonId: 'lesson-123' },
        }),
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.CONTENT_VIEW,
          eventData: { contentId: 'content-456', duration: 300 },
        }),
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.EXERCISE_COMPLETE,
          eventData: { exerciseId: 'exercise-789', score: 0.8 },
        }),
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.LESSON_COMPLETE,
          eventData: { lessonId: 'lesson-123', finalScore: 0.85 },
        }),
        createMockLearningEvent({
          userId,
          sessionId,
          eventType: EventType.SESSION_END,
          eventData: { totalDuration: 1800 },
        }),
      ];

      // Process events in sequence
      for (const event of events) {
        await realTimeAnalyticsService.processEvent(event);
      }

      // Wait for all processing to complete
      await waitFor(async () => {
        const result = await databaseService.query(
          'SELECT COUNT(*) as count FROM learning_events WHERE user_id = $1 AND session_id = $2',
          [userId, sessionId]
        );
        return parseInt(result.rows[0].count) === events.length;
      });

      // Verify all events are stored
      const eventsResult = await databaseService.query(
        'SELECT * FROM learning_events WHERE user_id = $1 AND session_id = $2 ORDER BY timestamp',
        [userId, sessionId]
      );

      expect(eventsResult.rows).toHaveLength(events.length);

      // Verify event sequence is maintained
      const storedEventTypes = eventsResult.rows.map(row => row.event_type);
      const expectedEventTypes = events.map(event => event.eventType);
      expect(storedEventTypes).toEqual(expectedEventTypes);

      // Verify metrics are consistent
      const cachedMetrics = await redisService.getCachedMetrics(userId);
      expect(cachedMetrics).toBeTruthy();
      expect(cachedMetrics.timeSpent).toBeGreaterThan(0);
      expect(cachedMetrics.completionRate).toBeGreaterThan(0);

      // Verify aggregations include all events
      const now = new Date();
      const hourKey = `micro:${userId}:hour:${new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()}`;
      const aggregation = await redisService.getCachedAggregation(hourKey);
      
      expect(aggregation).toBeTruthy();
      expect(aggregation.metrics.totalEvents).toBeGreaterThanOrEqual(events.length);
    });

    it('should handle duplicate events gracefully', async () => {
      const event = createMockLearningEvent({
        id: 'duplicate-test-event',
        userId: 'duplicate-test-user',
        eventType: EventType.CONTENT_VIEW,
      });

      // Process the same event twice
      await realTimeAnalyticsService.processEvent(event);
      
      // Second processing should handle duplicate gracefully
      await expect(realTimeAnalyticsService.processEvent(event)).rejects.toThrow();

      // Verify only one event is stored
      const result = await databaseService.query(
        'SELECT COUNT(*) as count FROM learning_events WHERE id = $1',
        [event.id]
      );

      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary service failures', async () => {
      const userId = 'recovery-test-user';
      
      // Simulate Redis failure
      const originalSet = redisService.set;
      let failureCount = 0;
      redisService.set = jest.fn().mockImplementation(async (...args) => {
        if (failureCount < 2) {
          failureCount++;
          throw new Error('Redis temporarily unavailable');
        }
        return originalSet.apply(redisService, args);
      });

      const event = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_VIEW,
      });

      // First attempts should fail, but eventually succeed
      await expect(realTimeAnalyticsService.processEvent(event)).rejects.toThrow();

      // Reset failure simulation
      redisService.set = originalSet;

      // Subsequent processing should work
      const successEvent = createMockLearningEvent({
        userId,
        eventType: EventType.CONTENT_COMPLETE,
      });

      await expect(realTimeAnalyticsService.processEvent(successEvent)).resolves.not.toThrow();

      // Verify successful event was processed
      const result = await databaseService.query(
        'SELECT * FROM learning_events WHERE id = $1',
        [successEvent.id]
      );

      expect(result.rows).toHaveLength(1);
    });

    it('should maintain processing stats during errors', async () => {
      const initialStats = await realTimeAnalyticsService.getProcessingStats();

      // Process a valid event
      const validEvent = createMockLearningEvent({
        userId: 'stats-test-user',
        eventType: EventType.CONTENT_VIEW,
      });

      await realTimeAnalyticsService.processEvent(validEvent);

      // Try to process an invalid event
      const invalidEvent = { id: 'invalid' };
      
      try {
        await realTimeAnalyticsService.processEvent(invalidEvent as any);
      } catch (error) {
        // Expected to fail
      }

      const finalStats = await realTimeAnalyticsService.getProcessingStats();

      // Valid event should be counted
      expect(finalStats.eventsProcessed).toBe(initialStats.eventsProcessed + 1);
      
      // Error should be counted
      expect(finalStats.errorCount).toBe(initialStats.errorCount + 1);
    });
  });
});