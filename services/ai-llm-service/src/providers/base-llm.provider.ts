import { LLMProvider, LLMRequest, LLMResponse, ModelCapabilities } from '../types/ai.types';

export abstract class BaseLLMProvider {
  protected provider: LLMProvider;
  protected apiKey: string;
  protected defaultModel: string;

  constructor(provider: LLMProvider, apiKey: string, defaultModel: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  abstract generateResponse(request: LLMRequest, model?: string): Promise<LLMResponse>;
  abstract getCapabilities(model?: string): ModelCapabilities;
  abstract validateApiKey(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;
  abstract estimateCost(request: LLMRequest, model?: string): number;

  protected generateResponseId(): string {
    return `${this.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected calculateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  protected sanitizeInput(input: string): string {
    // Basic input sanitization
    return input.trim().replace(/[\x00-\x1F\x7F]/g, '');
  }

  protected validateRequest(request: LLMRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }
    if (!request.userId) {
      throw new Error('User ID is required');
    }
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }
  }
}