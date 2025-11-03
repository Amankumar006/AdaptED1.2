import { 
  Question, 
  DifficultyLevel, 
  QuestionType,
  ItemResponseTheoryParams 
} from '../types/assessment.types';
import { AdaptiveTestingState } from './adaptive-testing.service';
import { QuestionBankService } from './question-bank.service';

export interface QuestionSelectionCriteria {
  targetDifficulty: number;
  excludeQuestions: string[];
  contentTags?: string[];
  questionTypes?: QuestionType[];
  maxInformationGain?: number;
  diversityWeight?: number;
  contentCoverageWeight?: number;
}

export interface QuestionScore {
  questionId: string;
  informationGain: number;
  difficultyMatch: number;
  contentRelevance: number;
  diversityScore: number;
  totalScore: number;
}

export interface ContentCoverage {
  tag: string;
  targetCoverage: number;
  currentCoverage: number;
  priority: number;
}

export class QuestionSelectionService {
  private questionBankService: QuestionBankService;
  private contentCoverageTargets: Map<string, ContentCoverage[]> = new Map();

  constructor(questionBankService: QuestionBankService) {
    this.questionBankService = questionBankService;
  }

  /**
   * Select optimal question using multiple criteria optimization
   */
  async selectOptimalQuestion(
    adaptiveState: AdaptiveTestingState,
    criteria: QuestionSelectionCriteria
  ): Promise<Question | null> {
    // Get candidate questions
    const candidates = await this.getCandidateQuestions(criteria);
    
    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate question
    const scoredQuestions = await Promise.all(
      candidates.map(question => this.scoreQuestion(question, adaptiveState, criteria))
    );

    // Sort by total score (descending)
    scoredQuestions.sort((a, b) => b.totalScore - a.totalScore);

    // Apply selection strategy (not always pick the highest scored)
    const selectedQuestion = this.applySelectionStrategy(scoredQuestions, adaptiveState);
    
    return candidates.find(q => q.id === selectedQuestion.questionId) || null;
  }

  /**
   * Select multiple questions for batch optimization
   */
  async selectQuestionBatch(
    adaptiveState: AdaptiveTestingState,
    criteria: QuestionSelectionCriteria,
    batchSize: number
  ): Promise<Question[]> {
    const selectedQuestions: Question[] = [];
    const updatedCriteria = { ...criteria };

    for (let i = 0; i < batchSize; i++) {
      const question = await this.selectOptimalQuestion(adaptiveState, updatedCriteria);
      
      if (!question) {
        break; // No more suitable questions available
      }

      selectedQuestions.push(question);
      
      // Update criteria to exclude selected question
      updatedCriteria.excludeQuestions = [
        ...updatedCriteria.excludeQuestions,
        question.id
      ];

      // Simulate adding this question to the adaptive state for next selection
      // (This is a simplified simulation - in practice, you'd need actual response)
      adaptiveState.questionsAsked.push(question.id);
    }

    return selectedQuestions;
  }

  /**
   * Optimize question sequence for maximum learning efficiency
   */
  async optimizeQuestionSequence(
    questions: Question[],
    adaptiveState: AdaptiveTestingState,
    learningObjectives: string[]
  ): Promise<Question[]> {
    if (questions.length <= 1) {
      return questions;
    }

    // Create a scoring matrix for question pairs
    const pairScores = new Map<string, number>();
    
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const score = this.calculateSequenceScore(questions[i], questions[j], adaptiveState);
        pairScores.set(`${i}-${j}`, score);
      }
    }

    // Use a greedy approach to build the optimal sequence
    const optimizedSequence: Question[] = [];
    const remainingQuestions = [...questions];
    
    // Start with the question that best matches current ability
    let currentQuestion = this.findBestStartingQuestion(remainingQuestions, adaptiveState);
    optimizedSequence.push(currentQuestion);
    remainingQuestions.splice(remainingQuestions.indexOf(currentQuestion), 1);

    // Build the rest of the sequence
    while (remainingQuestions.length > 0) {
      let bestNext: Question | null = null;
      let bestScore = -Infinity;

      for (const candidate of remainingQuestions) {
        const score = this.calculateTransitionScore(currentQuestion, candidate, adaptiveState);
        if (score > bestScore) {
          bestScore = score;
          bestNext = candidate;
        }
      }

      if (bestNext) {
        optimizedSequence.push(bestNext);
        remainingQuestions.splice(remainingQuestions.indexOf(bestNext), 1);
        currentQuestion = bestNext;
      } else {
        // Fallback: add remaining questions in original order
        optimizedSequence.push(...remainingQuestions);
        break;
      }
    }

    return optimizedSequence;
  }

  /**
   * Set content coverage targets for assessment
   */
  setContentCoverageTargets(assessmentId: string, targets: ContentCoverage[]): void {
    this.contentCoverageTargets.set(assessmentId, targets);
  }

  /**
   * Get current content coverage status
   */
  getContentCoverageStatus(
    assessmentId: string,
    askedQuestions: Question[]
  ): ContentCoverage[] {
    const targets = this.contentCoverageTargets.get(assessmentId) || [];
    
    return targets.map(target => {
      const relevantQuestions = askedQuestions.filter(q => 
        q.tags.includes(target.tag)
      );
      
      const currentCoverage = relevantQuestions.length / Math.max(1, askedQuestions.length);
      
      return {
        ...target,
        currentCoverage
      };
    });
  }

  /**
   * Score a question based on multiple criteria
   */
  private async scoreQuestion(
    question: Question,
    adaptiveState: AdaptiveTestingState,
    criteria: QuestionSelectionCriteria
  ): Promise<QuestionScore> {
    const irtParams = this.getIRTParameters(question);
    
    // Information gain score (0-1)
    const informationGain = this.calculateInformationGain(
      adaptiveState.currentAbility,
      irtParams
    );

    // Difficulty match score (0-1)
    const difficultyMatch = this.calculateDifficultyMatch(
      question,
      criteria.targetDifficulty
    );

    // Content relevance score (0-1)
    const contentRelevance = this.calculateContentRelevance(
      question,
      criteria.contentTags || []
    );

    // Diversity score (0-1)
    const diversityScore = this.calculateDiversityScore(
      question,
      adaptiveState.questionsAsked
    );

    // Weighted total score
    const weights = {
      information: 0.4,
      difficulty: 0.3,
      content: 0.2,
      diversity: 0.1
    };

    const totalScore = 
      informationGain * weights.information +
      difficultyMatch * weights.difficulty +
      contentRelevance * weights.content +
      diversityScore * weights.diversity;

    return {
      questionId: question.id,
      informationGain,
      difficultyMatch,
      contentRelevance,
      diversityScore,
      totalScore
    };
  }

  /**
   * Calculate information gain using Fisher Information
   */
  private calculateInformationGain(
    ability: number,
    irtParams: ItemResponseTheoryParams
  ): number {
    const { discrimination, difficulty, guessing } = irtParams;
    const probability = this.calculateProbability(ability, irtParams);
    
    // Fisher Information: I(θ) = a² * P(θ) * (1 - P(θ)) / (1 - c)²
    const information = Math.pow(discrimination, 2) * probability * (1 - probability) / 
                       Math.pow(1 - guessing, 2);
    
    // Normalize to 0-1 scale (max information is typically around 1.0)
    return Math.min(1.0, information);
  }

  /**
   * Calculate how well question difficulty matches target
   */
  private calculateDifficultyMatch(question: Question, targetDifficulty: number): number {
    const questionDifficulty = this.mapDifficultyToNumeric(question.difficulty);
    const difference = Math.abs(questionDifficulty - targetDifficulty);
    
    // Convert difference to similarity score (0-1)
    return Math.max(0, 1 - difference / 3); // Max difference is 3 (expert - beginner)
  }

  /**
   * Calculate content relevance based on tags
   */
  private calculateContentRelevance(question: Question, targetTags: string[]): number {
    if (targetTags.length === 0) {
      return 1.0; // No specific content requirements
    }

    const matchingTags = question.tags.filter(tag => 
      targetTags.some(targetTag => 
        tag.toLowerCase().includes(targetTag.toLowerCase()) ||
        targetTag.toLowerCase().includes(tag.toLowerCase())
      )
    );

    return matchingTags.length / targetTags.length;
  }

  /**
   * Calculate diversity score to avoid repetitive question types
   */
  private calculateDiversityScore(question: Question, askedQuestions: string[]): number {
    if (askedQuestions.length === 0) {
      return 1.0;
    }

    // This is simplified - in practice, you'd look up the actual questions
    // and analyze their types, topics, and formats
    const recentQuestions = askedQuestions.slice(-5); // Last 5 questions
    const repetitionPenalty = recentQuestions.length * 0.1;
    
    return Math.max(0.1, 1.0 - repetitionPenalty);
  }

  /**
   * Apply selection strategy (not always pick highest scored)
   */
  private applySelectionStrategy(
    scoredQuestions: QuestionScore[],
    adaptiveState: AdaptiveTestingState
  ): QuestionScore {
    // Early in the test, be more exploratory
    if (adaptiveState.responses.length < 3) {
      // Use weighted random selection from top 3 candidates
      const topCandidates = scoredQuestions.slice(0, Math.min(3, scoredQuestions.length));
      const weights = topCandidates.map((_, index) => Math.pow(0.7, index));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      let random = Math.random() * totalWeight;
      for (let i = 0; i < topCandidates.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return topCandidates[i];
        }
      }
    }

    // Later in the test, be more focused on optimal selection
    return scoredQuestions[0];
  }

  /**
   * Find the best starting question for a sequence
   */
  private findBestStartingQuestion(
    questions: Question[],
    adaptiveState: AdaptiveTestingState
  ): Question {
    let bestQuestion = questions[0];
    let bestScore = -Infinity;

    for (const question of questions) {
      const difficultyScore = this.calculateDifficultyMatch(
        question,
        adaptiveState.currentAbility
      );
      
      // Prefer questions that are slightly easier than current ability for starting
      const startingBonus = question.difficulty === DifficultyLevel.INTERMEDIATE ? 0.1 : 0;
      const totalScore = difficultyScore + startingBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  /**
   * Calculate score for transitioning from one question to another
   */
  private calculateTransitionScore(
    fromQuestion: Question,
    toQuestion: Question,
    adaptiveState: AdaptiveTestingState
  ): number {
    let score = 0;

    // Difficulty progression score
    const fromDiff = this.mapDifficultyToNumeric(fromQuestion.difficulty);
    const toDiff = this.mapDifficultyToNumeric(toQuestion.difficulty);
    const diffChange = toDiff - fromDiff;

    // Prefer gradual difficulty increase
    if (diffChange >= 0 && diffChange <= 1) {
      score += 0.3;
    } else if (diffChange > 1) {
      score -= 0.2; // Penalty for jumping too high
    } else {
      score -= 0.1; // Small penalty for going easier
    }

    // Content variety score
    const sharedTags = fromQuestion.tags.filter(tag => toQuestion.tags.includes(tag));
    const varietyScore = 1 - (sharedTags.length / Math.max(fromQuestion.tags.length, 1));
    score += varietyScore * 0.2;

    // Question type variety score
    if (fromQuestion.type !== toQuestion.type) {
      score += 0.1;
    }

    return score;
  }

  /**
   * Calculate sequence score for question pairs
   */
  private calculateSequenceScore(
    question1: Question,
    question2: Question,
    adaptiveState: AdaptiveTestingState
  ): number {
    return this.calculateTransitionScore(question1, question2, adaptiveState);
  }

  /**
   * Get candidate questions based on criteria
   */
  private async getCandidateQuestions(
    criteria: QuestionSelectionCriteria
  ): Promise<Question[]> {
    // Get questions from question bank
    const allQuestions = await this.questionBankService.searchQuestions({
      type: criteria.questionTypes?.[0],
      tags: criteria.contentTags
    });

    // Filter out excluded questions
    return allQuestions.filter(q => !criteria.excludeQuestions.includes(q.id));
  }

  /**
   * Calculate probability using 3PL IRT model
   */
  private calculateProbability(theta: number, irtParams: ItemResponseTheoryParams): number {
    const { discrimination, difficulty, guessing } = irtParams;
    const exponent = -discrimination * (theta - difficulty);
    return guessing + (1 - guessing) / (1 + Math.exp(exponent));
  }

  /**
   * Get IRT parameters for a question
   */
  private getIRTParameters(question: Question): ItemResponseTheoryParams {
    // In practice, these would be calibrated from historical data
    return {
      discrimination: 1.0 + Math.random() * 0.5, // 1.0 to 1.5
      difficulty: this.mapDifficultyToIRTDifficulty(question.difficulty),
      guessing: question.type === QuestionType.MULTIPLE_CHOICE ? 0.25 : 0.1
    };
  }

  /**
   * Map difficulty level to numeric value
   */
  private mapDifficultyToNumeric(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER: return 0;
      case DifficultyLevel.INTERMEDIATE: return 1;
      case DifficultyLevel.ADVANCED: return 2;
      case DifficultyLevel.EXPERT: return 3;
      default: return 1;
    }
  }

  /**
   * Map difficulty level to IRT difficulty parameter
   */
  private mapDifficultyToIRTDifficulty(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER: return -1.0;
      case DifficultyLevel.INTERMEDIATE: return 0.0;
      case DifficultyLevel.ADVANCED: return 1.0;
      case DifficultyLevel.EXPERT: return 1.5;
      default: return 0.0;
    }
  }
}