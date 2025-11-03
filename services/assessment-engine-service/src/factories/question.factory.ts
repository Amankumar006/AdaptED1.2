import { QuestionType } from '../types/assessment.types';
import { IQuestionHandler, IQuestionFactory } from '../interfaces/question.interface';
import { MultipleChoiceHandler } from '../handlers/multiple-choice.handler';
import { EssayHandler } from '../handlers/essay.handler';
import { CodeSubmissionHandler } from '../handlers/code-submission.handler';
import { FileUploadHandler } from '../handlers/file-upload.handler';

export class QuestionFactory implements IQuestionFactory {
  private handlers: Map<QuestionType, IQuestionHandler> = new Map();

  constructor() {
    this.initializeDefaultHandlers();
  }

  private initializeDefaultHandlers(): void {
    this.registerHandler(QuestionType.MULTIPLE_CHOICE, new MultipleChoiceHandler());
    this.registerHandler(QuestionType.ESSAY, new EssayHandler());
    this.registerHandler(QuestionType.CODE_SUBMISSION, new CodeSubmissionHandler());
    this.registerHandler(QuestionType.FILE_UPLOAD, new FileUploadHandler());
  }

  createHandler(type: QuestionType): IQuestionHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for question type: ${type}`);
    }
    return handler;
  }

  registerHandler(type: QuestionType, handler: IQuestionHandler): void {
    if (handler.getSupportedType() !== type) {
      throw new Error(`Handler type mismatch: expected ${type}, got ${handler.getSupportedType()}`);
    }
    this.handlers.set(type, handler);
  }

  getSupportedTypes(): QuestionType[] {
    return Array.from(this.handlers.keys());
  }

  isTypeSupported(type: QuestionType): boolean {
    return this.handlers.has(type);
  }
}

// Singleton instance
export const questionFactory = new QuestionFactory();