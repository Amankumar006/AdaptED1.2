import { 
  Question, 
  Response, 
  DifficultyLevel, 
  AdaptiveTestingConfig,
  ItemResponseTheoryParams,
  AssessmentSubmission
} from '../types/assessment.types';
import { QuestionBankService } from './question-bank.service';

export interface AdaptiveTestingState {
  userId: string;
  assessmentId: string;
  currentAbility: number; // theta parameter in IRT
  abilityHistory: number[];
  questionsAsked: string[];
  responses: Response[];
  confidenceLevel: number;
  isComplete: boolean;
  nextQuestionId?: string;
  estimatedCompletion: number; // percentage
}

export interface QuestionSelectionCriteria {
  targetDifficulty: number;
  excludeQuestions: string[];
  contentTags?: string[];
  maxInformationGain?: number;
}

export class AdaptiveTestingService {
  private questionBankService: QuestionBankService;
  private testingStates: Map<string, AdaptiveTestingState> = new Map();

  constructor(questionBankService: QuestionBankService) {
    this.questionBankService = questionBankService;
  }

  /**
   * Initialize adaptive testing session
   */
  async initializeAdaptiveTest(
    userId: string, 
    assessmentId: string, 
    config: AdaptiveTestingConfig
  ): Promise<AdaptiveTestingState> {
    const stateId = this.generateStateId(userId, assessmentId);
    
    const initialState: AdaptiveTestingState = {
      userId,
      assessmentId,
      currentAbility: this.mapDifficultyToAbility(config.initialDifficulty),
      abilityHistory: [],
      questionsAsked: [],
      responses: [],
      confidenceLevel: 0,
      isComplete: false,
      estimatedCompletion: 0
    };

    // Select first question
    const firstQuestion = await this.selectNextQuestion(initialState, config);
    if (firstQuestion) {
      initialState.nextQuestionId = firstQuestion.id;
    }

    this.testingStates.set(stateId, initialState);
    return initialState;
  }

  /**
   * Process a response and update adaptive testing state
   */
  async processResponse(
    userId: string,
    assessmentId: string,
    response: Response,
    config: AdaptiveTestingConfig
  ): Promise<AdaptiveTestingState> {
    const stateId = this.generateStateId(userId, assessmentId);
    const state = this.testingStates.get(stateId);
    
    if (!state) {
      throw new Error('Adaptive testing state not found');
    }

    // Add response to state
    state.responses.push(response);
    state.questionsAsked.push(response.questionId);

    // Get question details for IRT calculation
    const question = await this.questionBankService.getQuestion(response.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Calculate new ability estimate using IRT
    const newAbility = await this.updateAbilityEstimate(state, question, response);
    state.currentAbility = newAbility;
    state.abilityHistory.push(newAbility);

    // Update confidence level
    state.confidenceLevel = this.calculateConfidenceLevel(state);

    // Check if test should continue
    const shouldContinue = this.shouldContinueTest(state, config);
    
    if (shouldContinue) {
      // Select next question
      const nextQuestion = await this.selectNextQuestion(state, config);
      state.nextQuestionId = nextQuestion?.id;
      state.estimatedCompletion = this.calculateEstimatedCompletion(state, config);
    } else {
      state.isComplete = true;
      state.estimatedCompletion = 100;
      state.nextQuestionId = undefined;
    }

    this.testingStates.set(stateId, state);
    return state;
  }

  /**
   * Get current adaptive testing state
   */
  getAdaptiveTestingState(userId: string, assessmentId: string): AdaptiveTestingState | null {
    const stateId = this.generateStateId(userId, assessmentId);
    return this.testingStates.get(stateId) || null;
  }

  /**
   * Select the next optimal question using Item Response Theory
   */
  private async selectNextQuestion(
    state: AdaptiveTestingState, 
    config: AdaptiveTestingConfig
  ): Promise<Question | null> {
    const criteria: QuestionSelectionCriteria = {
      targetDifficulty: state.currentAbility,
      excludeQuestions: state.questionsAsked,
      maxInformationGain: 1.0
    };

    // Get available questions from question bank
    const availableQuestions = await this.questionBankService.searchQuestions({
      // Filter out already asked questions
    });

    if (availableQuestions.length === 0) {
      return null;
    }

    // Filter out already asked questions
    const candidateQuestions = availableQuestions.filter(
      q => !criteria.excludeQuestions.includes(q.id)
    );

    if (candidateQuestions.length === 0) {
      return null;
    }

    // Calculate information gain for each candidate question
    let bestQuestion: Question | null = null;
    let maxInformation = -1;

    for (const question of candidateQuestions) {
      const irtParams = this.getIRTParameters(question);
      const information = this.calculateInformation(state.currentAbility, irtParams);
      
      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  /**
   * Update ability estimate using Maximum Likelihood Estimation
   */
  private async updateAbilityEstimate(
    state: AdaptiveTestingState,
    question: Question,
    response: Response
  ): Promise<number> {
    const irtParams = this.getIRTParameters(question);
    const isCorrect = await this.isResponseCorrect(question, response);
    
    // Use Newton-Raphson method for MLE
    let theta = state.currentAbility;
    const maxIterations = 10;
    const tolerance = 0.001;

    for (let i = 0; i < maxIterations; i++) {
      const { likelihood, derivative } = this.calculateLikelihoodAndDerivative(
        theta, 
        state.responses, 
        state.questionsAsked,
        isCorrect,
        irtParams
      );

      if (Math.abs(derivative) < tolerance) {
        break;
      }

      const newTheta = theta - (likelihood / derivative);
      
      // Constrain theta to reasonable bounds
      theta = Math.max(-4, Math.min(4, newTheta));
    }

    return theta;
  }

  /**
   * Calculate information function for a question at given ability level
   */
  private calculateInformation(theta: number, irtParams: ItemResponseTheoryParams): number {
    const { discrimination, difficulty, guessing } = irtParams;
    const probability = this.calculateProbability(theta, irtParams);
    
    // Information function: I(θ) = a² * P(θ) * (1 - P(θ)) / (1 - c)²
    const information = Math.pow(discrimination, 2) * probability * (1 - probability) / Math.pow(1 - guessing, 2);
    
    return information;
  }

  /**
   * Calculate probability of correct response using 3PL IRT model
   */
  private calculateProbability(theta: number, irtParams: ItemResponseTheoryParams): number {
    const { discrimination, difficulty, guessing } = irtParams;
    
    // 3PL model: P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))
    const exponent = -discrimination * (theta - difficulty);
    const probability = guessing + (1 - guessing) / (1 + Math.exp(exponent));
    
    return Math.max(0.001, Math.min(0.999, probability));
  }

  /**
   * Calculate likelihood and its derivative for MLE
   */
  private calculateLikelihoodAndDerivative(
    theta: number,
    responses: Response[],
    questionIds: string[],
    currentIsCorrect: boolean,
    currentIrtParams: ItemResponseTheoryParams
  ): { likelihood: number; derivative: number } {
    let logLikelihood = 0;
    let derivative = 0;

    // Process all previous responses
    for (let i = 0; i < responses.length - 1; i++) {
      const response = responses[i];
      const questionId = questionIds[i];
      
      // Get IRT parameters for this question (simplified - would need actual lookup)
      const irtParams = this.getDefaultIRTParameters();
      const isCorrect = response.confidence ? response.confidence > 0.5 : Math.random() > 0.5; // Simplified
      
      const probability = this.calculateProbability(theta, irtParams);
      
      if (isCorrect) {
        logLikelihood += Math.log(probability);
        derivative += irtParams.discrimination * (1 - probability);
      } else {
        logLikelihood += Math.log(1 - probability);
        derivative -= irtParams.discrimination * probability;
      }
    }

    // Add current response
    const currentProbability = this.calculateProbability(theta, currentIrtParams);
    if (currentIsCorrect) {
      logLikelihood += Math.log(currentProbability);
      derivative += currentIrtParams.discrimination * (1 - currentProbability);
    } else {
      logLikelihood += Math.log(1 - currentProbability);
      derivative -= currentIrtParams.discrimination * currentProbability;
    }

    return { likelihood: logLikelihood, derivative };
  }

  /**
   * Calculate confidence level based on standard error of ability estimate
   */
  private calculateConfidenceLevel(state: AdaptiveTestingState): number {
    if (state.responses.length === 0) {
      return 0;
    }

    // Calculate standard error based on information
    let totalInformation = 0;
    
    for (const questionId of state.questionsAsked) {
      const irtParams = this.getDefaultIRTParameters(); // Simplified
      const information = this.calculateInformation(state.currentAbility, irtParams);
      totalInformation += information;
    }

    const standardError = totalInformation > 0 ? 1 / Math.sqrt(totalInformation) : 1;
    
    // Convert to confidence level (0-1)
    // Use a more generous confidence calculation for testing
    const confidence = Math.max(0.1, 1 - (standardError * 0.5));
    
    return Math.min(1, confidence);
  }

  /**
   * Determine if testing should continue
   */
  private shouldContinueTest(state: AdaptiveTestingState, config: AdaptiveTestingConfig): boolean {
    // Check minimum questions
    if (state.responses.length < config.minQuestions) {
      return true;
    }

    // Check maximum questions
    if (state.responses.length >= config.maxQuestions) {
      return false;
    }

    // Check confidence threshold
    if (state.confidenceLevel >= config.confidenceThreshold) {
      return false;
    }

    // Check if ability estimate has stabilized
    if (state.abilityHistory.length >= 3) {
      const recentAbilities = state.abilityHistory.slice(-3);
      const variance = this.calculateVariance(recentAbilities);
      
      if (variance < 0.1) { // Ability has stabilized
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate estimated completion percentage
   */
  private calculateEstimatedCompletion(state: AdaptiveTestingState, config: AdaptiveTestingConfig): number {
    const questionsProgress = state.responses.length / config.maxQuestions;
    const confidenceProgress = state.confidenceLevel / config.confidenceThreshold;
    
    // Weight both factors
    const completion = Math.max(questionsProgress * 0.6 + confidenceProgress * 0.4, questionsProgress);
    
    return Math.min(100, completion * 100);
  }

  /**
   * Get IRT parameters for a question
   */
  private getIRTParameters(question: Question): ItemResponseTheoryParams {
    // In a real implementation, these would be calibrated from historical data
    const baseParams = this.getDefaultIRTParameters();
    
    // Adjust based on question difficulty
    const difficultyAdjustment = this.mapDifficultyToIRTDifficulty(question.difficulty);
    
    return {
      discrimination: baseParams.discrimination,
      difficulty: difficultyAdjustment,
      guessing: baseParams.guessing
    };
  }

  /**
   * Get default IRT parameters
   */
  private getDefaultIRTParameters(): ItemResponseTheoryParams {
    return {
      discrimination: 1.0, // a parameter
      difficulty: 0.0,     // b parameter  
      guessing: 0.2        // c parameter (20% guessing probability)
    };
  }

  /**
   * Map difficulty level to ability scale
   */
  private mapDifficultyToAbility(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER:
        return -1.5;
      case DifficultyLevel.INTERMEDIATE:
        return 0.0;
      case DifficultyLevel.ADVANCED:
        return 1.0;
      case DifficultyLevel.EXPERT:
        return 2.0;
      default:
        return 0.0;
    }
  }

  /**
   * Map difficulty level to IRT difficulty parameter
   */
  private mapDifficultyToIRTDifficulty(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER:
        return -1.0;
      case DifficultyLevel.INTERMEDIATE:
        return 0.0;
      case DifficultyLevel.ADVANCED:
        return 1.0;
      case DifficultyLevel.EXPERT:
        return 1.5;
      default:
        return 0.0;
    }
  }

  /**
   * Check if response is correct (simplified)
   */
  private async isResponseCorrect(question: Question, response: Response): Promise<boolean> {
    // This would use the actual grading logic from question handlers
    // For now, using confidence as a proxy
    return response.confidence ? response.confidence > 0.5 : Math.random() > 0.5;
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

  /**
   * Generate unique state ID
   */
  private generateStateId(userId: string, assessmentId: string): string {
    return `${userId}_${assessmentId}`;
  }

  /**
   * Clean up completed or expired testing states
   */
  cleanupExpiredStates(maxAgeHours: number = 24): void {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    for (const [stateId, state] of this.testingStates.entries()) {
      // Remove completed states or very old states
      if (state.isComplete || (state.responses.length > 0 && 
          state.responses[state.responses.length - 1].timeSpent < cutoffTime)) {
        this.testingStates.delete(stateId);
      }
    }
  }
}