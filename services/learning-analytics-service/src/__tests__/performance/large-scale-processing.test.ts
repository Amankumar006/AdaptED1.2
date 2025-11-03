import { realTimeAnalyticsService } from '../../services/real-time-analytics.service';
import { predictiveAnalyticsService } from '../../services/predictive-analytics.service';
import { dashboardService } from '../../services/dashboard.service';
import { reportingService } from '../../services/reporting.service';
import { databaseService } from '../../services/database.service';
import { redisService } from '../../services/redis.service';
import { EventType, ModelType, ReportType, AnalyticsLevel } from '../../types/analytics.types';
import { createMockLearningEvent, createMockLearningMetrics, createMockReportFilters } from '../../test/setup';

describe('Large-Scale Data Processing Performance', () => {
  // Increase timeout for performance tests
  jest.setTimeout(120000); // 2 minutes

  beforeAll(async () => {
    await realTimeAnalyticsService.initialize();
    await predictiveAnalyticsService.initialize();
  });

  afterAll(async () => {
    await realTimeAnalyticsService.shutdown();
    await predictiveAnalyticsService.shutdown();
  });

  describe('High-Volume Event Processing', () => {
    it('should process 10,000 events within performance targets', async () => {
      const eventCount = 10000;
      const userCount = 1000;
      const sessionCount = 2000;

      console.log(`Generating ${eventCount} events for ${userCount} users...`);

      // Generate large dataset
      const events = Array.from({ length: eventCount }, (_, i) => {
        const userId = `perf-user-${i % userCount}`;
        const sessionId = `perf-session-${i % sessionCount}`;
        const eventTypes = Object.values(EventType);
        const eventType = eventTypes[i % eventTypes.length];

        return createMockLearningEvent({
          id: `perf-event-${i}`,
          userId,
          sessionId,
          eventType,
          eventData: {
            duration: Math.random() * 1000 + 100,
            score: Math.random(),
            contentId: `content-${i % 100}`,
          },
        });
      });

      console.log('Starting event processing...');
      const startTime = Date.now();

      // Process events in batches to simulate realistic load
      const batchSize = 100;
      let processedCount = 0;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (event) => {
          try {
            await realTimeAnalyticsService.processEvent(event);
            processedCount++;
          } catch (error) {
            console.warn(`Failed to process event ${event.id}:`, error.message);
          }
        }));

        // Log progress every 1000 events
        if ((i + batchSize) % 1000 === 0) {
          console.log(`Processed ${i + batchSize}/${eventCount} events`);
        }
      }

      const totalTime = Date.now() - startTime;
      const eventsPerSecond = processedCount / (totalTime / 1000);

      console.log(`Performance Results:`);
      console.log(`- Total events processed: ${processedCount}/${eventCount}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Events per second: ${eventsPerSecond.toFixed(2)}`);
      console.log(`- Average time per event: ${(totalTime / processedCount).toFixed(2)}ms`);

      // Performance assertions
      expect(processedCount).toBeGreaterThan(eventCount * 0.95); // At least 95% success rate
      expect(eventsPerSecond).toBeGreaterThan(50); // At least 50 events per second
      expect(totalTime / processedCount).toBeLessThan(100); // Less than 100ms per event average

      // Verify data integrity
      const storedEventsResult = await databaseService.query(
        'SELECT COUNT(*) as count FROM learning_events WHERE id LIKE $1',
        ['perf-event-%']
      );

      const storedCount = parseInt(storedEventsResult.rows[0].count);
      expect(storedCount).toBeGreaterThan(eventCount * 0.9); // At least 90% stored

      // Check processing stats
      const stats = await realTimeAnalyticsService.getProcessingStats();
      expect(stats.averageProcessingTime).toBeLessThan(5000); // Under 5s SLO
    });

    it('should maintain performance with concurrent users', async () => {
      const concurrentUsers = 50;
      const eventsPerUser = 20;
      const totalEvents = concurrentUsers * eventsPerUser;

      console.log(`Testing concurrent processing: ${concurrentUsers} users, ${eventsPerUser} events each`);

      const startTime = Date.now();

      // Create concurrent user simulations
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userId = `concurrent-perf-user-${userIndex}`;
        const userStartTime = Date.now();

        const userEvents = Array.from({ length: eventsPerUser }, (_, eventIndex) =>
          createMockLearningEvent({
            id: `concurrent-perf-event-${userIndex}-${eventIndex}`,
            userId,
            eventType: EventType.CONTENT_VIEW,
            eventData: { duration: Math.random() * 500 + 200 },
          })
        );

        let successCount = 0;
        for (const event of userEvents) {
          try {
            await realTimeAnalyticsService.processEvent(event);
            successCount++;
          } catch (error) {
            console.warn(`User ${userIndex} event failed:`, error.message);
          }
        }

        const userTime = Date.now() - userStartTime;
        return { userIndex, successCount, userTime };
      });

      const results = await Promise.all(userPromises);
      const totalTime = Date.now() - startTime;

      const totalSuccessful = results.reduce((sum, result) => sum + result.successCount, 0);
      const avgUserTime = results.reduce((sum, result) => sum + result.userTime, 0) / results.length;
      const eventsPerSecond = totalSuccessful / (totalTime / 1000);

      console.log(`Concurrent Performance Results:`);
      console.log(`- Total events processed: ${totalSuccessful}/${totalEvents}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Average user time: ${avgUserTime.toFixed(2)}ms`);
      console.log(`- Events per second: ${eventsPerSecond.toFixed(2)}`);

      // Performance assertions
      expect(totalSuccessful).toBeGreaterThan(totalEvents * 0.9); // 90% success rate
      expect(eventsPerSecond).toBeGreaterThan(30); // At least 30 events per second under load
      expect(avgUserTime).toBeLessThan(eventsPerUser * 1000); // Less than 1s per event per user
    });
  });

  describe('Large Dataset Analytics', () => {
    it('should generate dashboards for large user bases efficiently', async () => {
      const userCount = 1000;
      
      console.log(`Creating metrics for ${userCount} users...`);

      // Create metrics for many users
      const userMetrics = Array.from({ length: userCount }, (_, i) => 
        createMockLearningMetrics({
          userId: `dashboard-user-${i}`,
          engagementScore: Math.random(),
          masteryLevel: Math.random(),
          completionRate: Math.random(),
        })
      );

      // Insert metrics in batches
      const batchSize = 100;
      for (let i = 0; i < userMetrics.length; i += batchSize) {
        const batch = userMetrics.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (metrics) => {
          await databaseService.query(`
            INSERT INTO learning_metrics (
              user_id, time_spent, completion_rate, engagement_score, mastery_level,
              struggling_indicators, learning_velocity, retention_score, 
              collaboration_score, ai_interaction_score, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        }));
      }

      console.log('Generating macro-level dashboard...');

      const timeframe = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
        granularity: 'day' as const,
      };

      const startTime = Date.now();
      const dashboard = await dashboardService.getMacroLevelDashboard('test-org-large', timeframe);
      const dashboardTime = Date.now() - startTime;

      console.log(`Dashboard generation time: ${dashboardTime}ms`);

      // Performance assertions
      expect(dashboardTime).toBeLessThan(30000); // Under 30 seconds
      expect(dashboard.widgets.length).toBeGreaterThan(0);
      expect(dashboard.metadata.dataPoints).toBeGreaterThan(0);

      // Verify dashboard structure
      expect(dashboard.level).toBe(AnalyticsLevel.MACRO);
      expect(dashboard.widgets).toBeInstanceOf(Array);
      expect(dashboard.metadata.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle large-scale report generation', async () => {
      const recordCount = 5000;
      
      console.log(`Generating report with ${recordCount} records...`);

      // Create a performance report
      const report = await reportingService.createReport(
        'Large Scale Performance Report',
        'Testing report generation with large dataset',
        ReportType.PERFORMANCE,
        AnalyticsLevel.MICRO,
        createMockReportFilters({
          dateRange: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
            end: new Date(),
          },
        }),
        [],
        'perf-test-user'
      );

      const startTime = Date.now();
      const reportData = await reportingService.generateReport(report.id);
      const reportTime = Date.now() - startTime;

      console.log(`Report generation results:`);
      console.log(`- Generation time: ${reportTime}ms`);
      console.log(`- Records generated: ${reportData.rows.length}`);
      console.log(`- Headers: ${reportData.headers.length}`);

      // Performance assertions
      expect(reportTime).toBeLessThan(60000); // Under 60 seconds
      expect(reportData.rows.length).toBeGreaterThan(0);
      expect(reportData.headers.length).toBeGreaterThan(0);
      expect(reportData.metadata.executionTime).toBeLessThan(60000);

      // Verify report structure
      expect(reportData.metadata.totalRecords).toBe(reportData.rows.length);
      expect(reportData.metadata.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Machine Learning Performance', () => {
    it('should train models efficiently with large datasets', async () => {
      const trainingDataSize = 2000;
      
      console.log(`Creating training dataset with ${trainingDataSize} samples...`);

      // Create model
      const model = await predictiveAnalyticsService.createModel(
        'Large Scale Training Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore', 'masteryLevel', 'completionRate', 'strugglingIndicatorCount']
      );

      // Generate training data
      const trainingUsers = Array.from({ length: trainingDataSize }, (_, i) => ({
        userId: `training-user-${i}`,
        metrics: createMockLearningMetrics({
          userId: `training-user-${i}`,
          engagementScore: Math.random(),
          masteryLevel: Math.random(),
          completionRate: Math.random(),
          strugglingIndicators: Math.random() > 0.7 ? ['difficulty1', 'difficulty2'] : [],
        }),
      }));

      // Insert training data in batches
      const batchSize = 200;
      for (let i = 0; i < trainingUsers.length; i += batchSize) {
        const batch = trainingUsers.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          // Insert metrics
          await databaseService.query(`
            INSERT INTO learning_metrics (
              user_id, time_spent, completion_rate, engagement_score, mastery_level,
              struggling_indicators, learning_velocity, retention_score, 
              collaboration_score, ai_interaction_score, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            user.metrics.userId,
            user.metrics.timeSpent,
            user.metrics.completionRate,
            user.metrics.engagementScore,
            user.metrics.masteryLevel,
            user.metrics.strugglingIndicators,
            user.metrics.learningVelocity,
            user.metrics.retentionScore,
            user.metrics.collaborationScore,
            user.metrics.aiInteractionScore,
            user.metrics.lastUpdated,
          ]);

          // Insert events for context
          for (let j = 0; j < 15; j++) {
            await databaseService.query(`
              INSERT INTO learning_events (
                id, user_id, session_id, event_type, event_data, context, timestamp
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              `training-event-${user.userId}-${j}`,
              user.userId,
              `training-session-${user.userId}`,
              'content_view',
              JSON.stringify({ duration: Math.random() * 1000 }),
              JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
              new Date(),
            ]);
          }
        }));

        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(trainingUsers.length / batchSize)}`);
      }

      console.log('Starting model training...');

      const trainingStartTime = Date.now();
      await predictiveAnalyticsService.trainModel(model.id);
      const trainingTime = Date.now() - trainingStartTime;

      console.log(`Model training results:`);
      console.log(`- Training time: ${trainingTime}ms`);
      console.log(`- Training data size: ${trainingDataSize} samples`);

      // Performance assertions
      expect(trainingTime).toBeLessThan(300000); // Under 5 minutes
      
      // Verify model was trained
      const modelPerformance = await predictiveAnalyticsService.getModelPerformance(model.id);
      expect(modelPerformance).toBeDefined();
      expect(modelPerformance.accuracy).toBeGreaterThan(0);
    });

    it('should generate predictions efficiently for many users', async () => {
      const predictionUserCount = 500;
      
      console.log(`Generating predictions for ${predictionUserCount} users...`);

      // Create a simple model
      const model = await predictiveAnalyticsService.createModel(
        'Batch Prediction Model',
        ModelType.ENGAGEMENT_PREDICTION,
        ['engagementScore', 'sessionFrequency']
      );

      // Create users for predictions
      const predictionUsers = Array.from({ length: predictionUserCount }, (_, i) => {
        const userId = `prediction-user-${i}`;
        return {
          userId,
          metrics: createMockLearningMetrics({ userId }),
        };
      });

      // Insert user data
      for (const user of predictionUsers) {
        await databaseService.query(`
          INSERT INTO learning_metrics (
            user_id, time_spent, completion_rate, engagement_score, mastery_level,
            struggling_indicators, learning_velocity, retention_score, 
            collaboration_score, ai_interaction_score, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          user.metrics.userId,
          user.metrics.timeSpent,
          user.metrics.completionRate,
          user.metrics.engagementScore,
          user.metrics.masteryLevel,
          user.metrics.strugglingIndicators,
          user.metrics.learningVelocity,
          user.metrics.retentionScore,
          user.metrics.collaborationScore,
          user.metrics.aiInteractionScore,
          user.metrics.lastUpdated,
        ]);

        // Add some events
        for (let j = 0; j < 10; j++) {
          await databaseService.query(`
            INSERT INTO learning_events (
              id, user_id, session_id, event_type, event_data, context, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            `pred-event-${user.userId}-${j}`,
            user.userId,
            `pred-session-${user.userId}`,
            'content_view',
            JSON.stringify({ duration: 300 }),
            JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
            new Date(),
          ]);
        }
      }

      // Train model
      await predictiveAnalyticsService.trainModel(model.id);

      console.log('Generating predictions...');

      const predictionStartTime = Date.now();
      let successfulPredictions = 0;

      // Generate predictions in batches
      const batchSize = 50;
      for (let i = 0; i < predictionUsers.length; i += batchSize) {
        const batch = predictionUsers.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (user) => {
          try {
            const prediction = await predictiveAnalyticsService.generatePrediction(model.id, user.userId);
            if (prediction) {
              successfulPredictions++;
              return prediction;
            }
          } catch (error) {
            console.warn(`Prediction failed for user ${user.userId}:`, error.message);
          }
          return null;
        });

        await Promise.all(batchPromises);
      }

      const predictionTime = Date.now() - predictionStartTime;
      const predictionsPerSecond = successfulPredictions / (predictionTime / 1000);

      console.log(`Prediction generation results:`);
      console.log(`- Total time: ${predictionTime}ms`);
      console.log(`- Successful predictions: ${successfulPredictions}/${predictionUserCount}`);
      console.log(`- Predictions per second: ${predictionsPerSecond.toFixed(2)}`);

      // Performance assertions
      expect(predictionTime).toBeLessThan(120000); // Under 2 minutes
      expect(successfulPredictions).toBeGreaterThan(predictionUserCount * 0.5); // At least 50% success
      expect(predictionsPerSecond).toBeGreaterThan(1); // At least 1 prediction per second
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', {
        rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      });

      // Perform memory-intensive operations
      const eventCount = 5000;
      const events = Array.from({ length: eventCount }, (_, i) =>
        createMockLearningEvent({
          id: `memory-test-event-${i}`,
          userId: `memory-user-${i % 100}`,
        })
      );

      // Process events
      for (let i = 0; i < events.length; i += 100) {
        const batch = events.slice(i, i + 100);
        await Promise.all(batch.map(event => realTimeAnalyticsService.processEvent(event)));

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      });

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerEvent = memoryIncrease / eventCount;

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory per event: ${memoryIncreasePerEvent.toFixed(2)} bytes`);

      // Memory usage should be reasonable
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB increase
      expect(memoryIncreasePerEvent).toBeLessThan(10000); // Less than 10KB per event
    });
  });
});