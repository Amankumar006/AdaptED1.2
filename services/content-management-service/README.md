# Content Management Service

A comprehensive headless CMS service for the Enhanced Educational Platform, providing API-first content management with versioning, collaboration, and multimedia support.

## Features

### Core CMS Capabilities
- **Headless Architecture**: API-first design for flexible content delivery
- **Content Versioning**: Full version control with changelog tracking
- **Content Lifecycle**: Draft → Review → Published → Archived workflow
- **Rich Metadata**: Comprehensive content metadata and tagging system
- **Search & Discovery**: Full-text search with advanced filtering

### Content Types Supported
- Lessons and educational materials
- Exercises and practice problems
- Assessments and quizzes
- Multimedia content (images, videos, audio)
- Documents and resources
- SCORM packages
- Interactive content

### Advanced Features
- **Collaborative Editing**: Real-time collaboration with operational transforms
- **Comment System**: Contextual comments and suggestions
- **Workflow Management**: Customizable content approval workflows
- **Analytics Integration**: Content usage and engagement tracking
- **Multi-tenant Support**: Organization-based content isolation

## API Endpoints

### Content Management
```
POST   /api/content                    # Create new content
GET    /api/content/:id                # Get content by ID
PUT    /api/content/:id                # Update content
DELETE /api/content/:id                # Delete content
POST   /api/content/:id/publish        # Publish content
POST   /api/content/:id/archive        # Archive content
```

### Content Discovery
```
GET    /api/content/search             # Search content
GET    /api/content/my                 # Get user's content
GET    /api/content/organization/:id   # Get organization content
```

### Version Management
```
GET    /api/content/:id/versions       # Get all versions
GET    /api/content/:id/versions/:ver  # Get specific version
```

### Content Interaction
```
POST   /api/content/:id/download       # Download content
```

## Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3003

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/content_management
MONGODB_DB_NAME=content_management

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=educational-platform-content

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# File Upload Configuration
MAX_FILE_SIZE=100MB
ALLOWED_FILE_TYPES=image/*,video/*,audio/*,application/pdf,application/zip

# Video Processing Configuration
FFMPEG_PATH=/usr/local/bin/ffmpeg
VIDEO_QUALITY_LEVELS=240p,360p,480p,720p,1080p

# Content Processing
CONTENT_CACHE_TTL=3600
MAX_CONTENT_SIZE=500MB

# API Configuration
API_RATE_LIMIT=1000
API_WINDOW_MS=900000
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- FFmpeg (for video processing)

### Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build the application
npm run build

# Start the service
npm start
```

### Development
```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Docker
```bash
# Build Docker image
docker build -t content-management-service .

# Run with Docker Compose
docker-compose up content-management-service
```

## Content Structure

### Content Metadata
```typescript
{
  title: string;
  description: string;
  keywords: string[];
  language: string;
  subject: string;
  gradeLevel: string;
  duration?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  learningObjectives: string[];
  prerequisites: string[];
  standards?: string[];
}
```

### Content Versioning
- Semantic versioning (1.0.0)
- Automatic version increment on updates
- Version-specific publishing
- Changelog tracking for each version

### Content Collaboration
- Role-based access control (owner, editor, reviewer, viewer)
- Real-time collaborative editing
- Comment and suggestion system
- Approval workflows

## Performance Features

### Caching Strategy
- Redis-based content caching
- Search result caching
- Version data caching
- Intelligent cache invalidation

### Database Optimization
- MongoDB indexes for performance
- Text search indexes
- Compound indexes for common queries
- Aggregation pipeline optimization

### Scalability
- Horizontal scaling support
- Stateless service design
- Event-driven architecture ready
- CDN integration for media files

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Permission-based operations
- Organization-level isolation

### Data Protection
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet security headers

## Monitoring & Observability

### Health Checks
- Service health endpoint
- Database connectivity check
- Redis connectivity check

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics

## Standards Compliance

### Educational Standards
- SCORM 1.2 and 2004 support
- xAPI (Tin Can API) integration
- IMS Common Cartridge support
- QTI assessment compatibility

### Web Standards
- RESTful API design
- OpenAPI/Swagger documentation
- JSON:API compliance
- HTTP status code standards

## Development Guidelines

### Code Quality
- TypeScript for type safety
- ESLint and Prettier configuration
- Comprehensive test coverage
- Code review requirements

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- Performance tests for scalability
- End-to-end tests for workflows

### Documentation
- API documentation with examples
- Code documentation with JSDoc
- Architecture decision records
- Deployment guides

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.