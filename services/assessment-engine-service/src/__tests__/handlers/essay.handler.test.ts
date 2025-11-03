import { EssayHandler } from '../../handlers/essay.handler';
import { QuestionType, DifficultyLevel, EssayQuestion, Response } from '../../types/assessment.types';

describe('EssayHandler', () => {
  let handler: EssayHandler;

  beforeEach(() => {
    handler = new EssayHandler();
  });

  describe('getSupportedType', () => {
    it('should return ESSAY type', () => {
      expect(handler.getSupportedType()).toBe(QuestionType.ESSAY);
    });
  });

  describe('validateQuestion', () => {
    it('should validate a correct essay question', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: {
          text: 'Discuss the impact of climate change on global ecosystems.',
          instructions: 'Write a comprehensive essay of 500-800 words.'
        },
        wordLimit: 800,
        points: 25,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: ['environmental-science', 'climate-change'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject question with invalid word limit', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Write an essay.' },
        wordLimit: -10,
        points: 25,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_WORD_LIMIT')).toBe(true);
    });

    it('should warn about very low word limit', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Write a short response.' },
        wordLimit: 5,
        points: 10,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'LOW_WORD_LIMIT')).toBe(true);
    });

    it('should warn about missing rubric', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Write an essay about history.' },
        points: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: ['history'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_RUBRIC')).toBe(true);
    });

    it('should validate rubric when present', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Write an essay.' },
        rubric: {
          id: 'rubric1',
          criteria: [
            {
              id: 'content',
              name: 'Content Quality',
              description: 'Quality of content',
              levels: [
                {
                  id: 'excellent',
                  name: 'Excellent',
                  description: 'Outstanding content',
                  points: 4
                }
              ]
            }
          ],
          totalPoints: 4
        },
        points: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(true);
    });

    it('should reject question with invalid rubric', async () => {
      const question: EssayQuestion = {
        id: 'essay1',
        type: QuestionType.ESSAY,
        content: { text: 'Write an essay.' },
        rubric: {
          id: 'rubric1',
          criteria: [], // Empty criteria
          totalPoints: 0
        },
        points: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_RUBRIC_CRITERIA')).toBe(true);
    });
  });

  describe('validateResponse', () => {
    const question: EssayQuestion = {
      id: 'essay1',
      type: QuestionType.ESSAY,
      content: { text: 'Write about your favorite book.' },
      wordLimit: 300,
      points: 15,
      difficulty: DifficultyLevel.INTERMEDIATE,
      tags: ['literature'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'teacher1'
    };

    it('should validate correct response format', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 'My favorite book is "To Kill a Mockingbird" by Harper Lee. This novel explores themes of racial injustice and moral growth through the eyes of Scout Finch, a young girl in the American South. The story teaches valuable lessons about empathy, courage, and standing up for what is right, even when it is difficult.',
        timeSpent: 180000,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string response', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 123, // Should be string
        timeSpent: 60000,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RESPONSE_FORMAT')).toBe(true);
    });

    it('should reject empty response', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: '   ', // Empty/whitespace only
        timeSpent: 30000,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EMPTY_RESPONSE')).toBe(true);
    });

    it('should reject response exceeding word limit', async () => {
      const longResponse = 'word '.repeat(400); // 400 words, exceeds limit of 300
      const response: Response = {
        questionId: 'essay1',
        answer: longResponse,
        timeSpent: 300000,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EXCEEDS_WORD_LIMIT')).toBe(true);
    });

    it('should warn about very short response', async () => {
      const shortResponse = 'Short answer.'; // Much shorter than expected
      const response: Response = {
        questionId: 'essay1',
        answer: shortResponse,
        timeSpent: 30000,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'VERY_SHORT_RESPONSE')).toBe(true);
    });
  });

  describe('gradeResponse', () => {
    const question: EssayQuestion = {
      id: 'essay1',
      type: QuestionType.ESSAY,
      content: { text: 'Explain photosynthesis.' },
      wordLimit: 200,
      points: 20,
      difficulty: DifficultyLevel.INTERMEDIATE,
      tags: ['biology'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'teacher1'
    };

    it('should require manual grading for essays', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 'Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen. This process occurs in the chloroplasts of plant cells and is essential for life on Earth as it produces oxygen and serves as the foundation of most food chains.',
        timeSpent: 240000,
        attempts: 1
      };

      const result = await handler.gradeResponse(question, response);
      
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(20);
      expect(result.isCorrect).toBe(false);
      expect(result.metadata?.requiresManualGrading).toBe(true);
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.basicAnalysis).toBeDefined();
    });

    it('should perform basic analysis of essay content', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 'In this essay, I will discuss photosynthesis. Photosynthesis is important for plants. It helps them make food from sunlight. Therefore, photosynthesis is a crucial biological process.',
        timeSpent: 180000,
        attempts: 1
      };

      const result = await handler.gradeResponse(question, response);
      
      expect(result.metadata?.basicAnalysis).toBeDefined();
      expect(result.metadata?.basicAnalysis.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.basicAnalysis.sentenceCount).toBeGreaterThan(0);
      expect(result.metadata?.basicAnalysis.hasIntroduction).toBe(true);
      expect(result.metadata?.basicAnalysis.hasConclusion).toBe(true);
      expect(result.metadata?.basicAnalysis.readabilityScore).toBeGreaterThan(0);
    });
  });

  describe('generateFeedback', () => {
    const question: EssayQuestion = {
      id: 'essay1',
      type: QuestionType.ESSAY,
      content: { text: 'Write about renewable energy.' },
      wordLimit: 400,
      points: 25,
      difficulty: DifficultyLevel.INTERMEDIATE,
      tags: ['environmental-science'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'teacher1'
    };

    it('should generate comprehensive feedback for essay', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 'Renewable energy sources like solar and wind power are becoming increasingly important in our fight against climate change. These technologies offer clean alternatives to fossil fuels.',
        timeSpent: 300000,
        attempts: 1
      };

      const gradingResult = {
        score: 0,
        maxScore: 25,
        isCorrect: false,
        metadata: {
          wordCount: 28,
          basicAnalysis: {
            wordCount: 28,
            sentenceCount: 2,
            avgWordsPerSentence: 14,
            hasIntroduction: false,
            hasConclusion: false,
            readabilityScore: 75
          }
        }
      };

      const feedback = await handler.generateFeedback(question, response, gradingResult);
      
      expect(feedback.questionId).toBe('essay1');
      expect(feedback.score).toBe(0);
      expect(feedback.maxScore).toBe(25);
      expect(feedback.comments).toContain('Word count: 28');
      expect(feedback.comments).toContain('manual review');
      expect(feedback.suggestions?.length).toBeGreaterThan(0);
    });

    it('should provide specific suggestions for improvement', async () => {
      const response: Response = {
        questionId: 'essay1',
        answer: 'Solar power is good. Wind power is also good. They are renewable.',
        timeSpent: 120000,
        attempts: 1
      };

      const gradingResult = {
        score: 0,
        maxScore: 25,
        isCorrect: false,
        metadata: {
          wordCount: 12,
          basicAnalysis: {
            wordCount: 12,
            sentenceCount: 3,
            avgWordsPerSentence: 4,
            hasIntroduction: false,
            hasConclusion: false,
            readabilityScore: 90
          }
        }
      };

      const feedback = await handler.generateFeedback(question, response, gradingResult);
      
      expect(feedback.suggestions).toContain('Consider expanding your response with more details and examples.');
      expect(feedback.suggestions).toContain('Consider adding a clear introduction that outlines your main points.');
      expect(feedback.suggestions).toContain('Consider adding a conclusion that summarizes your key arguments.');
    });
  });

  describe('estimateTimeToComplete', () => {
    it('should estimate time based on word limit and complexity', () => {
      const shortEssay: EssayQuestion = {
        id: 'short',
        type: QuestionType.ESSAY,
        content: { text: 'Write a brief response.' },
        wordLimit: 100,
        points: 10,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const longEssay: EssayQuestion = {
        id: 'long',
        type: QuestionType.ESSAY,
        content: { text: 'Write a comprehensive analysis.' },
        wordLimit: 1500,
        points: 50,
        difficulty: DifficultyLevel.ADVANCED,
        tags: ['analysis', 'research'],
        rubric: {
          id: 'rubric1',
          criteria: [
            {
              id: 'c1',
              name: 'Content',
              description: 'Content quality',
              levels: []
            },
            {
              id: 'c2',
              name: 'Structure',
              description: 'Essay structure',
              levels: []
            },
            {
              id: 'c3',
              name: 'Analysis',
              description: 'Depth of analysis',
              levels: []
            }
          ],
          totalPoints: 50
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const shortTime = handler.estimateTimeToComplete(shortEssay);
      const longTime = handler.estimateTimeToComplete(longEssay);

      expect(shortTime).toBeGreaterThan(0);
      expect(longTime).toBeGreaterThan(shortTime);
      expect(longTime).toBeGreaterThan(600); // Should be more than base 10 minutes
    });
  });

  describe('text analysis utilities', () => {
    it('should count words correctly', () => {
      const text1 = 'Hello world';
      const text2 = 'This is a longer sentence with more words.';
      const text3 = '   Spaces   around   words   ';

      expect(handler['countWords'](text1)).toBe(2);
      expect(handler['countWords'](text2)).toBe(8);
      expect(handler['countWords'](text3)).toBe(3);
    });

    it('should detect introduction patterns', () => {
      const withIntro = 'In this essay, I will discuss the importance of education.';
      const withoutIntro = 'Education is very important for society.';

      expect(handler['hasIntroductionPattern'](withIntro)).toBe(true);
      expect(handler['hasIntroductionPattern'](withoutIntro)).toBe(false);
    });

    it('should detect conclusion patterns', () => {
      const withConclusion = 'Many factors contribute to success. In conclusion, hard work is essential.';
      const withoutConclusion = 'Many factors contribute to success. Hard work is one of them.';

      expect(handler['hasConclusionPattern'](withConclusion)).toBe(true);
      expect(handler['hasConclusionPattern'](withoutConclusion)).toBe(false);
    });

    it('should calculate readability score', () => {
      const simpleText = 'The cat sat on the mat. It was a big cat.';
      const complexText = 'The multifaceted implications of contemporary socioeconomic paradigms necessitate comprehensive analytical frameworks for adequate comprehension.';

      const simpleScore = handler['calculateSimpleReadabilityScore'](simpleText);
      const complexScore = handler['calculateSimpleReadabilityScore'](complexText);

      expect(simpleScore).toBeGreaterThan(complexScore);
      expect(simpleScore).toBeGreaterThan(0);
      expect(simpleScore).toBeLessThanOrEqual(100);
      expect(complexScore).toBeGreaterThanOrEqual(0);
      expect(complexScore).toBeLessThanOrEqual(100);
    });

    it('should estimate syllables reasonably', () => {
      const monosyllabic = 'cat dog run';
      const polysyllabic = 'education information communication';

      const monoSyllables = handler['estimateSyllables'](monosyllabic);
      const polySyllables = handler['estimateSyllables'](polysyllabic);

      expect(monoSyllables).toBeLessThan(polySyllables);
      expect(monoSyllables).toBeGreaterThan(0);
      expect(polySyllables).toBeGreaterThan(5);
    });
  });
});