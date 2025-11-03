#!/bin/bash

# Assessment Engine Service Pilot Deployment Script
set -e

echo "🚀 Starting Assessment Engine Service Pilot Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
SERVICE_NAME="assessment-engine-service"
SERVICE_PORT=3003
PILOT_ENV_FILE=".env.pilot"
DOCKER_COMPOSE_FILE="docker-compose.pilot.yml"

# Create pilot environment configuration
create_pilot_env() {
    print_step "Creating pilot environment configuration..."
    
    cat > "$PILOT_ENV_FILE" << EOF
# Assessment Engine Service - Pilot Environment Configuration
NODE_ENV=pilot
PORT=$SERVICE_PORT
PILOT_MODE=true

# Database Configuration (Pilot Mode - Optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assessment_engine_pilot
DB_USER=pilot_user
DB_PASSWORD=pilot_password
DB_MAX_CONNECTIONS=10

# Redis Configuration (Optional for pilot)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security Configuration
JWT_SECRET=pilot_jwt_secret_change_in_production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads/pilot
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,text/plain

# Monitoring Configuration
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info

# Pilot-specific Configuration
PILOT_COHORT_SIZE=50
PILOT_DURATION_DAYS=30
PILOT_FEEDBACK_ENABLED=true
PILOT_ANALYTICS_ENABLED=true

# External Services (Mock endpoints for pilot)
AI_SERVICE_URL=http://localhost:3001
ANALYTICS_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3004

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080
EOF

    print_status "✅ Pilot environment configuration created"
}

# Create Docker Compose configuration for pilot
create_docker_compose() {
    print_step "Creating Docker Compose configuration for pilot..."
    
    cat > "$DOCKER_COMPOSE_FILE" << EOF
version: '3.8'

services:
  assessment-engine-pilot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: assessment-engine-pilot
    ports:
      - "$SERVICE_PORT:$SERVICE_PORT"
    environment:
      - NODE_ENV=pilot
      - PILOT_MODE=true
      - PORT=$SERVICE_PORT
    env_file:
      - $PILOT_ENV_FILE
    volumes:
      - ./uploads/pilot:/app/uploads/pilot
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:$SERVICE_PORT/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - pilot-network

  # Optional: Redis for caching (pilot mode)
  redis-pilot:
    image: redis:7-alpine
    container_name: redis-pilot
    ports:
      - "6379:6379"
    volumes:
      - redis-pilot-data:/data
    restart: unless-stopped
    networks:
      - pilot-network

  # Optional: PostgreSQL for data persistence (pilot mode)
  postgres-pilot:
    image: postgres:15-alpine
    container_name: postgres-pilot
    environment:
      POSTGRES_DB: assessment_engine_pilot
      POSTGRES_USER: pilot_user
      POSTGRES_PASSWORD: pilot_password
    ports:
      - "5432:5432"
    volumes:
      - postgres-pilot-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - pilot-network

volumes:
  redis-pilot-data:
  postgres-pilot-data:

networks:
  pilot-network:
    driver: bridge
EOF

    print_status "✅ Docker Compose configuration created"
}

# Create pilot initialization SQL
create_init_sql() {
    print_step "Creating pilot database initialization script..."
    
    cat > "init.sql" << EOF
-- Assessment Engine Service - Pilot Database Initialization

-- Create pilot-specific schemas
CREATE SCHEMA IF NOT EXISTS pilot;

-- Basic tables for pilot (simplified schema)
CREATE TABLE IF NOT EXISTS pilot.assessments (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    time_limit INTEGER,
    max_attempts INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pilot.question_banks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    subject VARCHAR(255),
    tags JSONB DEFAULT '[]',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pilot.questions (
    id VARCHAR(255) PRIMARY KEY,
    bank_id VARCHAR(255) REFERENCES pilot.question_banks(id),
    type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    options JSONB DEFAULT '[]',
    correct_answer JSONB,
    points INTEGER DEFAULT 1,
    difficulty VARCHAR(50) DEFAULT 'intermediate',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pilot.submissions (
    id VARCHAR(255) PRIMARY KEY,
    assessment_id VARCHAR(255) REFERENCES pilot.assessments(id),
    user_id VARCHAR(255) NOT NULL,
    responses JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'in_progress',
    score DECIMAL(5,2),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessments_status ON pilot.assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON pilot.assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_bank_id ON pilot.questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON pilot.questions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment_id ON pilot.submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON pilot.submissions(user_id);

-- Insert pilot data
INSERT INTO pilot.question_banks (id, name, description, subject, tags, created_by) VALUES
('qb_pilot_math', 'Pilot Mathematics Bank', 'Question bank for mathematics pilot', 'Mathematics', '["pilot", "math"]', 'pilot_admin'),
('qb_pilot_science', 'Pilot Science Bank', 'Question bank for science pilot', 'Science', '["pilot", "science"]', 'pilot_admin'),
('qb_pilot_cs', 'Pilot Computer Science Bank', 'Question bank for CS pilot', 'Computer Science', '["pilot", "programming"]', 'pilot_admin')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA pilot TO pilot_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pilot TO pilot_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pilot TO pilot_user;

-- Create pilot monitoring views
CREATE OR REPLACE VIEW pilot.assessment_metrics AS
SELECT 
    COUNT(*) as total_assessments,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_assessments,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_assessments,
    AVG(time_limit) as avg_time_limit
FROM pilot.assessments;

CREATE OR REPLACE VIEW pilot.submission_metrics AS
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_submissions,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_submissions,
    AVG(score) as avg_score,
    COUNT(DISTINCT user_id) as unique_users
FROM pilot.submissions;

COMMENT ON SCHEMA pilot IS 'Pilot environment schema for assessment engine service';
EOF

    print_status "✅ Pilot database initialization script created"
}

# Build and deploy the service
deploy_service() {
    print_step "Building and deploying assessment engine service..."
    
    # Install dependencies
    if [ -f "package.json" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Build the service
    print_status "Building TypeScript code..."
    npm run build
    
    # Create upload directory
    mkdir -p uploads/pilot
    mkdir -p logs
    
    # Start services with Docker Compose
    print_status "Starting pilot services with Docker Compose..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    for i in {1..10}; do
        if curl -f "http://localhost:$SERVICE_PORT/health" > /dev/null 2>&1; then
            print_status "✅ Assessment Engine Service is healthy"
            break
        else
            print_warning "Waiting for service to be ready... (attempt $i/10)"
            sleep 10
        fi
    done
}

# Run pilot validation
run_pilot_validation() {
    print_step "Running pilot validation tests..."
    
    if [ -f "scripts/pilot-validation.sh" ]; then
        chmod +x scripts/pilot-validation.sh
        ./scripts/pilot-validation.sh
    else
        print_warning "Pilot validation script not found, skipping validation"
    fi
}

# Generate deployment report
generate_deployment_report() {
    print_step "Generating deployment report..."
    
    cat > "pilot-deployment-report.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "service": "$SERVICE_NAME",
  "environment": "pilot",
  "deployment_status": "completed",
  "configuration": {
    "service_port": $SERVICE_PORT,
    "pilot_mode": true,
    "database": "postgresql",
    "cache": "redis",
    "monitoring": "enabled"
  },
  "endpoints": {
    "health": "http://localhost:$SERVICE_PORT/health",
    "api": "http://localhost:$SERVICE_PORT/api/v1",
    "metrics": "http://localhost:$SERVICE_PORT/metrics",
    "dashboard": "http://localhost:$SERVICE_PORT/dashboard"
  },
  "pilot_configuration": {
    "cohort_size": 50,
    "duration_days": 30,
    "feedback_enabled": true,
    "analytics_enabled": true
  },
  "next_steps": [
    "Verify service health and endpoints",
    "Set up teacher training materials",
    "Configure pilot student cohorts",
    "Begin assessment creation workflows",
    "Monitor performance metrics"
  ]
}
EOF

    print_status "✅ Deployment report generated: pilot-deployment-report.json"
}

# Main deployment process
main() {
    print_step "Starting Assessment Engine Service Pilot Deployment..."
    
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        print_error "Docker is required but not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is required but not installed"
        exit 1
    fi
    
    # Create pilot configuration
    create_pilot_env
    create_docker_compose
    create_init_sql
    
    # Deploy the service
    deploy_service
    
    # Run validation
    run_pilot_validation
    
    # Generate report
    generate_deployment_report
    
    echo ""
    echo "=================================================="
    echo "🎉 PILOT DEPLOYMENT COMPLETED"
    echo "=================================================="
    echo "Service URL: http://localhost:$SERVICE_PORT"
    echo "Health Check: http://localhost:$SERVICE_PORT/health"
    echo "API Documentation: http://localhost:$SERVICE_PORT/api/v1"
    echo "Metrics: http://localhost:$SERVICE_PORT/metrics"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Verify service is running: curl http://localhost:$SERVICE_PORT/health"
    echo "   2. Review deployment report: pilot-deployment-report.json"
    echo "   3. Set up teacher training materials"
    echo "   4. Configure pilot student cohorts"
    echo "   5. Begin pilot assessment workflows"
    echo ""
    print_status "Pilot deployment completed successfully!"
}

# Run main function
main "$@"