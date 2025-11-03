import OpenAI from 'openai';
import { BaseLLMProvider } from './base-llm.provider';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  ModelCapabilities, 
  QueryType,
  SafetyLevel 
} from '../types/ai.types';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;

  constructor(apiKey: string, defaultModel: string = 'gpt-3.5-turbo') {
    super(LLMProvider.OPENAI, apiKey, defaultModel);
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(request: LLMRequest, model?: string): Promise<LLMResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const modelToUse = model || this.defaultModel;
    
    try {
      const messages = this.buildMessages(request);
      
      const completion = await this.client.chat.completions.create({
        model: modelToUse,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;

      return {
        id: this.generateResponseId(),
        requestId: request.id,
        response,
        provider: this.provider,
        model: modelToUse,
        confidence: this.calculateConfidence(completion),
        safetyLevel: this.assessSafetyLevel(response),
        tokensUsed,
        responseTime,
        cached: false,
        timestamp: new Date(),
        metadata: {
          sources: this.extractSources(request.courseContext),
          suggestedFollowUps: this.generateFollowUps(request.queryType),
          escalationRecommended: this.shouldEscalate(response, request),
        },
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(model?: string): ModelCapabilities {
    const modelName = model || this.defaultModel;
    
    return {
      provider: this.provider,
      model: modelName,
      maxTokens: this.getMaxTokensForModel(modelName),
      supportsImages: modelName.includes('vision') || modelName.includes('gpt-4'),
      supportsAudio: false,
      supportsCode: true,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'],
      specialties: [
        QueryType.GENERAL_QUESTION,
        QueryType.HOMEWORK_HELP,
        QueryType.CONCEPT_EXPLANATION,
        QueryType.PROBLEM_SOLVING,
        QueryType.CREATIVE_WRITING,
        QueryType.CODE_ASSISTANCE,
        QueryType.MATH_PROBLEM,
      ],
      costPerToken: this.getCostPerToken(modelName),
      averageResponseTime: 2000,
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch {
      return [this.defaultModel];
    }
  }

  estimateCost(request: LLMRequest, model?: string): number {
    const modelName = model || this.defaultModel;
    const inputTokens = this.calculateTokens(request.query);
    const estimatedOutputTokens = Math.min(inputTokens * 2, 1000);
    const costPerToken = this.getCostPerToken(modelName);
    
    return (inputTokens + estimatedOutputTokens) * costPerToken;
  }

  private buildMessages(request: LLMRequest): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // System message with educational context
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(request),
    });

    // Add conversation history if available
    if (request.context?.history) {
      for (const msg of request.context.history.slice(-10)) { // Last 10 messages
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current user query
    messages.push({
      role: 'user',
      content: request.query,
    });

    return messages;
  }

  private buildSystemPrompt(request: LLMRequest): string {
    let prompt = `You are BuddyAI, an educational AI assistant designed to help students learn effectively. `;
    
    if (request.userProfile?.age && request.userProfile.age < 13) {
      prompt += `You are speaking with a young student (age ${request.userProfile.age}). Use age-appropriate language and explanations. `;
    }

    if (request.courseContext) {
      prompt += `The student is currently studying ${request.courseContext.subject} at ${request.courseContext.gradeLevel} level. `;
      if (request.courseContext.currentLesson) {
        prompt += `They are working on: ${request.courseContext.currentLesson}. `;
      }
    }

    prompt += `Guidelines:
- Provide clear, educational explanations
- Encourage critical thinking
- Ask follow-up questions to check understanding
- If you're unsure about something, say so
- Avoid doing homework for students - guide them to find answers
- Keep responses appropriate for the student's age and grade level
- If asked about inappropriate topics, politely redirect to educational content`;

    return prompt;
  }

  private calculateConfidence(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Simple confidence calculation based on response characteristics
    const response = completion.choices[0]?.message?.content || '';
    const finishReason = completion.choices[0]?.finish_reason;
    
    if (finishReason === 'stop' && response.length > 50) {
      return 0.9;
    } else if (finishReason === 'length') {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private assessSafetyLevel(response: string): SafetyLevel {
    // Basic safety assessment - in production, use more sophisticated methods
    const lowercaseResponse = response.toLowerCase();
    
    const criticalKeywords = ['suicide', 'self-harm', 'violence', 'illegal'];
    const highRiskKeywords = ['inappropriate', 'adult content', 'dangerous'];
    
    if (criticalKeywords.some(keyword => lowercaseResponse.includes(keyword))) {
      return SafetyLevel.CRITICAL;
    } else if (highRiskKeywords.some(keyword => lowercaseResponse.includes(keyword))) {
      return SafetyLevel.HIGH;
    } else {
      return SafetyLevel.LOW;
    }
  }

  private extractSources(courseContext?: any): string[] {
    if (!courseContext?.materials) return [];
    
    return courseContext.materials
      .filter((material: any) => material.relevanceScore && material.relevanceScore > 0.7)
      .map((material: any) => material.title)
      .slice(0, 3);
  }

  private generateFollowUps(queryType: QueryType): string[] {
    const followUps: Record<QueryType, string[]> = {
      [QueryType.GENERAL_QUESTION]: [
        "Would you like me to explain any part in more detail?",
        "Do you have any follow-up questions?",
      ],
      [QueryType.HOMEWORK_HELP]: [
        "Can you try solving a similar problem?",
        "What part of this concept would you like to practice more?",
      ],
      [QueryType.CONCEPT_EXPLANATION]: [
        "Would you like to see an example of this concept?",
        "How does this relate to what you've learned before?",
      ],
      [QueryType.PROBLEM_SOLVING]: [
        "Can you walk me through your thinking process?",
        "What would you try differently next time?",
      ],
      [QueryType.CREATIVE_WRITING]: [
        "What inspired this idea?",
        "How could you develop this further?",
      ],
      [QueryType.CODE_ASSISTANCE]: [
        "Can you explain what this code does?",
        "What would happen if we changed this part?",
      ],
      [QueryType.MATH_PROBLEM]: [
        "Can you solve a similar problem on your own?",
        "What mathematical concept does this demonstrate?",
      ],
      [QueryType.LANGUAGE_LEARNING]: [
        "Can you use this in a sentence?",
        "What other words are related to this?",
      ],
    };

    return followUps[queryType] || followUps[QueryType.GENERAL_QUESTION];
  }

  private shouldEscalate(response: string, request: LLMRequest): boolean {
    // Check if response indicates need for human teacher intervention
    const escalationIndicators = [
      'i don\'t know',
      'i\'m not sure',
      'you should ask your teacher',
      'this is beyond my knowledge',
      'complex topic',
    ];

    const lowercaseResponse = response.toLowerCase();
    return escalationIndicators.some(indicator => lowercaseResponse.includes(indicator));
  }

  private getMaxTokensForModel(model: string): number {
    const tokenLimits: Record<string, number> = {
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
    };

    return tokenLimits[model] || 4096;
  }

  private getCostPerToken(model: string): number {
    // Cost per token in USD (approximate, as of 2024)
    const costs: Record<string, number> = {
      'gpt-3.5-turbo': 0.000002,
      'gpt-4': 0.00003,
      'gpt-4-turbo': 0.00001,
    };

    return costs[model] || 0.000002;
  }
}