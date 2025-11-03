#!/bin/bash

# Student Portal Pilot Deployment Script
# This script deploys the student portal to the pilot environment

set -e

echo "🚀 Starting Student Portal Pilot Deployment..."

# Configuration
PILOT_ENV="pilot"
BUILD_DIR="dist"
PILOT_DOMAIN="pilot-student.enhanced-edu.com"
DOCKER_IMAGE="student-portal:pilot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed ✓"
}

# Setup pilot environment
setup_pilot_env() {
    print_status "Setting up pilot environment..."
    
    # Copy pilot environment variables
    if [ -f ".env.pilot" ]; then
        cp .env.pilot .env
        print_status "Pilot environment variables configured ✓"
    else
        print_error "Pilot environment file (.env.pilot) not found"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --production=false
    print_status "Dependencies installed ✓"
}

# Run tests before deployment
run_tests() {
    print_status "Running pre-deployment tests..."
    
    # Run unit tests
    npm run test:unit
    print_status "Unit tests passed ✓"
    
    # Run accessibility tests
    npm run test:a11y
    print_status "Accessibility tests passed ✓"
    
    # Run integration tests
    npm run cypress:run:headless
    print_status "Integration tests passed ✓"
    
    # Run performance tests
    npm run performance
    print_status "Performance tests passed ✓"
}

# Build application
build_application() {
    print_status "Building application for pilot environment..."
    
    # Clean previous build
    rm -rf $BUILD_DIR
    
    # Build with pilot configuration
    NODE_ENV=pilot npm run build
    
    if [ -d "$BUILD_DIR" ]; then
        print_status "Application built successfully ✓"
    else
        print_error "Build failed - dist directory not found"
        exit 1
    fi
}

# Create Docker image
create_docker_image() {
    print_status "Creating Docker image..."
    
    # Create Dockerfile for pilot deployment
    cat > Dockerfile.pilot << EOF
FROM nginx:alpine

# Copy built application
COPY dist/ /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.pilot.conf /etc/nginx/conf.d/default.conf

# Add pilot-specific labels
LABEL environment="pilot"
LABEL version="1.0.0"
LABEL maintainer="enhanced-edu-team"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

    # Create nginx configuration for pilot
    cat > nginx.pilot.conf << EOF
server {
    listen 80;
    server_name $PILOT_DOMAIN;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # PWA support
    location /manifest.json {
        add_header Cache-Control "public, max-age=86400";
    }

    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy (if needed)
    location /api/ {
        proxy_pass https://pilot-api.enhanced-edu.com/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Pilot-specific endpoints
    location /pilot-health {
        access_log off;
        return 200 "Pilot environment healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Build Docker image
    docker build -f Dockerfile.pilot -t $DOCKER_IMAGE .
    
    print_status "Docker image created ✓"
}

# Deploy to pilot environment
deploy_to_pilot() {
    print_status "Deploying to pilot environment..."
    
    # Tag image for registry
    docker tag $DOCKER_IMAGE "registry.enhanced-edu.com/$DOCKER_IMAGE"
    
    # Push to registry (if configured)
    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        docker push "registry.enhanced-edu.com/$DOCKER_IMAGE"
        print_status "Image pushed to registry ✓"
    fi
    
    # Deploy using docker-compose or kubernetes (example with docker-compose)
    cat > docker-compose.pilot.yml << EOF
version: '3.8'

services:
  student-portal-pilot:
    image: $DOCKER_IMAGE
    container_name: student-portal-pilot
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=pilot
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.student-portal-pilot.rule=Host(\`$PILOT_DOMAIN\`)"
      - "traefik.http.routers.student-portal-pilot.tls=true"
      - "traefik.http.services.student-portal-pilot.loadbalancer.server.port=80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/pilot-health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    external:
      name: pilot-network
EOF

    # Start the service
    docker-compose -f docker-compose.pilot.yml up -d
    
    print_status "Deployment completed ✓"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for service to be ready
    sleep 30
    
    # Health check
    if curl -f "http://localhost:8080/pilot-health" > /dev/null 2>&1; then
        print_status "Health check passed ✓"
    else
        print_error "Health check failed"
        exit 1
    fi
    
    # Basic functionality test
    if curl -f "http://localhost:8080/" > /dev/null 2>&1; then
        print_status "Application is accessible ✓"
    else
        print_error "Application is not accessible"
        exit 1
    fi
    
    print_status "Deployment verification completed ✓"
}

# Cleanup temporary files
cleanup() {
    print_status "Cleaning up temporary files..."
    rm -f Dockerfile.pilot nginx.pilot.conf docker-compose.pilot.yml
    print_status "Cleanup completed ✓"
}

# Main deployment flow
main() {
    print_status "Student Portal Pilot Deployment Started"
    print_status "Target Domain: $PILOT_DOMAIN"
    print_status "Docker Image: $DOCKER_IMAGE"
    
    check_prerequisites
    setup_pilot_env
    install_dependencies
    run_tests
    build_application
    create_docker_image
    deploy_to_pilot
    verify_deployment
    cleanup
    
    print_status "🎉 Student Portal Pilot Deployment Completed Successfully!"
    print_status "Access the pilot at: http://$PILOT_DOMAIN"
    print_status "Health check: http://$PILOT_DOMAIN/pilot-health"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"