# User Management Service

The User Management Service is a core microservice of the Educational Platform that handles user profiles, preferences, role-based access control, and multi-tenant organization management.

## Features

### User Profile Management
- User registration and profile creation
- Comprehensive user preferences (theme, notifications, accessibility, learning preferences)
- Profile updates and validation
- User search and filtering capabilities

### Role-Based Access Control (RBAC)
- Hierarchical role management with inheritance
- Permission-based access control
- Bulk role assignment capabilities
- Organization-scoped and global roles

### Multi-Tenant Organization Support
- Organization hierarchy management
- Tenant-specific configurations and branding
- Cross-organization permission handling
- Organization member management

### Key Capabilities
- JWT-based authentication integration
- Redis caching for performance
- Comprehensive audit logging
- RESTful API with validation
- Database transactions for data consistency
- Horizontal scalability support

## API Endpoints

### Users
- `POST /users` - Create user (system admin only)
- `GET /users/search` - Search users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (system admin only)
- `GET /users/:id/roles` - Get user roles
- `POST /users/:id/roles` - Assign roles to user
- `DELETE /users/:id/roles` - Remove roles from user

### Roles
- `POST /roles` - Create role
- `GET /roles` - Get all roles
- `GET /roles/hierarchy` - Get role hierarchy
- `GET /roles/:id` - Get role by ID
- `PUT /roles/:id` - Update role
- `DELETE /roles/:id` - Delete role
- `POST /roles/bulk-assign` - Bulk role assignment

### Organizations
- `POST /organizations` - Create organization (system admin only)
- `GET /organizations` - Get all organizations
- `GET /organizations/hierarchy` - Get organization hierarchy
- `GET /organizations/:id` - Get organization by ID
- `PUT /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization
- `GET /organizations/:id/members` - Get organization members
- `POST /organizations/:id/members` - Add member to organization

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for session management and caching
- **Authentication**: JWT token validation
- **Validation**: express-validator
- **Logging**: Winston with structured logging
- **Security**: Helmet, CORS, rate limiting

## Environment Variables

```bash
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educational_platform
DB_USERNAME=postgres
DB_PASSWORD=password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1
REDIS_KEY_PREFIX=user:

# JWT Configuration
JWT_ACCESS_SECRET=your-access-token-secret
JWT_ISSUER=educational-platform
JWT_AUDIENCE=educational-platform-users

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd services/user-management-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**
   ```bash
   # Run the init.sql script in your PostgreSQL database
   psql -h localhost -U postgres -d educational_platform -f init.sql
   ```

5. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Building
```bash
# Build TypeScript
npm run build
```

## Docker

### Build Image
```bash
docker build -t user-management-service .
```

### Run Container
```bash
docker run -p 3002:3002 \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  user-management-service
```

## Database Schema

The service uses PostgreSQL with the following main tables:

- **users**: Core user information
- **user_profiles**: Detailed user profile data
- **user_preferences**: User preferences and settings
- **organizations**: Organization/tenant information
- **roles**: Role definitions with hierarchy
- **permissions**: Permission definitions
- **role_permissions**: Role-permission mappings
- **organization_memberships**: User-organization relationships

## Caching Strategy

The service implements multi-level caching:

- **User Data**: Cached for 1 hour
- **Roles**: Cached for 2 hours
- **Organizations**: Cached for 2 hours
- **Permissions**: Cached for 4 hours

Cache invalidation is handled automatically on data updates.

## Security Features

- JWT token validation for authentication
- Role-based authorization middleware
- Input validation and sanitization
- SQL injection prevention
- Rate limiting
- CORS configuration
- Security headers with Helmet
- Audit logging for all operations

## Monitoring and Health Checks

- **Health Check**: `GET /health` - Service health status
- **Readiness Check**: `GET /ready` - Service readiness status
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Request Metrics**: Response time and status code tracking

## Error Handling

The service implements comprehensive error handling:

- Validation errors with detailed field information
- Authentication and authorization errors
- Database constraint violations
- Resource not found errors
- Internal server errors with request correlation

## Performance Considerations

- Database connection pooling
- Redis caching for frequently accessed data
- Efficient database queries with proper indexing
- Pagination for large result sets
- Bulk operations for role assignments
- Asynchronous processing where applicable

## Contributing

1. Follow TypeScript and ESLint configurations
2. Write tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all tests pass before submitting PRs

## License

This project is licensed under the MIT License.