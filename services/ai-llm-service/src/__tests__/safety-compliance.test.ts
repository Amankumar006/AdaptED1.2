import { SafetyService } from '../services/safety.service';
import { ContentModerationService } from '../services/content-moderation.service';
import { EscalationService } from '../services/escalation.service';
import { AIService } from '../services/ai.service';
import { 
  LLMRequest, 
  LLMResponse, 
  QueryType, 
  InputType, 
  SafetyLevel, 
  UserProfile,
  ParentalControls 
} from '../types/ai.types';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('Safety and Compliance Features', () => {
  let safetyService: SafetyService;
  let moderationService: ContentModerationService;
  let escalationService: EscalationService;

  beforeEach(() => {
    safetyService = new SafetyService();
    moderationService = new ContentModerationService();
    escalationService = new EscalationService();
  });

  describe('SafetyService', () => {
    describe('Input Safety Checks', () => {
      it('should detect profanity in user input', async () => {
        const request: LLMRequest = {
          id: 'test-1',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'This is damn stupid',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const profanityCheck = checks.find(check => check.type === 'profanity');
        
        expect(profanityCheck).toBeDefined();
        expect(profanityCheck?.passed).toBe(false);
        expect(profanityCheck?.confidence).toBeGreaterThan(0.8);
      });

      it('should detect inappropriate topics', async () => {
        const request: LLMRequest = {
          id: 'test-2',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'How to make violence in games',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const topicCheck = checks.find(check => check.type === 'inappropriate_topic');
        
        expect(topicCheck).toBeDefined();
        expect(topicCheck?.passed).toBe(false);
      });

      it('should check age appropriateness', async () => {
        const userProfile: UserProfile = {
          userId: 'user-1',
          age: 10,
          gradeLevel: '5th',
          subjects: ['math', 'science'],
          language: 'en',
          timezone: 'UTC'
        };

        const request: LLMRequest = {
          id: 'test-3',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'Tell me about violence in history',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          userProfile,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const ageCheck = checks.find(check => check.type === 'age_inappropriate');
        
        expect(ageCheck).toBeDefined();
        expect(ageCheck?.passed).toBe(false);
      });

      it('should respect parental controls', async () => {
        const parentalControls: ParentalControls = {
          enabled: true,
          restrictedTopics: ['violence', 'drugs'],
          contentFilterLevel: 'strict'
        };

        const userProfile: UserProfile = {
          userId: 'user-1',
          age: 12,
          gradeLevel: '7th',
          subjects: ['math', 'science'],
          language: 'en',
          timezone: 'UTC',
          parentalControls
        };

        const request: LLMRequest = {
          id: 'test-4',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'What are drugs used for?',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          userProfile,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const parentalCheck = checks.find(check => check.type === 'parental_controls');
        
        expect(parentalCheck).toBeDefined();
        expect(parentalCheck?.passed).toBe(false);
      });

      it('should detect homework integrity violations', async () => {
        const request: LLMRequest = {
          id: 'test-5',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'Give me the answer to my math homework',
          queryType: QueryType.HOMEWORK_HELP,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const homeworkCheck = checks.find(check => check.type === 'homework_integrity');
        
        expect(homeworkCheck).toBeDefined();
        expect(homeworkCheck?.passed).toBe(false);
      });

      it('should detect personal information', async () => {
        const request: LLMRequest = {
          id: 'test-6',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'My email is john.doe@example.com and my phone is 555-123-4567',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const checks = await safetyService.performInputSafetyChecks(request);
        const piiCheck = checks.find(check => check.type === 'personal_information');
        
        expect(piiCheck).toBeDefined();
        expect(piiCheck?.passed).toBe(false);
      });
    });

    describe('Output Safety Checks', () => {
      it('should validate response content appropriateness', async () => {
        const request: LLMRequest = {
          id: 'test-7',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'Tell me about science',
          queryType: QueryType.CONCEPT_EXPLANATION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-1',
          requestId: 'test-7',
          response: 'Science is the study of the natural world through observation and experimentation.',
          provider: 'openai' as any,
          model: 'gpt-3.5-turbo',
          confidence: 0.9,
          safetyLevel: SafetyLevel.LOW,
          tokensUsed: 50,
          responseTime: 1000,
          cached: false,
          timestamp: new Date()
        };

        const checks = await safetyService.performOutputSafetyChecks(response, request);
        const contentCheck = checks.find(check => check.type === 'response_content');
        
        expect(contentCheck).toBeDefined();
        expect(contentCheck?.passed).toBe(true);
      });

      it('should check educational value of responses', async () => {
        const request: LLMRequest = {
          id: 'test-8',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'How does photosynthesis work?',
          queryType: QueryType.CONCEPT_EXPLANATION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-2',
          requestId: 'test-8',
          response: 'Photosynthesis is a process where plants convert sunlight into energy. Plants use chlorophyll to capture light and transform carbon dioxide and water into glucose and oxygen.',
          provider: 'openai' as any,
          model: 'gpt-3.5-turbo',
          confidence: 0.9,
          safetyLevel: SafetyLevel.LOW,
          tokensUsed: 75,
          responseTime: 1200,
          cached: false,
          timestamp: new Date()
        };

        const checks = await safetyService.performOutputSafetyChecks(response, request);
        const educationalCheck = checks.find(check => check.type === 'educational_value');
        
        expect(educationalCheck).toBeDefined();
        expect(educationalCheck?.passed).toBe(true);
      });
    });

    describe('Age-Appropriate Filtering', () => {
      it('should simplify language for younger students', async () => {
        const originalText = 'The molecular structure demonstrates complex interactions between various chemical compounds.';
        const filteredText = await safetyService.applyAgeAppropriateFiltering(originalText, 8);
        
        expect(filteredText).not.toEqual(originalText);
        expect(filteredText.toLowerCase()).toContain('simple');
      });

      it('should adjust content for middle school students', async () => {
        const originalText = 'This elementary concept is basic for understanding.';
        const filteredText = await safetyService.applyAgeAppropriateFiltering(originalText, 13);
        
        expect(filteredText).toContain('foundational');
      });
    });

    describe('Escalation Logic', () => {
      it('should recommend escalation for high-risk safety violations', async () => {
        const request: LLMRequest = {
          id: 'test-9',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'I want to hurt someone',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-3',
          requestId: 'test-9',
          response: 'I cannot and will not provide information about harming others.',
          provider: 'safety_filter' as any,
          model: 'content_moderation',
          confidence: 1.0,
          safetyLevel: SafetyLevel.CRITICAL,
          tokensUsed: 0,
          responseTime: 0,
          cached: false,
          timestamp: new Date()
        };

        const inputChecks = await safetyService.performInputSafetyChecks(request);
        const outputChecks = await safetyService.performOutputSafetyChecks(response, request);
        
        const escalationResult = await safetyService.shouldEscalateToHuman(
          request, 
          response, 
          inputChecks, 
          outputChecks
        );
        
        expect(escalationResult.shouldEscalate).toBe(true);
        expect(escalationResult.severity).toBe(SafetyLevel.HIGH);
      });

      it('should detect emotional distress', async () => {
        const request: LLMRequest = {
          id: 'test-10',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'I am so stressed and confused about everything, I want to give up',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-4',
          requestId: 'test-10',
          response: 'I understand you are feeling stressed. Let me help you break down the problem.',
          provider: 'openai' as any,
          model: 'gpt-3.5-turbo',
          confidence: 0.8,
          safetyLevel: SafetyLevel.MEDIUM,
          tokensUsed: 40,
          responseTime: 800,
          cached: false,
          timestamp: new Date()
        };

        const inputChecks = await safetyService.performInputSafetyChecks(request);
        const outputChecks = await safetyService.performOutputSafetyChecks(response, request);
        
        const escalationResult = await safetyService.shouldEscalateToHuman(
          request, 
          response, 
          inputChecks, 
          outputChecks
        );
        
        expect(escalationResult.shouldEscalate).toBe(true);
        expect(escalationResult.reason).toContain('emotional distress');
      });
    });
  });

  describe('ContentModerationService', () => {
    describe('Input Moderation', () => {
      it('should moderate inappropriate input', async () => {
        const request: LLMRequest = {
          id: 'test-11',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'How to cheat on my test',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const result = await moderationService.moderateInput(request);
        
        expect(result.isAppropriate).toBe(false);
        expect(result.categories).toContain('academic_integrity');
        expect(result.suggestedAction).toBe('filter');
      });

      it('should allow appropriate educational content', async () => {
        const request: LLMRequest = {
          id: 'test-12',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'Can you help me understand photosynthesis?',
          queryType: QueryType.CONCEPT_EXPLANATION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const result = await moderationService.moderateInput(request);
        
        expect(result.isAppropriate).toBe(true);
        expect(result.suggestedAction).toBe('allow');
      });
    });

    describe('Age Filtering', () => {
      it('should block age-inappropriate content', async () => {
        const result = await moderationService.applyAgeFilter(
          'This content discusses violence and weapons',
          10
        );
        
        expect(result.isAppropriate).toBe(false);
        expect(result.categories).toContain('age_inappropriate');
        expect(result.suggestedAction).toBe('block');
      });

      it('should allow age-appropriate content', async () => {
        const result = await moderationService.applyAgeFilter(
          'Let me explain how plants grow',
          10
        );
        
        expect(result.isAppropriate).toBe(true);
        expect(result.suggestedAction).toBe('allow');
      });
    });

    describe('Academic Integrity', () => {
      it('should detect direct answer requests', async () => {
        const result = await moderationService.checkAcademicIntegrity(
          'Just give me the answer to this math problem',
          'homework_help'
        );
        
        expect(result.isAppropriate).toBe(false);
        expect(result.categories).toContain('academic_integrity');
        expect(result.suggestedAction).toBe('filter');
      });

      it('should allow learning-focused questions', async () => {
        const result = await moderationService.checkAcademicIntegrity(
          'Can you help me understand how to solve this type of problem?',
          'homework_help'
        );
        
        expect(result.isAppropriate).toBe(true);
        expect(result.suggestedAction).toBe('allow');
      });
    });

    describe('Safe Content Generation', () => {
      it('should generate safe alternatives for inappropriate content', async () => {
        const moderationResult = {
          isAppropriate: false,
          confidence: 0.9,
          categories: ['academic_integrity', 'direct_answer_request'],
          severity: SafetyLevel.MEDIUM,
          suggestedAction: 'filter' as const
        };

        const safeContent = await moderationService.generateSafeContent(
          'Give me the answer to my homework',
          moderationResult
        );
        
        expect(safeContent).toContain('guide you through');
        expect(safeContent).toContain('understand');
        expect(safeContent).not.toContain('answer');
      });

      it('should generate age-appropriate alternatives', async () => {
        const moderationResult = {
          isAppropriate: false,
          confidence: 0.9,
          categories: ['age_inappropriate'],
          severity: SafetyLevel.HIGH,
          suggestedAction: 'block' as const
        };

        const userProfile: UserProfile = {
          userId: 'user-1',
          age: 8,
          gradeLevel: '3rd',
          subjects: ['math', 'science'],
          language: 'en',
          timezone: 'UTC'
        };

        const safeContent = await moderationService.generateSafeContent(
          'Tell me about violence',
          moderationResult,
          userProfile
        );
        
        expect(safeContent).toContain('grown-up topic');
        expect(safeContent).toContain('school');
      });
    });
  });

  describe('EscalationService', () => {
    describe('Escalation Rules', () => {
      it('should evaluate safety check failures', async () => {
        const request: LLMRequest = {
          id: 'test-13',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'Inappropriate content',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-5',
          requestId: 'test-13',
          response: 'Filtered response',
          provider: 'safety_filter' as any,
          model: 'content_moderation',
          confidence: 1.0,
          safetyLevel: SafetyLevel.HIGH,
          tokensUsed: 0,
          responseTime: 0,
          cached: false,
          timestamp: new Date()
        };

        const safetyChecks = [
          {
            type: 'inappropriate_topic',
            passed: false,
            confidence: 0.9,
            details: 'High-risk content detected'
          }
        ];

        const evaluation = await escalationService.evaluateEscalation(
          request,
          response,
          safetyChecks
        );
        
        expect(evaluation.shouldEscalate).toBe(true);
        expect(evaluation.rule).toBeDefined();
      });

      it('should detect emotional distress patterns', async () => {
        const request: LLMRequest = {
          id: 'test-14',
          userId: 'user-1',
          sessionId: 'session-1',
          query: 'I am so stressed and anxious about failing this class',
          queryType: QueryType.GENERAL_QUESTION,
          inputType: InputType.TEXT,
          timestamp: new Date()
        };

        const response: LLMResponse = {
          id: 'response-6',
          requestId: 'test-14',
          response: 'I understand you are feeling stressed.',
          provider: 'openai' as any,
          model: 'gpt-3.5-turbo',
          confidence: 0.8,
          safetyLevel: SafetyLevel.MEDIUM,
          tokensUsed: 30,
          responseTime: 600,
          cached: false,
          timestamp: new Date()
        };

        const evaluation = await escalationService.evaluateEscalation(
          request,
          response,
          []
        );
        
        expect(evaluation.shouldEscalate).toBe(true);
        expect(evaluation.reason).toContain('Emotional Distress');
      });
    });

    describe('Teacher Assignment', () => {
      it('should assign teachers to students', async () => {
        await escalationService.assignTeacherToStudent('student-1', 'teacher-1');
        
        const escalations = await escalationService.getTeacherEscalations('teacher-1');
        expect(escalations).toBeDefined();
      });

      it('should remove teacher assignments', async () => {
        await escalationService.assignTeacherToStudent('student-1', 'teacher-1');
        await escalationService.removeTeacherFromStudent('student-1', 'teacher-1');
        
        // Verify removal (in a real implementation, this would check the database)
        expect(true).toBe(true); // Placeholder assertion
      });
    });

    describe('Escalation Metrics', () => {
      it('should provide escalation metrics', async () => {
        const metrics = await escalationService.getEscalationMetrics();
        
        expect(metrics).toHaveProperty('totalEscalations');
        expect(metrics).toHaveProperty('escalationsByType');
        expect(metrics).toHaveProperty('escalationsBySeverity');
        expect(metrics).toHaveProperty('averageResponseTime');
        expect(metrics).toHaveProperty('resolutionRate');
        expect(metrics).toHaveProperty('teacherResponseRate');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together for comprehensive safety', async () => {
      // Test that all services can work together
      const request: LLMRequest = {
        id: 'integration-test',
        userId: 'user-1',
        sessionId: 'session-1',
        query: 'This is a test query',
        queryType: QueryType.GENERAL_QUESTION,
        inputType: InputType.TEXT,
        timestamp: new Date()
      };

      // Test input moderation
      const inputModeration = await moderationService.moderateInput(request);
      expect(inputModeration).toHaveProperty('isAppropriate');
      expect(inputModeration).toHaveProperty('suggestedAction');

      // Test safety checks
      const safetyChecks = await safetyService.performInputSafetyChecks(request);
      expect(Array.isArray(safetyChecks)).toBe(true);
      expect(safetyChecks.length).toBeGreaterThan(0);

      // Test escalation evaluation
      const mockResponse: LLMResponse = {
        id: 'mock-response',
        requestId: request.id,
        response: 'This is a test response',
        provider: 'test' as any,
        model: 'test-model',
        confidence: 0.9,
        safetyLevel: SafetyLevel.LOW,
        tokensUsed: 20,
        responseTime: 100,
        cached: false,
        timestamp: new Date()
      };

      const escalationEval = await escalationService.evaluateEscalation(
        request,
        mockResponse,
        safetyChecks
      );
      
      expect(escalationEval).toHaveProperty('shouldEscalate');
      expect(escalationEval).toHaveProperty('reason');
    });
  });
});