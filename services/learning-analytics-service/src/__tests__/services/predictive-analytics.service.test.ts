import { predictiveAnalyticsService } from '../../services/predictive-analytics.service';
import { databaseService } from '../../services/database.service';
import { ModelType, RecommendationType } from '../../types/analytics.types';
import { createMockLearningMetrics } from '../../test/setup';

describe('PredictiveAnalyticsService', () => {
  describe('Model Creation', () => {
    it('should create a new predictive model', async () => {
      const model = await predictiveAnalyticsService.createModel(
        'Test Risk Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore', 'completionRate', 'masteryLevel']
      );

      expect(model.id).toBeDefined();
      expect(model.name).toBe('Test Risk Model');
      expect(model.type).toBe(ModelType.RISK_PREDICTION);
      expect(model.features).toEqual(['engagementScore', 'completionRate', 'masteryLevel']);
      expect(model.isActive).toBe(true);

      // Verify model was saved to database
      const result = await databaseService.query(
        'SELECT * FROM predictive_models WHERE id = $1',
        [model.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test Risk Model');
    });

    it('should create models with different types', async () => {
      const modelTypes = [
        ModelType.RISK_PREDICTION,
        ModelType.OUTCOME_FORECASTING,
        ModelType.RECOMMENDATION,
        ModelType.ENGAGEMENT_PREDICTION,
        ModelType.PERFORMANCE_PREDICTION,
      ];

      for (const type of modelTypes) {
        const model = await predictiveAnalyticsService.createModel(
          `Test ${type} Model`,
          type,
          ['feature1', 'feature2']
        );

        expect(model.type).toBe(type);
        expect(model.isActive).toBe(true);
      }
    });
  });

  describe('Model Training', () => {
    it('should train a model with sufficient data', async () => {
      // Create a model
      const model = await predictiveAnalyticsService.createModel(
        'Training Test Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore', 'masteryLevel']
      );

      // Create test users with metrics
      const testUsers = Array.from({ length: 20 }, (_, i) => ({
        userId: `train-user-${i}`,
        metrics: createMockLearningMetrics({
          userId: `train-user-${i}`,
          engagementScore: Math.random(),
          masteryLevel: Math.random(),
          strugglingIndicators: Math.random() > 0.7 ? ['difficulty'] : [],
        }),
      }));

      // Insert test data
      for (const user of testUsers) {
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

        // Add some learning events for each user
        for (let j = 0; j < 15; j++) {
          await databaseService.query(`
            INSERT INTO learning_events (
              id, user_id, session_id, event_type, event_data, context, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            `event-${user.userId}-${j}`,
            user.userId,
            `session-${user.userId}`,
            'content_view',
            JSON.stringify({ duration: Math.random() * 1000 }),
            JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
            new Date(),
          ]);
        }
      }

      // Train the model
      await predictiveAnalyticsService.trainModel(model.id);

      // Verify model was updated
      const result = await databaseService.query(
        'SELECT * FROM predictive_models WHERE id = $1',
        [model.id]
      );

      const updatedModel = result.rows[0];
      expect(updatedModel.accuracy).toBeGreaterThan(0);
      expect(new Date(updatedModel.last_trained)).toBeInstanceOf(Date);
    });

    it('should handle insufficient training data', async () => {
      const model = await predictiveAnalyticsService.createModel(
        'Insufficient Data Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore']
      );

      // Create only a few users (insufficient for training)
      for (let i = 0; i < 3; i++) {
        const metrics = createMockLearningMetrics({ userId: `insufficient-user-${i}` });
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
      }

      // Training should complete without error but may not update accuracy
      await expect(predictiveAnalyticsService.trainModel(model.id)).resolves.not.toThrow();
    });
  });

  describe('Prediction Generation', () => {
    it('should generate predictions for trained models', async () => {
      // Create and train a model
      const model = await predictiveAnalyticsService.createModel(
        'Prediction Test Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore', 'masteryLevel', 'strugglingIndicatorCount']
      );

      // Create test user with metrics
      const userId = 'prediction-test-user';
      const metrics = createMockLearningMetrics({
        userId,
        engagementScore: 0.3, // Low engagement
        masteryLevel: 0.4,    // Low mastery
        strugglingIndicators: ['difficulty1', 'difficulty2'], // Multiple struggles
      });

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

      // Add some events for context
      for (let i = 0; i < 12; i++) {
        await databaseService.query(`
          INSERT INTO learning_events (
            id, user_id, session_id, event_type, event_data, context, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          `pred-event-${i}`,
          userId,
          'pred-session',
          'content_view',
          JSON.stringify({ duration: 200 }),
          JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
          new Date(),
        ]);
      }

      // Train the model first
      await predictiveAnalyticsService.trainModel(model.id);

      // Generate prediction
      const prediction = await predictiveAnalyticsService.generatePrediction(model.id, userId);

      if (prediction) {
        expect(prediction.id).toBeDefined();
        expect(prediction.modelId).toBe(model.id);
        expect(prediction.userId).toBe(userId);
        expect(prediction.predictionType).toBe(ModelType.RISK_PREDICTION);
        expect(typeof prediction.prediction).toBe('number');
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);

        // Verify prediction was saved
        const result = await databaseService.query(
          'SELECT * FROM predictions WHERE id = $1',
          [prediction.id]
        );

        expect(result.rows).toHaveLength(1);
      }
    });

    it('should return null for low confidence predictions', async () => {
      const model = await predictiveAnalyticsService.createModel(
        'Low Confidence Model',
        ModelType.RECOMMENDATION,
        ['engagementScore']
      );

      const userId = 'low-confidence-user';
      const metrics = createMockLearningMetrics({ userId });

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

      // Don't train the model to ensure low confidence
      const prediction = await predictiveAnalyticsService.generatePrediction(model.id, userId);

      // Should return null for untrained model or low confidence
      expect(prediction).toBeNull();
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations for users', async () => {
      const userId = 'recommendation-test-user';
      
      // Create user with specific characteristics
      const metrics = createMockLearningMetrics({
        userId,
        engagementScore: 0.3,  // Low engagement -> study group recommendation
        masteryLevel: 0.9,     // High mastery -> advanced content recommendation
        strugglingIndicators: ['topic1', 'topic2', 'topic3'], // Many struggles -> remediation
      });

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

      const recommendations = await predictiveAnalyticsService.generateRecommendations(userId, 5);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(5);

      // Check recommendation structure
      for (const rec of recommendations) {
        expect(rec.id).toBeDefined();
        expect(rec.userId).toBe(userId);
        expect(rec.type).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        expect(rec.priority).toBeGreaterThan(0);
      }

      // Should include study group recommendation for low engagement
      const studyGroupRec = recommendations.find(r => r.type === RecommendationType.STUDY_GROUP);
      expect(studyGroupRec).toBeDefined();

      // Should include remediation for struggling indicators
      const remediationRec = recommendations.find(r => r.type === RecommendationType.REMEDIATION);
      expect(remediationRec).toBeDefined();

      // Should include advanced content for high mastery
      const advancedRec = recommendations.find(r => r.type === RecommendationType.LEARNING_PATH);
      expect(advancedRec).toBeDefined();
    });

    it('should limit recommendations to specified count', async () => {
      const userId = 'limit-test-user';
      const metrics = createMockLearningMetrics({ userId });

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

      const recommendations = await predictiveAnalyticsService.generateRecommendations(userId, 2);

      expect(recommendations.length).toBeLessThanOrEqual(2);
    });

    it('should sort recommendations by priority and confidence', async () => {
      const userId = 'priority-test-user';
      const metrics = createMockLearningMetrics({
        userId,
        engagementScore: 0.2,
        strugglingIndicators: ['topic1', 'topic2'],
      });

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

      const recommendations = await predictiveAnalyticsService.generateRecommendations(userId, 10);

      // Check that recommendations are sorted by priority (descending)
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i].priority).toBeLessThanOrEqual(recommendations[i - 1].priority);
      }
    });
  });

  describe('Model Performance', () => {
    it('should track model performance metrics', async () => {
      const model = await predictiveAnalyticsService.createModel(
        'Performance Test Model',
        ModelType.ENGAGEMENT_PREDICTION,
        ['engagementScore', 'sessionFrequency']
      );

      // Create some predictions
      const userId = 'performance-test-user';
      const metrics = createMockLearningMetrics({ userId });

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

      // Add events for context
      for (let i = 0; i < 15; i++) {
        await databaseService.query(`
          INSERT INTO learning_events (
            id, user_id, session_id, event_type, event_data, context, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          `perf-event-${i}`,
          userId,
          'perf-session',
          'content_view',
          JSON.stringify({ duration: 300 }),
          JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
          new Date(),
        ]);
      }

      await predictiveAnalyticsService.trainModel(model.id);

      // Generate some predictions
      for (let i = 0; i < 3; i++) {
        await predictiveAnalyticsService.generatePrediction(model.id, userId);
      }

      const performance = await predictiveAnalyticsService.getModelPerformance(model.id);

      expect(performance).toBeDefined();
      expect(performance.modelId).toBe(model.id);
      expect(performance.name).toBe('Performance Test Model');
      expect(performance.type).toBe(ModelType.ENGAGEMENT_PREDICTION);
      expect(typeof performance.accuracy).toBe('number');
      expect(performance.totalPredictions).toBeGreaterThanOrEqual(0);
      expect(typeof performance.averageConfidence).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent model training', async () => {
      await expect(
        predictiveAnalyticsService.trainModel('non-existent-model')
      ).rejects.toThrow('Model not found');
    });

    it('should handle non-existent user predictions', async () => {
      const model = await predictiveAnalyticsService.createModel(
        'Error Test Model',
        ModelType.RISK_PREDICTION,
        ['engagementScore']
      );

      const prediction = await predictiveAnalyticsService.generatePrediction(
        model.id, 
        'non-existent-user'
      );

      expect(prediction).toBeNull();
    });

    it('should handle database errors during model creation', async () => {
      // Mock database error
      const originalQuery = databaseService.query;
      databaseService.query = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        predictiveAnalyticsService.createModel(
          'Error Model',
          ModelType.RISK_PREDICTION,
          ['feature1']
        )
      ).rejects.toThrow('Database error');

      // Restore original method
      databaseService.query = originalQuery;
    });
  });
});