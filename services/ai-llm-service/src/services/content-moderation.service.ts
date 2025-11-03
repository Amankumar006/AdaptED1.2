import { LLMRequest, LLMResponse, SafetyLevel, UserProfile } from '../types/ai.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  categories: string[];
  severity: SafetyLevel;
  reason?: string;
  suggestedAction: 'allow' | 'filter' | 'block' | 'escalate';
}

export interface ContentFilter {
  name: string;
  enabled: boolean;
  threshold: number;
  ageRestricted?: boolean;
  minAge?: number;
}

export class ContentModerationService {
  private contentFilters: Map<string, ContentFilter> = new Map();
  private bannedPhrases: Set<string> = new Set();
  private educationalKeywords: Set<string> = new Set();
  private warningKeywords: Set<string> = new Set();

  constructor() {
    this.initializeFilters();
    this.initializeKeywordSets();
  }

  /**
   * Moderates user input before processing
   */
  async moderateInput(request: LLMRequest): Promise<ModerationResult> {
    try {
      const results: ModerationResult[] = [];

      // Apply all enabled filters
      for (const [filterName, filter] of this.contentFilters) {
        if (filter.enabled) {
          const result = await this.applyFilter(filterName, request.query, request.userProfile);
          results.push(result);
        }
      }

      // Combine results and determine overall moderation decision
      return this.combineResults(results, 'input');

    } catch (error) {
      logger.error('Error during input moderation:', error);
      return {
        isAppropriate: false,
        confidence: 1.0,
        categories: ['error'],
        severity: SafetyLevel.HIGH,
        reason: 'Moderation system error',
        suggestedAction: 'block'
      };
    }
  }

  /**
   * Moderates AI-generated output before returning to user
   */
  async moderateOutput(response: LLMResponse, request: LLMRequest): Promise<ModerationResult> {
    try {
      const results: ModerationResult[] = [];

      // Apply output-specific filters
      const outputFilters = ['profanity', 'educational_value', 'age_appropriateness', 'accuracy'];
      
      for (const filterName of outputFilters) {
        const filter = this.contentFilters.get(filterName);
        if (filter?.enabled) {
          const result = await this.applyFilter(filterName, response.response, request.userProfile);
          results.push(result);
        }
      }

      // Check response quality and educational value
      const qualityResult = await this.assessResponseQuality(response, request);
      results.push(qualityResult);

      return this.combineResults(results, 'output');

    } catch (error) {
      logger.error('Error during output moderation:', error);
      return {
        isAppropriate: false,
        confidence: 1.0,
        categories: ['error'],
        severity: SafetyLevel.HIGH,
        reason: 'Output moderation system error',
        suggestedAction: 'block'
      };
    }
  }

  /**
   * Applies age-appropriate content filtering
   */
  async applyAgeFilter(content: string, userAge?: number, gradeLevel?: string): Promise<ModerationResult> {
    if (!userAge && !gradeLevel) {
      return {
        isAppropriate: true,
        confidence: 0.5,
        categories: ['age_unknown'],
        severity: SafetyLevel.LOW,
        suggestedAction: 'allow'
      };
    }

    const effectiveAge = userAge || this.gradeToAge(gradeLevel || '');
    
    // Check for age-inappropriate content
    const ageInappropriatePatterns = [
      { pattern: /\b(violence|violent|fight|attack|weapon)\b/gi, minAge: 13 },
      { pattern: /\b(alcohol|beer|wine|drunk|drinking)\b/gi, minAge: 16 },
      { pattern: /\b(drug|marijuana|cocaine|heroin)\b/gi, minAge: 16 },
      { pattern: /\b(sex|sexual|adult|mature)\b/gi, minAge: 16 },
      { pattern: /\b(death|suicide|kill|murder)\b/gi, minAge: 14 },
      { pattern: /\b(gambling|bet|casino|poker)\b/gi, minAge: 18 }
    ];

    for (const { pattern, minAge } of ageInappropriatePatterns) {
      if (pattern.test(content) && effectiveAge < minAge) {
        return {
          isAppropriate: false,
          confidence: 0.9,
          categories: ['age_inappropriate'],
          severity: SafetyLevel.HIGH,
          reason: `Content requires minimum age of ${minAge}, user is ${effectiveAge}`,
          suggestedAction: 'block'
        };
      }
    }

    return {
      isAppropriate: true,
      confidence: 0.8,
      categories: ['age_appropriate'],
      severity: SafetyLevel.LOW,
      suggestedAction: 'allow'
    };
  }

  /**
   * Checks if content promotes academic integrity
   */
  async checkAcademicIntegrity(content: string, queryType: string): Promise<ModerationResult> {
    const directAnswerPatterns = [
      /give me the answer/gi,
      /what is the answer to/gi,
      /solve this for me/gi,
      /do my homework/gi,
      /write my essay/gi,
      /complete this assignment/gi,
      /just tell me the answer/gi
    ];

    const cheatingIndicators = [
      /copy.*paste/gi,
      /plagiarize/gi,
      /cheat.*test/gi,
      /exam.*answers/gi,
      /homework.*answers/gi
    ];

    let violationFound = false;
    let violationType = '';

    // Check for direct answer requests
    if (directAnswerPatterns.some(pattern => pattern.test(content))) {
      violationFound = true;
      violationType = 'direct_answer_request';
    }

    // Check for cheating indicators
    if (cheatingIndicators.some(pattern => pattern.test(content))) {
      violationFound = true;
      violationType = 'cheating_attempt';
    }

    if (violationFound) {
      return {
        isAppropriate: false,
        confidence: 0.8,
        categories: ['academic_integrity', violationType],
        severity: SafetyLevel.MEDIUM,
        reason: 'Content may violate academic integrity policies',
        suggestedAction: 'filter'
      };
    }

    return {
      isAppropriate: true,
      confidence: 0.7,
      categories: ['academic_integrity'],
      severity: SafetyLevel.LOW,
      suggestedAction: 'allow'
    };
  }

  /**
   * Generates filtered/safe version of inappropriate content
   */
  async generateSafeContent(
    originalContent: string, 
    moderationResult: ModerationResult,
    userProfile?: UserProfile
  ): Promise<string> {
    
    if (moderationResult.isAppropriate) {
      return originalContent;
    }

    // Generate age-appropriate alternative based on violation type
    if (moderationResult.categories.includes('age_inappropriate')) {
      return this.generateAgeAppropriateAlternative(originalContent, userProfile?.age);
    }

    if (moderationResult.categories.includes('academic_integrity')) {
      return this.generateAcademicIntegrityAlternative(originalContent);
    }

    if (moderationResult.categories.includes('profanity')) {
      return this.generateProfanityAlternative(originalContent);
    }

    if (moderationResult.categories.includes('inappropriate_topic')) {
      return this.generateTopicAlternative(originalContent);
    }

    // Default safe response
    return "I'd be happy to help you learn! Could you please rephrase your question in a way that focuses on understanding the concepts? I'm here to guide you through your learning journey.";
  }

  /**
   * Updates content filters based on configuration
   */
  async updateContentFilters(filterUpdates: Partial<Record<string, ContentFilter>>): Promise<void> {
    for (const [filterName, filterConfig] of Object.entries(filterUpdates)) {
      if (filterConfig) {
        this.contentFilters.set(filterName, filterConfig);
        logger.info(`Updated content filter: ${filterName}`);
      }
    }
  }

  /**
   * Gets current filter configuration
   */
  getFilterConfiguration(): Record<string, ContentFilter> {
    return Object.fromEntries(this.contentFilters);
  }

  // Private helper methods

  private initializeFilters(): void {
    this.contentFilters = new Map([
      ['profanity', {
        name: 'Profanity Filter',
        enabled: config.safety.profanityFilterEnabled,
        threshold: 0.8,
        ageRestricted: false
      }],
      ['inappropriate_topic', {
        name: 'Inappropriate Topic Filter',
        enabled: config.safety.contentFilterEnabled,
        threshold: 0.7,
        ageRestricted: false
      }],
      ['age_appropriateness', {
        name: 'Age Appropriateness Filter',
        enabled: config.safety.ageVerificationRequired,
        threshold: 0.8,
        ageRestricted: true
      }],
      ['academic_integrity', {
        name: 'Academic Integrity Filter',
        enabled: true,
        threshold: 0.7,
        ageRestricted: false
      }],
      ['educational_value', {
        name: 'Educational Value Filter',
        enabled: true,
        threshold: 0.6,
        ageRestricted: false
      }],
      ['personal_information', {
        name: 'Personal Information Filter',
        enabled: true,
        threshold: 0.9,
        ageRestricted: false
      }],
      ['accuracy', {
        name: 'Response Accuracy Filter',
        enabled: true,
        threshold: 0.7,
        ageRestricted: false
      }]
    ]);
  }

  private initializeKeywordSets(): void {
    this.bannedPhrases = new Set([
      'give me the answer',
      'do my homework',
      'write my essay',
      'solve this for me',
      'cheat on test',
      'plagiarize this'
    ]);

    this.educationalKeywords = new Set([
      'learn', 'understand', 'explain', 'teach', 'study', 'practice',
      'concept', 'theory', 'principle', 'method', 'approach', 'skill'
    ]);

    this.warningKeywords = new Set([
      'violence', 'weapon', 'drug', 'alcohol', 'suicide', 'self-harm',
      'hate', 'discrimination', 'illegal', 'dangerous', 'harmful'
    ]);
  }

  private async applyFilter(
    filterName: string, 
    content: string, 
    userProfile?: UserProfile
  ): Promise<ModerationResult> {
    
    switch (filterName) {
      case 'profanity':
        return this.checkProfanity(content);
      
      case 'inappropriate_topic':
        return this.checkInappropriateTopics(content);
      
      case 'age_appropriateness':
        return this.applyAgeFilter(content, userProfile?.age, userProfile?.gradeLevel);
      
      case 'academic_integrity':
        return this.checkAcademicIntegrity(content, 'general');
      
      case 'educational_value':
        return this.checkEducationalValue(content);
      
      case 'personal_information':
        return this.checkPersonalInformation(content);
      
      case 'accuracy':
        return this.checkAccuracy(content);
      
      default:
        return {
          isAppropriate: true,
          confidence: 0.5,
          categories: ['unknown_filter'],
          severity: SafetyLevel.LOW,
          suggestedAction: 'allow'
        };
    }
  }

  private checkProfanity(content: string): ModerationResult {
    const profanityPatterns = [
      /\b(damn|hell|crap|stupid|idiot|hate)\b/gi,
      /\b(kill|die|death|murder)\b/gi,
      // Add more patterns as needed
    ];

    const hasProfanity = profanityPatterns.some(pattern => pattern.test(content));

    return {
      isAppropriate: !hasProfanity,
      confidence: hasProfanity ? 0.9 : 0.8,
      categories: hasProfanity ? ['profanity'] : [],
      severity: hasProfanity ? SafetyLevel.MEDIUM : SafetyLevel.LOW,
      reason: hasProfanity ? 'Profanity detected' : undefined,
      suggestedAction: hasProfanity ? 'filter' : 'allow'
    };
  }

  private checkInappropriateTopics(content: string): ModerationResult {
    const inappropriatePatterns = [
      /\b(violence|violent|fight|attack)\b/gi,
      /\b(drug|alcohol|gambling)\b/gi,
      /\b(hate|discrimination|racist)\b/gi,
      /\b(illegal|criminal|crime)\b/gi
    ];

    const hasInappropriate = inappropriatePatterns.some(pattern => pattern.test(content));

    return {
      isAppropriate: !hasInappropriate,
      confidence: hasInappropriate ? 0.8 : 0.7,
      categories: hasInappropriate ? ['inappropriate_topic'] : [],
      severity: hasInappropriate ? SafetyLevel.HIGH : SafetyLevel.LOW,
      reason: hasInappropriate ? 'Inappropriate topic detected' : undefined,
      suggestedAction: hasInappropriate ? 'block' : 'allow'
    };
  }

  private checkEducationalValue(content: string): ModerationResult {
    const educationalScore = Array.from(this.educationalKeywords).filter(keyword =>
      content.toLowerCase().includes(keyword)
    ).length;

    const hasEducationalValue = educationalScore >= 1;

    return {
      isAppropriate: hasEducationalValue,
      confidence: hasEducationalValue ? 0.8 : 0.6,
      categories: hasEducationalValue ? ['educational'] : ['non_educational'],
      severity: SafetyLevel.LOW,
      reason: hasEducationalValue ? undefined : 'Low educational value',
      suggestedAction: hasEducationalValue ? 'allow' : 'filter'
    };
  }

  private checkPersonalInformation(content: string): ModerationResult {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd)\b/gi // Address
    ];

    const hasPII = piiPatterns.some(pattern => pattern.test(content));

    return {
      isAppropriate: !hasPII,
      confidence: hasPII ? 0.9 : 0.8,
      categories: hasPII ? ['personal_information'] : [],
      severity: hasPII ? SafetyLevel.HIGH : SafetyLevel.LOW,
      reason: hasPII ? 'Personal information detected' : undefined,
      suggestedAction: hasPII ? 'block' : 'allow'
    };
  }

  private checkAccuracy(content: string): ModerationResult {
    // Simple heuristic for accuracy - in production, this would be more sophisticated
    const uncertaintyIndicators = [
      'i think', 'maybe', 'probably', 'might be', 'could be',
      'not sure', 'uncertain', 'possibly'
    ];

    const hasUncertainty = uncertaintyIndicators.some(indicator =>
      content.toLowerCase().includes(indicator)
    );

    return {
      isAppropriate: !hasUncertainty,
      confidence: hasUncertainty ? 0.6 : 0.8,
      categories: hasUncertainty ? ['uncertain'] : ['confident'],
      severity: SafetyLevel.LOW,
      reason: hasUncertainty ? 'Response contains uncertainty indicators' : undefined,
      suggestedAction: hasUncertainty ? 'filter' : 'allow'
    };
  }

  private async assessResponseQuality(response: LLMResponse, request: LLMRequest): Promise<ModerationResult> {
    let qualityScore = 0;
    const categories: string[] = [];

    // Check response length (not too short, not too long)
    const responseLength = response.response.length;
    if (responseLength >= 50 && responseLength <= 2000) {
      qualityScore += 1;
      categories.push('appropriate_length');
    }

    // Check for educational indicators
    const educationalScore = Array.from(this.educationalKeywords).filter(keyword =>
      response.response.toLowerCase().includes(keyword)
    ).length;

    if (educationalScore >= 2) {
      qualityScore += 2;
      categories.push('educational');
    }

    // Check model confidence
    if (response.confidence >= 0.7) {
      qualityScore += 1;
      categories.push('confident');
    }

    // Check for citations or sources
    if (response.metadata?.citations?.length || response.metadata?.sources?.length) {
      qualityScore += 1;
      categories.push('well_sourced');
    }

    const isHighQuality = qualityScore >= 3;

    return {
      isAppropriate: isHighQuality,
      confidence: isHighQuality ? 0.8 : 0.6,
      categories,
      severity: SafetyLevel.LOW,
      reason: isHighQuality ? undefined : 'Response quality below threshold',
      suggestedAction: isHighQuality ? 'allow' : 'filter'
    };
  }

  private combineResults(results: ModerationResult[], type: 'input' | 'output'): ModerationResult {
    if (results.length === 0) {
      return {
        isAppropriate: true,
        confidence: 0.5,
        categories: [],
        severity: SafetyLevel.LOW,
        suggestedAction: 'allow'
      };
    }

    // Find the most severe result
    const mostSevere = results.reduce((prev, current) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    // If any result suggests blocking, block
    if (results.some(r => r.suggestedAction === 'block')) {
      return {
        ...mostSevere,
        suggestedAction: 'block'
      };
    }

    // If any result suggests escalation, escalate
    if (results.some(r => r.suggestedAction === 'escalate')) {
      return {
        ...mostSevere,
        suggestedAction: 'escalate'
      };
    }

    // If any result suggests filtering, filter
    if (results.some(r => r.suggestedAction === 'filter')) {
      return {
        ...mostSevere,
        suggestedAction: 'filter'
      };
    }

    // Otherwise, allow
    return {
      isAppropriate: true,
      confidence: Math.min(...results.map(r => r.confidence)),
      categories: results.flatMap(r => r.categories),
      severity: mostSevere.severity,
      suggestedAction: 'allow'
    };
  }

  private gradeToAge(gradeLevel: string): number {
    const grade = parseInt(gradeLevel.replace(/\D/g, ''));
    return Math.max(5 + grade, 5); // Kindergarten = age 5, 1st grade = age 6, etc.
  }

  private generateAgeAppropriateAlternative(content: string, userAge?: number): string {
    if (!userAge || userAge >= 16) {
      return "I'd like to help you learn about this topic, but let's approach it in an age-appropriate way. What specific aspect would you like to understand better?";
    }

    if (userAge < 10) {
      return "That's a grown-up topic! Let's talk about something fun you're learning in school instead. What's your favorite subject?";
    }

    return "That topic is a bit advanced for now. Let's focus on concepts that are perfect for your grade level. What are you studying in class that I can help with?";
  }

  private generateAcademicIntegrityAlternative(content: string): string {
    return "I'd love to help you learn! Instead of giving you the solution directly, let me guide you through the problem step by step. This way, you'll understand the concepts and be able to solve similar problems on your own. What part would you like to start with?";
  }

  private generateProfanityAlternative(content: string): string {
    return "I notice some inappropriate language in your message. Let's keep our conversation respectful and focused on learning. I'm here to help with your studies - what subject can I assist you with today?";
  }

  private generateTopicAlternative(content: string): string {
    return "That topic isn't something I can help with in an educational context. I'm designed to assist with schoolwork and learning. What academic subject would you like to explore instead?";
  }
}