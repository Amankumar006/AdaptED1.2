import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base-llm.provider';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  ModelCapabilities, 
  QueryType,
  SafetyLevel 
} from '../types/ai.types';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;

  constructor(apiKey: string, defaultModel: string = 'claude-3-sonnet-20240229') {
    super(LLMProvider.ANTHROPIC, apiKey, defaultModel);
    this.client = new Anthropic({ apiKey });
  }

  async generateResponse(request: LLMRequest, model?: string): Promise<LLMResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const modelToUse = model || this.defaultModel;
    
    try {
      const message = await this.client.messages.create({
        model: modelToUse,
        max_tokens: 2048,
        temperature: 0.7,
        system: this.buildSystemPrompt(request),
        messages: this.buildMessages(request),
      });

      const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
      const responseTime = Date.now() - startTime;

      return {
        id: this.generateResponseId(),
        requestId: request.id,
        response,
        provider: this.provider,
        model: modelToUse,
        confidence: this.calculateConfidence(message),
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
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCapabilities(model?: string): ModelCapabilities {
    const modelName = model || this.defaultModel;
    
    return {
      provider: this.provider,
      model: modelName,
      maxTokens: this.getMaxTokensForModel(modelName),
      supportsImages: modelName.includes('claude-3'),
      supportsAudio: false,
      supportsCode: true,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      specialties: [
        QueryType.GENERAL_QUESTION,
        QueryType.HOMEWORK_HELP,
        QueryType.CONCEPT_EXPLANATION,
        QueryType.PROBLEM_SOLVING,
        QueryType.CREATIVE_WRITING,
        QueryType.CODE_ASSISTANCE,
      ],
      costPerToken: this.getCostPerToken(modelName),
      averageResponseTime: 2500,
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }

  estimateCost(request: LLMRequest, model?: string): number {
    const modelName = model || this.defaultModel;
    const inputTokens = this.calculateTokens(request.query);
    const estimatedOutputTokens = Math.min(inputTokens * 2, 1000);
    const costPerToken = this.getCostPerToken(modelName);
    
    return (inputTokens + estimatedOutputTokens) * costPerToken;
  }

  private buildMessages(request: LLMRequest): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if available
    if (request.context?.history) {
      for (const msg of request.context.history.slice(-10)) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
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
- Encourage critical thinking and curiosity
- Ask follow-up questions to check understanding
- Be honest about limitations - if unsure, say so
- Guide students to discover answers rather than providing direct solutions
- Keep responses appropriate for the student's age and grade level
- Focus on educational content and learning objectives
- Be encouraging and supportive in your tone`;

    return prompt;
  }

  private calculateConfidence(message: Anthropic.Message): number {
    const response = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const stopReason = message.stop_reason;
    
    if (stopReason === 'end_turn' && response.length > 50) {
      return 0.9;
    } else if (stopReason === 'max_tokens') {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private assessSafetyLevel(response: string): SafetyLevel {
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
        "What aspects of this would you like to explore further?",
        "How does this connect to what you already know?",
      ],
      [QueryType.HOMEWORK_HELP]: [
        "What's your approach to solving this type of problem?",
        "Can you identify the key concepts involved here?",
      ],
      [QueryType.CONCEPT_EXPLANATION]: [
        "Can you think of a real-world example of this concept?",
        "What questions do you still have about this topic?",
      ],
      [QueryType.PROBLEM_SOLVING]: [
        "What strategies did you consider for this problem?",
        "How might you approach similar problems in the future?",
      ],
      [QueryType.CREATIVE_WRITING]: [
        "What emotions or themes are you trying to convey?",
        "How could you make this even more engaging?",
      ],
      [QueryType.CODE_ASSISTANCE]: [
        "Can you trace through what this code does step by step?",
        "What would you expect to happen if we modified this?",
      ],
      [QueryType.MATH_PROBLEM]: [
        "Can you explain the reasoning behind each step?",
        "What mathematical principles are at work here?",
      ],
      [QueryType.LANGUAGE_LEARNING]: [
        "How might you use this in everyday conversation?",
        "What patterns do you notice in this language structure?",
      ],
    };

    return followUps[queryType] || followUps[QueryType.GENERAL_QUESTION];
  }

  private shouldEscalate(response: string, request: LLMRequest): boolean {
    const escalationIndicators = [
      'i don\'t know',
      'i\'m not certain',
      'you should consult',
      'beyond my knowledge',
      'complex topic that requires',
    ];

    const lowercaseResponse = response.toLowerCase();
    return escalationIndicators.some(indicator => lowercaseResponse.includes(indicator));
  }

  private getMaxTokensForModel(model: string): number {
    const tokenLimits: Record<string, number> = {
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'claude-2.1': 200000,
      'claude-2.0': 100000,
    };

    return tokenLimits[model] || 200000;
  }

  private getCostPerToken(model: string): number {
    // Cost per token in USD (approximate, as of 2024)
    const costs: Record<string, number> = {
      'claude-3-opus-20240229': 0.000075,
      'claude-3-sonnet-20240229': 0.000015,
      'claude-3-haiku-20240307': 0.000001,
      'claude-2.1': 0.000024,
      'claude-2.0': 0.000024,
    };

    return costs[model] || 0.000015;
  }
}