import { 
  Question, 
  QuestionType, 
  Response, 
  FileUploadQuestion,
  Feedback,
  RubricScore
} from '../types/assessment.types';
import { 
  ValidationResult, 
  GradingResult, 
  ValidationError,
  ValidationWarning
} from '../interfaces/question.interface';
import { BaseQuestionHandler } from './base-question.handler';

export class FileUploadHandler extends BaseQuestionHandler {
  private readonly COMMON_FILE_TYPES = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', // Documents
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', // Images
    'mp4', 'avi', 'mov', 'wmv', 'flv', // Videos
    'mp3', 'wav', 'aac', 'flac', // Audio
    'zip', 'rar', '7z', 'tar', 'gz', // Archives
    'ppt', 'pptx', 'xls', 'xlsx', // Office
    'html', 'css', 'js', 'py', 'java', 'cpp', 'c' // Code files
  ];

  private readonly MAX_REASONABLE_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_REASONABLE_FILES = 10;

  getSupportedType(): QuestionType {
    return QuestionType.FILE_UPLOAD;
  }

  protected async validateQuestionType(question: Question): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fileQuestion = question as FileUploadQuestion;

    // Validate allowed file types
    if (!fileQuestion.allowedFileTypes || fileQuestion.allowedFileTypes.length === 0) {
      errors.push({
        field: 'allowedFileTypes',
        message: 'At least one allowed file type must be specified',
        code: 'NO_ALLOWED_FILE_TYPES'
      });
    } else {
      // Validate file type format
      fileQuestion.allowedFileTypes.forEach((fileType, index) => {
        if (!fileType || fileType.trim() === '') {
          errors.push({
            field: `allowedFileTypes[${index}]`,
            message: 'File type cannot be empty',
            code: 'EMPTY_FILE_TYPE'
          });
        } else {
          const cleanType = fileType.toLowerCase().replace(/^\./, '');
          if (!this.COMMON_FILE_TYPES.includes(cleanType)) {
            warnings.push({
              field: `allowedFileTypes[${index}]`,
              message: `Uncommon file type: ${fileType}`,
              code: 'UNCOMMON_FILE_TYPE'
            });
          }
        }
      });

      // Check for duplicates
      const duplicates = fileQuestion.allowedFileTypes.filter((type, index) => 
        fileQuestion.allowedFileTypes.indexOf(type) !== index
      );
      if (duplicates.length > 0) {
        warnings.push({
          field: 'allowedFileTypes',
          message: `Duplicate file types: ${duplicates.join(', ')}`,
          code: 'DUPLICATE_FILE_TYPES'
        });
      }
    }

    // Validate max file size
    if (fileQuestion.maxFileSize <= 0) {
      errors.push({
        field: 'maxFileSize',
        message: 'Maximum file size must be greater than 0',
        code: 'INVALID_MAX_FILE_SIZE'
      });
    } else {
      if (fileQuestion.maxFileSize > this.MAX_REASONABLE_FILE_SIZE) {
        warnings.push({
          field: 'maxFileSize',
          message: `Very large file size limit: ${this.formatFileSize(fileQuestion.maxFileSize)}`,
          code: 'LARGE_FILE_SIZE_LIMIT'
        });
      }

      if (fileQuestion.maxFileSize < 1024) { // Less than 1KB
        warnings.push({
          field: 'maxFileSize',
          message: 'Very small file size limit may be too restrictive',
          code: 'SMALL_FILE_SIZE_LIMIT'
        });
      }
    }

    // Validate max files
    if (fileQuestion.maxFiles <= 0) {
      errors.push({
        field: 'maxFiles',
        message: 'Maximum number of files must be greater than 0',
        code: 'INVALID_MAX_FILES'
      });
    } else if (fileQuestion.maxFiles > this.MAX_REASONABLE_FILES) {
      warnings.push({
        field: 'maxFiles',
        message: `Large number of files allowed: ${fileQuestion.maxFiles}`,
        code: 'MANY_FILES_ALLOWED'
      });
    }

    // Validate rubric if present
    if (fileQuestion.rubric) {
      const rubricValidation = this.validateRubric(fileQuestion.rubric);
      errors.push(...rubricValidation.errors);
      warnings.push(...rubricValidation.warnings);
    } else {
      warnings.push({
        field: 'rubric',
        message: 'Consider adding a rubric for consistent grading of file submissions',
        code: 'MISSING_RUBRIC'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  protected async validateResponseType(question: Question, response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fileQuestion = question as FileUploadQuestion;

    // Validate response format
    if (!Array.isArray(response.answer)) {
      errors.push({
        field: 'answer',
        message: 'File upload response must be an array of file information',
        code: 'INVALID_RESPONSE_FORMAT'
      });
      return { isValid: false, errors, warnings };
    }

    const files = response.answer as FileSubmission[];

    // Validate file count
    if (files.length === 0) {
      errors.push({
        field: 'answer',
        message: 'At least one file must be uploaded',
        code: 'NO_FILES_UPLOADED'
      });
    } else if (files.length > fileQuestion.maxFiles) {
      errors.push({
        field: 'answer',
        message: `Too many files uploaded. Maximum allowed: ${fileQuestion.maxFiles}`,
        code: 'TOO_MANY_FILES'
      });
    }

    // Validate individual files
    files.forEach((file, index) => {
      // Validate file structure
      if (!file.filename || file.filename.trim() === '') {
        errors.push({
          field: `answer[${index}].filename`,
          message: 'Filename is required',
          code: 'MISSING_FILENAME'
        });
      }

      if (!file.size || file.size <= 0) {
        errors.push({
          field: `answer[${index}].size`,
          message: 'File size must be greater than 0',
          code: 'INVALID_FILE_SIZE'
        });
      } else if (file.size > fileQuestion.maxFileSize) {
        errors.push({
          field: `answer[${index}].size`,
          message: `File too large: ${this.formatFileSize(file.size)}. Maximum: ${this.formatFileSize(fileQuestion.maxFileSize)}`,
          code: 'FILE_TOO_LARGE'
        });
      }

      if (!file.mimeType || file.mimeType.trim() === '') {
        warnings.push({
          field: `answer[${index}].mimeType`,
          message: 'MIME type not provided',
          code: 'MISSING_MIME_TYPE'
        });
      }

      // Validate file type
      if (file.filename) {
        const fileExtension = this.getFileExtension(file.filename);
        const isAllowed = fileQuestion.allowedFileTypes.some(allowedType => {
          const cleanAllowed = allowedType.toLowerCase().replace(/^\./, '');
          return cleanAllowed === fileExtension.toLowerCase();
        });

        if (!isAllowed) {
          errors.push({
            field: `answer[${index}].filename`,
            message: `File type '${fileExtension}' not allowed. Allowed types: ${fileQuestion.allowedFileTypes.join(', ')}`,
            code: 'INVALID_FILE_TYPE'
          });
        }
      }

      // Security checks
      const securityCheck = this.performFileSecurityCheck(file);
      if (!securityCheck.isSafe) {
        errors.push({
          field: `answer[${index}]`,
          message: `Security issue: ${securityCheck.issues.join(', ')}`,
          code: 'SECURITY_VIOLATION'
        });
      }
    });

    // Check for duplicate filenames
    const filenames = files.map(f => f.filename);
    const duplicateFilenames = filenames.filter((name, index) => filenames.indexOf(name) !== index);
    if (duplicateFilenames.length > 0) {
      warnings.push({
        field: 'answer',
        message: `Duplicate filenames: ${duplicateFilenames.join(', ')}`,
        code: 'DUPLICATE_FILENAMES'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async gradeResponse(question: Question, response: Response): Promise<GradingResult> {
    const fileQuestion = question as FileUploadQuestion;
    const files = response.answer as FileSubmission[];

    // File uploads typically require manual grading
    // We can provide some automated analysis
    const analysis = this.performFileAnalysis(files, fileQuestion);

    return {
      score: 0, // Requires manual grading
      maxScore: question.points,
      isCorrect: false, // Cannot determine automatically
      partialCredit: 0,
      explanation: 'File submission requires manual review and grading by an instructor.',
      metadata: {
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        fileTypes: [...new Set(files.map(f => this.getFileExtension(f.filename)))],
        requiresManualGrading: true,
        analysis
      }
    };
  }

  async generateFeedback(question: Question, response: Response, gradingResult: GradingResult): Promise<Feedback> {
    const fileQuestion = question as FileUploadQuestion;
    const files = response.answer as FileSubmission[];
    
    const feedback: Feedback = {
      questionId: question.id,
      score: gradingResult.score,
      maxScore: gradingResult.maxScore,
      comments: this.generateFileComments(fileQuestion, files, gradingResult),
      suggestions: this.generateFileSuggestions(fileQuestion, files)
    };

    // Add rubric scores if available and graded
    if (fileQuestion.rubric && gradingResult.score > 0) {
      feedback.rubricScores = this.generatePlaceholderRubricScores(fileQuestion.rubric);
    }

    return feedback;
  }

  protected getBaseTimeEstimate(): number {
    return 300; // 5 minutes base time for file uploads
  }

  protected getContentComplexityMultiplier(question: Question): number {
    const fileQuestion = question as FileUploadQuestion;
    let multiplier = super.getContentComplexityMultiplier(question);

    // Adjust for number of files allowed
    if (fileQuestion.maxFiles > 1) {
      multiplier += (fileQuestion.maxFiles - 1) * 0.1;
    }

    // Adjust for file type complexity
    const complexTypes = ['zip', 'rar', '7z', 'tar', 'gz'];
    const hasComplexTypes = fileQuestion.allowedFileTypes.some(type => 
      complexTypes.includes(type.toLowerCase().replace(/^\./, ''))
    );
    if (hasComplexTypes) {
      multiplier += 0.2;
    }

    // Adjust for rubric complexity
    if (fileQuestion.rubric) {
      const criteriaCount = fileQuestion.rubric.criteria.length;
      multiplier += criteriaCount * 0.05;
    }

    return multiplier;
  }

  private validateRubric(rubric: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!rubric.criteria || rubric.criteria.length === 0) {
      errors.push({
        field: 'rubric.criteria',
        message: 'Rubric must have at least one criterion',
        code: 'NO_RUBRIC_CRITERIA'
      });
    } else {
      rubric.criteria.forEach((criterion: any, index: number) => {
        if (!criterion.name || criterion.name.trim() === '') {
          errors.push({
            field: `rubric.criteria[${index}].name`,
            message: 'Criterion name is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (!criterion.levels || criterion.levels.length === 0) {
          errors.push({
            field: `rubric.criteria[${index}].levels`,
            message: 'Criterion must have at least one level',
            code: 'NO_CRITERION_LEVELS'
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  private performFileSecurityCheck(file: FileSubmission): { isSafe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for dangerous file extensions
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar'];
    const extension = this.getFileExtension(file.filename).toLowerCase();
    
    if (dangerousExtensions.includes(extension)) {
      issues.push(`Potentially dangerous file type: ${extension}`);
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Windows reserved names
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(file.filename)) {
        issues.push('Suspicious filename pattern');
      }
    });

    // Check file size for zip bombs (very small file with large uncompressed size)
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
    if (archiveExtensions.includes(extension) && file.size < 1024) {
      issues.push('Suspiciously small archive file');
    }

    return {
      isSafe: issues.length === 0,
      issues
    };
  }

  private performFileAnalysis(files: FileSubmission[], question: FileUploadQuestion): any {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const fileTypes = [...new Set(files.map(f => this.getFileExtension(f.filename)))];
    const averageFileSize = files.length > 0 ? totalSize / files.length : 0;

    return {
      fileCount: files.length,
      totalSize,
      averageFileSize,
      fileTypes,
      sizeDistribution: files.map(f => ({
        filename: f.filename,
        size: f.size,
        percentage: totalSize > 0 ? (f.size / totalSize) * 100 : 0
      })),
      complianceCheck: {
        withinSizeLimit: files.every(f => f.size <= question.maxFileSize),
        withinFileLimit: files.length <= question.maxFiles,
        allowedTypes: files.every(f => {
          const ext = this.getFileExtension(f.filename);
          return question.allowedFileTypes.some(allowed => 
            allowed.toLowerCase().replace(/^\./, '') === ext.toLowerCase()
          );
        })
      }
    };
  }

  private generateFileComments(question: FileUploadQuestion, files: FileSubmission[], gradingResult: GradingResult): string {
    const comments: string[] = [];
    const analysis = gradingResult.metadata?.analysis;

    if (analysis) {
      comments.push(`Files submitted: ${analysis.fileCount}`);
      comments.push(`Total size: ${this.formatFileSize(analysis.totalSize)}`);
      comments.push(`File types: ${analysis.fileTypes.join(', ')}`);

      if (!analysis.complianceCheck.withinSizeLimit) {
        comments.push('⚠️ Some files exceed the size limit');
      }

      if (!analysis.complianceCheck.allowedTypes) {
        comments.push('⚠️ Some files are not of allowed types');
      }
    }

    comments.push('Files have been received and require manual review by an instructor.');

    return comments.join('\n');
  }

  private generateFileSuggestions(question: FileUploadQuestion, files: FileSubmission[]): string[] {
    const suggestions: string[] = [];

    // Check if all required file types are present (if specified in instructions)
    const uploadedTypes = [...new Set(files.map(f => this.getFileExtension(f.filename)))];
    
    if (files.length < question.maxFiles) {
      suggestions.push(`You can upload up to ${question.maxFiles} files. Consider adding more supporting materials if needed.`);
    }

    // Suggest file organization
    if (files.length > 3) {
      suggestions.push('Consider organizing multiple files into a single archive (zip) for easier submission.');
    }

    // File naming suggestions
    const hasGenericNames = files.some(f => 
      /^(document|file|untitled|new)/i.test(f.filename)
    );
    if (hasGenericNames) {
      suggestions.push('Use descriptive filenames that clearly indicate the content of each file.');
    }

    if (question.rubric) {
      suggestions.push('Review the rubric criteria to ensure your submission addresses all required elements.');
    }

    return suggestions;
  }

  private generatePlaceholderRubricScores(rubric: any): RubricScore[] {
    // This would be populated by actual grading
    return rubric.criteria.map((criterion: any) => ({
      criterionId: criterion.id,
      levelId: criterion.levels[0]?.id || '',
      points: 0,
      comments: 'Requires manual evaluation'
    }));
  }
}

interface FileSubmission {
  filename: string;
  size: number;
  mimeType: string;
  uploadPath?: string;
  checksum?: string;
}