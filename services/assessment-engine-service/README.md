# Assessment Engine Service

A comprehensive assessment engine service for the Enhanced Educational Platform, providing pluggable question types, automated grading, and assessment analytics.

## Features

### Core Functionality
- **Pluggable Question Type Architecture**: Extensible system supporting multiple question types
- **Question Bank Management**: Organize and manage questions with tagging and search capabilities
- **Assessment Creation and Management**: Create, publish, and manage assessments
- **Automated Grading**: Intelligent grading system with support for various question types
- **Assessment Analytics**: Detailed performance analytics and reporting

### Supported Question Types
- **Multiple Choice**: Single and multi-select questions with partial credit scoring
- **Essay**: Long-form text responses with rubric-based grading support
- **Code Submission**: Programming questions with automated test case execution
- **File Upload**: Document and media submission with validation

### Advanced Features
- Real-time response validation
- Adaptive time estimation
- Comprehensive feedback generation
- Security validation for code and file submissions
- Bulk question import/export
- Assessment analytics and reporting

## Architecture

### Question Handler System
The service uses a pluggable architecture where each question type has its own handler implementing the `IQuestionHandler` interface:

```typescript
interface IQuestionHandler {
  validateQuestion(question: Question): Promise<ValidationResult>;
  validateResponse(question: Question, response: Response): Promise<ValidationResult>;
  gradeResponse(question: Question, response: Response): Promise<GradingResult>;
  generateFeedback(question: Question, response: Response, gradingResult: GradingResult): Promise<Feedback>;
  getSupportedType(): QuestionType;
  estimateTimeToComplete(question: Question): number;
  generatePreview(question: Question): QuestionPreview;
}
```

### Services
- **QuestionBankService**: Manages question banks and individual questions
- **AssessmentService**: Handles assessment lifecycle and submissions
- **DatabaseService**: PostgreSQL database abstraction layer

## Installation

1. Clone the repository and navigate to the service directory:
```bash
cd services/assessment-engine-service
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

5. Set up the database:
```bash
# Make sure PostgreSQL is running and create the database
createdb assessment_engine
```

## Development

### Running the Service
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Linting
```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Question Banks
- `POST /api/v1/question-banks` - Create question bank
- `GET /api/v1/question-banks` - List question banks
- `GET /api/v1/question-banks/:id` - Get question bank
- `PUT /api/v1/question-banks/:id` - Update question bank
- `DELETE /api/v1/question-banks/:id` - Delete question bank

### Questions
- `POST /api/v1/question-banks/:bankId/questions` - Add question to bank
- `GET /api/v1/question-banks/:bankId/questions` - Get questions from bank
- `PUT /api/v1/questions/:id` - Update question
- `DELETE /api/v1/question-banks/:bankId/questions/:id` - Remove question from bank
- `GET /api/v1/questions/search` - Search questions

### Assessments
- `POST /api/v1/assessments` - Create assessment
- `GET /api/v1/assessments` - List assessments
- `GET /api/v1/assessments/:id` - Get assessment
- `PUT /api/v1/assessments/:id` - Update assessment
- `POST /api/v1/assessments/:id/publish` - Publish assessment
- `DELETE /api/v1/assessments/:id` - Delete assessment

### Assessment Submissions
- `POST /api/v1/assessments/:id/start` - Start assessment
- `POST /api/v1/submissions/:id/responses` - Submit response
- `POST /api/v1/submissions/:id/submit` - Submit assessment
- `GET /api/v1/submissions/:id` - Get submission
- `GET /api/v1/assessments/:id/analytics` - Get assessment analytics

## Question Types

### Multiple Choice Questions
```typescript
{
  type: "multiple_choice",
  content: {
    text: "What is 2 + 2?",
    instructions: "Select the correct answer"
  },
  options: [
    { id: "opt1", text: "3", isCorrect: false },
    { id: "opt2", text: "4", isCorrect: true },
    { id: "opt3", text: "5", isCorrect: false }
  ],
  allowMultiple: false,
  points: 1,
  difficulty: "beginner"
}
```

### Essay Questions
```typescript
{
  type: "essay",
  content: {
    text: "Explain the concept of photosynthesis",
    instructions: "Write a detailed explanation in 300-500 words"
  },
  wordLimit: 500,
  rubric: {
    criteria: [
      {
        name: "Content Accuracy",
        levels: [
          { name: "Excellent", points: 4 },
          { name: "Good", points: 3 },
          { name: "Fair", points: 2 },
          { name: "Poor", points: 1 }
        ]
      }
    ]
  },
  points: 10,
  difficulty: "intermediate"
}
```

### Code Submission Questions
```typescript
{
  type: "code_submission",
  content: {
    text: "Write a function to calculate factorial",
    instructions: "Implement a recursive factorial function"
  },
  language: "python",
  starterCode: "def factorial(n):\n    # Your code here\n    pass",
  testCases: [
    {
      input: "5",
      expectedOutput: "120",
      isHidden: false,
      points: 5
    }
  ],
  points: 10,
  difficulty: "intermediate"
}
```

### File Upload Questions
```typescript
{
  type: "file_upload",
  content: {
    text: "Submit your research paper",
    instructions: "Upload your completed research paper in PDF format"
  },
  allowedFileTypes: ["pdf", "doc", "docx"],
  maxFileSize: 10485760, // 10MB
  maxFiles: 1,
  rubric: {
    criteria: [
      {
        name: "Research Quality",
        levels: [
          { name: "Excellent", points: 10 },
          { name: "Good", points: 8 },
          { name: "Fair", points: 6 },
          { name: "Poor", points: 4 }
        ]
      }
    ]
  },
  points: 20,
  difficulty: "advanced"
}
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `assessments` - Assessment definitions
- `assessment_submissions` - Student submissions
- `question_banks` - Question bank metadata
- `questions` - Individual questions
- `question_bank_questions` - Junction table for bank-question relationships

## Configuration

Key configuration options in `.env`:

### Database
- `DB_HOST`, `DB_PORT`, `DB_NAME` - Database connection
- `DB_USER`, `DB_PASSWORD` - Database credentials
- `DB_MAX_CONNECTIONS` - Connection pool size

### Security
- `JWT_SECRET` - JWT signing secret
- `RATE_LIMIT_MAX_REQUESTS` - API rate limiting

### File Uploads
- `MAX_FILE_SIZE` - Maximum file upload size
- `ALLOWED_MIME_TYPES` - Allowed file types
- `UPLOAD_PATH` - File storage location

### Code Execution
- `CODE_EXECUTION_ENABLED` - Enable/disable code execution
- `SANDBOX_URL` - Code execution sandbox URL
- `CODE_EXECUTION_TIMEOUT` - Execution timeout

## Monitoring and Logging

The service includes comprehensive logging and monitoring:
- Structured JSON logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics
- Health check endpoints

## Security Features

- Input validation and sanitization
- SQL injection prevention
- File upload security scanning
- Code execution sandboxing
- Rate limiting
- CORS protection
- Helmet security headers

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details