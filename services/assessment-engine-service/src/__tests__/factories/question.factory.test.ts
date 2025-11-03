import { QuestionFactory } from '../../factories/question.factory';
import { QuestionType } from '../../types/assessment.types';
import { MultipleChoiceHandler } from '../../handlers/multiple-choice.handler';
import { EssayHandler } from '../../handlers/essay.handler';
import { CodeSubmissionHandler } from '../../handlers/code-submission.handler';
import { FileUploadHandler } from '../../handlers/file-upload.handler';

describe('QuestionFactory', () => {
  let factory: QuestionFactory;

  beforeEach(() => {
    factory = new QuestionFactory();
  });

  describe('createHandler', () => {
    it('should create MultipleChoiceHandler for MULTIPLE_CHOICE type', () => {
      const handler = factory.createHandler(QuestionType.MULTIPLE_CHOICE);
      expect(handler).toBeInstanceOf(MultipleChoiceHandler);
      expect(handler.getSupportedType()).toBe(QuestionType.MULTIPLE_CHOICE);
    });

    it('should create EssayHandler for ESSAY type', () => {
      const handler = factory.createHandler(QuestionType.ESSAY);
      expect(handler).toBeInstanceOf(EssayHandler);
      expect(handler.getSupportedType()).toBe(QuestionType.ESSAY);
    });

    it('should create CodeSubmissionHandler for CODE_SUBMISSION type', () => {
      const handler = factory.createHandler(QuestionType.CODE_SUBMISSION);
      expect(handler).toBeInstanceOf(CodeSubmissionHandler);
      expect(handler.getSupportedType()).toBe(QuestionType.CODE_SUBMISSION);
    });

    it('should create FileUploadHandler for FILE_UPLOAD type', () => {
      const handler = factory.createHandler(QuestionType.FILE_UPLOAD);
      expect(handler).toBeInstanceOf(FileUploadHandler);
      expect(handler.getSupportedType()).toBe(QuestionType.FILE_UPLOAD);
    });

    it('should throw error for unsupported question type', () => {
      expect(() => {
        factory.createHandler('UNSUPPORTED_TYPE' as QuestionType);
      }).toThrow('No handler registered for question type: UNSUPPORTED_TYPE');
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all supported question types', () => {
      const types = factory.getSupportedTypes();
      expect(types).toContain(QuestionType.MULTIPLE_CHOICE);
      expect(types).toContain(QuestionType.ESSAY);
      expect(types).toContain(QuestionType.CODE_SUBMISSION);
      expect(types).toContain(QuestionType.FILE_UPLOAD);
      expect(types).toHaveLength(4);
    });
  });

  describe('isTypeSupported', () => {
    it('should return true for supported types', () => {
      expect(factory.isTypeSupported(QuestionType.MULTIPLE_CHOICE)).toBe(true);
      expect(factory.isTypeSupported(QuestionType.ESSAY)).toBe(true);
      expect(factory.isTypeSupported(QuestionType.CODE_SUBMISSION)).toBe(true);
      expect(factory.isTypeSupported(QuestionType.FILE_UPLOAD)).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(factory.isTypeSupported('UNSUPPORTED_TYPE' as QuestionType)).toBe(false);
    });
  });

  describe('registerHandler', () => {
    it('should register a new handler', () => {
      const mockHandler = {
        getSupportedType: () => QuestionType.TRUE_FALSE,
        validateQuestion: jest.fn(),
        validateResponse: jest.fn(),
        gradeResponse: jest.fn(),
        generateFeedback: jest.fn(),
        estimateTimeToComplete: jest.fn(),
        generatePreview: jest.fn()
      };

      factory.registerHandler(QuestionType.TRUE_FALSE, mockHandler as any);
      
      expect(factory.isTypeSupported(QuestionType.TRUE_FALSE)).toBe(true);
      const handler = factory.createHandler(QuestionType.TRUE_FALSE);
      expect(handler).toBe(mockHandler);
    });

    it('should throw error when handler type mismatch', () => {
      const mockHandler = {
        getSupportedType: () => QuestionType.ESSAY, // Mismatch
        validateQuestion: jest.fn(),
        validateResponse: jest.fn(),
        gradeResponse: jest.fn(),
        generateFeedback: jest.fn(),
        estimateTimeToComplete: jest.fn(),
        generatePreview: jest.fn()
      };

      expect(() => {
        factory.registerHandler(QuestionType.TRUE_FALSE, mockHandler as any);
      }).toThrow('Handler type mismatch: expected true_false, got essay');
    });
  });
});