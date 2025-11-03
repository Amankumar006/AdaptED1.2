import { LLMRequest, QueryType, UserProfile, CourseContext } from '../types/ai.types';
import { logger } from '../utils/logger';

export class PromptEngineeringService {
  private subjectPrompts: Map<string, string> = new Map();
  private gradePrompts: Map<string, string> = new Map();
  private queryTypePrompts: Map<QueryType, string> = new Map();

  constructor() {
    this.initializePromptTemplates();
  }

  generateSystemPrompt(request: LLMRequest): string {
    try {
      let systemPrompt = this.getBaseSystemPrompt();
      
      // Add subject-specific context
      if (request.courseContext?.subject) {
        systemPrompt += this.getSubjectSpecificPrompt(request.courseContext.subject);
      }

      // Add grade-level adaptations
      if (request.userProfile?.gradeLevel || request.courseContext?.gradeLevel) {
        const gradeLevel = request.userProfile?.gradeLevel || request.courseContext?.gradeLevel;
        systemPrompt += this.getGradeLevelPrompt(gradeLevel!);
      }

      // Add query type specific instructions
      systemPrompt += this.getQueryTypePrompt(request.queryType);

      // Add user profile adaptations
      if (request.userProfile) {
        systemPrompt += this.getUserProfilePrompt(request.userProfile);
      }

      // Add safety and educational guidelines
      systemPrompt += this.getSafetyGuidelines(request.userProfile?.age);

      return systemPrompt;
    } catch (error) {
      logger.error('Error generating system prompt:', error);
      return this.getBaseSystemPrompt();
    }
  }

  private initializePromptTemplates(): void {
    // Subject-specific prompts
    this.subjectPrompts.set('mathematics', `
You are specialized in mathematics education. Focus on:
- Breaking down complex problems into manageable steps
- Using visual representations when helpful
- Connecting mathematical concepts to real-world applications
- Encouraging mathematical reasoning and proof-based thinking`);

    this.subjectPrompts.set('science', `
You are specialized in science education. Focus on:
- Encouraging scientific inquiry and hypothesis formation
- Using the scientific method in explanations
- Connecting concepts to observable phenomena
- Promoting hands-on learning and experimentation`);

    this.subjectPrompts.set('english', `
You are specialized in English language arts. Focus on:
- Developing reading comprehension and critical analysis
- Improving writing skills through structured feedback
- Exploring literary themes and techniques
- Building vocabulary in context`);

    this.subjectPrompts.set('history', `
You are specialized in history education. Focus on:
- Connecting historical events to their broader context
- Encouraging critical analysis of primary sources
- Drawing parallels between past and present
- Developing chronological thinking skills`);

    // Grade-level prompts
    this.gradePrompts.set('elementary', `
Adapt your language and examples for elementary students:
- Use simple, clear language and short sentences
- Include concrete examples and visual descriptions
- Make learning fun and engaging
- Break complex ideas into very small steps`);

    this.gradePrompts.set('middle', `
Adapt for middle school students:
- Use age-appropriate language while introducing academic vocabulary
- Connect learning to students' interests and experiences
- Encourage independent thinking and problem-solving
- Provide scaffolding for complex concepts`);

    this.gradePrompts.set('high', `
Adapt for high school students:
- Use more sophisticated language and concepts
- Encourage critical thinking and analysis
- Connect to college and career preparation
- Support independent research and inquiry`);

    // Query type prompts
    this.queryTypePrompts.set(QueryType.HOMEWORK_HELP, `
For homework assistance:
- Guide students to discover answers rather than providing direct solutions
- Ask probing questions to check understanding
- Provide hints and scaffolding
- Encourage students to explain their thinking process`);

    this.queryTypePrompts.set(QueryType.CONCEPT_EXPLANATION, `
For concept explanations:
- Start with simple definitions and build complexity
- Use analogies and real-world examples
- Check for understanding with follow-up questions
- Connect new concepts to prior knowledge`);

    this.queryTypePrompts.set(QueryType.PROBLEM_SOLVING, `
For problem-solving assistance:
- Teach problem-solving strategies and frameworks
- Encourage breaking problems into smaller parts
- Model thinking processes and reasoning
- Help students reflect on their approach`);
  }

  private getBaseSystemPrompt(): string {
    return `You are BuddyAI, an educational AI assistant designed to support student learning. Your role is to:

- Provide clear, accurate, and age-appropriate educational support
- Encourage critical thinking and independent learning
- Adapt your communication style to each student's needs
- Maintain a supportive, encouraging, and patient tone
- Focus on educational content and learning objectives
- Guide students to discover answers rather than providing direct solutions`;
  }

  private getSubjectSpecificPrompt(subject: string): string {
    const normalizedSubject = subject.toLowerCase();
    return this.subjectPrompts.get(normalizedSubject) || '';
  }

  private getGradeLevelPrompt(gradeLevel: string): string {
    const level = this.normalizeGradeLevel(gradeLevel);
    return this.gradePrompts.get(level) || '';
  }

  private getQueryTypePrompt(queryType: QueryType): string {
    return this.queryTypePrompts.get(queryType) || '';
  }

  private getUserProfilePrompt(userProfile: UserProfile): string {
    let prompt = '\n\nStudent Profile Considerations:';

    if (userProfile.age) {
      if (userProfile.age < 13) {
        prompt += '\n- Use very simple language appropriate for young learners';
        prompt += '\n- Keep explanations short and engaging';
        prompt += '\n- Use encouraging and positive language';
      } else if (userProfile.age < 18) {
        prompt += '\n- Use age-appropriate language for teenagers';
        prompt += '\n- Connect to relevant interests and experiences';
      }
    }

    if (userProfile.learningStyle) {
      switch (userProfile.learningStyle.toLowerCase()) {
        case 'visual':
          prompt += '\n- Describe visual elements and use spatial language';
          prompt += '\n- Suggest diagrams, charts, or visual aids when helpful';
          break;
        case 'auditory':
          prompt += '\n- Use rhythm, rhymes, or verbal patterns when appropriate';
          prompt += '\n- Encourage reading aloud or verbal practice';
          break;
        case 'kinesthetic':
          prompt += '\n- Suggest hands-on activities or physical demonstrations';
          prompt += '\n- Use action-oriented language and examples';
          break;
      }
    }

    if (userProfile.language && userProfile.language !== 'en') {
      prompt += `\n- Be aware that ${userProfile.language} is the student's primary language`;
      prompt += '\n- Use clear, simple English and explain idioms or complex phrases';
    }

    return prompt;
  }

  private getSafetyGuidelines(age?: number): string {
    let guidelines = '\n\nSafety and Educational Guidelines:';
    guidelines += '\n- Keep all content educational and appropriate';
    guidelines += '\n- If asked about inappropriate topics, redirect to educational content';
    guidelines += '\n- Encourage students to ask teachers or parents for help with sensitive topics';
    guidelines += '\n- Never provide answers that could be used to cheat or plagiarize';
    guidelines += '\n- If unsure about a topic, admit limitations and suggest consulting other resources';

    if (age && age < 13) {
      guidelines += '\n- Extra care for young learners: use only G-rated content';
      guidelines += '\n- Encourage parental involvement in learning';
    }

    return guidelines;
  }

  private normalizeGradeLevel(gradeLevel: string): string {
    const level = gradeLevel.toLowerCase();
    
    if (level.includes('k') || level.includes('kindergarten') || 
        ['1', '2', '3', '4', '5'].some(grade => level.includes(grade))) {
      return 'elementary';
    } else if (['6', '7', '8'].some(grade => level.includes(grade)) || 
               level.includes('middle')) {
      return 'middle';
    } else if (['9', '10', '11', '12'].some(grade => level.includes(grade)) || 
               level.includes('high')) {
      return 'high';
    }
    
    return 'middle'; // Default
  }

  generateContextualPrompt(
    basePrompt: string,
    courseContext?: CourseContext,
    conversationHistory?: any[]
  ): string {
    let contextualPrompt = basePrompt;

    if (courseContext) {
      contextualPrompt += this.buildCourseContextSection(courseContext);
    }

    if (conversationHistory && conversationHistory.length > 0) {
      contextualPrompt += this.buildConversationContextSection(conversationHistory);
    }

    return contextualPrompt;
  }

  private buildCourseContextSection(courseContext: CourseContext): string {
    let section = '\n\nCourse Context:';
    section += `\n- Subject: ${courseContext.subject}`;
    section += `\n- Grade Level: ${courseContext.gradeLevel}`;
    
    if (courseContext.currentLesson) {
      section += `\n- Current Lesson: ${courseContext.currentLesson}`;
    }

    if (courseContext.learningObjectives && courseContext.learningObjectives.length > 0) {
      section += '\n- Learning Objectives:';
      courseContext.learningObjectives.slice(0, 3).forEach(objective => {
        section += `\n  • ${objective}`;
      });
    }

    if (courseContext.materials && courseContext.materials.length > 0) {
      section += '\n- Available Materials:';
      courseContext.materials.slice(0, 3).forEach(material => {
        section += `\n  • ${material.title} (${material.type})`;
      });
    }

    return section;
  }

  private buildConversationContextSection(history: any[]): string {
    let section = '\n\nConversation Context:';
    
    const recentMessages = history.slice(-3);
    if (recentMessages.length > 0) {
      section += '\n- Recent discussion points:';
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          const preview = msg.content.length > 80 
            ? msg.content.substring(0, 80) + '...' 
            : msg.content;
          section += `\n  • Student: ${preview}`;
        }
      });
    }

    return section;
  }

  // Method to generate follow-up questions based on context
  generateFollowUpQuestions(
    queryType: QueryType,
    subject?: string,
    gradeLevel?: string
  ): string[] {
    const baseQuestions = this.getBaseFollowUpQuestions(queryType);
    
    // Customize based on subject and grade level
    if (subject && gradeLevel) {
      return this.customizeFollowUpQuestions(baseQuestions, subject, gradeLevel);
    }
    
    return baseQuestions;
  }

  private getBaseFollowUpQuestions(queryType: QueryType): string[] {
    const questionMap: Record<QueryType, string[]> = {
      [QueryType.GENERAL_QUESTION]: [
        "What would you like to explore further about this topic?",
        "How does this connect to what you already know?",
        "Do you have any specific questions about this?"
      ],
      [QueryType.HOMEWORK_HELP]: [
        "Can you walk me through your thinking process?",
        "What part of this problem is most challenging for you?",
        "How might you approach a similar problem?"
      ],
      [QueryType.CONCEPT_EXPLANATION]: [
        "Can you think of a real-world example of this concept?",
        "What questions do you still have about this topic?",
        "How does this relate to other concepts you've learned?"
      ],
      [QueryType.PROBLEM_SOLVING]: [
        "What strategies did you consider for this problem?",
        "What would you do differently if you encountered a similar problem?",
        "Can you explain why this solution works?"
      ],
      [QueryType.CREATIVE_WRITING]: [
        "What inspired this idea?",
        "How could you develop this theme further?",
        "What emotions are you trying to convey?"
      ],
      [QueryType.CODE_ASSISTANCE]: [
        "Can you trace through what this code does step by step?",
        "What would happen if we changed this part?",
        "How could you test if this code works correctly?"
      ],
      [QueryType.MATH_PROBLEM]: [
        "Can you explain the reasoning behind each step?",
        "What mathematical principles are at work here?",
        "How could you check if your answer is reasonable?"
      ],
      [QueryType.LANGUAGE_LEARNING]: [
        "How might you use this in everyday conversation?",
        "What patterns do you notice in this language structure?",
        "Can you create your own example using this concept?"
      ]
    };

    return questionMap[queryType] || questionMap[QueryType.GENERAL_QUESTION];
  }

  private customizeFollowUpQuestions(
    baseQuestions: string[],
    subject: string,
    gradeLevel: string
  ): string[] {
    // For now, return base questions
    // In a more sophisticated implementation, this would customize based on subject/grade
    return baseQuestions;
  }
}