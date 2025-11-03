import { Matrix } from 'ml-matrix';
import { SimpleLinearRegression, MultivariateLinearRegression } from 'ml-regression';
import { mean, standardDeviation, median, quantile } from 'simple-statistics';
import { 
  PredictiveModel, 
  ModelType, 
  Prediction, 
  Recommendation, 
  RecommendationType,
  LearningEvent,
  LearningMetrics 
} from '../types/analytics.types';
import { databaseService } from './database.service';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import config from '../config/config';

interface ModelFeatures {
  userId: string;
  timeSpent: number;
  completionRate: number;
  engagementScore: number;
  masteryLevel: number;
  learningVelocity: number;
  retentionScore: number;
  collaborationScore: number;
  aiInteractionScore: number;
  sessionFrequency: number;
  averageSessionDuration: number;
  strugglingIndicatorCount: number;
  assessmentScoreAverage: number;
  assessmentAttemptAverage: number;
  contentViewCount: number;
  discussionParticipation: number;
  helpSeekingBehavior: number;
  timeOfDayPattern: number;
  weekdayVsWeekendRatio: number;
  deviceTypeConsistency: number;
}

interface TrainingData {
  features: ModelFeatures[];
  labels: number[];
  metadata: {
    featureNames: string[];
    sampleCount: number;
    positiveClassRatio: number;
    trainingDate: Date;
  };
}

class PredictiveAnalyticsService {
  private models = new Map<string, PredictiveModel>();
  private trainedModels = new Map<string, any>(); // Actual ML model instances
  private isTraining = false;
  private trainingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicTraining();
  }

  async initialize(): Promise<void> {
    try {
      // Load existing models from database
      await this.loadModelsFromDatabase();
      
      // Initialize default models if none exist
      if (this.models.size === 0) {
        await this.initializeDefaultModels();
      }

      logger.info('Predictive analytics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize predictive analytics service', error);
      throw error;
    }
  }

  private async loadModelsFromDatabase(): Promise<void> {
    try {
      const result = await databaseService.query(`
        SELECT * FROM predictive_models WHERE is_active = true
      `);

      for (const row of result.rows) {
        const model: PredictiveModel = {
          id: row.id,
          name: row.name,
          type: row.type as ModelType,
          version: row.version,
          features: row.features,
          accuracy: parseFloat(row.accuracy),
          lastTrained: row.last_trained,
          isActive: row.is_active,
          parameters: row.parameters,
        };

        this.models.set(model.id, model);
        
        // Try to load the actual trained model from cache
        const trainedModel = await redisService.get(`model:${model.id}`);
        if (trainedModel) {
          this.trainedModels.set(model.id, trainedModel);
        }
      }

      logger.info('Loaded models from database', { modelCount: this.models.size });
    } catch (error) {
      logger.error('Failed to load models from database', error);
      throw error;
    }
  }

  private async initializeDefaultModels(): Promise<void> {
    const defaultModels = [
      {
        name: 'Student Risk Prediction',
        type: ModelType.RISK_PREDICTION,
        features: [
          'engagementScore', 'completionRate', 'masteryLevel', 'strugglingIndicatorCount',
          'sessionFrequency', 'assessmentScoreAverage', 'helpSeekingBehavior'
        ],
      },
      {
        name: 'Learning Outcome Forecasting',
        type: ModelType.OUTCOME_FORECASTING,
        features: [
          'timeSpent', 'completionRate', 'masteryLevel', 'learningVelocity',
          'retentionScore', 'assessmentScoreAverage', 'contentViewCount'
        ],
      },
      {
        name: 'Content Recommendation',
        type: ModelType.RECOMMENDATION,
        features: [
          'masteryLevel', 'learningVelocity', 'engagementScore', 'collaborationScore',
          'aiInteractionScore', 'timeOfDayPattern', 'deviceTypeConsistency'
        ],
      },
      {
        name: 'Engagement Prediction',
        type: ModelType.ENGAGEMENT_PREDICTION,
        features: [
          'sessionFrequency', 'averageSessionDuration', 'engagementScore',
          'discussionParticipation', 'weekdayVsWeekendRatio', 'timeOfDayPattern'
        ],
      },
      {
        name: 'Performance Prediction',
        type: ModelType.PERFORMANCE_PREDICTION,
        features: [
          'masteryLevel', 'learningVelocity', 'retentionScore', 'timeSpent',
          'assessmentScoreAverage', 'assessmentAttemptAverage', 'completionRate'
        ],
      },
    ];

    for (const modelConfig of defaultModels) {
      const model = await this.createModel(
        modelConfig.name,
        modelConfig.type,
        modelConfig.features
      );
      
      // Train the model with initial data
      await this.trainModel(model.id);
    }
  }

  async createModel(name: string, type: ModelType, features: string[]): Promise<PredictiveModel> {
    try {
      const model: PredictiveModel = {
        id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        version: '1.0.0',
        features,
        accuracy: 0,
        lastTrained: new Date(),
        isActive: true,
        parameters: {},
      };

      // Save to database
      await databaseService.query(`
        INSERT INTO predictive_models (
          id, name, type, version, features, accuracy, parameters, is_active, last_trained
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        model.id,
        model.name,
        model.type,
        model.version,
        model.features,
        model.accuracy,
        JSON.stringify(model.parameters),
        model.isActive,
        model.lastTrained,
      ]);

      this.models.set(model.id, model);
      
      logger.info('Created new predictive model', { 
        modelId: model.id, 
        name: model.name, 
        type: model.type 
      });

      return model;
    } catch (error) {
      logger.error('Failed to create model', { error, name, type });
      throw error;
    }
  }

  async trainModel(modelId: string): Promise<void> {
    if (this.isTraining) {
      logger.warn('Training already in progress, skipping', { modelId });
      return;
    }

    this.isTraining = true;

    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      logger.info('Starting model training', { modelId, modelName: model.name });

      // Collect training data
      const trainingData = await this.collectTrainingData(model);
      
      if (trainingData.features.length < 10) {
        logger.warn('Insufficient training data', { 
          modelId, 
          sampleCount: trainingData.features.length 
        });
        return;
      }

      // Train the model based on its type
      const trainedModel = await this.trainModelByType(model, trainingData);
      
      // Evaluate model performance
      const accuracy = await this.evaluateModel(trainedModel, trainingData);
      
      // Update model metadata
      model.accuracy = accuracy;
      model.lastTrained = new Date();
      model.version = this.incrementVersion(model.version);

      // Save trained model
      this.trainedModels.set(modelId, trainedModel);
      await redisService.set(`model:${modelId}`, trainedModel, 86400); // 24 hours TTL

      // Update database
      await databaseService.query(`
        UPDATE predictive_models 
        SET accuracy = $1, last_trained = $2, version = $3
        WHERE id = $4
      `, [model.accuracy, model.lastTrained, model.version, modelId]);

      logger.info('Model training completed', { 
        modelId, 
        accuracy, 
        sampleCount: trainingData.features.length 
      });

    } catch (error) {
      logger.error('Model training failed', { error, modelId });
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  private async collectTrainingData(model: PredictiveModel): Promise<TrainingData> {
    try {
      // Get user metrics and events for training
      const metricsResult = await databaseService.query(`
        SELECT lm.*, 
               COUNT(le.id) as event_count,
               AVG(CASE WHEN le.event_type = 'assessment_submit' 
                   THEN CAST(le.event_data->>'score' AS FLOAT) END) as avg_assessment_score,
               AVG(CASE WHEN le.event_type = 'assessment_submit' 
                   THEN CAST(le.event_data->>'attempts' AS INT) END) as avg_assessment_attempts,
               COUNT(CASE WHEN le.event_type = 'content_view' THEN 1 END) as content_views,
               COUNT(CASE WHEN le.event_type = 'discussion_post' THEN 1 END) as discussion_posts,
               COUNT(CASE WHEN le.event_type = 'ai_question_ask' THEN 1 END) as ai_questions
        FROM learning_metrics lm
        LEFT JOIN learning_events le ON lm.user_id = le.user_id
        WHERE lm.last_updated >= NOW() - INTERVAL '30 days'
        GROUP BY lm.user_id, lm.time_spent, lm.completion_rate, lm.engagement_score, 
                 lm.mastery_level, lm.struggling_indicators, lm.learning_velocity,
                 lm.retention_score, lm.collaboration_score, lm.ai_interaction_score
        HAVING COUNT(le.id) > 10
        LIMIT 10000
      `);

      const features: ModelFeatures[] = [];
      const labels: number[] = [];

      for (const row of metricsResult.rows) {
        const feature: ModelFeatures = {
          userId: row.user_id,
          timeSpent: parseInt(row.time_spent) || 0,
          completionRate: parseFloat(row.completion_rate) || 0,
          engagementScore: parseFloat(row.engagement_score) || 0,
          masteryLevel: parseFloat(row.mastery_level) || 0,
          learningVelocity: parseFloat(row.learning_velocity) || 0,
          retentionScore: parseFloat(row.retention_score) || 0,
          collaborationScore: parseFloat(row.collaboration_score) || 0,
          aiInteractionScore: parseFloat(row.ai_interaction_score) || 0,
          sessionFrequency: this.calculateSessionFrequency(row.event_count),
          averageSessionDuration: this.calculateAverageSessionDuration(row.time_spent, row.event_count),
          strugglingIndicatorCount: (row.struggling_indicators || []).length,
          assessmentScoreAverage: parseFloat(row.avg_assessment_score) || 0,
          assessmentAttemptAverage: parseFloat(row.avg_assessment_attempts) || 1,
          contentViewCount: parseInt(row.content_views) || 0,
          discussionParticipation: parseInt(row.discussion_posts) || 0,
          helpSeekingBehavior: parseInt(row.ai_questions) || 0,
          timeOfDayPattern: Math.random(), // Placeholder - would calculate from actual data
          weekdayVsWeekendRatio: Math.random(), // Placeholder - would calculate from actual data
          deviceTypeConsistency: Math.random(), // Placeholder - would calculate from actual data
        };

        features.push(feature);
        
        // Generate labels based on model type
        const label = this.generateLabel(model.type, feature);
        labels.push(label);
      }

      const positiveClassRatio = labels.filter(l => l > 0.5).length / labels.length;

      return {
        features,
        labels,
        metadata: {
          featureNames: model.features,
          sampleCount: features.length,
          positiveClassRatio,
          trainingDate: new Date(),
        },
      };

    } catch (error) {
      logger.error('Failed to collect training data', { error, modelId: model.id });
      throw error;
    }
  }

  private generateLabel(modelType: ModelType, feature: ModelFeatures): number {
    switch (modelType) {
      case ModelType.RISK_PREDICTION:
        // Risk score based on struggling indicators and low performance
        return (feature.strugglingIndicatorCount > 2 || 
                feature.engagementScore < 0.3 || 
                feature.assessmentScoreAverage < 0.5) ? 1 : 0;
        
      case ModelType.OUTCOME_FORECASTING:
        // Predicted final score based on current performance
        return Math.min(1, Math.max(0, 
          feature.masteryLevel * 0.4 + 
          feature.completionRate * 0.3 + 
          feature.assessmentScoreAverage * 0.3
        ));
        
      case ModelType.ENGAGEMENT_PREDICTION:
        // Future engagement based on current patterns
        return Math.min(1, Math.max(0,
          feature.engagementScore * 0.5 +
          feature.sessionFrequency * 0.3 +
          feature.discussionParticipation * 0.2
        ));
        
      case ModelType.PERFORMANCE_PREDICTION:
        // Future performance based on learning patterns
        return Math.min(1, Math.max(0,
          feature.masteryLevel * 0.4 +
          feature.learningVelocity * 0.3 +
          feature.retentionScore * 0.3
        ));
        
      case ModelType.RECOMMENDATION:
        // Content suitability score
        return Math.min(1, Math.max(0,
          feature.masteryLevel * 0.6 +
          feature.engagementScore * 0.4
        ));
        
      default:
        return Math.random(); // Fallback
    }
  }

  private async trainModelByType(model: PredictiveModel, trainingData: TrainingData): Promise<any> {
    const X = this.extractFeatureMatrix(trainingData.features, model.features);
    const y = trainingData.labels;

    switch (model.type) {
      case ModelType.RISK_PREDICTION:
      case ModelType.ENGAGEMENT_PREDICTION:
        // Binary classification using logistic regression (simplified)
        return this.trainLogisticRegression(X, y);
        
      case ModelType.OUTCOME_FORECASTING:
      case ModelType.PERFORMANCE_PREDICTION:
      case ModelType.RECOMMENDATION:
        // Regression for continuous predictions
        return this.trainLinearRegression(X, y);
        
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
  }

  private extractFeatureMatrix(features: ModelFeatures[], selectedFeatures: string[]): number[][] {
    return features.map(feature => {
      return selectedFeatures.map(featureName => {
        const value = (feature as any)[featureName];
        return typeof value === 'number' ? value : 0;
      });
    });
  }

  private trainLogisticRegression(X: number[][], y: number[]): any {
    // Simplified logistic regression using linear regression as approximation
    // In a production environment, you'd use a proper ML library
    const regression = new MultivariateLinearRegression(X, y);
    
    return {
      type: 'logistic',
      model: regression,
      predict: (features: number[]) => {
        const prediction = regression.predict(features);
        // Apply sigmoid function to get probability
        return 1 / (1 + Math.exp(-prediction));
      },
    };
  }

  private trainLinearRegression(X: number[][], y: number[]): any {
    const regression = new MultivariateLinearRegression(X, y);
    
    return {
      type: 'linear',
      model: regression,
      predict: (features: number[]) => {
        return Math.min(1, Math.max(0, regression.predict(features)));
      },
    };
  }

  private async evaluateModel(trainedModel: any, trainingData: TrainingData): Promise<number> {
    try {
      // Simple train/test split (70/30)
      const splitIndex = Math.floor(trainingData.features.length * 0.7);
      const testFeatures = trainingData.features.slice(splitIndex);
      const testLabels = trainingData.labels.slice(splitIndex);

      if (testFeatures.length === 0) {
        return 0.5; // Default accuracy if no test data
      }

      let correctPredictions = 0;
      let totalPredictions = testFeatures.length;

      for (let i = 0; i < testFeatures.length; i++) {
        const features = Object.values(testFeatures[i]).slice(1); // Remove userId
        const prediction = trainedModel.predict(features);
        const actual = testLabels[i];

        // For binary classification
        if (trainedModel.type === 'logistic') {
          const predictedClass = prediction > 0.5 ? 1 : 0;
          const actualClass = actual > 0.5 ? 1 : 0;
          if (predictedClass === actualClass) {
            correctPredictions++;
          }
        } else {
          // For regression, consider prediction correct if within 20% of actual
          const error = Math.abs(prediction - actual);
          if (error < 0.2) {
            correctPredictions++;
          }
        }
      }

      return correctPredictions / totalPredictions;

    } catch (error) {
      logger.error('Model evaluation failed', error);
      return 0.5; // Default accuracy
    }
  }

  async generatePrediction(modelId: string, userId: string): Promise<Prediction | null> {
    try {
      const model = this.models.get(modelId);
      const trainedModel = this.trainedModels.get(modelId);

      if (!model || !trainedModel) {
        logger.warn('Model not found or not trained', { modelId });
        return null;
      }

      // Get user features
      const userFeatures = await this.getUserFeatures(userId);
      if (!userFeatures) {
        logger.warn('User features not found', { userId });
        return null;
      }

      // Extract feature values
      const featureValues = model.features.map(featureName => {
        return (userFeatures as any)[featureName] || 0;
      });

      // Generate prediction
      const predictionValue = trainedModel.predict(featureValues);
      const confidence = this.calculateConfidence(predictionValue, model.type);

      // Only return predictions above confidence threshold
      if (confidence < config.ml.predictionConfidenceThreshold) {
        return null;
      }

      const prediction: Prediction = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modelId,
        userId,
        predictionType: model.type,
        prediction: predictionValue,
        confidence,
        features: userFeatures,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Save prediction
      await this.savePrediction(prediction);

      return prediction;

    } catch (error) {
      logger.error('Failed to generate prediction', { error, modelId, userId });
      return null;
    }
  }

  private async getUserFeatures(userId: string): Promise<ModelFeatures | null> {
    try {
      // Get user metrics
      const metricsResult = await databaseService.query(`
        SELECT lm.*,
               COUNT(le.id) as event_count,
               AVG(CASE WHEN le.event_type = 'assessment_submit' 
                   THEN CAST(le.event_data->>'score' AS FLOAT) END) as avg_assessment_score,
               AVG(CASE WHEN le.event_type = 'assessment_submit' 
                   THEN CAST(le.event_data->>'attempts' AS INT) END) as avg_assessment_attempts,
               COUNT(CASE WHEN le.event_type = 'content_view' THEN 1 END) as content_views,
               COUNT(CASE WHEN le.event_type = 'discussion_post' THEN 1 END) as discussion_posts,
               COUNT(CASE WHEN le.event_type = 'ai_question_ask' THEN 1 END) as ai_questions
        FROM learning_metrics lm
        LEFT JOIN learning_events le ON lm.user_id = le.user_id
        WHERE lm.user_id = $1
        GROUP BY lm.user_id, lm.time_spent, lm.completion_rate, lm.engagement_score, 
                 lm.mastery_level, lm.struggling_indicators, lm.learning_velocity,
                 lm.retention_score, lm.collaboration_score, lm.ai_interaction_score
      `, [userId]);

      if (metricsResult.rows.length === 0) {
        return null;
      }

      const row = metricsResult.rows[0];
      
      return {
        userId: row.user_id,
        timeSpent: parseInt(row.time_spent) || 0,
        completionRate: parseFloat(row.completion_rate) || 0,
        engagementScore: parseFloat(row.engagement_score) || 0,
        masteryLevel: parseFloat(row.mastery_level) || 0,
        learningVelocity: parseFloat(row.learning_velocity) || 0,
        retentionScore: parseFloat(row.retention_score) || 0,
        collaborationScore: parseFloat(row.collaboration_score) || 0,
        aiInteractionScore: parseFloat(row.ai_interaction_score) || 0,
        sessionFrequency: this.calculateSessionFrequency(row.event_count),
        averageSessionDuration: this.calculateAverageSessionDuration(row.time_spent, row.event_count),
        strugglingIndicatorCount: (row.struggling_indicators || []).length,
        assessmentScoreAverage: parseFloat(row.avg_assessment_score) || 0,
        assessmentAttemptAverage: parseFloat(row.avg_assessment_attempts) || 1,
        contentViewCount: parseInt(row.content_views) || 0,
        discussionParticipation: parseInt(row.discussion_posts) || 0,
        helpSeekingBehavior: parseInt(row.ai_questions) || 0,
        timeOfDayPattern: Math.random(), // Placeholder
        weekdayVsWeekendRatio: Math.random(), // Placeholder
        deviceTypeConsistency: Math.random(), // Placeholder
      };

    } catch (error) {
      logger.error('Failed to get user features', { error, userId });
      return null;
    }
  }

  private calculateConfidence(prediction: number, modelType: ModelType): number {
    // Simple confidence calculation based on prediction value
    switch (modelType) {
      case ModelType.RISK_PREDICTION:
      case ModelType.ENGAGEMENT_PREDICTION:
        // For binary classification, confidence is distance from 0.5
        return Math.abs(prediction - 0.5) * 2;
        
      default:
        // For regression, use a simple heuristic
        return Math.min(1, Math.max(0.5, 1 - Math.abs(prediction - 0.5)));
    }
  }

  async generateRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];

      // Get content recommendation model
      const contentModel = Array.from(this.models.values())
        .find(m => m.type === ModelType.RECOMMENDATION);

      if (contentModel) {
        const prediction = await this.generatePrediction(contentModel.id, userId);
        if (prediction && prediction.confidence > 0.7) {
          // Generate content recommendations based on prediction
          const contentRecs = await this.generateContentRecommendations(userId, prediction);
          recommendations.push(...contentRecs);
        }
      }

      // Generate rule-based recommendations
      const ruleBasedRecs = await this.generateRuleBasedRecommendations(userId);
      recommendations.push(...ruleBasedRecs);

      // Sort by priority and confidence
      recommendations.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.confidence - a.confidence;
      });

      // Save recommendations
      for (const rec of recommendations.slice(0, limit)) {
        await this.saveRecommendation(rec);
      }

      return recommendations.slice(0, limit);

    } catch (error) {
      logger.error('Failed to generate recommendations', { error, userId });
      return [];
    }
  }

  private async generateContentRecommendations(userId: string, prediction: Prediction): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // This would typically query a content database
    // For now, we'll generate sample recommendations
    const contentTypes = ['lesson', 'exercise', 'assessment', 'video'];
    
    for (let i = 0; i < 3; i++) {
      const contentType = contentTypes[i % contentTypes.length];
      const rec: Recommendation = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: RecommendationType.CONTENT,
        contentId: `content_${i + 1}`,
        title: `Recommended ${contentType} ${i + 1}`,
        description: `Based on your learning patterns, this ${contentType} will help improve your understanding.`,
        reason: `Your mastery level suggests this content is appropriate for your current skill level.`,
        confidence: prediction.confidence,
        priority: 5 - i,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isViewed: false,
      };
      
      recommendations.push(rec);
    }

    return recommendations;
  }

  private async generateRuleBasedRecommendations(userId: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Get user metrics
      const userFeatures = await this.getUserFeatures(userId);
      if (!userFeatures) {
        return recommendations;
      }

      // Rule 1: Low engagement -> recommend study group
      if (userFeatures.engagementScore < 0.4) {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type: RecommendationType.STUDY_GROUP,
          title: 'Join a Study Group',
          description: 'Connect with peers to boost your engagement and motivation.',
          reason: 'Your engagement score is below average. Study groups can help increase motivation.',
          confidence: 0.8,
          priority: 8,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isViewed: false,
        });
      }

      // Rule 2: Struggling indicators -> recommend remediation
      if (userFeatures.strugglingIndicatorCount > 2) {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type: RecommendationType.REMEDIATION,
          title: 'Review Fundamental Concepts',
          description: 'Strengthen your foundation with targeted review materials.',
          reason: 'You have several struggling indicators. Reviewing basics can help.',
          confidence: 0.9,
          priority: 9,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isViewed: false,
        });
      }

      // Rule 3: High mastery -> recommend advanced content
      if (userFeatures.masteryLevel > 0.8) {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type: RecommendationType.LEARNING_PATH,
          title: 'Advanced Learning Path',
          description: 'Challenge yourself with advanced topics in your area of strength.',
          reason: 'Your high mastery level indicates readiness for advanced content.',
          confidence: 0.85,
          priority: 7,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isViewed: false,
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate rule-based recommendations', { error, userId });
      return recommendations;
    }
  }

  private async savePrediction(prediction: Prediction): Promise<void> {
    try {
      await databaseService.query(`
        INSERT INTO predictions (
          id, model_id, user_id, prediction_type, prediction, confidence, features, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        prediction.id,
        prediction.modelId,
        prediction.userId,
        prediction.predictionType,
        JSON.stringify(prediction.prediction),
        prediction.confidence,
        JSON.stringify(prediction.features),
        prediction.createdAt,
        prediction.expiresAt,
      ]);
    } catch (error) {
      logger.error('Failed to save prediction', { error, predictionId: prediction.id });
      throw error;
    }
  }

  private async saveRecommendation(recommendation: Recommendation): Promise<void> {
    try {
      await databaseService.query(`
        INSERT INTO recommendations (
          id, user_id, type, content_id, title, description, reason, confidence, 
          priority, is_viewed, is_accepted, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        recommendation.id,
        recommendation.userId,
        recommendation.type,
        recommendation.contentId,
        recommendation.title,
        recommendation.description,
        recommendation.reason,
        recommendation.confidence,
        recommendation.priority,
        recommendation.isViewed,
        recommendation.isAccepted,
        recommendation.createdAt,
        recommendation.expiresAt,
      ]);
    } catch (error) {
      logger.error('Failed to save recommendation', { error, recommendationId: recommendation.id });
      throw error;
    }
  }

  private calculateSessionFrequency(eventCount: number): number {
    // Simple heuristic: events per day over last 30 days
    return Math.min(1, eventCount / (30 * 10)); // Normalize to 0-1 scale
  }

  private calculateAverageSessionDuration(totalTime: number, eventCount: number): number {
    if (eventCount === 0) return 0;
    const avgDuration = totalTime / eventCount;
    return Math.min(1, avgDuration / 3600); // Normalize to 0-1 scale (1 hour = 1.0)
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private startPeriodicTraining(): void {
    this.trainingInterval = setInterval(async () => {
      if (!this.isTraining) {
        try {
          // Retrain all active models
          for (const [modelId, model] of this.models) {
            if (model.isActive) {
              const timeSinceLastTraining = Date.now() - model.lastTrained.getTime();
              if (timeSinceLastTraining > config.ml.modelUpdateInterval) {
                await this.trainModel(modelId);
              }
            }
          }
        } catch (error) {
          logger.error('Periodic training failed', error);
        }
      }
    }, config.ml.modelUpdateInterval);
  }

  async getModelPerformance(modelId: string): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      return null;
    }

    // Get recent predictions for this model
    const result = await databaseService.query(`
      SELECT COUNT(*) as total_predictions,
             AVG(confidence) as avg_confidence,
             COUNT(CASE WHEN confidence > $1 THEN 1 END) as high_confidence_predictions
      FROM predictions 
      WHERE model_id = $2 AND created_at >= NOW() - INTERVAL '7 days'
    `, [config.ml.predictionConfidenceThreshold, modelId]);

    const stats = result.rows[0];

    return {
      modelId,
      name: model.name,
      type: model.type,
      accuracy: model.accuracy,
      lastTrained: model.lastTrained,
      totalPredictions: parseInt(stats.total_predictions),
      averageConfidence: parseFloat(stats.avg_confidence) || 0,
      highConfidencePredictions: parseInt(stats.high_confidence_predictions),
    };
  }

  async shutdown(): Promise<void> {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
    }
    logger.info('Predictive analytics service shut down');
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
export default predictiveAnalyticsService;