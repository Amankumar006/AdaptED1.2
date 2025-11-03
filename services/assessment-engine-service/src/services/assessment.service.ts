import { 
  Assessment, 
  AssessmentSubmission, 
  Question, 
  Response, 
  Feedback,
  AssessmentStatus,
  SubmissionStatus,
  AdaptiveTestingConfig,
  Rubric
} from '../types/assessment.types';
import { questionFactory } from '../factories/question.factory';
import { QuestionBankService } from './question-bank.service';
import { AdaptiveTestingService, AdaptiveTestingState } from './adaptive-testing.service';
import { DifficultyAdjustmentService } from './difficulty-adjustment.service';
import { QuestionSelectionService } from './question-selection.service';
import { AssessmentAnalyticsService, DetailedPerformanceAnalytics, AssessmentLevelAnalytics } from './assessment-analytics.service';
import { AutomatedFeedbackService, EnhancedFeedback, FeedbackGenerationConfig } from './automated-feedback.service';
import { RubricAssessmentService, RubricAssessmentResult, RubricAssessmentConfig } from './rubric-assessment.service';
import { ValidationResult, GradingResult } from '../interfaces/question.interface';

export class AssessmentService {
  private assessments: Map<string, Assessment> = new Map();
  private submissions: Map<string, AssessmentSubmission> = new Map();
  private questionBankService: QuestionBankService;
  private adaptiveTestingService: AdaptiveTestingService;
  private difficultyAdjustmentService: DifficultyAdjustmentService;
  private questionSelectionService: QuestionSelectionService;
  private analyticsService: AssessmentAnalyticsService;
  private feedbackService: AutomatedFeedbackService;
  private rubricService: RubricAssessmentService;

  constructor(questionBankService: QuestionBankService) {
    this.questionBankService = questionBankService;
    this.adaptiveTestingService = new AdaptiveTestingService(questionBankService);
    this.difficultyAdjustmentService = new DifficultyAdjustmentService();
    this.questionSelectionService = new QuestionSelectionService(questionBankService);
    this.analyticsService = new AssessmentAnalyticsService();
    this.feedbackService = new AutomatedFeedbackService();
    this.rubricService = new RubricAssessmentService();
  }

  async createAssessment(assessmentData: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assessment> {
    // Validate all questions in the assessment
    for (const question of assessmentData.questions) {
      const validation = await this.questionBankService.validateQuestion(question);
      if (!validation.isValid) {
        throw new Error(`Question validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const assessment: Assessment = {
      id: this.generateId(),
      ...assessmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  async getAssessment(assessmentId: string): Promise<Assessment | null> {
    return this.assessments.get(assessmentId) || null;
  }

  async updateAssessment(assessmentId: string, updates: Partial<Assessment>): Promise<Assessment | null> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) return null;

    // Validate questions if they are being updated
    if (updates.questions) {
      for (const question of updates.questions) {
        const validation = await this.questionBankService.validateQuestion(question);
        if (!validation.isValid) {
          throw new Error(`Question validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    const updatedAssessment = {
      ...assessment,
      ...updates,
      id: assessment.id, // Prevent ID changes
      createdAt: assessment.createdAt, // Prevent creation date changes
      updatedAt: new Date()
    };

    this.assessments.set(assessmentId, updatedAssessment);
    return updatedAssessment;
  }

  async deleteAssessment(assessmentId: string): Promise<boolean> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) return false;

    // Delete all submissions for this assessment
    const submissions = Array.from(this.submissions.values())
      .filter(sub => sub.assessmentId === assessmentId);
    
    submissions.forEach(sub => {
      this.submissions.delete(sub.id);
    });

    this.assessments.delete(assessmentId);
    return true;
  }

  async publishAssessment(assessmentId: string): Promise<Assessment | null> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) return null;

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new Error('Only draft assessments can be published');
    }

    // Validate assessment is ready for publishing
    const validation = await this.validateAssessmentForPublishing(assessment);
    if (!validation.isValid) {
      throw new Error(`Assessment not ready for publishing: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    assessment.status = AssessmentStatus.PUBLISHED;
    assessment.updatedAt = new Date();

    this.assessments.set(assessmentId, assessment);
    return assessment;
  }

  async startAssessment(assessmentId: string, userId: string): Promise<AssessmentSubmission> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new Error('Assessment is not published');
    }

    // Check if assessment is available
    const now = new Date();
    if (assessment.settings.availableFrom && now < assessment.settings.availableFrom) {
      throw new Error('Assessment is not yet available');
    }

    if (assessment.settings.availableUntil && now > assessment.settings.availableUntil) {
      throw new Error('Assessment is no longer available');
    }

    // Check for existing submissions
    const existingSubmissions = Array.from(this.submissions.values())
      .filter(sub => sub.assessmentId === assessmentId && sub.userId === userId);

    if (!assessment.settings.allowRetakes && existingSubmissions.length > 0) {
      throw new Error('Retakes are not allowed for this assessment');
    }

    if (assessment.settings.maxAttempts && existingSubmissions.length >= assessment.settings.maxAttempts) {
      throw new Error('Maximum number of attempts reached');
    }

    // Create new submission
    const submission: AssessmentSubmission = {
      id: this.generateId(),
      assessmentId,
      userId,
      responses: [],
      startedAt: new Date(),
      maxScore: assessment.questions.reduce((sum, q) => sum + q.points, 0),
      status: SubmissionStatus.IN_PROGRESS,
      metadata: {
        attemptNumber: existingSubmissions.length + 1,
        timeLimit: assessment.settings.timeLimit,
        shuffledQuestions: assessment.settings.shuffleQuestions ? this.shuffleQuestions(assessment.questions) : null,
        isAdaptive: assessment.settings.isAdaptive
      }
    };

    // Initialize adaptive testing if enabled
    if (assessment.settings.isAdaptive) {
      const adaptiveConfig: AdaptiveTestingConfig = {
        initialDifficulty: assessment.questions[0]?.difficulty || 'intermediate' as any,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      const adaptiveState = await this.adaptiveTestingService.initializeAdaptiveTest(
        userId,
        assessmentId,
        adaptiveConfig
      );

      submission.metadata.adaptiveState = adaptiveState;
    }

    this.submissions.set(submission.id, submission);
    return submission;
  }

  async submitResponse(submissionId: string, response: Response): Promise<ValidationResult & { nextQuestion?: Question; adaptiveState?: AdaptiveTestingState }> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new Error('Submission is not in progress');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Find the question
    const question = assessment.questions.find(q => q.id === response.questionId);
    if (!question) {
      throw new Error('Question not found in assessment');
    }

    // Validate the response
    const handler = questionFactory.createHandler(question.type);
    const validation = await handler.validateResponse(question, response);

    if (validation.isValid) {
      // Update or add the response
      const existingResponseIndex = submission.responses.findIndex(r => r.questionId === response.questionId);
      if (existingResponseIndex !== -1) {
        submission.responses[existingResponseIndex] = response;
      } else {
        submission.responses.push(response);
      }

      // Handle adaptive testing if enabled
      if (assessment.settings.isAdaptive && submission.metadata.isAdaptive) {
        const adaptiveConfig: AdaptiveTestingConfig = {
          initialDifficulty: assessment.questions[0]?.difficulty || 'intermediate' as any,
          difficultyAdjustmentFactor: 0.5,
          minQuestions: 5,
          maxQuestions: 20,
          targetAccuracy: 0.7,
          confidenceThreshold: 0.8
        };

        const adaptiveState = await this.adaptiveTestingService.processResponse(
          submission.userId,
          submission.assessmentId,
          response,
          adaptiveConfig
        );

        submission.metadata.adaptiveState = adaptiveState;

        // Get next question if test continues
        let nextQuestion: Question | undefined;
        if (!adaptiveState.isComplete && adaptiveState.nextQuestionId) {
          const questionResult = await this.questionBankService.getQuestion(adaptiveState.nextQuestionId);
          nextQuestion = questionResult || undefined;
        }

        this.submissions.set(submissionId, submission);

        return {
          ...validation,
          nextQuestion,
          adaptiveState
        };
      }

      this.submissions.set(submissionId, submission);
    }

    return validation;
  }

  async submitAssessment(submissionId: string): Promise<AssessmentSubmission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new Error('Submission is not in progress');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Mark as submitted
    submission.submittedAt = new Date();
    submission.status = SubmissionStatus.SUBMITTED;

    // Auto-grade if possible
    const gradingResult = await this.gradeSubmission(submissionId);
    if (gradingResult.canAutoGrade) {
      submission.score = gradingResult.score;
      submission.feedback = gradingResult.feedback;
      submission.status = SubmissionStatus.GRADED;
    }

    this.submissions.set(submissionId, submission);
    return submission;
  }

  async gradeSubmission(submissionId: string): Promise<GradingResult & { canAutoGrade: boolean; feedback: Feedback[] }> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    let totalScore = 0;
    let maxScore = 0;
    let canAutoGrade = true;
    const feedback: Feedback[] = [];

    // Grade each response
    for (const question of assessment.questions) {
      const response = submission.responses.find(r => r.questionId === question.id);
      maxScore += question.points;

      if (response) {
        const handler = questionFactory.createHandler(question.type);
        const gradingResult = await handler.gradeResponse(question, response);
        
        totalScore += gradingResult.score;

        // Generate feedback
        const questionFeedback = await handler.generateFeedback(question, response, gradingResult);
        feedback.push(questionFeedback);

        // Check if manual grading is required
        if (gradingResult.metadata?.requiresManualGrading) {
          canAutoGrade = false;
        }
      } else {
        // No response provided
        feedback.push({
          questionId: question.id,
          score: 0,
          maxScore: question.points,
          comments: 'No response provided',
          suggestions: ['Please provide an answer to this question']
        });
      }
    }

    return {
      score: totalScore,
      maxScore,
      isCorrect: totalScore === maxScore,
      canAutoGrade,
      feedback
    };
  }

  async getSubmission(submissionId: string): Promise<AssessmentSubmission | null> {
    return this.submissions.get(submissionId) || null;
  }

  async getSubmissionsByUser(userId: string, assessmentId?: string): Promise<AssessmentSubmission[]> {
    let submissions = Array.from(this.submissions.values())
      .filter(sub => sub.userId === userId);

    if (assessmentId) {
      submissions = submissions.filter(sub => sub.assessmentId === assessmentId);
    }

    return submissions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getSubmissionsByAssessment(assessmentId: string): Promise<AssessmentSubmission[]> {
    return Array.from(this.submissions.values())
      .filter(sub => sub.assessmentId === assessmentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalytics> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const submissions = Array.from(this.submissions.values())
      .filter(sub => sub.assessmentId === assessmentId && sub.status === SubmissionStatus.GRADED);

    const analytics: AssessmentAnalytics = {
      assessmentId,
      totalSubmissions: submissions.length,
      averageScore: 0,
      medianScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      averageTimeSpent: 0,
      questionAnalytics: [],
      difficultyDistribution: {},
      completionRate: 0
    };

    if (submissions.length === 0) {
      return analytics;
    }

    // Calculate basic statistics
    const scores = submissions.map(sub => sub.score || 0);
    const maxPossibleScore = assessment.questions.reduce((sum, q) => sum + q.points, 0);

    analytics.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    analytics.highestScore = Math.max(...scores);
    analytics.lowestScore = Math.min(...scores);

    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    analytics.medianScore = sortedScores.length % 2 === 0 
      ? (sortedScores[mid - 1] + sortedScores[mid]) / 2 
      : sortedScores[mid];

    // Calculate pass rate
    const passingScore = assessment.settings.passingScore || (maxPossibleScore * 0.6);
    const passedSubmissions = submissions.filter(sub => (sub.score || 0) >= passingScore);
    analytics.passRate = (passedSubmissions.length / submissions.length) * 100;

    // Calculate average time spent
    const timesSpent = submissions
      .filter(sub => sub.submittedAt)
      .map(sub => sub.submittedAt!.getTime() - sub.startedAt.getTime());
    
    if (timesSpent.length > 0) {
      analytics.averageTimeSpent = timesSpent.reduce((sum, time) => sum + time, 0) / timesSpent.length;
    }

    // Question-level analytics
    analytics.questionAnalytics = assessment.questions.map(question => {
      const questionResponses = submissions
        .map(sub => sub.responses.find(r => r.questionId === question.id))
        .filter(response => response !== undefined);

      const correctResponses = questionResponses.filter(response => {
        // This would need actual grading results - simplified for now
        return Math.random() > 0.3; // 70% correct rate simulation
      });

      return {
        questionId: question.id,
        questionType: question.type,
        difficulty: question.difficulty,
        totalResponses: questionResponses.length,
        correctResponses: correctResponses.length,
        correctRate: questionResponses.length > 0 ? (correctResponses.length / questionResponses.length) * 100 : 0,
        averageTimeSpent: questionResponses.reduce((sum, r) => sum + (r?.timeSpent || 0), 0) / Math.max(questionResponses.length, 1)
      };
    });

    return analytics;
  }

  private async validateAssessmentForPublishing(assessment: Assessment): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check if assessment has questions
    if (assessment.questions.length === 0) {
      errors.push({
        field: 'questions',
        message: 'Assessment must have at least one question',
        code: 'NO_QUESTIONS'
      });
    }

    // Validate all questions
    for (let i = 0; i < assessment.questions.length; i++) {
      const question = assessment.questions[i];
      const validation = await this.questionBankService.validateQuestion(question);
      
      if (!validation.isValid) {
        errors.push({
          field: `questions[${i}]`,
          message: `Question ${i + 1} validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          code: 'INVALID_QUESTION'
        });
      }

      validation.warnings.forEach(warning => {
        warnings.push({
          field: `questions[${i}].${warning.field}`,
          message: `Question ${i + 1}: ${warning.message}`,
          code: warning.code
        });
      });
    }

    // Validate settings
    if (assessment.settings.timeLimit && assessment.settings.timeLimit <= 0) {
      errors.push({
        field: 'settings.timeLimit',
        message: 'Time limit must be greater than 0',
        code: 'INVALID_TIME_LIMIT'
      });
    }

    if (assessment.settings.maxAttempts && assessment.settings.maxAttempts <= 0) {
      errors.push({
        field: 'settings.maxAttempts',
        message: 'Max attempts must be greater than 0',
        code: 'INVALID_MAX_ATTEMPTS'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private shuffleQuestions(questions: Question[]): string[] {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.map(q => q.id);
  }

  /**
   * Get adaptive testing state for a user's assessment
   */
  async getAdaptiveTestingState(userId: string, assessmentId: string): Promise<AdaptiveTestingState | null> {
    return this.adaptiveTestingService.getAdaptiveTestingState(userId, assessmentId);
  }

  /**
   * Get difficulty adjustment recommendations for a user
   */
  async getDifficultyRecommendations(userId: string): Promise<{
    currentLevel: string;
    suggestedLevel: string;
    confidence: number;
    reasoning: string[];
  }> {
    return this.difficultyAdjustmentService.analyzePerformancePatterns(userId);
  }

  /**
   * Get performance trends for a user
   */
  async getPerformanceTrends(userId: string): Promise<{
    accuracyTrend: number;
    speedTrend: number;
    difficultyTrend: number;
    abilityTrend: number;
  }> {
    return this.difficultyAdjustmentService.getPerformanceTrends(userId);
  }

  /**
   * Get optimal next questions for adaptive testing
   */
  async getOptimalNextQuestions(
    userId: string,
    assessmentId: string,
    count: number = 3
  ): Promise<Question[]> {
    const adaptiveState = await this.getAdaptiveTestingState(userId, assessmentId);
    if (!adaptiveState) {
      throw new Error('Adaptive testing state not found');
    }

    const criteria = {
      targetDifficulty: adaptiveState.currentAbility,
      excludeQuestions: adaptiveState.questionsAsked,
      maxInformationGain: 1.0
    };

    return this.questionSelectionService.selectQuestionBatch(
      adaptiveState,
      criteria,
      count
    );
  }

  /**
   * Analyze question selection effectiveness
   */
  async analyzeQuestionSelectionEffectiveness(
    assessmentId: string
  ): Promise<{
    averageInformationGain: number;
    difficultyDistribution: Record<string, number>;
    contentCoverage: Record<string, number>;
    selectionEfficiency: number;
  }> {
    const submissions = Array.from(this.submissions.values())
      .filter(sub => sub.assessmentId === assessmentId && sub.status === SubmissionStatus.GRADED);

    if (submissions.length === 0) {
      return {
        averageInformationGain: 0,
        difficultyDistribution: {},
        contentCoverage: {},
        selectionEfficiency: 0
      };
    }

    // Calculate metrics across all submissions
    let totalInformationGain = 0;
    const difficultyCount: Record<string, number> = {};
    const contentCount: Record<string, number> = {};
    let totalQuestions = 0;

    for (const submission of submissions) {
      const assessment = this.assessments.get(submission.assessmentId);
      if (!assessment) continue;

      for (const response of submission.responses) {
        const question = assessment.questions.find(q => q.id === response.questionId);
        if (!question) continue;

        totalQuestions++;
        
        // Track difficulty distribution
        difficultyCount[question.difficulty] = (difficultyCount[question.difficulty] || 0) + 1;
        
        // Track content coverage
        question.tags.forEach(tag => {
          contentCount[tag] = (contentCount[tag] || 0) + 1;
        });

        // Estimate information gain (simplified)
        totalInformationGain += 0.5; // Would be calculated properly with IRT
      }
    }

    // Normalize distributions
    const difficultyDistribution: Record<string, number> = {};
    const contentCoverage: Record<string, number> = {};

    Object.keys(difficultyCount).forEach(key => {
      difficultyDistribution[key] = difficultyCount[key] / totalQuestions;
    });

    Object.keys(contentCount).forEach(key => {
      contentCoverage[key] = contentCount[key] / totalQuestions;
    });

    return {
      averageInformationGain: totalQuestions > 0 ? totalInformationGain / totalQuestions : 0,
      difficultyDistribution,
      contentCoverage,
      selectionEfficiency: this.calculateSelectionEfficiency(submissions)
    };
  }

  /**
   * Calculate selection efficiency metric
   */
  private calculateSelectionEfficiency(submissions: AssessmentSubmission[]): number {
    if (submissions.length === 0) return 0;

    let totalEfficiency = 0;
    
    for (const submission of submissions) {
      // Efficiency = questions needed to reach confidence / optimal questions needed
      const questionsUsed = submission.responses.length;
      const optimalQuestions = Math.max(5, Math.min(15, questionsUsed)); // Simplified
      
      const efficiency = optimalQuestions / Math.max(questionsUsed, 1);
      totalEfficiency += Math.min(1, efficiency);
    }

    return totalEfficiency / submissions.length;
  }

  /**
   * Generate detailed performance analytics for a submission
   */
  async generateDetailedAnalytics(
    submissionId: string,
    config?: { includeComparativeAnalytics: boolean; includeLearningPath: boolean }
  ): Promise<DetailedPerformanceAnalytics> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Get all submissions for comparative analytics
    const allSubmissions = Array.from(this.submissions.values())
      .filter(s => s.assessmentId === submission.assessmentId);

    return this.analyticsService.generateDetailedPerformanceAnalytics(
      submission,
      assessment,
      allSubmissions
    );
  }

  /**
   * Generate assessment-level analytics
   */
  async generateAssessmentAnalytics(assessmentId: string): Promise<AssessmentLevelAnalytics> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const submissions = Array.from(this.submissions.values())
      .filter(s => s.assessmentId === assessmentId);

    return this.analyticsService.generateAssessmentLevelAnalytics(assessment, submissions);
  }

  /**
   * Generate enhanced feedback for a submission
   */
  async generateEnhancedFeedback(
    submissionId: string,
    config: FeedbackGenerationConfig
  ): Promise<EnhancedFeedback[]> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const enhancedFeedback: EnhancedFeedback[] = [];

    // Generate enhanced feedback for each question
    for (const question of assessment.questions) {
      const response = submission.responses.find(r => r.questionId === question.id);
      const basicFeedback = submission.feedback?.find(f => f.questionId === question.id);

      if (response && basicFeedback) {
        // Convert basic feedback to grading result
        const gradingResult: GradingResult = {
          score: basicFeedback.score,
          maxScore: basicFeedback.maxScore,
          isCorrect: basicFeedback.score === basicFeedback.maxScore
        };

        const enhanced = await this.feedbackService.generateEnhancedFeedback(
          question,
          response,
          gradingResult,
          config,
          submission.userId
        );

        enhancedFeedback.push(enhanced);
      }
    }

    return enhancedFeedback;
  }

  /**
   * Assess submission using rubric
   */
  async assessWithRubric(
    submissionId: string,
    rubric: Rubric,
    config: RubricAssessmentConfig,
    assessorId?: string
  ): Promise<RubricAssessmentResult[]> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const rubricResults: RubricAssessmentResult[] = [];

    // Assess each question that supports rubric assessment
    for (const question of assessment.questions) {
      if (question.type === 'essay' || question.type === 'file_upload') {
        const response = submission.responses.find(r => r.questionId === question.id);
        if (response) {
          const result = await this.rubricService.assessWithRubric(
            question,
            response,
            rubric,
            config,
            assessorId
          );
          rubricResults.push(result);
        }
      }
    }

    return rubricResults;
  }

  /**
   * Get learning analytics dashboard data for a user
   */
  async getLearningAnalyticsDashboard(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    overallProgress: any;
    skillMastery: any[];
    recentActivity: any[];
    achievements: any[];
    recommendations: any[];
  }> {
    return this.analyticsService.generateLearningAnalyticsDashboard(userId, timeRange);
  }

  /**
   * Get skill progression for a user
   */
  async getSkillProgression(userId: string, skillName?: string): Promise<Map<string, any[]>> {
    return this.analyticsService.getSkillProgression(userId, skillName);
  }

  /**
   * Generate adaptive feedback based on user history
   */
  async generateAdaptiveFeedback(
    submissionId: string,
    config: FeedbackGenerationConfig
  ): Promise<EnhancedFeedback[]> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const adaptiveFeedback: EnhancedFeedback[] = [];

    for (const question of assessment.questions) {
      const response = submission.responses.find(r => r.questionId === question.id);
      const basicFeedback = submission.feedback?.find(f => f.questionId === question.id);

      if (response && basicFeedback) {
        const gradingResult: GradingResult = {
          score: basicFeedback.score,
          maxScore: basicFeedback.maxScore,
          isCorrect: basicFeedback.score === basicFeedback.maxScore
        };

        const enhanced = await this.feedbackService.generateAdaptiveFeedback(
          question,
          response,
          gradingResult,
          submission.userId,
          config
        );

        adaptiveFeedback.push(enhanced);
      }
    }

    return adaptiveFeedback;
  }

  /**
   * Create rubric for assessment questions
   */
  async createRubric(
    name: string,
    description: string,
    criteria: any[],
    templateId?: string
  ): Promise<Rubric> {
    return this.rubricService.createRubric(name, description, criteria, templateId);
  }

  /**
   * Validate rubric quality
   */
  async validateRubric(rubric: Rubric): Promise<any> {
    return this.rubricService.validateRubric(rubric);
  }

  /**
   * Get rubric analytics
   */
  async getRubricAnalytics(rubricId: string): Promise<any> {
    return this.rubricService.getRubricAnalytics(rubricId);
  }

  /**
   * Perform peer assessment
   */
  async performPeerAssessment(
    submissionId: string,
    rubric: Rubric,
    peerConfig: any,
    peerIds: string[]
  ): Promise<RubricAssessmentResult[]> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const peerResults: RubricAssessmentResult[] = [];

    for (const question of assessment.questions) {
      if (question.type === 'essay' || question.type === 'file_upload') {
        const response = submission.responses.find(r => r.questionId === question.id);
        if (response) {
          const result = await this.rubricService.performPeerAssessment(
            question,
            response,
            rubric,
            peerConfig,
            peerIds
          );
          peerResults.push(result);
        }
      }
    }

    return peerResults;
  }

  /**
   * Perform self-assessment
   */
  async performSelfAssessment(
    submissionId: string,
    rubric: Rubric,
    selfConfig: any
  ): Promise<RubricAssessmentResult[]> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const assessment = this.assessments.get(submission.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const selfResults: RubricAssessmentResult[] = [];

    for (const question of assessment.questions) {
      if (question.type === 'essay' || question.type === 'file_upload') {
        const response = submission.responses.find(r => r.questionId === question.id);
        if (response) {
          const result = await this.rubricService.performSelfAssessment(
            question,
            response,
            rubric,
            submission.userId,
            selfConfig
          );
          selfResults.push(result);
        }
      }
    }

    return selfResults;
  }

  private generateId(): string {
    return `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface AssessmentAnalytics {
  assessmentId: string;
  totalSubmissions: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionAnalytics: QuestionAnalytics[];
  difficultyDistribution: Record<string, number>;
  completionRate: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionType: string;
  difficulty: string;
  totalResponses: number;
  correctResponses: number;
  correctRate: number;
  averageTimeSpent: number;
}