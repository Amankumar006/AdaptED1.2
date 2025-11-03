import { 
  Question, 
  QuestionType, 
  Response, 
  CodeSubmissionQuestion,
  TestCase
} from '../types/assessment.types';
import { 
  ValidationResult, 
  GradingResult, 
  ValidationError,
  ValidationWarning
} from '../interfaces/question.interface';
import { BaseQuestionHandler } from './base-question.handler';

export class CodeSubmissionHandler extends BaseQuestionHandler {
  private readonly SUPPORTED_LANGUAGES = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
    'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala'
  ];

  getSupportedType(): QuestionType {
    return QuestionType.CODE_SUBMISSION;
  }

  protected async validateQuestionType(question: Question): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const codeQuestion = question as CodeSubmissionQuestion;

    // Validate programming language
    if (!codeQuestion.language || !this.SUPPORTED_LANGUAGES.includes(codeQuestion.language.toLowerCase())) {
      errors.push({
        field: 'language',
        message: `Unsupported programming language. Supported: ${this.SUPPORTED_LANGUAGES.join(', ')}`,
        code: 'UNSUPPORTED_LANGUAGE'
      });
    }

    // Validate test cases
    if (!codeQuestion.testCases || codeQuestion.testCases.length === 0) {
      errors.push({
        field: 'testCases',
        message: 'Code submission questions must have at least one test case',
        code: 'NO_TEST_CASES'
      });
    } else {
      // Validate individual test cases
      codeQuestion.testCases.forEach((testCase, index) => {
        if (!testCase.id || testCase.id.trim() === '') {
          errors.push({
            field: `testCases[${index}].id`,
            message: 'Test case ID is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (testCase.input === undefined || testCase.input === null) {
          errors.push({
            field: `testCases[${index}].input`,
            message: 'Test case input is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (testCase.expectedOutput === undefined || testCase.expectedOutput === null) {
          errors.push({
            field: `testCases[${index}].expectedOutput`,
            message: 'Test case expected output is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (testCase.points <= 0) {
          errors.push({
            field: `testCases[${index}].points`,
            message: 'Test case points must be greater than 0',
            code: 'INVALID_POINTS'
          });
        }
      });

      // Check for duplicate test case IDs
      const testCaseIds = codeQuestion.testCases.map(tc => tc.id);
      const duplicateIds = testCaseIds.filter((id, index) => testCaseIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        errors.push({
          field: 'testCases',
          message: `Duplicate test case IDs found: ${duplicateIds.join(', ')}`,
          code: 'DUPLICATE_TEST_CASE_IDS'
        });
      }

      // Validate points distribution
      const totalTestCasePoints = codeQuestion.testCases.reduce((sum, tc) => sum + tc.points, 0);
      if (totalTestCasePoints !== question.points) {
        warnings.push({
          field: 'testCases',
          message: `Test case points (${totalTestCasePoints}) don't match question points (${question.points})`,
          code: 'POINTS_MISMATCH'
        });
      }

      // Check for at least one visible test case
      const visibleTestCases = codeQuestion.testCases.filter(tc => !tc.isHidden);
      if (visibleTestCases.length === 0) {
        warnings.push({
          field: 'testCases',
          message: 'Consider having at least one visible test case for student guidance',
          code: 'NO_VISIBLE_TEST_CASES'
        });
      }
    }

    // Validate starter code syntax if provided
    if (codeQuestion.starterCode) {
      const syntaxValidation = this.validateCodeSyntax(codeQuestion.starterCode, codeQuestion.language);
      if (!syntaxValidation.isValid) {
        warnings.push({
          field: 'starterCode',
          message: 'Starter code may have syntax issues',
          code: 'STARTER_CODE_SYNTAX'
        });
      }
    }

    // Validate allowed libraries
    if (codeQuestion.allowedLibraries && codeQuestion.allowedLibraries.length > 0) {
      const invalidLibraries = this.validateLibraries(codeQuestion.allowedLibraries, codeQuestion.language);
      if (invalidLibraries.length > 0) {
        warnings.push({
          field: 'allowedLibraries',
          message: `Some libraries may not be available: ${invalidLibraries.join(', ')}`,
          code: 'UNRECOGNIZED_LIBRARIES'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  protected async validateResponseType(question: Question, response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const codeQuestion = question as CodeSubmissionQuestion;

    // Validate response format
    if (typeof response.answer !== 'string') {
      errors.push({
        field: 'answer',
        message: 'Code submission response must be a string',
        code: 'INVALID_RESPONSE_FORMAT'
      });
      return { isValid: false, errors, warnings };
    }

    const code = response.answer as string;

    // Validate minimum content
    if (code.trim().length === 0) {
      errors.push({
        field: 'answer',
        message: 'Code submission cannot be empty',
        code: 'EMPTY_CODE'
      });
    }

    // Basic syntax validation
    const syntaxValidation = this.validateCodeSyntax(code, codeQuestion.language);
    if (!syntaxValidation.isValid) {
      warnings.push({
        field: 'answer',
        message: 'Code may have syntax errors that will prevent execution',
        code: 'SYNTAX_WARNING'
      });
    }

    // Check for potentially dangerous code patterns
    const securityCheck = this.performSecurityCheck(code);
    if (!securityCheck.isSafe) {
      errors.push({
        field: 'answer',
        message: `Code contains potentially dangerous patterns: ${securityCheck.issues.join(', ')}`,
        code: 'SECURITY_VIOLATION'
      });
    }

    // Validate library usage if restricted
    if (codeQuestion.allowedLibraries) {
      const libraryViolations = this.checkLibraryUsage(code, codeQuestion.allowedLibraries, codeQuestion.language);
      if (libraryViolations.length > 0) {
        errors.push({
          field: 'answer',
          message: `Unauthorized libraries used: ${libraryViolations.join(', ')}`,
          code: 'UNAUTHORIZED_LIBRARIES'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async gradeResponse(question: Question, response: Response): Promise<GradingResult> {
    const codeQuestion = question as CodeSubmissionQuestion;
    const code = response.answer as string;

    // In a real implementation, this would execute the code in a sandboxed environment
    // For now, we'll simulate the grading process
    const testResults = await this.executeTestCases(code, codeQuestion.testCases, codeQuestion.language);
    
    const passedTests = testResults.filter(result => result.passed);
    const totalPoints = codeQuestion.testCases.reduce((sum, tc) => sum + tc.points, 0);
    const earnedPoints = passedTests.reduce((sum, result) => sum + result.points, 0);

    const score = Math.min(earnedPoints, question.points);
    const isCorrect = passedTests.length === codeQuestion.testCases.length;

    return {
      score,
      maxScore: question.points,
      isCorrect,
      partialCredit: totalPoints > 0 ? earnedPoints / totalPoints : 0,
      explanation: this.generateCodeExplanation(testResults),
      metadata: {
        testResults,
        passedTests: passedTests.length,
        totalTests: codeQuestion.testCases.length,
        executionTime: testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0),
        language: codeQuestion.language
      }
    };
  }

  protected getBaseTimeEstimate(): number {
    return 900; // 15 minutes base time for code submissions
  }

  protected getContentComplexityMultiplier(question: Question): number {
    const codeQuestion = question as CodeSubmissionQuestion;
    let multiplier = super.getContentComplexityMultiplier(question);

    // Adjust for number of test cases
    multiplier += codeQuestion.testCases.length * 0.1;

    // Adjust for language complexity
    const complexLanguages = ['cpp', 'c', 'rust', 'scala'];
    if (complexLanguages.includes(codeQuestion.language.toLowerCase())) {
      multiplier += 0.3;
    }

    // Adjust for starter code presence
    if (!codeQuestion.starterCode) {
      multiplier += 0.5; // More time needed without starter code
    }

    return multiplier;
  }

  private validateCodeSyntax(code: string, language: string): { isValid: boolean; errors: string[] } {
    // Basic syntax validation - in a real implementation, this would use language-specific parsers
    const errors: string[] = [];
    
    // Common syntax checks
    const brackets = this.checkBracketBalance(code);
    if (!brackets.isBalanced) {
      errors.push(`Unbalanced brackets: ${brackets.error}`);
    }

    // Language-specific basic checks
    switch (language.toLowerCase()) {
      case 'python':
        if (this.hasMixedIndentation(code)) {
          errors.push('Mixed indentation detected');
        }
        break;
      case 'javascript':
      case 'typescript':
      case 'java':
      case 'cpp':
      case 'c':
      case 'csharp':
        if (this.hasMissingSemicolons(code, language)) {
          errors.push('Potential missing semicolons');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private checkBracketBalance(code: string): { isBalanced: boolean; error?: string } {
    const stack: string[] = [];
    const pairs: { [key: string]: string } = { '(': ')', '[': ']', '{': '}' };
    const opening = Object.keys(pairs);
    const closing = Object.values(pairs);

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (opening.includes(char)) {
        stack.push(char);
      } else if (closing.includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return { isBalanced: false, error: `Mismatched ${char} at position ${i}` };
        }
      }
    }

    if (stack.length > 0) {
      return { isBalanced: false, error: `Unclosed ${stack[stack.length - 1]}` };
    }

    return { isBalanced: true };
  }

  private hasMixedIndentation(code: string): boolean {
    const lines = code.split('\n');
    let hasSpaces = false;
    let hasTabs = false;

    for (const line of lines) {
      if (line.startsWith(' ')) hasSpaces = true;
      if (line.startsWith('\t')) hasTabs = true;
      if (hasSpaces && hasTabs) return true;
    }

    return false;
  }

  private hasMissingSemicolons(code: string, language: string): boolean {
    // Very basic check - in practice, this would be more sophisticated
    if (language.toLowerCase() === 'javascript') return false; // JS allows optional semicolons
    
    const lines = code.split('\n');
    const statementPattern = /^\s*(return|break|continue|throw|\w+\s*=|\w+\()/;
    
    return lines.some(line => {
      const trimmed = line.trim();
      return statementPattern.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}');
    });
  }

  private performSecurityCheck(code: string): { isSafe: boolean; issues: string[] } {
    const issues: string[] = [];
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'eval() usage' },
      { pattern: /exec\s*\(/, message: 'exec() usage' },
      { pattern: /system\s*\(/, message: 'system() call' },
      { pattern: /import\s+os/, message: 'OS module import' },
      { pattern: /subprocess/, message: 'subprocess usage' },
      { pattern: /Runtime\.getRuntime/, message: 'Runtime access' },
      { pattern: /ProcessBuilder/, message: 'ProcessBuilder usage' },
      { pattern: /__import__/, message: 'dynamic import' }
    ];

    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        issues.push(message);
      }
    });

    return {
      isSafe: issues.length === 0,
      issues
    };
  }

  private checkLibraryUsage(code: string, allowedLibraries: string[], language: string): string[] {
    const violations: string[] = [];
    
    // Extract import/include statements based on language
    const imports = this.extractImports(code, language);
    
    imports.forEach(importName => {
      if (!allowedLibraries.includes(importName)) {
        violations.push(importName);
      }
    });

    return violations;
  }

  private extractImports(code: string, language: string): string[] {
    const imports: string[] = [];
    
    switch (language.toLowerCase()) {
      case 'python':
        const pythonImports = code.match(/(?:from\s+(\w+)|import\s+(\w+))/g) || [];
        pythonImports.forEach(imp => {
          const match = imp.match(/(?:from\s+(\w+)|import\s+(\w+))/);
          if (match) {
            imports.push(match[1] || match[2]);
          }
        });
        break;
      
      case 'java':
        const javaImports = code.match(/import\s+([a-zA-Z0-9_.]+)/g) || [];
        javaImports.forEach(imp => {
          const match = imp.match(/import\s+([a-zA-Z0-9_.]+)/);
          if (match) {
            imports.push(match[1].split('.')[0]);
          }
        });
        break;
      
      case 'javascript':
      case 'typescript':
        const jsImports = code.match(/(?:import.*from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g) || [];
        jsImports.forEach(imp => {
          const match = imp.match(/['"]([^'"]+)['"]/);
          if (match) {
            imports.push(match[1]);
          }
        });
        break;
    }

    return imports;
  }

  private validateLibraries(libraries: string[], language: string): string[] {
    // In a real implementation, this would check against known library databases
    const commonLibraries: { [key: string]: string[] } = {
      python: ['numpy', 'pandas', 'matplotlib', 'requests', 'json', 'math', 'random', 'datetime'],
      javascript: ['lodash', 'axios', 'moment', 'express', 'react', 'vue'],
      java: ['java.util', 'java.io', 'java.lang', 'java.math'],
      cpp: ['iostream', 'vector', 'string', 'algorithm', 'map']
    };

    const knownLibs = commonLibraries[language.toLowerCase()] || [];
    return libraries.filter(lib => !knownLibs.includes(lib));
  }

  private async executeTestCases(code: string, testCases: TestCase[], language: string): Promise<TestResult[]> {
    // Simulate test execution - in a real implementation, this would run in a sandboxed environment
    return testCases.map(testCase => {
      // Simulate execution result
      const passed = Math.random() > 0.3; // 70% pass rate for simulation
      const executionTime = Math.random() * 1000; // Random execution time
      
      return {
        testCaseId: testCase.id,
        passed,
        points: passed ? testCase.points : 0,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: passed ? testCase.expectedOutput : 'Error or incorrect output',
        executionTime,
        error: passed ? undefined : 'Simulated execution error'
      };
    });
  }

  private generateCodeExplanation(testResults: TestResult[]): string {
    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    
    let explanation = `Test Results: ${passedCount}/${totalCount} tests passed\n\n`;
    
    testResults.forEach((result, index) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      explanation += `Test ${index + 1}: ${status}\n`;
      
      if (!result.passed) {
        explanation += `  Expected: ${result.expectedOutput}\n`;
        explanation += `  Got: ${result.actualOutput}\n`;
        if (result.error) {
          explanation += `  Error: ${result.error}\n`;
        }
      }
      explanation += '\n';
    });

    return explanation;
  }
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  points: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
}