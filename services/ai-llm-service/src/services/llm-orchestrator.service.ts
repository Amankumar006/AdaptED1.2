import { BaseLLMProvider } from '../providers/base-llm.provider';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  QueryType, 
  ModelCapabilities,
  SafetyLevel 
} from '../types/ai.types';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class LLMOrchestratorService {
  private providers: Map<LLMProvider, BaseLLMProvider> = new Map();
  private modelCapabilities: Map<string, ModelCapabilities> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Initialize OpenAI provider
      if (config.llmProviders.openai.apiKey) {
        const openaiProvider = new OpenAIProvider(
          config.llmProviders.openai.apiKey,
          config.llmProviders.openai.defaultModel
        );
        
        if (await openaiProvider.validateApiKey()) {
          this.providers.set(LLMProvider.OPENAI, openaiProvider);
          logger.info('OpenAI provider initialized successfully');
        } else {
          logger.warn('OpenAI API key validation failed');
        }
      }

      // Initialize Anthropic provider
      if (config.llmProviders.anthropic.apiKey) {
        const anthropicProvider = new AnthropicProvider(
          config.llmProviders.anthropic.apiKey,
          config.llmProviders.anthropic.defaultModel
        );
        
        if (await anthropicProvider.validateApiKey()) {
          this.providers.set(LLMProvider.ANTHROPIC, anthropicProvider);
          logger.info('Anthropic provider initialized successfully');
        } else {
          logger.warn('Anthropic API key validation failed');
        }
      }

      // Cache model capabilities
      await this.cacheModelCapabilities();
      
      logger.info(`LLM Orchestrator initialized with ${this.providers.size} providers`);
    } catch (error) {
      logger.error('Failed to initialize LLM providers:', error);
      throw error;
    }
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const selectedProvider = this.selectOptimalProvider(request);
      const selectedModel = this.selectOptimalModel(request, selectedProvider);
      
      logger.info(`Routing request ${request.id} to ${selectedProvider} with model ${selectedModel}`);
      
      const provider = this.providers.get(selectedProvider);
      if (!provider) {
        throw new Error(`Provider ${selectedProvider} not available`);
      }

      const response = await provider.generateResponse(request, selectedModel);
      
      // Log usage metrics
      this.logUsageMetrics(request, response);
      
      return response;
    } catch (error) {
      logger.error(`Failed to generate response for request ${request.id}:`, error);
      throw error;
    }
  }

  selectOptimalProvider(request: LLMRequest): LLMProvider {
    const availableProviders = Array.from(this.providers.keys());
    
    if (availableProviders.length === 0) {
      throw new Error('No LLM providers available');
    }

    // Provider selection logic based on query type and context
    const providerScores = new Map<LLMProvider, number>();

    for (const provider of availableProviders) {
      let score = 0;

      // Base score for provider availability
      score += 10;

      // Query type preferences
      switch (request.queryType) {
        case QueryType.CODE_ASSISTANCE:
          if (provider === LLMProvider.OPENAI) score += 15;
          if (provider === LLMProvider.ANTHROPIC) score += 10;
          break;
        case QueryType.CREATIVE_WRITING:
          if (provider === LLMProvider.ANTHROPIC) score += 15;
          if (provider === LLMProvider.OPENAI) score += 10;
          break;
        case QueryType.MATH_PROBLEM:
          if (provider === LLMProvider.OPENAI) score += 15;
          if (provider === LLMProvider.ANTHROPIC) score += 12;
          break;
        case QueryType.CONCEPT_EXPLANATION:
          if (provider === LLMProvider.ANTHROPIC) score += 15;
          if (provider === LLMProvider.OPENAI) score += 12;
          break;
        default:
          // Default preference
          if (provider === LLMProvider.OPENAI) score += 10;
          if (provider === LLMProvider.ANTHROPIC) score += 8;
      }

      // User profile considerations
      if (request.userProfile?.age && request.userProfile.age < 13) {
        // Prefer providers with better safety controls for younger users
        if (provider === LLMProvider.ANTHROPIC) score += 5;
      }

      // Context complexity considerations
      if (request.courseContext?.materials && request.courseContext.materials.length > 5) {
        // Prefer providers with larger context windows for complex contexts
        if (provider === LLMProvider.ANTHROPIC) score += 8;
        if (provider === LLMProvider.OPENAI) score += 5;
      }

      providerScores.set(provider, score);
    }

    // Select provider with highest score
    let bestProvider = availableProviders[0];
    let bestScore = providerScores.get(bestProvider) || 0;

    for (const [provider, score] of providerScores) {
      if (score > bestScore) {
        bestProvider = provider;
        bestScore = score;
      }
    }

    return bestProvider;
  }

  selectOptimalModel(request: LLMRequest, provider: LLMProvider): string {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not available`);
    }

    // Get available models for the provider
    const capabilities = providerInstance.getCapabilities();
    let selectedModel = capabilities.model;

    // Model selection logic based on request characteristics
    if (provider === LLMProvider.OPENAI) {
      // Complex queries or image inputs might benefit from GPT-4
      if (request.queryType === QueryType.CODE_ASSISTANCE || 
          request.queryType === QueryType.PROBLEM_SOLVING ||
          request.inputType.toString().includes('image')) {
        selectedModel = 'gpt-4';
      } else if (request.courseContext?.materials && request.courseContext.materials.length > 10) {
        // Large context might benefit from 16k model
        selectedModel = 'gpt-3.5-turbo-16k';
      } else {
        selectedModel = 'gpt-3.5-turbo';
      }
    } else if (provider === LLMProvider.ANTHROPIC) {
      // Select Claude model based on complexity
      if (request.queryType === QueryType.CREATIVE_WRITING || 
          request.queryType === QueryType.CONCEPT_EXPLANATION) {
        selectedModel = 'claude-3-sonnet-20240229';
      } else if (request.queryType === QueryType.GENERAL_QUESTION) {
        selectedModel = 'claude-3-haiku-20240307'; // Faster for simple queries
      } else {
        selectedModel = 'claude-3-sonnet-20240229';
      }
    }

    return selectedModel;
  }

  async getProviderCapabilities(provider: LLMProvider): Promise<ModelCapabilities | null> {
    const providerInstance = this.providers.get(provider);
    return providerInstance ? providerInstance.getCapabilities() : null;
  }

  async getAllCapabilities(): Promise<ModelCapabilities[]> {
    const capabilities: ModelCapabilities[] = [];
    
    for (const provider of this.providers.values()) {
      capabilities.push(provider.getCapabilities());
    }
    
    return capabilities;
  }

  async estimateRequestCost(request: LLMRequest): Promise<number> {
    const provider = this.selectOptimalProvider(request);
    const model = this.selectOptimalModel(request, provider);
    
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return 0;
    }
    
    return providerInstance.estimateCost(request, model);
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  async getProviderHealth(): Promise<Map<LLMProvider, boolean>> {
    const health = new Map<LLMProvider, boolean>();
    
    for (const [provider, instance] of this.providers) {
      try {
        const isHealthy = await instance.validateApiKey();
        health.set(provider, isHealthy);
      } catch {
        health.set(provider, false);
      }
    }
    
    return health;
  }

  private async cacheModelCapabilities(): Promise<void> {
    for (const [provider, instance] of this.providers) {
      try {
        const capabilities = instance.getCapabilities();
        this.modelCapabilities.set(`${provider}:${capabilities.model}`, capabilities);
        
        // Cache capabilities for all available models
        const availableModels = await instance.getAvailableModels();
        for (const model of availableModels) {
          const modelCapabilities = instance.getCapabilities(model);
          this.modelCapabilities.set(`${provider}:${model}`, modelCapabilities);
        }
      } catch (error) {
        logger.warn(`Failed to cache capabilities for ${provider}:`, error);
      }
    }
  }

  private logUsageMetrics(request: LLMRequest, response: LLMResponse): void {
    const metrics = {
      requestId: request.id,
      userId: request.userId,
      provider: response.provider,
      model: response.model,
      queryType: request.queryType,
      tokensUsed: response.tokensUsed,
      responseTime: response.responseTime,
      safetyLevel: response.safetyLevel,
      cached: response.cached,
      timestamp: new Date(),
    };

    logger.info('LLM usage metrics:', metrics);
    
    // In production, send to analytics service
    // await this.analyticsService.recordUsage(metrics);
  }

  // Method to handle provider failover
  async generateResponseWithFailover(request: LLMRequest): Promise<LLMResponse> {
    const availableProviders = this.getAvailableProviders();
    let lastError: Error | null = null;

    // Try primary provider first
    const primaryProvider = this.selectOptimalProvider(request);
    try {
      return await this.generateResponse(request);
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Primary provider ${primaryProvider} failed, attempting failover`);
    }

    // Try other available providers
    for (const provider of availableProviders) {
      if (provider === primaryProvider) continue;

      try {
        const providerInstance = this.providers.get(provider);
        if (!providerInstance) continue;

        const model = this.selectOptimalModel(request, provider);
        const response = await providerInstance.generateResponse(request, model);
        
        logger.info(`Failover successful using provider ${provider}`);
        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Failover provider ${provider} also failed`);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }
}