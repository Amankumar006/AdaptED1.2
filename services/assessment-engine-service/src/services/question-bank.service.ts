import { 
  Question, 
  QuestionBank, 
  QuestionBankFilter, 
  QuestionType, 
  DifficultyLevel 
} from '../types/assessment.types';
import { questionFactory } from '../factories/question.factory';
import { ValidationResult } from '../interfaces/question.interface';

export class QuestionBankService {
  private questionBanks: Map<string, QuestionBank> = new Map();
  private questions: Map<string, Question> = new Map();

  async createQuestionBank(bankData: Omit<QuestionBank, 'id' | 'questions' | 'createdAt' | 'updatedAt'>): Promise<QuestionBank> {
    const bank: QuestionBank = {
      id: this.generateId(),
      ...bankData,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.questionBanks.set(bank.id, bank);
    return bank;
  }

  async getQuestionBank(bankId: string): Promise<QuestionBank | null> {
    return this.questionBanks.get(bankId) || null;
  }

  async updateQuestionBank(bankId: string, updates: Partial<QuestionBank>): Promise<QuestionBank | null> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return null;

    const updatedBank = {
      ...bank,
      ...updates,
      id: bank.id, // Prevent ID changes
      createdAt: bank.createdAt, // Prevent creation date changes
      updatedAt: new Date()
    };

    this.questionBanks.set(bankId, updatedBank);
    return updatedBank;
  }

  async deleteQuestionBank(bankId: string): Promise<boolean> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return false;

    // Remove all questions from the bank
    bank.questions.forEach(question => {
      this.questions.delete(question.id);
    });

    this.questionBanks.delete(bankId);
    return true;
  }

  async addQuestionToBank(bankId: string, question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question | null> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return null;

    // Validate the question using the appropriate handler
    const handler = questionFactory.createHandler(question.type);
    const fullQuestion: Question = {
      id: this.generateId(),
      ...question,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Question;

    const validation = await handler.validateQuestion(fullQuestion);
    if (!validation.isValid) {
      throw new Error(`Question validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Add question to storage
    this.questions.set(fullQuestion.id, fullQuestion);

    // Add question to bank
    bank.questions.push(fullQuestion);
    bank.updatedAt = new Date();

    this.questionBanks.set(bankId, bank);
    return fullQuestion;
  }

  async removeQuestionFromBank(bankId: string, questionId: string): Promise<boolean> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return false;

    const questionIndex = bank.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return false;

    // Remove from bank
    bank.questions.splice(questionIndex, 1);
    bank.updatedAt = new Date();

    // Remove from storage
    this.questions.delete(questionId);

    this.questionBanks.set(bankId, bank);
    return true;
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    return this.questions.get(questionId) || null;
  }

  async updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question | null> {
    const question = this.questions.get(questionId);
    if (!question) return null;

    const updatedQuestion = {
      ...question,
      ...updates,
      id: question.id, // Prevent ID changes
      createdAt: question.createdAt, // Prevent creation date changes
      updatedAt: new Date()
    } as Question;

    // Validate the updated question
    const handler = questionFactory.createHandler(updatedQuestion.type);
    const validation = await handler.validateQuestion(updatedQuestion);
    if (!validation.isValid) {
      throw new Error(`Question validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.questions.set(questionId, updatedQuestion);

    // Update in all banks that contain this question
    for (const bank of this.questionBanks.values()) {
      const questionIndex = bank.questions.findIndex(q => q.id === questionId);
      if (questionIndex !== -1) {
        bank.questions[questionIndex] = updatedQuestion;
        bank.updatedAt = new Date();
      }
    }

    return updatedQuestion;
  }

  async searchQuestions(filter: QuestionBankFilter): Promise<Question[]> {
    let questions = Array.from(this.questions.values());

    // Apply filters
    if (filter.type) {
      questions = questions.filter(q => q.type === filter.type);
    }

    if (filter.difficulty) {
      questions = questions.filter(q => q.difficulty === filter.difficulty);
    }

    if (filter.tags && filter.tags.length > 0) {
      questions = questions.filter(q => 
        filter.tags!.some(tag => q.tags.includes(tag))
      );
    }

    if (filter.createdBy) {
      questions = questions.filter(q => q.createdBy === filter.createdBy);
    }

    if (filter.organizationId) {
      // Find questions in banks belonging to the organization
      const orgBanks = Array.from(this.questionBanks.values())
        .filter(bank => bank.organizationId === filter.organizationId);
      
      const orgQuestionIds = new Set(
        orgBanks.flatMap(bank => bank.questions.map(q => q.id))
      );

      questions = questions.filter(q => orgQuestionIds.has(q.id));
    }

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      questions = questions.filter(q => 
        q.content.text.toLowerCase().includes(searchTerm) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    return questions;
  }

  async getQuestionsByBank(bankId: string, filter?: Partial<QuestionBankFilter>): Promise<Question[]> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return [];

    let questions = [...bank.questions];

    if (filter) {
      if (filter.type) {
        questions = questions.filter(q => q.type === filter.type);
      }

      if (filter.difficulty) {
        questions = questions.filter(q => q.difficulty === filter.difficulty);
      }

      if (filter.tags && filter.tags.length > 0) {
        questions = questions.filter(q => 
          filter.tags!.some(tag => q.tags.includes(tag))
        );
      }

      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        questions = questions.filter(q => 
          q.content.text.toLowerCase().includes(searchTerm) ||
          q.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
    }

    return questions;
  }

  async getQuestionBanks(organizationId?: string, isPublic?: boolean): Promise<QuestionBank[]> {
    let banks = Array.from(this.questionBanks.values());

    if (organizationId !== undefined) {
      banks = banks.filter(bank => bank.organizationId === organizationId);
    }

    if (isPublic !== undefined) {
      banks = banks.filter(bank => bank.isPublic === isPublic);
    }

    return banks;
  }

  async duplicateQuestion(questionId: string, newBankId?: string): Promise<Question | null> {
    const originalQuestion = this.questions.get(questionId);
    if (!originalQuestion) return null;

    const duplicatedQuestion: Question = {
      ...originalQuestion,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.questions.set(duplicatedQuestion.id, duplicatedQuestion);

    // Add to specified bank if provided
    if (newBankId) {
      const bank = this.questionBanks.get(newBankId);
      if (bank) {
        bank.questions.push(duplicatedQuestion);
        bank.updatedAt = new Date();
        this.questionBanks.set(newBankId, bank);
      }
    }

    return duplicatedQuestion;
  }

  async getQuestionStatistics(bankId?: string): Promise<QuestionStatistics> {
    let questions: Question[];

    if (bankId) {
      const bank = this.questionBanks.get(bankId);
      questions = bank ? bank.questions : [];
    } else {
      questions = Array.from(this.questions.values());
    }

    const stats: QuestionStatistics = {
      total: questions.length,
      byType: {},
      byDifficulty: {},
      byTag: {},
      averagePoints: 0
    };

    // Calculate statistics
    let totalPoints = 0;

    questions.forEach(question => {
      // Count by type
      stats.byType[question.type] = (stats.byType[question.type] || 0) + 1;

      // Count by difficulty
      stats.byDifficulty[question.difficulty] = (stats.byDifficulty[question.difficulty] || 0) + 1;

      // Count by tags
      question.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });

      totalPoints += question.points;
    });

    stats.averagePoints = questions.length > 0 ? totalPoints / questions.length : 0;

    return stats;
  }

  async validateQuestion(question: Question): Promise<ValidationResult> {
    const handler = questionFactory.createHandler(question.type);
    return handler.validateQuestion(question);
  }

  async bulkImportQuestions(bankId: string, questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<BulkImportResult> {
    const bank = this.questionBanks.get(bankId);
    if (!bank) {
      throw new Error('Question bank not found');
    }

    const result: BulkImportResult = {
      successful: [],
      failed: [],
      totalProcessed: questions.length
    };

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = await this.addQuestionToBank(bankId, questions[i]);
        if (question) {
          result.successful.push({
            index: i,
            questionId: question.id,
            question
          });
        }
      } catch (error) {
        result.failed.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          question: questions[i]
        });
      }
    }

    return result;
  }

  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface QuestionStatistics {
  total: number;
  byType: Partial<Record<QuestionType, number>>;
  byDifficulty: Partial<Record<DifficultyLevel, number>>;
  byTag: Record<string, number>;
  averagePoints: number;
}

export interface BulkImportResult {
  successful: Array<{
    index: number;
    questionId: string;
    question: Question;
  }>;
  failed: Array<{
    index: number;
    error: string;
    question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;
  }>;
  totalProcessed: number;
}