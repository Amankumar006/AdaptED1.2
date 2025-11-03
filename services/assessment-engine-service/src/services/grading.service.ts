import * as Bull from 'bull';
const Queue = Bull.default || Bull;
import { Question, Response, Feedback } from '../types/assessment.types';
import { GradingResult } from '../interfaces/question.interface';
import { questionFactory } from '../factories/question.factory';
import { AIEssayGradingService } from './ai-essay-grading.service';
import { PlagiarismDetectionService } from './plagiarism-detection.service';
import { logger } from '../utils/logger';

export interface GradingJob {
  submissionId: string;
  assessmentId: string;
  userId: string;
  questionId: string;
  question: Question;
  response: Response;
  priority?: number;
}

export interface DistributedGradingResult extends GradingResult {
  submissionId: string;
  questionId: string;
  gradedAt: Date;
  gradingDuration: number;
  requiresManualReview: boolean;
  confidence: number;
  metadata: {
    gradingMethod: 'automatic' | 'ai_assisted' | 'manual';
    plagiarismScore?: number;
    aiConfidence?: number;
    processingNode?: string;
    [key: string]: any;
  };
}

export class DistributedGradingService {
  private gradingQueue: Bull.Queue<GradingJob>;
  private priorityGradingQueue: Bull.Queue<GradingJob>;
  private aiEssayGradingService: AIEssayGradingService;
  private plagiarismDetectionService: PlagiarismDetectionService;
  private gradingResults: Map<string, DistributedGradingResult> = new Map();
  private processingStats: Map<string, { processed: number; failed: number; avgDuration: number }> = new Map();

  constructor(redisConfig: any) {
    // Initialize Bull queues for distributed processing
    this.gradingQueue = new Queue<GradingJob>('grading', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.priorityGradingQueue = new Queue<GradingJob>('priority-grading', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.aiEssayGradingService = new AIEssayGradingService();
    this.plagiarismDetectionService = new PlagiarismDetectionService();

    this.setupQueueProcessors();
    this.setupQueueEventHandlers();
  }

  /**
   * Submit a grading job to the distributed queue
   */
  async submitGradingJob(
    submissionId: string,
    assessmentId: string,
    userId: string,
    question: Question,
    response: Response,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const gradingJob: GradingJob = {
      submissionId,
      assessmentId,
      userId,
      questionId: question.id,
      question,
      response,
      priority: this.getPriorityValue(priority),
    };

    const queue = priority === 'high' ? this.priorityGradingQueue : this.gradingQueue;
    const job = await queue.add('grade-response', gradingJob, {
      priority: gradingJob.priority,
      delay: priority === 'low' ? 5000 : 0, // Delay low priority jobs
    });

    logger.info(`Grading job submitted`, {
      jobId: job.id,
      submissionId,
      questionId: question.id,
      questionType: question.type,
      priority,
    });

    return job.id!.toString();
  }

  /**
   * Submit multiple grading jobs as a batch
   */
  async submitBatchGradingJobs(
    submissionId: string,
    assessmentId: string,
    userId: string,
    questionsAndResponses: Array<{ question: Question; response: Response }>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string[]> {
    const jobs = questionsAndResponses.map(({ question, response }) => ({
      name: 'grade-response',
      data: {
        submissionId,
        assessmentId,
        userId,
        questionId: question.id,
        question,
        response,
        priority: this.getPriorityValue(priority),
      } as GradingJob,
      opts: {
        priority: this.getPriorityValue(priority),
        delay: priority === 'low' ? 5000 : 0,
      },
    }));

    const queue = priority === 'high' ? this.priorityGradingQueue : this.gradingQueue;
    const submittedJobs = await queue.addBulk(jobs);

    const jobIds = submittedJobs.map(job => job.id!.toString());

    logger.info(`Batch grading jobs submitted`, {
      submissionId,
      assessmentId,
      jobCount: jobs.length,
      jobIds,
      priority,
    });

    return jobIds;
  }

  /**
   * Get grading result by submission and question
   */
  async getGradingResult(submissionId: string, questionId: string): Promise<DistributedGradingResult | null> {
    const key = `${submissionId}_${questionId}`;
    return this.gradingResults.get(key) || null;
  }

  /**
   * Get all grading results for a submission
   */
  async getSubmissionGradingResults(submissionId: string): Promise<DistributedGradingResult[]> {
    const results: DistributedGradingResult[] = [];
    
    for (const [key, result] of this.gradingResults.entries()) {
      if (result.submissionId === submissionId) {
        results.push(result);
      }
    }

    return results.sort((a, b) => a.gradedAt.getTime() - b.gradedAt.getTime());
  }

  /**
   * Check if all questions in a submission have been graded
   */
  async isSubmissionFullyGraded(submissionId: string, questionIds: string[]): Promise<boolean> {
    for (const questionId of questionIds) {
      const result = await this.getGradingResult(submissionId, questionId);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get grading queue statistics
   */
  async getQueueStatistics(): Promise<{
    normal: { waiting: number; active: number; completed: number; failed: number };
    priority: { waiting: number; active: number; completed: number; failed: number };
    processingStats: Record<string, { processed: number; failed: number; avgDuration: number }>;
  }> {
    const [normalWaiting, normalActive, normalCompleted, normalFailed] = await Promise.all([
      this.gradingQueue.getWaiting(),
      this.gradingQueue.getActive(),
      this.gradingQueue.getCompleted(),
      this.gradingQueue.getFailed(),
    ]);

    const [priorityWaiting, priorityActive, priorityCompleted, priorityFailed] = await Promise.all([
      this.priorityGradingQueue.getWaiting(),
      this.priorityGradingQueue.getActive(),
      this.priorityGradingQueue.getCompleted(),
      this.priorityGradingQueue.getFailed(),
    ]);

    return {
      normal: {
        waiting: normalWaiting.length,
        active: normalActive.length,
        completed: normalCompleted.length,
        failed: normalFailed.length,
      },
      priority: {
        waiting: priorityWaiting.length,
        active: priorityActive.length,
        completed: priorityCompleted.length,
        failed: priorityFailed.length,
      },
      processingStats: Object.fromEntries(this.processingStats),
    };
  }

  /**
   * Pause grading queues
   */
  async pauseGrading(): Promise<void> {
    await Promise.all([
      this.gradingQueue.pause(),
      this.priorityGradingQueue.pause(),
    ]);
    logger.info('Grading queues paused');
  }

  /**
   * Resume grading queues
   */
  async resumeGrading(): Promise<void> {
    await Promise.all([
      this.gradingQueue.resume(),
      this.priorityGradingQueue.resume(),
    ]);
    logger.info('Grading queues resumed');
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanupJobs(): Promise<void> {
    await Promise.all([
      this.gradingQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
      this.gradingQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'), // 7 days
      this.priorityGradingQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.priorityGradingQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
    ]);
    logger.info('Grading queue cleanup completed');
  }

  private setupQueueProcessors(): void {
    // Process normal priority grading jobs
    this.gradingQueue.process('grade-response', 5, async (job: Bull.Job<GradingJob>) => {
      return this.processGradingJob(job);
    });

    // Process high priority grading jobs
    this.priorityGradingQueue.process('grade-response', 10, async (job: Bull.Job<GradingJob>) => {
      return this.processGradingJob(job);
    });
  }

  private setupQueueEventHandlers(): void {
    // Handle job completion
    this.gradingQueue.on('completed', (job: Bull.Job<GradingJob>, result: DistributedGradingResult) => {
      this.updateProcessingStats(job.data.question.type, true, result.gradingDuration);
      logger.info(`Grading job completed`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
        score: result.score,
        duration: result.gradingDuration,
      });
    });

    this.priorityGradingQueue.on('completed', (job: Bull.Job<GradingJob>, result: DistributedGradingResult) => {
      this.updateProcessingStats(job.data.question.type, true, result.gradingDuration);
      logger.info(`Priority grading job completed`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
        score: result.score,
        duration: result.gradingDuration,
      });
    });

    // Handle job failures
    this.gradingQueue.on('failed', (job: Bull.Job<GradingJob>, err: Error) => {
      this.updateProcessingStats(job.data.question.type, false, 0);
      logger.error(`Grading job failed`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    this.priorityGradingQueue.on('failed', (job: Bull.Job<GradingJob>, err: Error) => {
      this.updateProcessingStats(job.data.question.type, false, 0);
      logger.error(`Priority grading job failed`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    // Handle job stalling
    this.gradingQueue.on('stalled', (job: Bull.Job<GradingJob>) => {
      logger.warn(`Grading job stalled`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
      });
    });

    this.priorityGradingQueue.on('stalled', (job: Bull.Job<GradingJob>) => {
      logger.warn(`Priority grading job stalled`, {
        jobId: job.id,
        submissionId: job.data.submissionId,
        questionId: job.data.questionId,
      });
    });
  }

  private async processGradingJob(job: Bull.Job<GradingJob>): Promise<DistributedGradingResult> {
    const startTime = Date.now();
    const { submissionId, questionId, question, response } = job.data;

    try {
      // Get the appropriate question handler
      const handler = questionFactory.createHandler(question.type);
      
      // Perform basic grading
      const basicGradingResult = await handler.gradeResponse(question, response);
      
      let gradingResult: DistributedGradingResult = {
        ...basicGradingResult,
        submissionId,
        questionId,
        gradedAt: new Date(),
        gradingDuration: Date.now() - startTime,
        requiresManualReview: false,
        confidence: 1.0,
        metadata: {
          gradingMethod: 'automatic',
          processingNode: process.env.NODE_ID || 'unknown',
        },
      };

      // Enhanced grading for specific question types
      if (question.type === 'essay') {
        gradingResult = await this.enhanceEssayGrading(gradingResult, question, response);
      } else if (question.type === 'code_submission') {
        gradingResult = await this.enhanceCodeGrading(gradingResult, question, response);
      }

      // Check for plagiarism if applicable
      if (question.type === 'essay' || question.type === 'code_submission') {
        const plagiarismResult = await this.plagiarismDetectionService.checkPlagiarism(
          response.answer,
          question.type,
          {
            userId: job.data.userId,
            assessmentId: job.data.assessmentId,
            questionId,
          }
        );

        gradingResult.metadata.plagiarismScore = plagiarismResult.similarityScore;
        
        if (plagiarismResult.similarityScore > 0.7) {
          gradingResult.requiresManualReview = true;
          gradingResult.confidence *= 0.5; // Reduce confidence due to potential plagiarism
        }
      }

      // Store the result
      const key = `${submissionId}_${questionId}`;
      this.gradingResults.set(key, gradingResult);

      // Update job progress
      await job.progress(100);

      return gradingResult;
    } catch (error) {
      logger.error(`Error processing grading job`, {
        jobId: job.id,
        submissionId,
        questionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async enhanceEssayGrading(
    basicResult: DistributedGradingResult,
    question: any,
    response: Response
  ): Promise<DistributedGradingResult> {
    try {
      const aiGradingResult = await this.aiEssayGradingService.gradeEssay(
        response.answer,
        question.rubric || question.sampleAnswer,
        {
          wordLimit: question.wordLimit,
          gradingCriteria: question.metadata?.gradingCriteria,
        }
      );

      return {
        ...basicResult,
        score: aiGradingResult.score,
        confidence: aiGradingResult.confidence,
        requiresManualReview: aiGradingResult.confidence < 0.8,
        metadata: {
          ...basicResult.metadata,
          gradingMethod: 'ai_assisted',
          aiConfidence: aiGradingResult.confidence,
          aiAnalysis: aiGradingResult.analysis,
          suggestedImprovements: aiGradingResult.suggestions,
        },
      };
    } catch (error) {
      logger.warn(`AI essay grading failed, falling back to basic grading`, {
        questionId: question.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        ...basicResult,
        requiresManualReview: true,
        confidence: 0.5,
      };
    }
  }

  private async enhanceCodeGrading(
    basicResult: DistributedGradingResult,
    question: any,
    response: Response
  ): Promise<DistributedGradingResult> {
    // Enhanced code grading could include:
    // - Code quality analysis
    // - Performance benchmarking
    // - Security vulnerability scanning
    // - Style guide compliance

    const codeAnalysis = {
      complexity: this.analyzeCodeComplexity(response.answer),
      style: this.analyzeCodeStyle(response.answer, question.language),
      security: this.analyzeCodeSecurity(response.answer),
    };

    let adjustedScore = basicResult.score;
    let confidence = basicResult.confidence;

    // Adjust score based on code quality
    if (codeAnalysis.complexity > 10) {
      adjustedScore *= 0.9; // Penalize overly complex code
    }

    if (codeAnalysis.style.score < 0.7) {
      adjustedScore *= 0.95; // Minor penalty for poor style
    }

    if (codeAnalysis.security.vulnerabilities.length > 0) {
      adjustedScore *= 0.8; // Significant penalty for security issues
      confidence *= 0.7;
    }

    return {
      ...basicResult,
      score: Math.max(0, adjustedScore),
      confidence,
      requiresManualReview: confidence < 0.8 || codeAnalysis.security.vulnerabilities.length > 0,
      metadata: {
        ...basicResult.metadata,
        codeAnalysis,
        qualityAdjustments: {
          complexityPenalty: basicResult.score - adjustedScore,
          styleAdjustment: codeAnalysis.style.score,
          securityIssues: codeAnalysis.security.vulnerabilities.length,
        },
      },
    };
  }

  private analyzeCodeComplexity(code: string): number {
    // Simplified cyclomatic complexity calculation
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
    let complexity = 1; // Base complexity

    for (const keyword of complexityKeywords) {
      const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private analyzeCodeStyle(code: string, language: string): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Basic style checks (simplified)
    if (!/^\s*\/\*[\s\S]*?\*\/|^\s*\/\//.test(code)) {
      issues.push('Missing comments');
      score -= 0.1;
    }

    if (language === 'javascript' || language === 'typescript') {
      if (!/;\s*$/.test(code.trim())) {
        issues.push('Missing semicolons');
        score -= 0.1;
      }
    }

    if (code.includes('\t') && code.includes('  ')) {
      issues.push('Inconsistent indentation');
      score -= 0.1;
    }

    return { score: Math.max(0, score), issues };
  }

  private analyzeCodeSecurity(code: string): { vulnerabilities: string[]; riskLevel: 'low' | 'medium' | 'high' } {
    const vulnerabilities: string[] = [];

    // Basic security checks (simplified)
    if (code.includes('eval(')) {
      vulnerabilities.push('Use of eval() function');
    }

    if (code.includes('innerHTML') && !code.includes('sanitize')) {
      vulnerabilities.push('Potential XSS vulnerability with innerHTML');
    }

    if (code.includes('document.write')) {
      vulnerabilities.push('Use of document.write');
    }

    if (/password\s*=\s*["'][^"']*["']/.test(code)) {
      vulnerabilities.push('Hardcoded password detected');
    }

    const riskLevel = vulnerabilities.length === 0 ? 'low' : 
                     vulnerabilities.length <= 2 ? 'medium' : 'high';

    return { vulnerabilities, riskLevel };
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 10;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  private updateProcessingStats(questionType: string, success: boolean, duration: number): void {
    const stats = this.processingStats.get(questionType) || { processed: 0, failed: 0, avgDuration: 0 };
    
    if (success) {
      stats.processed++;
      stats.avgDuration = (stats.avgDuration * (stats.processed - 1) + duration) / stats.processed;
    } else {
      stats.failed++;
    }

    this.processingStats.set(questionType, stats);
  }

  /**
   * Shutdown the grading service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down distributed grading service...');
    
    await Promise.all([
      this.gradingQueue.close(),
      this.priorityGradingQueue.close(),
    ]);

    logger.info('Distributed grading service shutdown complete');
  }
}