# Authentication Service

A comprehensive authentication and authorization service for the Educational Platform, providing JWT-based authentication, OAuth/SSO integration, multi-factor authentication, and role-based access control.

## Features

### 🔐 Authentication
- **JWT-based Authentication** with access and refresh token rotation
- **OAuth 2.0 Integration** (Google, Microsoft)
- **SAML 2.0 Support** for enterprise SSO
- **Multi-Factor Authentication** (TOTP, Biometric, Backup codes)
- **Account Security** (lockout, rate limiting, password policies)

### 🛡️ Authorization
- **Role-Based Access Control (RBAC)** with hierarchical roles
- **Attribute-Based Access Control (ABAC)** with policy engine
- **Context-Aware Permissions** with dynamic policy evaluation
- **Multi-Tenant Support** with organization-scoped roles

### 📊 Monitoring & Observability
- **Comprehensive Metrics** (Prometheus format)
- **SLO Monitoring** (p95 ≤ 300ms, error rate ≤ 1%)
- **Security Event Tracking** with threat detection
- **Performance Monitoring** with distributed tracing support

### 🔒 Security
- **Zero-Trust Architecture** principles
- **Security Headers** (Helmet.js integration)
- **Input Validation** and sanitization
- **Rate Limiting** and DDoS protection
- **Audit Logging** for compliance

## Quick Start

### Prerequisites
- Node.js 18+
- Redis 6+
- PostgreSQL 13+

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env

# Build the service
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

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

### Docker Development

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f auth-service
```

## API Documentation

### Authentication Endpoints

#### POST /auth/login
Login with email and password.

```json
{
  "email": "user@example.com",
  "password": "password123",
  "mfaCode": "123456"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "roles": ["student"],
    "organizations": ["org-id"]
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### POST /auth/logout
Logout and revoke tokens.

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### GET /auth/validate
Validate access token.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

#### GET /auth/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

### OAuth Endpoints

#### GET /oauth/providers
Get supported OAuth providers.

#### GET /oauth/google
Initiate Google OAuth flow.

#### GET /oauth/google/callback
Handle Google OAuth callback.

#### GET /oauth/microsoft
Initiate Microsoft OAuth flow.

#### GET /oauth/microsoft/callback
Handle Microsoft OAuth callback.

#### GET /oauth/saml
Initiate SAML authentication.

#### POST /oauth/saml/callback
Handle SAML callback.

#### GET /oauth/saml/metadata
Get SAML metadata.

### MFA Endpoints

#### GET /mfa/status
Get user's MFA status and available methods.

#### POST /mfa/totp/setup
Setup TOTP MFA.

#### POST /mfa/totp/verify-setup
Verify TOTP setup with code.

```json
{
  "code": "123456"
}
```

#### POST /mfa/verify
Verify MFA code during authentication.

```json
{
  "userId": "user-id",
  "code": "123456",
  "method": "totp"
}
```

#### POST /mfa/biometric/challenge
Generate biometric authentication challenge.

#### POST /mfa/biometric/verify
Verify biometric authentication response.

#### POST /mfa/backup-codes/regenerate
Regenerate backup codes.

#### POST /mfa/disable
Disable MFA for user.

### Authorization Endpoints

#### GET /authorization/permissions/:userId?
Get user permissions.

#### GET /authorization/roles/:userId?
Get user roles.

#### POST /authorization/check
Check if user has specific permission.

```json
{
  "resource": "content",
  "action": "read",
  "resourceId": "content-id",
  "organizationId": "org-id"
}
```

#### GET /authorization/policies
Get authorization policies (Admin only).

#### POST /authorization/policies
Add authorization policy (Super Admin only).

```json
{
  "name": "Policy Name",
  "resource": "resource",
  "action": "action",
  "effect": "allow",
  "conditions": [],
  "priority": 100
}
```

### Monitoring Endpoints

#### GET /health
Health check endpoint.

#### GET /ready
Readiness check endpoint.

#### GET /metrics
Prometheus metrics endpoint.

#### GET /metrics/summary
Metrics summary with health status and SLO compliance.

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-token-key
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_CLUSTER=false

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educational_platform
DB_USERNAME=postgres
DB_PASSWORD=password

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# SAML Configuration
SAML_ENTRY_POINT=https://your-idp.com/saml/sso
SAML_CERT=your-saml-certificate

# Security Configuration
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
RATE_LIMIT_MAX=100

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Security Features

### Authentication Security
- **Password Policies**: Minimum 8 characters, complexity requirements
- **Account Lockout**: Automatic lockout after failed attempts
- **Rate Limiting**: Request rate limiting per IP
- **Token Security**: JWT with secure secrets and rotation
- **Session Management**: Secure session handling with Redis

### Authorization Security
- **Principle of Least Privilege**: Minimal required permissions
- **Context-Aware Access**: Dynamic permission evaluation
- **Policy Engine**: Flexible ABAC policy system
- **Audit Logging**: Comprehensive access logging

### Infrastructure Security
- **Zero-Trust Architecture**: mTLS communication
- **Security Headers**: Comprehensive security headers
- **Input Validation**: Strict input validation and sanitization
- **CORS Protection**: Configurable CORS policies

## Monitoring & Observability

### Metrics
- **Authentication Metrics**: Login attempts, success/failure rates
- **Performance Metrics**: Response times, throughput
- **Security Metrics**: Failed attempts, suspicious activity
- **Business Metrics**: Active users, feature usage

### SLO Targets
- **Response Time**: p95 ≤ 300ms
- **Error Rate**: ≤ 1%
- **Availability**: 99.9%

### Alerting
- **Critical Security Events**: Immediate alerts
- **SLO Violations**: Automated alerting
- **Performance Degradation**: Proactive monitoring

## Testing

### Test Coverage
- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints and workflows
- **Security Tests**: Authentication bypass attempts
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 3001:3001 --env-file .env auth-service
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        - name: DB_HOST
          value: "postgres-service"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   API Gateway   │    │  Auth Service   │
│                 │◄──►│                 │◄──►│                 │
│ Web/Mobile/API  │    │ Kong/Nginx/etc  │    │ Node.js/Express │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │     Redis       │◄────────────┤
                       │                 │             │
                       │ Session/Cache   │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │◄────────────┘
                       │                 │
                       │ User/Role Data  │
                       └─────────────────┘
```

### Security Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Rate Limiter  │    │  Input Validator│    │ Auth Middleware │
│                 │───►│                 │───►│                 │
│ DDoS Protection │    │ XSS/SQL Prevent │    │ JWT Validation  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             ▼
                       │ Authorization   │    ┌─────────────────┐
                       │                 │◄───│ Business Logic  │
                       │ RBAC/ABAC       │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Jest**: Testing framework
- **Security**: Security-first development

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the monitoring dashboards

---

**Note**: This service is part of the Educational Platform microservices architecture. Ensure proper security configurations and monitoring are in place before deploying to production environments.