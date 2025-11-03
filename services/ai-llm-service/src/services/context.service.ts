import { 
  ConversationContext, 
  ConversationMessage, 
  CourseContext, 
  CourseMaterial,
  LLMRequest 
} from '../types/ai.types';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';

export class ContextService {
  private cache: CacheService;
  private maxHistoryLength: number = 20;
  private maxMaterialsPerContext: number = 10;

  constructor(cache: CacheService) {
    this.cache = cache;
  }

  async getConversationContext(
    userId: string, 
    sessionId: string
  ): Promise<ConversationContext | null> {
    try {
      const cacheKey = `conversation:${userId}:${sessionId}`;
      const cachedContext = await this.cache.getCachedResponse({
        id: cacheKey,
        userId,
        sessionId,
        query: '',
        queryType: 'general_question' as any,
        inputType: 'text' as any,
        timestamp: new Date(),
      });

      if (cachedContext) {
        return JSON.parse(cachedContext.response);
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving conversation context:', error);
      return null;
    }
  }

  async updateConversationContext(
    userId: string,
    sessionId: string,
    message: ConversationMessage,
    topic?: string,
    subject?: string
  ): Promise<void> {
    try {
      let context = await this.getConversationContext(userId, sessionId);
      
      if (!context) {
        context = {
          conversationId: `${userId}_${sessionId}_${Date.now()}`,
          history: [],
          topic,
          subject,
        };
      }

      // Add new message to history
      context.history.push(message);

      // Trim history to max length
      if (context.history.length > this.maxHistoryLength) {
        context.history = context.history.slice(-this.maxHistoryLength);
      }

      // Update topic and subject if provided
      if (topic) context.topic = topic;
      if (subject) context.subject = subject;

      // Cache the updated context
      const cacheKey = `conversation:${userId}:${sessionId}`;
      await this.cacheConversationContext(cacheKey, context);

      logger.debug(`Updated conversation context for user ${userId}, session ${sessionId}`);
    } catch (error) {
      logger.error('Error updating conversation context:', error);
    }
  }

  async enrichRequestWithContext(request: LLMRequest): Promise<LLMRequest> {
    try {
      // Get conversation context
      const conversationContext = await this.getConversationContext(
        request.userId, 
        request.sessionId
      );

      // Get course context with relevant materials
      const enrichedCourseContext = await this.enrichCourseContext(
        request.courseContext,
        request.query
      );

      // Analyze conversation for learning patterns
      const learningInsights = conversationContext 
        ? this.analyzeLearningPatterns(conversationContext)
        : null;

      return {
        ...request,
        context: conversationContext ? {
          ...conversationContext,
          learningInsights,
        } : undefined,
        courseContext: enrichedCourseContext,
      };
    } catch (error) {
      logger.error('Error enriching request with context:', error);
      return request;
    }
  }

  async getCourseRelevantMaterials(
    courseContext: CourseContext,
    query: string,
    limit: number = 5
  ): Promise<CourseMaterial[]> {
    if (!courseContext?.materials) {
      return [];
    }

    try {
      // Calculate relevance scores for materials
      const scoredMaterials = courseContext.materials.map(material => ({
        ...material,
        relevanceScore: this.calculateMaterialRelevance(material, query, courseContext),
      }));

      // Sort by relevance and return top results
      return scoredMaterials
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting course relevant materials:', error);
      return courseContext.materials.slice(0, limit);
    }
  }

  async generateDomainSpecificPrompt(
    request: LLMRequest,
    basePrompt: string
  ): Promise<string> {
    try {
      let enhancedPrompt = basePrompt;

      // Add course-specific context
      if (request.courseContext) {
        enhancedPrompt += this.buildCourseContextPrompt(request.courseContext);
      }

      // Add conversation context
      if (request.context?.history && request.context.history.length > 0) {
        enhancedPrompt += this.buildConversationContextPrompt(request.context);
      }

      // Add learning objectives context
      if (request.courseContext?.learningObjectives) {
        enhancedPrompt += this.buildLearningObjectivesPrompt(request.courseContext.learningObjectives);
      }

      // Add user-specific adaptations
      if (request.userProfile) {
        enhancedPrompt += this.buildUserAdaptationPrompt(request.userProfile);
      }

      return enhancedPrompt;
    } catch (error) {
      logger.error('Error generating domain-specific prompt:', error);
      return basePrompt;
    }
  }

  private async enrichCourseContext(
    courseContext?: CourseContext,
    query?: string
  ): Promise<CourseContext | undefined> {
    if (!courseContext || !query) {
      return courseContext;
    }

    try {
      // Get relevant materials for the query
      const relevantMaterials = await this.getCourseRelevantMaterials(
        courseContext,
        query,
        this.maxMaterialsPerContext
      );

      return {
        ...courseContext,
        materials: relevantMaterials,
      };
    } catch (error) {
      logger.error('Error enriching course context:', error);
      return courseContext;
    }
  }

  private calculateMaterialRelevance(
    material: CourseMaterial,
    query: string,
    courseContext: CourseContext
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const materialContent = `${material.title} ${material.content}`.toLowerCase();

    // Keyword matching
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const matchingWords = queryWords.filter(word => materialContent.includes(word));
    score += (matchingWords.length / queryWords.length) * 40;

    // Material type relevance
    const typeRelevance: Record<string, number> = {
      lesson: 30,
      exercise: 25,
      reading: 20,
      video: 15,
      document: 10,
    };
    score += typeRelevance[material.type] || 10;

    // Current lesson relevance
    if (courseContext.currentLesson && 
        material.title.toLowerCase().includes(courseContext.currentLesson.toLowerCase())) {
      score += 20;
    }

    // Learning objectives alignment
    if (courseContext.learningObjectives) {
      const objectiveMatch = courseContext.learningObjectives.some(objective =>
        materialContent.includes(objective.toLowerCase()) ||
        queryLower.includes(objective.toLowerCase())
      );
      if (objectiveMatch) score += 15;
    }

    return Math.min(score, 100);
  }

  private analyzeLearningPatterns(context: ConversationContext): any {
    const recentMessages = context.history.slice(-10);
    
    return {
      strugglingTopics: this.identifyStrugglingTopics(recentMessages),
      learningVelocity: this.calculateLearningVelocity(recentMessages),
      questionPatterns: this.analyzeQuestionPatterns(recentMessages),
      engagementLevel: this.calculateEngagementLevel(recentMessages),
    };
  }

  private identifyStrugglingTopics(messages: ConversationMessage[]): string[] {
    const strugglingIndicators = [
      'i don\'t understand',
      'confused',
      'help',
      'difficult',
      'hard',
      'stuck',
      'can\'t figure out',
    ];

    const strugglingMessages = messages.filter(msg => 
      msg.role === 'user' && 
      strugglingIndicators.some(indicator => 
        msg.content.toLowerCase().includes(indicator)
      )
    );

    // Extract topics from struggling messages (simplified)
    const topics = strugglingMessages.map(msg => {
      const words = msg.content.toLowerCase().split(/\s+/);
      return words.filter(word => word.length > 4).slice(0, 3);
    }).flat();

    // Return unique topics
    return [...new Set(topics)].slice(0, 5);
  }

  private calculateLearningVelocity(messages: ConversationMessage[]): 'fast' | 'moderate' | 'slow' {
    if (messages.length < 3) return 'moderate';

    const userMessages = messages.filter(msg => msg.role === 'user');
    const avgTimeBetweenMessages = this.calculateAverageTimeBetweenMessages(userMessages);

    if (avgTimeBetweenMessages < 60000) return 'fast'; // Less than 1 minute
    if (avgTimeBetweenMessages < 300000) return 'moderate'; // Less than 5 minutes
    return 'slow';
  }

  private analyzeQuestionPatterns(messages: ConversationMessage[]): any {
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    const patterns = {
      conceptual: 0,
      procedural: 0,
      factual: 0,
    };

    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      if (content.includes('what is') || content.includes('explain') || content.includes('why')) {
        patterns.conceptual++;
      } else if (content.includes('how to') || content.includes('steps') || content.includes('process')) {
        patterns.procedural++;
      } else {
        patterns.factual++;
      }
    });

    return patterns;
  }

  private calculateEngagementLevel(messages: ConversationMessage[]): 'high' | 'medium' | 'low' {
    if (messages.length === 0) return 'low';

    const userMessages = messages.filter(msg => msg.role === 'user');
    const avgMessageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
    
    if (avgMessageLength > 100) return 'high';
    if (avgMessageLength > 30) return 'medium';
    return 'low';
  }

  private calculateAverageTimeBetweenMessages(messages: ConversationMessage[]): number {
    if (messages.length < 2) return 0;

    let totalTime = 0;
    for (let i = 1; i < messages.length; i++) {
      totalTime += messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime();
    }

    return totalTime / (messages.length - 1);
  }

  private buildCourseContextPrompt(courseContext: CourseContext): string {
    let prompt = `\n\nCourse Context:`;
    prompt += `\n- Course: ${courseContext.courseName} (${courseContext.subject})`;
    prompt += `\n- Grade Level: ${courseContext.gradeLevel}`;
    
    if (courseContext.currentLesson) {
      prompt += `\n- Current Lesson: ${courseContext.currentLesson}`;
    }

    if (courseContext.materials && courseContext.materials.length > 0) {
      prompt += `\n- Relevant Materials:`;
      courseContext.materials.slice(0, 3).forEach(material => {
        prompt += `\n  • ${material.title} (${material.type})`;
      });
    }

    return prompt;
  }

  private buildConversationContextPrompt(context: ConversationContext): string {
    let prompt = `\n\nConversation Context:`;
    
    if (context.topic) {
      prompt += `\n- Current Topic: ${context.topic}`;
    }

    if (context.history && context.history.length > 0) {
      prompt += `\n- Recent Discussion Points:`;
      const recentMessages = context.history.slice(-3);
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `\n  • Student asked: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
        }
      });
    }

    return prompt;
  }

  private buildLearningObjectivesPrompt(objectives: string[]): string {
    let prompt = `\n\nLearning Objectives:`;
    objectives.slice(0, 3).forEach(objective => {
      prompt += `\n- ${objective}`;
    });
    return prompt;
  }

  private buildUserAdaptationPrompt(userProfile: any): string {
    let prompt = `\n\nStudent Profile Adaptations:`;
    
    if (userProfile.age) {
      prompt += `\n- Age-appropriate explanations for ${userProfile.age} year old`;
    }
    
    if (userProfile.gradeLevel) {
      prompt += `\n- Grade ${userProfile.gradeLevel} level content`;
    }
    
    if (userProfile.learningStyle) {
      prompt += `\n- Adapt for ${userProfile.learningStyle} learning style`;
    }
    
    if (userProfile.language && userProfile.language !== 'en') {
      prompt += `\n- Consider ${userProfile.language} as primary language`;
    }

    return prompt;
  }

  private async cacheConversationContext(cacheKey: string, context: ConversationContext): Promise<void> {
    try {
      // Create a mock request for caching
      const mockRequest: LLMRequest = {
        id: cacheKey,
        userId: 'system',
        sessionId: 'context',
        query: '',
        queryType: 'general_question' as any,
        inputType: 'text' as any,
        timestamp: new Date(),
      };

      const mockResponse = {
        id: cacheKey,
        requestId: cacheKey,
        response: JSON.stringify(context),
        provider: 'openai' as any,
        model: 'context',
        confidence: 1,
        safetyLevel: 'low' as any,
        tokensUsed: 0,
        responseTime: 0,
        cached: false,
        timestamp: new Date(),
      };

      await this.cache.cacheResponse(mockRequest, mockResponse);
    } catch (error) {
      logger.error('Error caching conversation context:', error);
    }
  }
}