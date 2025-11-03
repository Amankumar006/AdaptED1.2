import { AssessmentService } from '../../services/assessment.service';
import { QuestionBankService } from '../../services/question-bank.service';
import { AssessmentAnalyticsService } from '../../services/assessment-analytics.service';
import { AutomatedFeedbackService } from '../../services/automated-feedback.service';
import { RubricAssessmentService } from '../../services/rubric-assessment.service';
import {
  Assessment,
  AssessmentSubmission,
  Question,
  Response,
  Feedback,
  QuestionType,
  DifficultyLevel,
  AssessmentStatus,
  SubmissionStatus,
  MultipleChoiceQuestion,
  EssayQuestion,
  Rubric,
  RubricCriterion,
  RubricLevel
} from '../../types/assessment.types';

describe('Assessment Analytics and Feedback Integration', () => {
  let assessmentService: AssessmentService;
  let questionBankService: QuestionBankService;
  let analyticsService: AssessmentAnalyticsService;
  let feedbackService: AutomatedFeedbackService;
  let rubricService: RubricAssessmentService;

  beforeEach(() => {
    questionBankService = new QuestionBankService();
    assessmentService = new AssessmentService(questionBankService);
    analyticsService = new AssessmentAnalyticsService();
    feedbackService = new AutomatedFeedbackService();
    rubricService = new RubricAssessmentService();
  });

  describe('Detailed Performance Analytics', () => {
    it('should generate comprehensive performance analytics for a submission', async () => {
      // Create test assessment
      const assessment = await createTestAssessment();
      const submission = await createTestSubmission(assessment);

      const analytics = await assessmentService.generateDetailedAnalytics(submission.id);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(submission.userId);
      expect(analytics.assessmentId).toBe(submission.assessmentId);
      expect(analytics.overallPerformance).toBeDefined();
      expect(analytics.questionLevelAnalytics).toHaveLength(assessment.questions.length);
      expect(analytics.skillAnalytics).toBeDefined();
      expect(analytics.learningPathRecommendations).toBeDefined();
      expect(analytics.strengthsAndWeaknesses).toBeDefined();
      expect(analytics.comparativeAnalytics).toBeDefined();
      expect(analytics.temporalAnalytics).toBeDefined();
    });

    it('should identify strengths and weaknesses correctly', async () => {
      const assessment = await createTestAssessment();
      const submission = await createHighPerformanceSubmission(assessment);

      const analytics = await assessmentService.generateDetailedAnalytics(submission.id);

      expect(analytics.strengthsAndWeaknesses.strengths.length).toBeGreaterThan(0);
      expect(analytics.overallPerformance.percentage).toBeGreaterThan(80);
    });

    it('should provide learning path recommendations based on performance', async () => {
      const assessment = await createTestAssessment();
      const submission = await createLowPerformanceSubmission(assessment);

      const analytics = await assessmentService.generateDetailedAnalytics(submission.id);

      expect(analytics.learningPathRecommendations).toBeDefined();
      expect(analytics.learningPathRecommendations.length).toBeGreaterThan(0);
      
      const remediationRecommendations = analytics.learningPathRecommendations
        .filter(rec => rec.type === 'remediation');
      expect(remediationRecommendations.length).toBeGreaterThan(0);
    });

    it('should calculate comparative analytics correctly', async () => {
      const assessment = await createTestAssessment();
      const submissions = await createMultipleSubmissions(assessment, 10);

      const analytics = await assessmentService.generateDetailedAnalytics(submissions[0].id);

      expect(analytics.comparativeAnalytics).toBeDefined();
      expect(analytics.comparativeAnalytics.cohortComparison.cohortSize).toBe(10);
      expect(analytics.comparativeAnalytics.percentileRank).toBeGreaterThanOrEqual(0);
      expect(analytics.comparativeAnalytics.percentileRank).toBeLessThanOrEqual(100);
    });
  });

  describe('Assessment-Level Analytics', () => {
    it('should generate comprehensive assessment analytics', async () => {
      const assessment = await createTestAssessment();
      const submissions = await createMultipleSubmissions(assessment, 5);

      const analytics = await assessmentService.generateAssessmentAnalytics(assessment.id);

      expect(analytics).toBeDefined();
      expect(analytics.assessmentId).toBe(assessment.id);
      expect(analytics.totalSubmissions).toBe(5);
      expect(analytics.questionAnalytics).toHaveLength(assessment.questions.length);
      expect(analytics.difficultyAnalysis).toBeDefined();
      expect(analytics.timeAnalytics).toBeDefined();
      expect(analytics.engagementAnalytics).toBeDefined();
      expect(analytics.recommendations).toBeDefined();
    });

    it('should identify difficulty alignment issues', async () => {
      const assessment = await createTestAssessment();
      // Create submissions with consistently low scores
      const submissions = await createMultipleSubmissions(assessment, 5, { averageScore: 0.3 });

      const analytics = await assessmentService.generateAssessmentAnalytics(assessment.id);

      expect(analytics.difficultyAnalysis.difficultyAlignment).toBe('too_hard');
      expect(analytics.recommendations.some(rec => rec.category === 'difficulty')).toBe(true);
    });

    it('should provide question-level analytics', async () => {
      const assessment = await createTestAssessment();
      const submissions = await createMultipleSubmissions(assessment, 3);

      const analytics = await assessmentService.generateAssessmentAnalytics(assessment.id);

      for (const questionAnalytics of analytics.questionAnalytics) {
        expect(questionAnalytics.questionId).toBeDefined();
        expect(questionAnalytics.statistics.totalAttempts).toBeGreaterThan(0);
        expect(questionAnalytics.statistics.correctRate).toBeGreaterThanOrEqual(0);
        expect(questionAnalytics.statistics.correctRate).toBeLessThanOrEqual(100);
        expect(questionAnalytics.analysis.discriminationIndex).toBeDefined();
        expect(questionAnalytics.qualityMetrics).toBeDefined();
      }
    });
  });

  describe('Enhanced Feedback Generation', () => {
    it('should generate enhanced feedback for all question types', async () => {
      const assessment = await createTestAssessment();
      const submission = await createTestSubmission(assessment);

      const config = {
        includeExplanations: true,
        includeSuggestions: true,
        includeResources: true,
        personalizeForUser: true,
        adaptToPerformanceLevel: true,
        languageLevel: 'intermediate' as const,
        feedbackStyle: 'encouraging' as const
      };

      const enhancedFeedback = await assessmentService.generateEnhancedFeedback(
        submission.id,
        config
      );

      expect(enhancedFeedback).toBeDefined();
      expect(enhancedFeedback.length).toBe(assessment.questions.length);

      for (const feedback of enhancedFeedback) {
        expect(feedback.detailedAnalysis).toBeDefined();
        expect(feedback.personalizedSuggestions).toBeDefined();
        expect(feedback.learningResources).toBeDefined();
        expect(feedback.nextSteps).toBeDefined();
        expect(feedback.motivationalMessage).toBeDefined();
        expect(feedback.estimatedImprovementTime).toBeGreaterThan(0);
      }
    });

    it('should adapt feedback style based on configuration', async () => {
      const assessment = await createTestAssessment();
      const submission = await createTestSubmission(assessment);

      const encouragingConfig = {
        includeExplanations: true,
        includeSuggestions: true,
        includeResources: false,
        personalizeForUser: false,
        adaptToPerformanceLevel: true,
        languageLevel: 'beginner' as const,
        feedbackStyle: 'encouraging' as const
      };

      const directConfig = {
        ...encouragingConfig,
        feedbackStyle: 'direct' as const
      };

      const encouragingFeedback = await assessmentService.generateEnhancedFeedback(
        submission.id,
        encouragingConfig
      );

      const directFeedback = await assessmentService.generateEnhancedFeedback(
        submission.id,
        directConfig
      );

      expect(encouragingFeedback[0].motivationalMessage).not.toBe(directFeedback[0].motivationalMessage);
    });

    it('should provide personalized suggestions based on performance', async () => {
      const assessment = await createTestAssessment();
      const lowPerformanceSubmission = await createLowPerformanceSubmission(assessment);

      const config = {
        includeExplanations: true,
        includeSuggestions: true,
        includeResources: true,
        personalizeForUser: true,
        adaptToPerformanceLevel: true,
        languageLevel: 'intermediate' as const,
        feedbackStyle: 'detailed' as const
      };

      const feedback = await assessmentService.generateEnhancedFeedback(
        lowPerformanceSubmission.id,
        config
      );

      const highPrioritySuggestions = feedback.flatMap(f => f.personalizedSuggestions)
        .filter(s => s.priority === 'high');

      expect(highPrioritySuggestions.length).toBeGreaterThan(0);
      expect(highPrioritySuggestions.some(s => s.category === 'concept_review')).toBe(true);
    });
  });

  describe('Rubric-Based Assessment', () => {
    it('should create and validate rubrics', async () => {
      const rubric = await assessmentService.createRubric(
        'Essay Writing Rubric',
        'Comprehensive rubric for essay assessment',
        [
          {
            name: 'Content Quality',
            description: 'Quality and depth of content',
            weight: 0.4,
            levels: [
              { name: 'Excellent', description: 'Comprehensive and insightful', points: 4, indicators: [], examples: [] },
              { name: 'Good', description: 'Well-developed content', points: 3, indicators: [], examples: [] },
              { name: 'Satisfactory', description: 'Adequate content', points: 2, indicators: [], examples: [] },
              { name: 'Needs Improvement', description: 'Limited content', points: 1, indicators: [], examples: [] }
            ],
            assessmentGuidelines: [],
            commonMistakes: [],
            exemplars: []
          }
        ]
      );

      expect(rubric).toBeDefined();
      expect(rubric.criteria.length).toBe(1);
      expect(rubric.totalPoints).toBeGreaterThan(0);

      const validation = await assessmentService.validateRubric(rubric);
      expect(validation).toBeDefined();
    });

    it('should assess essay questions using rubrics', async () => {
      const assessment = await createEssayAssessment();
      const submission = await createEssaySubmission(assessment);
      const rubric = await createTestRubric();

      const config = {
        enableAIAssistance: true,
        requireHumanReview: false,
        confidenceThreshold: 0.7,
        enablePeerAssessment: false,
        allowSelfAssessment: false,
        weightingStrategy: 'equal' as const
      };

      const results = await assessmentService.assessWithRubric(
        submission.id,
        rubric,
        config
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result.rubricScores).toBeDefined();
      expect(result.overallFeedback).toBeDefined();
      expect(result.criterionFeedback).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should support peer assessment workflows', async () => {
      const assessment = await createEssayAssessment();
      const submission = await createEssaySubmission(assessment);
      const rubric = await createTestRubric();

      const peerConfig = {
        numberOfPeers: 3,
        anonymousAssessment: true,
        calibrationRequired: false,
        consensusThreshold: 0.7,
        enableDiscussion: false
      };

      const peerIds = ['peer1', 'peer2', 'peer3'];

      const results = await assessmentService.performPeerAssessment(
        submission.id,
        rubric,
        peerConfig,
        peerIds
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result.assessmentMetadata.assessmentMethod).toBe('peer');
      expect(result.assessmentMetadata.reviewCount).toBe(3);
      expect(result.assessmentMetadata.consensusLevel).toBeDefined();
    });
  });

  describe('Skill Progression Tracking', () => {
    it('should track skill progression over time', async () => {
      const userId = 'test-user-123';
      
      // Create multiple assessments over time
      const assessments = await createProgressionAssessments();
      const submissions = await createProgressionSubmissions(assessments, userId);

      // Get skill progression
      const skillProgression = await assessmentService.getSkillProgression(userId);

      expect(skillProgression).toBeDefined();
      expect(skillProgression.size).toBeGreaterThan(0);

      // Check that skills show progression
      for (const [skillName, progression] of skillProgression.entries()) {
        expect(progression.length).toBeGreaterThan(0);
        expect(progression[0].timestamp).toBeDefined();
        expect(progression[0].masteryLevel).toBeGreaterThanOrEqual(0);
        expect(progression[0].masteryLevel).toBeLessThanOrEqual(1);
      }
    });

    it('should provide learning analytics dashboard', async () => {
      const userId = 'test-user-123';
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const dashboard = await assessmentService.getLearningAnalyticsDashboard(userId, timeRange);

      expect(dashboard).toBeDefined();
      expect(dashboard.overallProgress).toBeDefined();
      expect(dashboard.skillMastery).toBeDefined();
      expect(dashboard.recentActivity).toBeDefined();
      expect(dashboard.achievements).toBeDefined();
      expect(dashboard.recommendations).toBeDefined();
    });
  });

  describe('Adaptive Feedback', () => {
    it('should generate adaptive feedback based on user history', async () => {
      const assessment = await createTestAssessment();
      const submission = await createTestSubmission(assessment);

      const config = {
        includeExplanations: true,
        includeSuggestions: true,
        includeResources: true,
        personalizeForUser: true,
        adaptToPerformanceLevel: true,
        languageLevel: 'intermediate' as const,
        feedbackStyle: 'encouraging' as const
      };

      const adaptiveFeedback = await assessmentService.generateAdaptiveFeedback(
        submission.id,
        config
      );

      expect(adaptiveFeedback).toBeDefined();
      expect(adaptiveFeedback.length).toBe(assessment.questions.length);

      // Adaptive feedback should include personalized elements
      for (const feedback of adaptiveFeedback) {
        expect(feedback.personalizedSuggestions.length).toBeGreaterThan(0);
        expect(feedback.motivationalMessage).toBeDefined();
        expect(feedback.learningResources.length).toBeGreaterThan(0);
      }
    });
  });

  // Helper functions for creating test data

  async function createTestAssessment(): Promise<Assessment> {
    const questions: Question[] = [
      {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'What is 2 + 2?' },
        points: 10,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['mathematics', 'arithmetic'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-creator',
        options: [
          { id: 'a', text: '3', isCorrect: false },
          { id: 'b', text: '4', isCorrect: true },
          { id: 'c', text: '5', isCorrect: false }
        ],
        allowMultiple: false
      } as MultipleChoiceQuestion,
      {
        id: 'q2',
        type: QuestionType.ESSAY,
        content: { text: 'Explain the concept of photosynthesis.' },
        points: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: ['biology', 'plants'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-creator',
        wordLimit: 500
      } as EssayQuestion
    ];

    return assessmentService.createAssessment({
      title: 'Test Assessment',
      description: 'A test assessment for analytics',
      instructions: 'Complete all questions',
      questions,
      settings: {
        timeLimit: 60,
        allowRetakes: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        showCorrectAnswers: true,
        isAdaptive: false
      },
      status: AssessmentStatus.PUBLISHED,
      tags: ['test'],
      createdBy: 'test-creator'
    });
  }

  async function createTestSubmission(assessment: Assessment): Promise<AssessmentSubmission> {
    const submission = await assessmentService.startAssessment(assessment.id, 'test-user-123');

    // Submit responses
    await assessmentService.submitResponse(submission.id, {
      questionId: 'q1',
      answer: 'b',
      timeSpent: 30000,
      attempts: 1,
      confidence: 0.8
    });

    await assessmentService.submitResponse(submission.id, {
      questionId: 'q2',
      answer: 'Photosynthesis is the process by which plants convert sunlight into energy...',
      timeSpent: 120000,
      attempts: 1,
      confidence: 0.7
    });

    return assessmentService.submitAssessment(submission.id);
  }

  async function createHighPerformanceSubmission(assessment: Assessment): Promise<AssessmentSubmission> {
    const submission = await assessmentService.startAssessment(assessment.id, 'high-performer');

    // Submit correct responses quickly
    await assessmentService.submitResponse(submission.id, {
      questionId: 'q1',
      answer: 'b',
      timeSpent: 15000,
      attempts: 1,
      confidence: 0.95
    });

    await assessmentService.submitResponse(submission.id, {
      questionId: 'q2',
      answer: 'Photosynthesis is a complex biological process where plants use chlorophyll to convert carbon dioxide and water into glucose using sunlight energy, releasing oxygen as a byproduct. This process is essential for life on Earth...',
      timeSpent: 90000,
      attempts: 1,
      confidence: 0.9
    });

    return assessmentService.submitAssessment(submission.id);
  }

  async function createLowPerformanceSubmission(assessment: Assessment): Promise<AssessmentSubmission> {
    const submission = await assessmentService.startAssessment(assessment.id, 'struggling-learner');

    // Submit incorrect/poor responses
    await assessmentService.submitResponse(submission.id, {
      questionId: 'q1',
      answer: 'a',
      timeSpent: 60000,
      attempts: 2,
      confidence: 0.3
    });

    await assessmentService.submitResponse(submission.id, {
      questionId: 'q2',
      answer: 'Plants make food from sun.',
      timeSpent: 180000,
      attempts: 1,
      confidence: 0.4
    });

    return assessmentService.submitAssessment(submission.id);
  }

  async function createMultipleSubmissions(
    assessment: Assessment, 
    count: number, 
    options?: { averageScore?: number }
  ): Promise<AssessmentSubmission[]> {
    const submissions: AssessmentSubmission[] = [];

    for (let i = 0; i < count; i++) {
      const userId = `user-${i}`;
      const submission = await assessmentService.startAssessment(assessment.id, userId);

      // Vary performance based on options
      const targetScore = options?.averageScore || Math.random();
      const correctAnswer = targetScore > 0.5 ? 'b' : 'a';
      const confidence = targetScore;

      await assessmentService.submitResponse(submission.id, {
        questionId: 'q1',
        answer: correctAnswer,
        timeSpent: 20000 + Math.random() * 40000,
        attempts: 1,
        confidence
      });

      await assessmentService.submitResponse(submission.id, {
        questionId: 'q2',
        answer: targetScore > 0.7 ? 'Detailed photosynthesis explanation...' : 'Basic answer',
        timeSpent: 60000 + Math.random() * 120000,
        attempts: 1,
        confidence
      });

      const completed = await assessmentService.submitAssessment(submission.id);
      submissions.push(completed);
    }

    return submissions;
  }

  async function createEssayAssessment(): Promise<Assessment> {
    const questions: Question[] = [
      {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Discuss the impact of climate change on global ecosystems.' },
        points: 50,
        difficulty: DifficultyLevel.ADVANCED,
        tags: ['environmental-science', 'climate-change', 'ecosystems'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-creator',
        wordLimit: 1000
      } as EssayQuestion
    ];

    return assessmentService.createAssessment({
      title: 'Essay Assessment',
      description: 'Advanced essay assessment',
      instructions: 'Write a comprehensive essay',
      questions,
      settings: {
        timeLimit: 120,
        allowRetakes: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        showCorrectAnswers: false,
        isAdaptive: false
      },
      status: AssessmentStatus.PUBLISHED,
      tags: ['essay'],
      createdBy: 'test-creator'
    });
  }

  async function createEssaySubmission(assessment: Assessment): Promise<AssessmentSubmission> {
    const submission = await assessmentService.startAssessment(assessment.id, 'essay-writer');

    await assessmentService.submitResponse(submission.id, {
      questionId: 'essay1',
      answer: 'Climate change has profound impacts on global ecosystems. Rising temperatures affect species distribution, alter precipitation patterns, and disrupt food chains. Many species face extinction due to habitat loss and changing environmental conditions. The melting of polar ice caps affects marine ecosystems, while deforestation accelerates the problem. Mitigation strategies include renewable energy adoption, conservation efforts, and international cooperation through agreements like the Paris Climate Accord.',
      timeSpent: 300000,
      attempts: 1,
      confidence: 0.8
    });

    return assessmentService.submitAssessment(submission.id);
  }

  async function createTestRubric(): Promise<Rubric> {
    return assessmentService.createRubric(
      'Comprehensive Essay Rubric',
      'Rubric for assessing essay quality',
      [
        {
          name: 'Content Quality',
          description: 'Depth and accuracy of content',
          weight: 0.4,
          levels: [
            { name: 'Excellent', description: 'Comprehensive and accurate', points: 4, indicators: [], examples: [] },
            { name: 'Good', description: 'Well-developed', points: 3, indicators: [], examples: [] },
            { name: 'Satisfactory', description: 'Adequate', points: 2, indicators: [], examples: [] },
            { name: 'Needs Improvement', description: 'Limited', points: 1, indicators: [], examples: [] }
          ],
          assessmentGuidelines: [],
          commonMistakes: [],
          exemplars: []
        },
        {
          name: 'Organization',
          description: 'Structure and flow of ideas',
          weight: 0.3,
          levels: [
            { name: 'Excellent', description: 'Clear and logical structure', points: 4, indicators: [], examples: [] },
            { name: 'Good', description: 'Well-organized', points: 3, indicators: [], examples: [] },
            { name: 'Satisfactory', description: 'Basic organization', points: 2, indicators: [], examples: [] },
            { name: 'Needs Improvement', description: 'Poor organization', points: 1, indicators: [], examples: [] }
          ],
          assessmentGuidelines: [],
          commonMistakes: [],
          exemplars: []
        }
      ]
    );
  }

  async function createProgressionAssessments(): Promise<Assessment[]> {
    // Create multiple assessments to track progression
    const assessments: Assessment[] = [];
    
    for (let i = 0; i < 3; i++) {
      const assessment = await createTestAssessment();
      assessments.push(assessment);
    }
    
    return assessments;
  }

  async function createProgressionSubmissions(
    assessments: Assessment[], 
    userId: string
  ): Promise<AssessmentSubmission[]> {
    const submissions: AssessmentSubmission[] = [];
    
    // Create submissions showing improvement over time
    for (let i = 0; i < assessments.length; i++) {
      const assessment = assessments[i];
      const submission = await assessmentService.startAssessment(assessment.id, userId);
      
      // Simulate improvement over time
      const performance = 0.4 + (i * 0.2); // 40%, 60%, 80%
      const correctAnswer = performance > 0.5 ? 'b' : 'a';
      
      await assessmentService.submitResponse(submission.id, {
        questionId: 'q1',
        answer: correctAnswer,
        timeSpent: 30000 - (i * 5000), // Getting faster
        attempts: 1,
        confidence: 0.5 + (i * 0.2)
      });

      await assessmentService.submitResponse(submission.id, {
        questionId: 'q2',
        answer: performance > 0.7 ? 'Detailed answer showing mastery' : 'Basic answer',
        timeSpent: 120000 - (i * 20000),
        attempts: 1,
        confidence: 0.5 + (i * 0.2)
      });

      const completed = await assessmentService.submitAssessment(submission.id);
      submissions.push(completed);
    }
    
    return submissions;
  }
});