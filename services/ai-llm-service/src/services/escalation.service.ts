import { LLMRequest, LLMResponse, EscalationEvent, SafetyLevel, SafetyCheck } from '../types/ai.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: EscalationCondition[];
  action: EscalationAction;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

export interface EscalationCondition {
  type: 'safety_check_failed' | 'repeated_questions' | 'emotional_distress' | 'complex_academic' | 'custom';
  threshold?: number;
  timeWindow?: number; // in minutes
  parameters?: Record<string, any>;
}

export interface EscalationAction {
  type: 'notify_teacher' | 'block_user' | 'require_supervision' | 'custom_response';
  parameters?: Record<string, any>;
}

export interface TeacherNotification {
  id: string;
  escalationEventId: string;
  teacherId: string;
  studentId: string;
  courseId?: string;
  message: string;
  priority: SafetyLevel;
  channels: string[];
  sentAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface EscalationMetrics {
  totalEscalations: number;
  escalationsByType: Record<string, number>;
  escalationsBySeverity: Record<string, number>;
  averageResponseTime: number;
  resolutionRate: number;
  teacherResponseRate: number;
}

export class EscalationService {
  private escalationRules: Map<string, EscalationRule> = new Map();
  private activeEscalations: Map<string, EscalationEvent> = new Map();
  private userEscalationHistory: Map<string, EscalationEvent[]> = new Map();
  private teacherAssignments: Map<string, string[]> = new Map(); // userId -> teacherIds

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Evaluates if escalation is needed based on request and safety checks
   */
  async evaluateEscalation(
    request: LLMRequest,
    response: LLMResponse,
    safetyChecks: SafetyCheck[]
  ): Promise<{ shouldEscalate: boolean; rule?: EscalationRule; reason: string }> {
    
    if (!config.safety.humanTeacherEscalationEnabled) {
      return { shouldEscalate: false, reason: 'Escalation disabled in configuration' };
    }

    try {
      // Check each escalation rule
      for (const [ruleId, rule] of this.escalationRules) {
        if (!rule.enabled) continue;

        const shouldEscalate = await this.evaluateRule(rule, request, response, safetyChecks);
        if (shouldEscalate) {
          logger.info(`Escalation triggered by rule: ${rule.name} for user ${request.userId}`);
          return { 
            shouldEscalate: true, 
            rule, 
            reason: `Rule triggered: ${rule.name}` 
          };
        }
      }

      return { shouldEscalate: false, reason: 'No escalation rules triggered' };

    } catch (error) {
      logger.error('Error evaluating escalation:', error);
      return { shouldEscalate: false, reason: 'Escalation evaluation error' };
    }
  }

  /**
   * Creates and processes an escalation event
   */
  async createEscalation(
    request: LLMRequest,
    response: LLMResponse,
    rule: EscalationRule,
    reason: string
  ): Promise<EscalationEvent> {
    
    const escalationEvent: EscalationEvent = {
      id: uuidv4(),
      userId: request.userId,
      sessionId: request.sessionId,
      requestId: request.id,
      reason,
      severity: this.determineSeverity(rule, request),
      teacherId: await this.findAssignedTeacher(request.userId, request.courseContext?.courseId),
      resolved: false,
      timestamp: new Date()
    };

    // Store the escalation
    this.activeEscalations.set(escalationEvent.id, escalationEvent);
    
    // Add to user history
    const userHistory = this.userEscalationHistory.get(request.userId) || [];
    userHistory.push(escalationEvent);
    this.userEscalationHistory.set(request.userId, userHistory);

    // Execute escalation action
    await this.executeEscalationAction(escalationEvent, rule, request, response);

    logger.warn(`Escalation created: ${escalationEvent.id} - ${reason}`);
    return escalationEvent;
  }

  /**
   * Sends notification to assigned teacher
   */
  async notifyTeacher(
    escalationEvent: EscalationEvent,
    request: LLMRequest,
    additionalContext?: Record<string, any>
  ): Promise<TeacherNotification | null> {
    
    if (!escalationEvent.teacherId) {
      logger.warn(`No teacher assigned for escalation ${escalationEvent.id}`);
      return null;
    }

    const notification: TeacherNotification = {
      id: uuidv4(),
      escalationEventId: escalationEvent.id,
      teacherId: escalationEvent.teacherId,
      studentId: request.userId,
      courseId: request.courseContext?.courseId,
      message: await this.generateTeacherNotificationMessage(escalationEvent, request, additionalContext),
      priority: escalationEvent.severity,
      channels: this.getNotificationChannels(escalationEvent.severity),
      sentAt: new Date(),
      acknowledged: false
    };

    // In production, this would integrate with the notification service
    await this.sendNotificationToTeacher(notification);

    logger.info(`Teacher notification sent: ${notification.id} to teacher ${notification.teacherId}`);
    return notification;
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
    
    const escalation = this.activeEscalations.get(escalationId);
    if (!escalation) {
      logger.error(`Escalation not found: ${escalationId}`);
      return false;
    }

    if (escalation.teacherId !== teacherId) {
      logger.error(`Teacher ${teacherId} not authorized to resolve escalation ${escalationId}`);
      return false;
    }

    escalation.resolved = true;
    
    // In production, this would be stored in a database
    logger.info(`Escalation resolved: ${escalationId} by teacher ${teacherId}`);
    
    // Remove from active escalations
    this.activeEscalations.delete(escalationId);

    return true;
  }

  /**
   * Gets escalation history for a user
   */
  async getUserEscalationHistory(userId: string, limit?: number): Promise<EscalationEvent[]> {
    const history = this.userEscalationHistory.get(userId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Gets active escalations for a teacher
   */
  async getTeacherEscalations(teacherId: string): Promise<EscalationEvent[]> {
    return Array.from(this.activeEscalations.values())
      .filter(escalation => escalation.teacherId === teacherId && !escalation.resolved);
  }

  /**
   * Gets escalation metrics for monitoring
   */
  async getEscalationMetrics(timeRange?: { start: Date; end: Date }): Promise<EscalationMetrics> {
    const allEscalations = Array.from(this.userEscalationHistory.values()).flat();
    
    let filteredEscalations = allEscalations;
    if (timeRange) {
      filteredEscalations = allEscalations.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const escalationsByType: Record<string, number> = {};
    const escalationsBySeverity: Record<string, number> = {};

    filteredEscalations.forEach(escalation => {
      // Count by reason (type)
      escalationsByType[escalation.reason] = (escalationsByType[escalation.reason] || 0) + 1;
      
      // Count by severity
      escalationsBySeverity[escalation.severity] = (escalationsBySeverity[escalation.severity] || 0) + 1;
    });

    return {
      totalEscalations: filteredEscalations.length,
      escalationsByType,
      escalationsBySeverity,
      averageResponseTime: 0, // Would be calculated from resolution times
      resolutionRate: 0, // Would be calculated from resolved vs total
      teacherResponseRate: 0 // Would be calculated from teacher acknowledgments
    };
  }

  /**
   * Updates escalation rules configuration
   */
  async updateEscalationRules(rules: EscalationRule[]): Promise<void> {
    for (const rule of rules) {
      this.escalationRules.set(rule.id, rule);
      logger.info(`Updated escalation rule: ${rule.name}`);
    }
  }

  /**
   * Assigns teachers to students for escalation purposes
   */
  async assignTeacherToStudent(studentId: string, teacherId: string): Promise<void> {
    const currentTeachers = this.teacherAssignments.get(studentId) || [];
    if (!currentTeachers.includes(teacherId)) {
      currentTeachers.push(teacherId);
      this.teacherAssignments.set(studentId, currentTeachers);
      logger.info(`Assigned teacher ${teacherId} to student ${studentId}`);
    }
  }

  /**
   * Removes teacher assignment from student
   */
  async removeTeacherFromStudent(studentId: string, teacherId: string): Promise<void> {
    const currentTeachers = this.teacherAssignments.get(studentId) || [];
    const updatedTeachers = currentTeachers.filter(id => id !== teacherId);
    this.teacherAssignments.set(studentId, updatedTeachers);
    logger.info(`Removed teacher ${teacherId} from student ${studentId}`);
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    const defaultRules: EscalationRule[] = [
      {
        id: 'safety-violation-high',
        name: 'High-Risk Safety Violation',
        enabled: true,
        conditions: [
          {
            type: 'safety_check_failed',
            threshold: 0.8,
            parameters: { severity: 'high' }
          }
        ],
        action: {
          type: 'notify_teacher',
          parameters: { immediate: true }
        },
        priority: 'critical',
        notificationChannels: ['email', 'sms', 'in_app']
      },
      {
        id: 'emotional-distress',
        name: 'Student Emotional Distress',
        enabled: true,
        conditions: [
          {
            type: 'emotional_distress',
            threshold: 0.7
          }
        ],
        action: {
          type: 'notify_teacher',
          parameters: { urgent: true, counselor: true }
        },
        priority: 'critical',
        notificationChannels: ['email', 'sms', 'in_app']
      },
      {
        id: 'repeated-confusion',
        name: 'Repeated Student Confusion',
        enabled: true,
        conditions: [
          {
            type: 'repeated_questions',
            threshold: 3,
            timeWindow: 30
          }
        ],
        action: {
          type: 'notify_teacher',
          parameters: { intervention_needed: true }
        },
        priority: 'medium',
        notificationChannels: ['email', 'in_app']
      },
      {
        id: 'complex-academic',
        name: 'Complex Academic Question',
        enabled: true,
        conditions: [
          {
            type: 'complex_academic',
            threshold: 0.8
          }
        ],
        action: {
          type: 'notify_teacher',
          parameters: { expertise_needed: true }
        },
        priority: 'low',
        notificationChannels: ['in_app']
      }
    ];

    defaultRules.forEach(rule => {
      this.escalationRules.set(rule.id, rule);
    });
  }

  private async evaluateRule(
    rule: EscalationRule,
    request: LLMRequest,
    response: LLMResponse,
    safetyChecks: SafetyCheck[]
  ): Promise<boolean> {
    
    for (const condition of rule.conditions) {
      const conditionMet = await this.evaluateCondition(condition, request, response, safetyChecks);
      if (!conditionMet) {
        return false; // All conditions must be met
      }
    }
    
    return true;
  }

  private async evaluateCondition(
    condition: EscalationCondition,
    request: LLMRequest,
    response: LLMResponse,
    safetyChecks: SafetyCheck[]
  ): Promise<boolean> {
    
    switch (condition.type) {
      case 'safety_check_failed':
        return this.evaluateSafetyCheckCondition(condition, safetyChecks);
      
      case 'repeated_questions':
        return await this.evaluateRepeatedQuestionsCondition(condition, request);
      
      case 'emotional_distress':
        return this.evaluateEmotionalDistressCondition(condition, request);
      
      case 'complex_academic':
        return this.evaluateComplexAcademicCondition(condition, request);
      
      default:
        return false;
    }
  }

  private evaluateSafetyCheckCondition(condition: EscalationCondition, safetyChecks: SafetyCheck[]): boolean {
    const failedChecks = safetyChecks.filter(check => 
      !check.passed && check.confidence >= (condition.threshold || 0.8)
    );
    
    // Check for high-severity failures
    const highSeverityChecks = safetyChecks.filter(check => 
      !check.passed && check.confidence >= 0.9 && 
      (check.type === 'inappropriate_topic' || check.type === 'profanity')
    );
    
    return failedChecks.length > 0 || highSeverityChecks.length > 0;
  }

  private async evaluateRepeatedQuestionsCondition(
    condition: EscalationCondition, 
    request: LLMRequest
  ): Promise<boolean> {
    // In production, this would check conversation history
    // For now, return false as placeholder
    return false;
  }

  private evaluateEmotionalDistressCondition(condition: EscalationCondition, request: LLMRequest): boolean {
    const distressKeywords = [
      'stressed', 'anxious', 'worried', 'scared', 'confused', 'lost',
      'don\'t understand', 'failing', 'give up', 'hopeless', 'frustrated'
    ];
    
    const query = request.query.toLowerCase();
    const distressScore = distressKeywords.filter(keyword => query.includes(keyword)).length;
    
    return distressScore >= (condition.threshold || 2);
  }

  private evaluateComplexAcademicCondition(condition: EscalationCondition, request: LLMRequest): boolean {
    const complexKeywords = [
      'advanced', 'graduate', 'research', 'thesis', 'dissertation',
      'theoretical', 'abstract', 'philosophical', 'quantum', 'molecular'
    ];
    
    const query = request.query.toLowerCase();
    const complexityScore = complexKeywords.filter(keyword => query.includes(keyword)).length;
    
    return complexityScore >= (condition.threshold || 1);
  }

  private determineSeverity(rule: EscalationRule, request: LLMRequest): SafetyLevel {
    switch (rule.priority) {
      case 'critical':
        return SafetyLevel.CRITICAL;
      case 'high':
        return SafetyLevel.HIGH;
      case 'medium':
        return SafetyLevel.MEDIUM;
      default:
        return SafetyLevel.LOW;
    }
  }

  private async findAssignedTeacher(userId: string, courseId?: string): Promise<string | undefined> {
    // In production, this would query the user management service
    const assignedTeachers = this.teacherAssignments.get(userId);
    return assignedTeachers?.[0]; // Return first assigned teacher
  }

  private async executeEscalationAction(
    escalationEvent: EscalationEvent,
    rule: EscalationRule,
    request: LLMRequest,
    response: LLMResponse
  ): Promise<void> {
    
    switch (rule.action.type) {
      case 'notify_teacher':
        await this.notifyTeacher(escalationEvent, request, rule.action.parameters);
        break;
      
      case 'block_user':
        // In production, this would integrate with user management
        logger.warn(`User blocking requested for escalation ${escalationEvent.id}`);
        break;
      
      case 'require_supervision':
        // In production, this would set user flags requiring supervision
        logger.info(`Supervision required for user ${request.userId}`);
        break;
      
      default:
        logger.warn(`Unknown escalation action type: ${rule.action.type}`);
    }
  }

  private async generateTeacherNotificationMessage(
    escalationEvent: EscalationEvent,
    request: LLMRequest,
    additionalContext?: Record<string, any>
  ): Promise<string> {
    
    const studentId = request.userId;
    const courseName = request.courseContext?.courseName || 'Unknown Course';
    const timestamp = escalationEvent.timestamp.toLocaleString();
    
    let message = `🚨 Student Escalation Alert\n\n`;
    message += `Student ID: ${studentId}\n`;
    message += `Course: ${courseName}\n`;
    message += `Time: ${timestamp}\n`;
    message += `Severity: ${escalationEvent.severity.toUpperCase()}\n`;
    message += `Reason: ${escalationEvent.reason}\n\n`;
    
    message += `Student Question: "${request.query}"\n\n`;
    
    if (additionalContext?.immediate) {
      message += `⚠️ IMMEDIATE ATTENTION REQUIRED\n\n`;
    }
    
    if (additionalContext?.counselor) {
      message += `📞 Consider involving school counselor\n\n`;
    }
    
    if (additionalContext?.intervention_needed) {
      message += `🎯 Student may need additional learning support\n\n`;
    }
    
    if (additionalContext?.expertise_needed) {
      message += `🧠 Question requires subject matter expertise\n\n`;
    }
    
    message += `Please review and take appropriate action through the teacher portal.`;
    
    return message;
  }

  private getNotificationChannels(severity: SafetyLevel): string[] {
    switch (severity) {
      case SafetyLevel.CRITICAL:
        return ['email', 'sms', 'in_app', 'push'];
      case SafetyLevel.HIGH:
        return ['email', 'in_app', 'push'];
      case SafetyLevel.MEDIUM:
        return ['email', 'in_app'];
      default:
        return ['in_app'];
    }
  }

  private async sendNotificationToTeacher(notification: TeacherNotification): Promise<void> {
    // In production, this would integrate with the notification service
    // For now, just log the notification
    logger.info(`Sending notification to teacher ${notification.teacherId}:`, {
      channels: notification.channels,
      priority: notification.priority,
      message: notification.message
    });
    
    // Mock notification sending
    for (const channel of notification.channels) {
      logger.info(`Notification sent via ${channel} to teacher ${notification.teacherId}`);
    }
  }
}