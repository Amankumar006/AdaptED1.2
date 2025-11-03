import { LLMOrchestratorService } from './llm-orchestrator.service';
import { CacheService } from './cache.service';
import { ContextService } from './context.service';
import { PromptEngineeringService } from './prompt-engineering.service';
import { SafetyService } from './safety.service';
import { ContentModerationService } from './content-moderation.service';
import { EscalationService } from './escalation.service';
import { LLMRequest, LLMResponse, QueryType, InputType, ConversationMessage, SafetyCheck, EscalationEvent } from '../types/ai.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AIService {
  private orchestrator: LLMOrchestratorService;
  private cache: CacheService;
  private contextService: ContextService;
  private promptService: PromptEngineeringService;
  private safetyService: SafetyService;
  private moderationService: ContentModerationService;
  private escalationService: EscalationService;

  constructor() {
    this.orchestrator = new LLMOrchestratorService();
    this.cache = new CacheService();
    this.contextService = new ContextService(this.cache);
    this.promptService = new PromptEngineeringService();
    this.safetyService = new SafetyService();
    this.moderationService = new ContentModerationService();
    this.escalationService = new EscalationService();
  }

  async initialize(): Promise<void> {
    try {
      await this.cache.connect();
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.cache.disconnect();
      logger.info('AI Service shutdown completed');
    } catch (error) {
      logger.error('Error during AI Service shutdown:', error);
    }
  }

  async processQuery(
    userId: string,
    sessionId: string,
    query: string,
    options: {
      queryType?: QueryType;
      inputType?: InputType;
      context?: any;
      courseContext?: any;
      userProfile?: any;
    } = {}
  ): Promise<LLMResponse> {
    const requestId = uuidv4();
    
    const request: LLMRequest = {
      id: requestId,
      userId,
      sessionId,
      query: query.trim(),
      queryType: options.queryType || this.detectQueryType(query),
      inputType: options.inputType || InputType.TEXT,
      context: options.context,
      courseContext: options.courseContext,
      userProfile: options.userProfile,
      timestamp: new Date(),
    };

    logger.info(`Processing query request ${requestId} for user ${userId}`);

    try {
      // Perform input safety checks and moderation
      const inputModeration = await this.moderationService.moderateInput(request);
      const inputSafetyChecks = await this.safetyService.performInputSafetyChecks(request);

      // Block inappropriate input
      if (!inputModeration.isAppropriate || inputSafetyChecks.some(check => !check.passed && check.confidence >= 0.8)) {
        const safeResponse = await this.moderationService.generateSafeContent(
          request.query,
          inputModeration,
          request.userProfile
        );
        
        return {
          id: uuidv4(),
          requestId: request.id,
          response: safeResponse,
          provider: 'safety_filter' as any,
          model: 'content_moderation',
          confidence: 1.0,
          safetyLevel: inputModeration.severity,
          tokensUsed: 0,
          responseTime: 0,
          cached: false,
          timestamp: new Date(),
          metadata: {
            contentWarnings: inputModeration.categories,
            escalationRecommended: inputModeration.suggestedAction === 'escalate'
          }
        };
      }

      // Check cache for safe content
      const cachedResponse = await this.cache.getCachedResponse(request);
      if (cachedResponse) {
        logger.info(`Returning cached response for request ${requestId}`);
        return cachedResponse;
      }

      // Enrich request with context
      const enrichedRequest = await this.contextService.enrichRequestWithContext(request);
      
      // Generate new response
      const response = await this.orchestrator.generateResponse(enrichedRequest);
      
      // Perform output safety checks and moderation
      const outputModeration = await this.moderationService.moderateOutput(response, request);
      const outputSafetyChecks = await this.safetyService.performOutputSafetyChecks(response, request);

      // Apply age-appropriate filtering
      let filteredResponse = response.response;
      if (request.userProfile?.age || request.userProfile?.gradeLevel) {
        filteredResponse = await this.safetyService.applyAgeAppropriateFiltering(
          response.response,
          request.userProfile.age,
          request.userProfile.gradeLevel
        );
      }

      // Check if escalation is needed
      const allSafetyChecks = [...inputSafetyChecks, ...outputSafetyChecks];
      const escalationEvaluation = await this.safetyService.shouldEscalateToHuman(
        request,
        response,
        inputSafetyChecks,
        outputSafetyChecks
      );

      // Create escalation if needed
      if (escalationEvaluation.shouldEscalate) {
        await this.safetyService.createEscalationEvent(
          request,
          response,
          escalationEvaluation.reason,
          escalationEvaluation.severity
        );
      }

      // Update response with safety information
      const safeResponse: LLMResponse = {
        ...response,
        response: filteredResponse,
        safetyLevel: escalationEvaluation.severity,
        metadata: {
          ...response.metadata,
          contentWarnings: outputModeration.categories,
          escalationRecommended: escalationEvaluation.shouldEscalate,
          safetyChecks: allSafetyChecks
        }
      };

      // Update conversation context with the new interaction
      await this.updateConversationHistory(request, safeResponse);
      
      // Cache the safe response
      await this.cache.cacheResponse(enrichedRequest, safeResponse);
      
      logger.info(`Generated safe response for request ${requestId} in ${response.responseTime}ms`);
      
      return safeResponse;
    } catch (error) {
      logger.error(`Failed to process query ${requestId}:`, error);
      throw error;
    }
  }

  async processQueryWithFailover(
    userId: string,
    sessionId: string,
    query: string,
    options: {
      queryType?: QueryType;
      inputType?: InputType;
      context?: any;
      courseContext?: any;
      userProfile?: any;
    } = {}
  ): Promise<LLMResponse> {
    const requestId = uuidv4();
    
    const request: LLMRequest = {
      id: requestId,
      userId,
      sessionId,
      query: query.trim(),
      queryType: options.queryType || this.detectQueryType(query),
      inputType: options.inputType || InputType.TEXT,
      context: options.context,
      courseContext: options.courseContext,
      userProfile: options.userProfile,
      timestamp: new Date(),
    };

    logger.info(`Processing query with failover for request ${requestId}`);

    try {
      // Check cache first
      const cachedResponse = await this.cache.getCachedResponse(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Generate response with failover
      const response = await this.orchestrator.generateResponseWithFailover(request);
      
      // Cache the response
      await this.cache.cacheResponse(request, response);
      
      return response;
    } catch (error) {
      logger.error(`Failed to process query with failover ${requestId}:`, error);
      throw error;
    }
  }

  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, boolean>;
    cache: boolean;
    details: any;
  }> {
    try {
      const providerHealth = await this.orchestrator.getProviderHealth();
      const cacheStats = await this.cache.getCacheStats();
      
      const healthyProviders = Array.from(providerHealth.values()).filter(Boolean).length;
      const totalProviders = providerHealth.size;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (healthyProviders === 0) {
        status = 'unhealthy';
      } else if (healthyProviders < totalProviders) {
        status = 'degraded';
      }

      return {
        status,
        providers: Object.fromEntries(providerHealth),
        cache: cacheStats.totalKeys >= 0, // Cache is working if we can get stats
        details: {
          availableProviders: this.orchestrator.getAvailableProviders(),
          cacheStats,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error('Error checking service health:', error);
      return {
        status: 'unhealthy',
        providers: {},
        cache: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  async getUsageStats(): Promise<{
    totalRequests: number;
    cacheHitRate: number;
    averageResponseTime: number;
    providerUsage: Record<string, number>;
  }> {
    try {
      const cacheStats = await this.cache.getCacheStats();
      
      // In a production system, these would come from a metrics store
      return {
        totalRequests: cacheStats.hits + cacheStats.misses,
        cacheHitRate: cacheStats.hitRate,
        averageResponseTime: 0, // Would be calculated from stored metrics
        providerUsage: {}, // Would be calculated from stored metrics
      };
    } catch (error) {
      logger.error('Error getting usage stats:', error);
      return {
        totalRequests: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        providerUsage: {},
      };
    }
  }

  async estimateQueryCost(
    query: string,
    options: {
      queryType?: QueryType;
      inputType?: InputType;
      context?: any;
      courseContext?: any;
      userProfile?: any;
    } = {}
  ): Promise<number> {
    const request: LLMRequest = {
      id: uuidv4(),
      userId: 'estimate',
      sessionId: 'estimate',
      query: query.trim(),
      queryType: options.queryType || this.detectQueryType(query),
      inputType: options.inputType || InputType.TEXT,
      context: options.context,
      courseContext: options.courseContext,
      userProfile: options.userProfile,
      timestamp: new Date(),
    };

    return await this.orchestrator.estimateRequestCost(request);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidateUserCache(userId);
  }

  async invalidateSessionCache(sessionId: string): Promise<void> {
    await this.cache.invalidateSessionCache(sessionId);
  }

  async clearAllCache(): Promise<void> {
    await this.cache.clearCache();
  }

  async updateConversationHistory(request: LLMRequest, response: LLMResponse): Promise<void> {
    try {
      // Add user message
      const userMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: request.query,
        timestamp: request.timestamp,
        metadata: {
          inputType: request.inputType,
          processingTime: 0,
          safetyChecks: [],
          modelUsed: response.model,
          provider: response.provider,
        },
      };

      // Add assistant response
      const assistantMessage: ConversationMessage = {
        id: response.id,
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        metadata: {
          inputType: request.inputType,
          processingTime: response.responseTime,
          safetyChecks: [],
          modelUsed: response.model,
          provider: response.provider,
        },
      };

      // Update context with both messages
      await this.contextService.updateConversationContext(
        request.userId,
        request.sessionId,
        userMessage,
        request.courseContext?.subject,
        request.courseContext?.currentLesson
      );

      await this.contextService.updateConversationContext(
        request.userId,
        request.sessionId,
        assistantMessage,
        request.courseContext?.subject,
        request.courseContext?.currentLesson
      );
    } catch (error) {
      logger.error('Error updating conversation history:', error);
    }
  }

  async getConversationContext(userId: string, sessionId: string): Promise<any> {
    return await this.contextService.getConversationContext(userId, sessionId);
  }

  async generateContextualResponse(
    userId: string,
    sessionId: string,
    query: string,
    options: {
      queryType?: QueryType;
      inputType?: InputType;
      context?: any;
      courseContext?: any;
      userProfile?: any;
      includeFollowUps?: boolean;
    } = {}
  ): Promise<LLMResponse & { followUpQuestions?: string[] }> {
    const response = await this.processQuery(userId, sessionId, query, options);
    
    if (options.includeFollowUps) {
      const followUpQuestions = this.promptService.generateFollowUpQuestions(
        options.queryType || this.detectQueryType(query),
        options.courseContext?.subject,
        options.courseContext?.gradeLevel || options.userProfile?.gradeLevel
      );
      
      return {
        ...response,
        followUpQuestions,
      };
    }
    
    return response;
  }

  /**
   * Gets safety and compliance status for a user
   */
  async getUserSafetyStatus(userId: string): Promise<{
    escalationHistory: EscalationEvent[];
    activeEscalations: number;
    safetyLevel: string;
    parentalControlsActive: boolean;
  }> {
    const escalationHistory = await this.escalationService.getUserEscalationHistory(userId, 10);
    const activeEscalations = escalationHistory.filter(e => !e.resolved).length;
    
    return {
      escalationHistory,
      activeEscalations,
      safetyLevel: activeEscalations > 0 ? 'monitored' : 'normal',
      parentalControlsActive: false // Would be determined from user profile
    };
  }

  /**
   * Updates content moderation settings
   */
  async updateModerationSettings(settings: any): Promise<void> {
    await this.moderationService.updateContentFilters(settings);
    logger.info('Content moderation settings updated');
  }

  /**
   * Assigns a teacher to a student for escalation purposes
   */
  async assignTeacherToStudent(studentId: string, teacherId: string): Promise<void> {
    await this.escalationService.assignTeacherToStudent(studentId, teacherId);
    logger.info(`Teacher ${teacherId} assigned to student ${studentId}`);
  }

  /**
   * Gets escalation metrics for monitoring
   */
  async getEscalationMetrics(timeRange?: { start: Date; end: Date }): Promise<any> {
    return await this.escalationService.getEscalationMetrics(timeRange);
  }

  /**
   * Resolves an escalation event
   */
  async resolveEscalation(
    escalationId: string,
    teacherId: string,
    resolution: string,
    followUpActions?: string[]
  ): Promise<boolean> {
    return await this.escalationService.resolveEscalation(escalationId, teacherId, resolution, followUpActions);
  }

  /**
   * Gets active escalations for a teacher
   */
  async getTeacherEscalations(teacherId: string): Promise<EscalationEvent[]> {
    return await this.escalationService.getTeacherEscalations(teacherId);
  }

  /**
   * Performs a safety audit on a conversation
   */
  async auditConversation(userId: string, sessionId: string): Promise<{
    totalMessages: number;
    safetyViolations: number;
    escalations: number;
    overallSafetyScore: number;
    recommendations: string[];
  }> {
    // In production, this would analyze the full conversation history
    const context = await this.contextService.getConversationContext(userId, sessionId);
    const escalationHistory = await this.escalationService.getUserEscalationHistory(userId);
    
    return {
      totalMessages: context?.history?.length || 0,
      safetyViolations: 0, // Would be calculated from safety checks
      escalations: escalationHistory.length,
      overallSafetyScore: 0.95, // Would be calculated from safety metrics
      recommendations: [
        'Continue monitoring for safety compliance',
        'Regular check-ins with assigned teacher recommended'
      ]
    };
  }

  private detectQueryType(query: string): QueryType {
    const lowercaseQuery = query.toLowerCase();
    
    // Code-related keywords
    if (lowercaseQuery.includes('code') || 
        lowercaseQuery.includes('program') || 
        lowercaseQuery.includes('function') ||
        lowercaseQuery.includes('algorithm') ||
        /\b(python|javascript|java|c\+\+|html|css)\b/.test(lowercaseQuery)) {
      return QueryType.CODE_ASSISTANCE;
    }
    
    // Math-related keywords
    if (lowercaseQuery.includes('calculate') || 
        lowercaseQuery.includes('solve') || 
        lowercaseQuery.includes('equation') ||
        lowercaseQuery.includes('formula') ||
        /\b(math|algebra|geometry|calculus|statistics)\b/.test(lowercaseQuery)) {
      return QueryType.MATH_PROBLEM;
    }
    
    // Creative writing keywords
    if (lowercaseQuery.includes('write') || 
        lowercaseQuery.includes('essay') || 
        lowercaseQuery.includes('story') ||
        lowercaseQuery.includes('poem') ||
        lowercaseQuery.includes('creative')) {
      return QueryType.CREATIVE_WRITING;
    }
    
    // Homework help keywords
    if (lowercaseQuery.includes('homework') || 
        lowercaseQuery.includes('assignment') || 
        lowercaseQuery.includes('due') ||
        lowercaseQuery.includes('help me with')) {
      return QueryType.HOMEWORK_HELP;
    }
    
    // Concept explanation keywords
    if (lowercaseQuery.includes('explain') || 
        lowercaseQuery.includes('what is') || 
        lowercaseQuery.includes('how does') ||
        lowercaseQuery.includes('why') ||
        lowercaseQuery.includes('concept')) {
      return QueryType.CONCEPT_EXPLANATION;
    }
    
    // Problem solving keywords
    if (lowercaseQuery.includes('problem') || 
        lowercaseQuery.includes('solution') || 
        lowercaseQuery.includes('approach') ||
        lowercaseQuery.includes('strategy')) {
      return QueryType.PROBLEM_SOLVING;
    }
    
    // Language learning keywords
    if (lowercaseQuery.includes('translate') || 
        lowercaseQuery.includes('language') || 
        lowercaseQuery.includes('grammar') ||
        lowercaseQuery.includes('vocabulary')) {
      return QueryType.LANGUAGE_LEARNING;
    }
    
    // Default to general question
    return QueryType.GENERAL_QUESTION;
  }
}