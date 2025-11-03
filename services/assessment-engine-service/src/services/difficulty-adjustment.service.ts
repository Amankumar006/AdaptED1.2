import { 
  Question, 
  Response, 
  DifficultyLevel, 
  AssessmentSubmission 
} from '../types/assessment.types';
import { AdaptiveTestingState } from './adaptive-testing.service';

export interface PerformanceMetrics {
  userId: string;
  correctAnswers: number;
  totalAnswers: number;
  averageResponseTime: number;
  difficultyProgression: DifficultyLevel[];
  abilityEstimate: number;
  confidenceLevel: number;
}

export interface DifficultyAdjustmentStrategy {
  name: string;
  adjustmentFactor: number;
  minDifficultyChange: number;
  maxDifficultyChange: number;
}

export class DifficultyAdjustmentService {
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();
  
  // Predefined adjustment strategies
  private strategies: Map<string, DifficultyAdjustmentStrategy> = new Map([
    ['conservative', {
      name: 'Conservative',
      adjustmentFactor: 0.3,
      minDifficultyChange: 0.1,
      maxDifficultyChange: 0.5
    }],
    ['moderate', {
      name: 'Moderate',
      adjustmentFactor: 0.5,
      minDifficultyChange: 0.2,
      maxDifficultyChange: 0.8
    }],
    ['aggressive', {
      name: 'Aggressive',
      adjustmentFactor: 0.8,
      minDifficultyChange: 0.3,
      maxDifficultyChange: 1.2
    }]
  ]);

  /**
   * Adjust difficulty based on user performance
   */
  adjustDifficultyBasedOnPerformance(
    userId: string,
    currentDifficulty: DifficultyLevel,
    recentResponses: Response[],
    strategyName: string = 'moderate'
  ): DifficultyLevel {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown difficulty adjustment strategy: ${strategyName}`);
    }

    const performance = this.calculatePerformanceMetrics(userId, recentResponses);
    const currentDifficultyValue = this.difficultyToNumeric(currentDifficulty);
    
    // Calculate adjustment based on performance
    let adjustment = 0;
    
    // Accuracy-based adjustment
    const accuracyTarget = 0.7; // Target 70% accuracy
    const accuracyDifference = performance.correctAnswers / performance.totalAnswers - accuracyTarget;
    adjustment += accuracyDifference * strategy.adjustmentFactor;
    
    // Response time-based adjustment
    const expectedTime = this.getExpectedResponseTime(currentDifficulty);
    const timeRatio = performance.averageResponseTime / expectedTime;
    
    if (timeRatio < 0.5) {
      // Too fast, might be too easy
      adjustment += 0.2 * strategy.adjustmentFactor;
    } else if (timeRatio > 2.0) {
      // Too slow, might be too hard
      adjustment -= 0.2 * strategy.adjustmentFactor;
    }
    
    // Apply bounds
    adjustment = Math.max(-strategy.maxDifficultyChange, 
                         Math.min(strategy.maxDifficultyChange, adjustment));
    
    if (Math.abs(adjustment) < strategy.minDifficultyChange) {
      adjustment = 0; // No change if adjustment is too small
    }
    
    const newDifficultyValue = Math.max(0, Math.min(3, currentDifficultyValue + adjustment));
    return this.numericToDifficulty(newDifficultyValue);
  }

  /**
   * Get optimal difficulty for next question based on adaptive testing state
   */
  getOptimalDifficulty(
    adaptiveState: AdaptiveTestingState,
    targetAccuracy: number = 0.7
  ): DifficultyLevel {
    // Convert ability estimate to difficulty level
    const abilityToDifficulty = this.mapAbilityToDifficulty(adaptiveState.currentAbility);
    
    // Adjust based on confidence level
    let adjustment = 0;
    
    if (adaptiveState.confidenceLevel < 0.5) {
      // Low confidence, slightly easier question
      adjustment = -0.2;
    } else if (adaptiveState.confidenceLevel > 0.8) {
      // High confidence, slightly harder question
      adjustment = 0.2;
    }
    
    // Consider recent performance trend
    if (adaptiveState.abilityHistory.length >= 3) {
      const recentTrend = this.calculateTrend(adaptiveState.abilityHistory.slice(-3));
      adjustment += recentTrend * 0.1;
    }
    
    const adjustedDifficulty = this.difficultyToNumeric(abilityToDifficulty) + adjustment;
    const boundedDifficulty = Math.max(0, Math.min(3, adjustedDifficulty));
    
    return this.numericToDifficulty(boundedDifficulty);
  }

  /**
   * Analyze performance patterns and suggest difficulty adjustments
   */
  analyzePerformancePatterns(userId: string): {
    currentLevel: DifficultyLevel;
    suggestedLevel: DifficultyLevel;
    confidence: number;
    reasoning: string[];
  } {
    const history = this.performanceHistory.get(userId) || [];
    
    if (history.length === 0) {
      return {
        currentLevel: DifficultyLevel.INTERMEDIATE,
        suggestedLevel: DifficultyLevel.INTERMEDIATE,
        confidence: 0,
        reasoning: ['No performance history available']
      };
    }
    
    const recent = history.slice(-5); // Last 5 assessments
    const avgAccuracy = recent.reduce((sum, p) => sum + (p.correctAnswers / p.totalAnswers), 0) / recent.length;
    const avgResponseTime = recent.reduce((sum, p) => sum + p.averageResponseTime, 0) / recent.length;
    const avgAbility = recent.reduce((sum, p) => sum + p.abilityEstimate, 0) / recent.length;
    
    const currentLevel = this.mapAbilityToDifficulty(avgAbility);
    let suggestedLevel = currentLevel;
    const reasoning: string[] = [];
    
    // Accuracy-based suggestions
    if (avgAccuracy > 0.85) {
      suggestedLevel = this.increaseDifficulty(currentLevel);
      reasoning.push(`High accuracy (${(avgAccuracy * 100).toFixed(1)}%) suggests readiness for harder content`);
    } else if (avgAccuracy < 0.5) {
      suggestedLevel = this.decreaseDifficulty(currentLevel);
      reasoning.push(`Low accuracy (${(avgAccuracy * 100).toFixed(1)}%) suggests need for easier content`);
    }
    
    // Response time analysis
    const expectedTime = this.getExpectedResponseTime(currentLevel);
    if (avgResponseTime < expectedTime * 0.6) {
      reasoning.push('Fast response times indicate good mastery');
      if (suggestedLevel === currentLevel) {
        suggestedLevel = this.increaseDifficulty(currentLevel);
      }
    } else if (avgResponseTime > expectedTime * 1.5) {
      reasoning.push('Slow response times may indicate difficulty');
      if (suggestedLevel === currentLevel) {
        suggestedLevel = this.decreaseDifficulty(currentLevel);
      }
    }
    
    // Calculate confidence based on consistency
    const abilityVariance = this.calculateVariance(recent.map(p => p.abilityEstimate));
    const confidence = Math.max(0, 1 - abilityVariance);
    
    return {
      currentLevel,
      suggestedLevel,
      confidence,
      reasoning
    };
  }

  /**
   * Update performance history for a user
   */
  updatePerformanceHistory(
    userId: string,
    responses: Response[],
    abilityEstimate: number,
    confidenceLevel: number
  ): void {
    const metrics = this.calculatePerformanceMetrics(userId, responses);
    metrics.abilityEstimate = abilityEstimate;
    metrics.confidenceLevel = confidenceLevel;
    
    const history = this.performanceHistory.get(userId) || [];
    history.push(metrics);
    
    // Keep only last 20 assessments
    if (history.length > 20) {
      history.shift();
    }
    
    this.performanceHistory.set(userId, history);
  }

  /**
   * Get performance trends for a user
   */
  getPerformanceTrends(userId: string): {
    accuracyTrend: number;
    speedTrend: number;
    difficultyTrend: number;
    abilityTrend: number;
  } {
    const history = this.performanceHistory.get(userId) || [];
    
    if (history.length < 2) {
      return {
        accuracyTrend: 0,
        speedTrend: 0,
        difficultyTrend: 0,
        abilityTrend: 0
      };
    }
    
    const accuracies = history.map(h => h.correctAnswers / h.totalAnswers);
    const speeds = history.map(h => h.averageResponseTime);
    const abilities = history.map(h => h.abilityEstimate);
    const difficulties = history.map(h => 
      h.difficultyProgression.length > 0 ? 
      this.difficultyToNumeric(h.difficultyProgression[h.difficultyProgression.length - 1]) : 1
    );
    
    return {
      accuracyTrend: this.calculateTrend(accuracies),
      speedTrend: this.calculateTrend(speeds),
      difficultyTrend: this.calculateTrend(difficulties),
      abilityTrend: this.calculateTrend(abilities)
    };
  }

  /**
   * Calculate performance metrics from responses
   */
  private calculatePerformanceMetrics(userId: string, responses: Response[]): PerformanceMetrics {
    const correctAnswers = responses.filter(r => r.confidence && r.confidence > 0.5).length;
    const totalAnswers = responses.length;
    const averageResponseTime = responses.reduce((sum, r) => sum + r.timeSpent, 0) / Math.max(1, totalAnswers);
    
    return {
      userId,
      correctAnswers,
      totalAnswers,
      averageResponseTime,
      difficultyProgression: [], // Would be populated from question difficulties
      abilityEstimate: 0, // Will be set by caller
      confidenceLevel: 0  // Will be set by caller
    };
  }

  /**
   * Convert difficulty level to numeric value
   */
  private difficultyToNumeric(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER: return 0;
      case DifficultyLevel.INTERMEDIATE: return 1;
      case DifficultyLevel.ADVANCED: return 2;
      case DifficultyLevel.EXPERT: return 3;
      default: return 1;
    }
  }

  /**
   * Convert numeric value to difficulty level
   */
  private numericToDifficulty(value: number): DifficultyLevel {
    const rounded = Math.round(value);
    switch (rounded) {
      case 0: return DifficultyLevel.BEGINNER;
      case 1: return DifficultyLevel.INTERMEDIATE;
      case 2: return DifficultyLevel.ADVANCED;
      case 3: return DifficultyLevel.EXPERT;
      default: return DifficultyLevel.INTERMEDIATE;
    }
  }

  /**
   * Map ability estimate to difficulty level
   */
  private mapAbilityToDifficulty(ability: number): DifficultyLevel {
    if (ability < -1.0) return DifficultyLevel.BEGINNER;
    if (ability < 0.5) return DifficultyLevel.INTERMEDIATE;
    if (ability < 1.5) return DifficultyLevel.ADVANCED;
    return DifficultyLevel.EXPERT;
  }

  /**
   * Get expected response time for difficulty level
   */
  private getExpectedResponseTime(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER: return 30000; // 30 seconds
      case DifficultyLevel.INTERMEDIATE: return 60000; // 1 minute
      case DifficultyLevel.ADVANCED: return 120000; // 2 minutes
      case DifficultyLevel.EXPERT: return 180000; // 3 minutes
      default: return 60000;
    }
  }

  /**
   * Increase difficulty level by one step
   */
  private increaseDifficulty(current: DifficultyLevel): DifficultyLevel {
    switch (current) {
      case DifficultyLevel.BEGINNER: return DifficultyLevel.INTERMEDIATE;
      case DifficultyLevel.INTERMEDIATE: return DifficultyLevel.ADVANCED;
      case DifficultyLevel.ADVANCED: return DifficultyLevel.EXPERT;
      case DifficultyLevel.EXPERT: return DifficultyLevel.EXPERT;
      default: return current;
    }
  }

  /**
   * Decrease difficulty level by one step
   */
  private decreaseDifficulty(current: DifficultyLevel): DifficultyLevel {
    switch (current) {
      case DifficultyLevel.BEGINNER: return DifficultyLevel.BEGINNER;
      case DifficultyLevel.INTERMEDIATE: return DifficultyLevel.BEGINNER;
      case DifficultyLevel.ADVANCED: return DifficultyLevel.INTERMEDIATE;
      case DifficultyLevel.EXPERT: return DifficultyLevel.ADVANCED;
      default: return current;
    }
  }

  /**
   * Calculate trend (slope) of a series of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    
    return variance;
  }
}