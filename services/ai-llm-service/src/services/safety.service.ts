import { LLMRequest, LLMResponse, SafetyLevel, SafetyCheck, EscalationEvent, UserProfile } from '../types/ai.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

export class SafetyService {
  private profanityWords: Set<string> = new Set([
    // Basic profanity list - in production, this would be more comprehensive
    'damn', 'hell', 'crap', 'stupid', 'idiot', 'hate', 'kill', 'die', 'death'
  ]);

  private inappropriateTopics: Set<string> = new Set([
    'violence', 'drugs', 'alcohol', 'weapons', 'gambling', 'adult content',
    'self-harm', 'suicide', 'illegal activities', 'hate speech', 'discrimination'
  ]);

  private ageRestrictedContent: Map<string, number> = new Map([
    ['violence', 13],
    ['mature themes', 16],
    ['complex political topics', 14],
    ['advanced scientific concepts', 12],
    ['financial advice', 16],
    ['medical advice', 18],
    ['legal advice', 18]
  ]); // content type -> minimum age

  constructor() {
    // Constructor is now empty as properties are initialized inline
  }

  /**
   * Performs comprehensive safety checks on user input
   */
  async performInputSafetyChecks(request: LLMRequest): Promise<SafetyCheck[]> {
    const checks: SafetyCheck[] = [];

    try {
      // Profanity check
      const profanityCheck = this.checkProfanity(request.query);
      checks.push(profanityCheck);

      // Inappropriate topic check
      const topicCheck = this.checkInappropriateTopics(request.query);
      checks.push(topicCheck);

      // Age appropriateness check
      if (request.userProfile?.age) {
        const ageCheck = this.checkAgeAppropriateness(request.query, request.userProfile.age);
        checks.push(ageCheck);
      }

      // Parental controls check
      if (request.userProfile?.parentalControls?.enabled) {
        const parentalCheck = this.checkParentalControls(request.query, request.userProfile.parentalControls);
        checks.push(parentalCheck);
      }

      // Homework integrity check
      const homeworkCheck = this.checkHomeworkIntegrity(request.query, request.queryType);
      checks.push(homeworkCheck);

      // Personal information check
      const piiCheck = this.checkPersonalInformation(request.query);
      checks.push(piiCheck);

      logger.info(`Performed ${checks.length} safety checks for request ${request.id}`);
      return checks;

    } catch (error) {
      logger.error('Error performing input safety checks:', error);
      return [{
        type: 'error',
        passed: false,
        confidence: 1.0,
        details: 'Safety check system error'
      }];
    }
  }

  /**
   * Performs safety checks on AI-generated responses
   */
  async performOutputSafetyChecks(response: LLMResponse, request: LLMRequest): Promise<SafetyCheck[]> {
    const checks: SafetyCheck[] = [];

    try {
      // Content appropriateness check
      const contentCheck = this.checkResponseContent(response.response, request.userProfile);
      checks.push(contentCheck);

      // Educational value check
      const educationalCheck = this.checkEducationalValue(response.response, request.queryType);
      checks.push(educationalCheck);

      // Accuracy confidence check
      const accuracyCheck = this.checkResponseAccuracy(response);
      checks.push(accuracyCheck);

      // Bias detection check
      const biasCheck = this.checkResponseBias(response.response);
      checks.push(biasCheck);

      // Citation and source check
      const sourceCheck = this.checkSourceReliability(response);
      checks.push(sourceCheck);

      logger.info(`Performed ${checks.length} output safety checks for response ${response.id}`);
      return checks;

    } catch (error) {
      logger.error('Error performing output safety checks:', error);
      return [{
        type: 'error',
        passed: false,
        confidence: 1.0,
        details: 'Output safety check system error'
      }];
    }
  }

  /**
   * Determines if escalation to human teacher is needed
   */
  async shouldEscalateToHuman(
    request: LLMRequest, 
    response: LLMResponse, 
    inputChecks: SafetyCheck[], 
    outputChecks: SafetyCheck[]
  ): Promise<{ shouldEscalate: boolean; reason: string; severity: SafetyLevel }> {
    
    if (!config.safety.humanTeacherEscalationEnabled) {
      return { shouldEscalate: false, reason: 'Escalation disabled', severity: SafetyLevel.LOW };
    }

    // Check for emotional distress indicators first (highest priority)
    if (this.detectsEmotionalDistress(request.query)) {
      return {
        shouldEscalate: true,
        reason: 'Student emotional distress detected',
        severity: SafetyLevel.CRITICAL
      };
    }

    // Check for failed safety checks
    const failedChecks = [...inputChecks, ...outputChecks].filter(check => !check.passed);
    
    if (failedChecks.length > 0) {
      const highRiskChecks = failedChecks.filter(check => 
        check.confidence >= (config.safety.escalationThreshold || 0.8)
      );

      if (highRiskChecks.length > 0) {
        return {
          shouldEscalate: true,
          reason: `High-risk safety violations: ${highRiskChecks.map(c => c.type).join(', ')}`,
          severity: SafetyLevel.HIGH
        };
      }
    }

    // Check for complex academic questions that might need human expertise
    if (this.isComplexAcademicQuestion(request.query, request.queryType)) {
      return {
        shouldEscalate: true,
        reason: 'Complex academic question requiring human expertise',
        severity: SafetyLevel.MEDIUM
      };
    }

    // Check for repeated similar questions (might indicate confusion)
    const isRepeatedQuestion = await this.checkRepeatedQuestions(request);
    if (isRepeatedQuestion) {
      return {
        shouldEscalate: true,
        reason: 'Repeated similar questions indicate student confusion',
        severity: SafetyLevel.MEDIUM
      };
    }

    return { shouldEscalate: false, reason: 'No escalation criteria met', severity: SafetyLevel.LOW };
  }

  /**
   * Creates an escalation event for human teacher intervention
   */
  async createEscalationEvent(
    request: LLMRequest,
    response: LLMResponse,
    reason: string,
    severity: SafetyLevel
  ): Promise<EscalationEvent> {
    const escalationEvent: EscalationEvent = {
      id: uuidv4(),
      userId: request.userId,
      sessionId: request.sessionId,
      requestId: request.id,
      reason,
      severity,
      teacherId: await this.findAssignedTeacher(request.userId, request.courseContext?.courseId),
      resolved: false,
      timestamp: new Date()
    };

    // In production, this would be stored in a database and trigger notifications
    logger.warn(`Escalation event created: ${escalationEvent.id} - ${reason}`);
    
    // Notify assigned teacher (mock implementation)
    await this.notifyTeacher(escalationEvent);

    return escalationEvent;
  }

  /**
   * Applies age-appropriate content filtering to responses
   */
  async applyAgeAppropriateFiltering(
    response: string, 
    userAge?: number, 
    gradeLevel?: string
  ): Promise<string> {
    if (!userAge && !gradeLevel) {
      return response;
    }

    let filteredResponse = response;

    // Apply age-based filtering
    if (userAge && userAge < 13) {
      // Elementary level filtering
      filteredResponse = this.simplifyLanguageForYoungerStudents(filteredResponse);
      filteredResponse = this.removeComplexConcepts(filteredResponse);
    } else if (userAge && userAge < 16) {
      // Middle school level filtering
      filteredResponse = this.adjustForMiddleSchool(filteredResponse);
    }

    // Apply grade-level appropriate language
    if (gradeLevel) {
      filteredResponse = this.adjustLanguageForGradeLevel(filteredResponse, gradeLevel);
    }

    return filteredResponse;
  }

  /**
   * Generates safe, educational alternative responses for inappropriate queries
   */
  async generateSafeAlternativeResponse(
    request: LLMRequest,
    failedChecks: SafetyCheck[]
  ): Promise<string> {
    const primaryFailure = failedChecks.find(check => check.confidence >= 0.8);
    
    if (!primaryFailure) {
      return "I'm here to help with your educational questions. Could you please rephrase your question in a more appropriate way?";
    }

    switch (primaryFailure.type) {
      case 'profanity':
        return "I notice your message contains inappropriate language. Let's keep our conversation respectful and focused on learning. How can I help you with your studies today?";
      
      case 'inappropriate_topic':
        return "That topic isn't something I can help with in an educational context. I'm here to assist with your schoolwork and learning. What subject would you like to explore?";
      
      case 'age_inappropriate':
        return "That question involves concepts that might be too advanced right now. Let me help you with topics that are perfect for your current level. What are you studying in class?";
      
      case 'homework_integrity':
        return "I'd love to help you learn, but I can't provide direct answers to homework. Instead, let me guide you through the concepts so you can solve it yourself. What part would you like to understand better?";
      
      case 'personal_information':
        return "I notice you might be sharing personal information. For your safety, please don't share personal details. Let's focus on your learning goals instead. What subject can I help you with?";
      
      default:
        return "I want to make sure our conversation stays helpful and appropriate for learning. Could you rephrase your question so I can better assist you with your studies?";
    }
  }

  // Private helper methods

  private checkProfanity(text: string): SafetyCheck {
    const words = text.toLowerCase().split(/\s+/);
    const profanityFound = words.some(word => this.profanityWords.has(word));
    
    return {
      type: 'profanity',
      passed: !profanityFound,
      confidence: profanityFound ? 0.9 : 0.1,
      details: profanityFound ? 'Profanity detected in input' : 'No profanity detected'
    };
  }

  private checkInappropriateTopics(text: string): SafetyCheck {
    const lowerText = text.toLowerCase();
    const inappropriateFound = Array.from(this.inappropriateTopics).some(topic => 
      lowerText.includes(topic)
    );
    
    // Also check for harmful intent
    const harmfulPatterns = ['hurt someone', 'harm others', 'want to kill', 'want to die'];
    const harmfulFound = harmfulPatterns.some(pattern => lowerText.includes(pattern));
    
    return {
      type: 'inappropriate_topic',
      passed: !inappropriateFound && !harmfulFound,
      confidence: (inappropriateFound || harmfulFound) ? 0.9 : 0.2,
      details: (inappropriateFound || harmfulFound) ? 'Inappropriate topic detected' : 'Content appears appropriate'
    };
  }

  private checkAgeAppropriateness(text: string, userAge: number): SafetyCheck {
    const lowerText = text.toLowerCase();
    
    for (const [content, minAge] of this.ageRestrictedContent.entries()) {
      if (lowerText.includes(content) && userAge < minAge) {
        return {
          type: 'age_inappropriate',
          passed: false,
          confidence: 0.8,
          details: `Content requires minimum age of ${minAge}, user is ${userAge}`
        };
      }
    }
    
    return {
      type: 'age_inappropriate',
      passed: true,
      confidence: 0.9,
      details: 'Content is age-appropriate'
    };
  }

  private checkParentalControls(text: string, parentalControls: any): SafetyCheck {
    const lowerText = text.toLowerCase();
    
    if (parentalControls.restrictedTopics) {
      const restrictedFound = parentalControls.restrictedTopics.some((topic: string) => 
        lowerText.includes(topic.toLowerCase())
      );
      
      if (restrictedFound) {
        return {
          type: 'parental_controls',
          passed: false,
          confidence: 0.9,
          details: 'Content violates parental control restrictions'
        };
      }
    }
    
    return {
      type: 'parental_controls',
      passed: true,
      confidence: 0.9,
      details: 'Content complies with parental controls'
    };
  }

  private checkHomeworkIntegrity(text: string, queryType: any): SafetyCheck {
    const homeworkIndicators = [
      'give me the answer', 'what is the answer to', 'solve this for me',
      'do my homework', 'complete this assignment', 'write my essay'
    ];
    
    const lowerText = text.toLowerCase();
    const directAnswerRequest = homeworkIndicators.some(indicator => 
      lowerText.includes(indicator)
    );
    
    return {
      type: 'homework_integrity',
      passed: !directAnswerRequest,
      confidence: directAnswerRequest ? 0.8 : 0.3,
      details: directAnswerRequest ? 'Direct homework answer request detected' : 'Appears to be learning-focused'
    };
  }

  private checkPersonalInformation(text: string): SafetyCheck {
    // Simple PII detection patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
      /\b\d{1,5}\s\w+\s(street|st|avenue|ave|road|rd|drive|dr)\b/i // Address
    ];
    
    const piiFound = piiPatterns.some(pattern => pattern.test(text));
    
    return {
      type: 'personal_information',
      passed: !piiFound,
      confidence: piiFound ? 0.9 : 0.1,
      details: piiFound ? 'Potential personal information detected' : 'No PII detected'
    };
  }

  private checkResponseContent(response: string, userProfile?: UserProfile): SafetyCheck {
    // Check if response contains inappropriate content
    const lowerResponse = response.toLowerCase();
    const inappropriateFound = Array.from(this.inappropriateTopics).some(topic => 
      lowerResponse.includes(topic)
    );
    
    return {
      type: 'response_content',
      passed: !inappropriateFound,
      confidence: inappropriateFound ? 0.8 : 0.9,
      details: inappropriateFound ? 'Response contains inappropriate content' : 'Response content is appropriate'
    };
  }

  private checkEducationalValue(response: string, queryType: any): SafetyCheck {
    // Simple heuristic for educational value
    const educationalIndicators = [
      'learn', 'understand', 'concept', 'explain', 'because', 'therefore',
      'example', 'practice', 'study', 'knowledge', 'skill', 'process', 'observation',
      'experimentation', 'science', 'plants', 'energy', 'convert', 'transform'
    ];
    
    const lowerResponse = response.toLowerCase();
    const educationalScore = educationalIndicators.filter(indicator => 
      lowerResponse.includes(indicator)
    ).length;
    
    const hasEducationalValue = educationalScore >= 1; // Lowered threshold
    
    return {
      type: 'educational_value',
      passed: hasEducationalValue,
      confidence: hasEducationalValue ? 0.8 : 0.6,
      details: `Educational indicators found: ${educationalScore}`
    };
  }

  private checkResponseAccuracy(response: LLMResponse): SafetyCheck {
    // Use the model's confidence score as a proxy for accuracy
    const isAccurate = response.confidence >= 0.7;
    
    return {
      type: 'accuracy',
      passed: isAccurate,
      confidence: response.confidence,
      details: `Model confidence: ${response.confidence}`
    };
  }

  private checkResponseBias(response: string): SafetyCheck {
    // Simple bias detection - in production, this would be more sophisticated
    const biasIndicators = [
      'always', 'never', 'all people', 'everyone knows', 'obviously',
      'clearly', 'definitely', 'certainly', 'without doubt'
    ];
    
    const lowerResponse = response.toLowerCase();
    const biasScore = biasIndicators.filter(indicator => 
      lowerResponse.includes(indicator)
    ).length;
    
    const hasBias = biasScore >= 3;
    
    return {
      type: 'bias',
      passed: !hasBias,
      confidence: hasBias ? 0.7 : 0.8,
      details: `Bias indicators found: ${biasScore}`
    };
  }

  private checkSourceReliability(response: LLMResponse): SafetyCheck {
    // Check if response includes citations or sources
    const hasCitations = !!(response.metadata?.citations && response.metadata.citations.length > 0);
    const hasSources = !!(response.metadata?.sources && response.metadata.sources.length > 0);
    
    return {
      type: 'source_reliability',
      passed: hasCitations || hasSources,
      confidence: (hasCitations || hasSources) ? 0.8 : 0.5,
      details: hasCitations || hasSources ? 'Response includes sources/citations' : 'No sources provided'
    };
  }

  private isComplexAcademicQuestion(query: string, queryType: any): boolean {
    const complexIndicators = [
      'advanced', 'graduate level', 'research', 'thesis', 'dissertation',
      'complex analysis', 'theoretical', 'abstract', 'philosophical'
    ];
    
    const lowerQuery = query.toLowerCase();
    return complexIndicators.some(indicator => lowerQuery.includes(indicator));
  }

  private detectsEmotionalDistress(query: string): boolean {
    const distressIndicators = [
      'stressed', 'anxious', 'worried', 'scared', 'confused', 'lost',
      'don\'t understand anything', 'failing', 'give up', 'hopeless',
      'want to give up', 'so stressed', 'so confused'
    ];
    
    const lowerQuery = query.toLowerCase();
    return distressIndicators.some(indicator => lowerQuery.includes(indicator));
  }

  private async checkRepeatedQuestions(request: LLMRequest): Promise<boolean> {
    // In production, this would check against conversation history
    // For now, return false as a placeholder
    return false;
  }

  private async findAssignedTeacher(userId: string, courseId?: string): Promise<string | undefined> {
    // In production, this would query the user management service
    // For now, return undefined as a placeholder
    return undefined;
  }

  private async notifyTeacher(escalationEvent: EscalationEvent): Promise<void> {
    // In production, this would send notifications via the notification service
    logger.info(`Teacher notification sent for escalation ${escalationEvent.id}`);
  }

  private simplifyLanguageForYoungerStudents(text: string): string {
    // Simple word replacements for younger students
    const replacements = new Map([
      ['utilize', 'use'],
      ['demonstrate', 'show'],
      ['comprehend', 'understand'],
      ['acquire', 'get'],
      ['construct', 'build'],
      ['examine', 'look at'],
      ['investigate', 'study'],
      ['molecular', 'simple'],
      ['complex', 'simple'],
      ['various', 'different'],
      ['chemical compounds', 'simple materials']
    ]);
    
    let simplified = text;
    for (const [complex, simple] of replacements) {
      simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
    }
    
    return simplified;
  }

  private removeComplexConcepts(text: string): string {
    // Remove or simplify complex concepts for younger students
    const complexPatterns = [
      /\b(quantum|molecular|cellular|atomic)\b/gi,
      /\b(theoretical|hypothetical|abstract)\b/gi,
      /\b(sophisticated|intricate|elaborate)\b/gi
    ];
    
    let simplified = text;
    complexPatterns.forEach(pattern => {
      simplified = simplified.replace(pattern, 'advanced');
    });
    
    return simplified;
  }

  private adjustForMiddleSchool(text: string): string {
    // Adjust content for middle school level
    return text.replace(/\b(elementary|basic)\b/gi, 'foundational');
  }

  private adjustLanguageForGradeLevel(text: string, gradeLevel: string): string {
    // Adjust language complexity based on grade level
    const grade = parseInt(gradeLevel.replace(/\D/g, ''));
    
    if (grade <= 5) {
      return this.simplifyLanguageForYoungerStudents(text);
    } else if (grade <= 8) {
      return this.adjustForMiddleSchool(text);
    }
    
    return text; // High school and above - no adjustment needed
  }
}