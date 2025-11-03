#!/bin/bash

# Educational Platform Docker Compose Deployment Script
set -e

echo "🚀 Starting Educational Platform Docker Compose Deployment"

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

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running"
    exit 1
fi

print_status "Docker and docker-compose are available"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p infrastructure/postgres/primary
mkdir -p infrastructure/postgres/replica
mkdir -p infrastructure/postgres/init
mkdir -p infrastructure/mongodb/init
mkdir -p infrastructure/redis
mkdir -p infrastructure/kong
mkdir -p infrastructure/prometheus
mkdir -p infrastructure/grafana/provisioning/datasources
mkdir -p infrastructure/grafana/provisioning/dashboards

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down -v || true

# Pull latest images
print_status "Pulling latest images..."
docker-compose pull

# Start infrastructure services
print_status "Starting infrastructure services..."
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL primary..."
until docker-compose exec -T postgres-primary pg_isready -U postgres; do
    echo "Waiting for PostgreSQL primary to be ready..."
    sleep 5
done

print_status "Waiting for PostgreSQL replica..."
until docker-compose exec -T postgres-replica pg_isready -U postgres; do
    echo "Waiting for PostgreSQL replica to be ready..."
    sleep 5
done

# Wait for MongoDB
print_status "Waiting for MongoDB..."
until docker-compose exec -T mongodb-primary mongosh --eval "db.adminCommand('ping')" --quiet; do
    echo "Waiting for MongoDB to be ready..."
    sleep 5
done

# Initialize MongoDB replica set
print_status "Initializing MongoDB replica set..."
sleep 10
docker-compose exec -T mongodb-primary mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
    { _id: 1, host: 'mongodb-secondary1:27017', priority: 1 },
    { _id: 2, host: 'mongodb-secondary2:27017', priority: 1 }
  ]
})
"

# Wait for Redis cluster
print_status "Waiting for Redis nodes..."
sleep 15

# Initialize Redis cluster
print_status "Initializing Redis cluster..."
docker-compose exec -T redis-node1 redis-cli --cluster create \
  redis-node1:7001 redis-node2:7002 redis-node3:7003 \
  --cluster-yes || true

# Wait for Kafka
print_status "Waiting for Kafka..."
until docker-compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list &> /dev/null; do
    echo "Waiting for Kafka to be ready..."
    sleep 5
done

# Create Kafka topics
print_status "Creating Kafka topics..."
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic user-events --partitions 3 --replication-factor 1 || true
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic content-events --partitions 3 --replication-factor 1 || true
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic assessment-events --partitions 3 --replication-factor 1 || true
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic analytics-events --partitions 6 --replication-factor 1 || true
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic gamification-events --partitions 3 --replication-factor 1 || true
docker-compose exec -T kafka kafka-topics --create --bootstrap-server localhost:9092 --topic notification-events --partitions 3 --replication-factor 1 || true

# Wait for Kong
print_status "Waiting for Kong API Gateway..."
until curl -s http://localhost:8001/status &> /dev/null; do
    echo "Waiting for Kong to be ready..."
    sleep 5
done

# Wait for monitoring services
print_status "Waiting for monitoring services..."
until curl -s http://localhost:9090/-/ready &> /dev/null; do
    echo "Waiting for Prometheus to be ready..."
    sleep 5
done

until curl -s http://localhost:3000/api/health &> /dev/null; do
    echo "Waiting for Grafana to be ready..."
    sleep 5
done

print_status "Infrastructure deployment completed successfully!"

# Display service endpoints
print_status "Service endpoints:"
echo "📊 Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "🔍 Jaeger Tracing: http://localhost:16686"
echo "📈 Prometheus: http://localhost:9090"
echo "🌐 API Gateway: http://localhost:8000"
echo "🔧 Kong Admin: http://localhost:8001"
echo "🗄️  PostgreSQL Primary: localhost:5432"
echo "🗄️  PostgreSQL Replica: localhost:5433"
echo "📄 MongoDB: localhost:27017"
echo "🔴 Redis: localhost:7001, localhost:7002, localhost:7003"
echo "📨 Kafka: localhost:9092"

print_status "Database credentials:"
echo "PostgreSQL: postgres/postgres_password"
echo "MongoDB: admin/admin_password"

print_warning "Please change default passwords in production!"

# Show container status
print_status "Container status:"
docker-compose ps

echo ""
print_status "Infrastructure is ready for microservice development!"
print_status "You can now start developing and deploying your microservices."