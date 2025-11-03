#!/bin/bash

# Educational Platform Infrastructure Deployment Script
set -e

echo "🚀 Starting Educational Platform Infrastructure Deployment"

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

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_status "Connected to Kubernetes cluster"

# Deploy namespaces and resource quotas
print_status "Creating namespaces and resource quotas..."
kubectl apply -f k8s/namespace.yaml

# Wait for namespaces to be ready
kubectl wait --for=condition=Active namespace/educational-platform --timeout=60s
kubectl wait --for=condition=Active namespace/educational-platform-data --timeout=60s
kubectl wait --for=condition=Active namespace/educational-platform-monitoring --timeout=60s

# Deploy Istio service mesh configurations
print_status "Deploying Istio service mesh configurations..."
kubectl apply -f k8s/istio/

# Deploy data layer (PostgreSQL, MongoDB, Redis, Kafka)
print_status "Deploying data layer..."
kubectl apply -f k8s/data/postgres-cluster.yaml
kubectl apply -f k8s/data/mongodb-cluster.yaml
kubectl apply -f k8s/data/redis-cluster.yaml
kubectl apply -f k8s/data/kafka-cluster.yaml

# Wait for data services to be ready
print_status "Waiting for data services to be ready..."
kubectl wait --for=condition=Ready pod -l app=postgres-primary -n educational-platform-data --timeout=300s
kubectl wait --for=condition=Ready pod -l app=mongodb-primary -n educational-platform-data --timeout=300s
kubectl wait --for=condition=Ready pod -l app=redis-cluster -n educational-platform-data --timeout=300s
kubectl wait --for=condition=Ready pod -l app=kafka -n educational-platform-data --timeout=300s

# Initialize Redis cluster
print_status "Initializing Redis cluster..."
kubectl wait --for=condition=Complete job/redis-cluster-init -n educational-platform-data --timeout=300s

# Initialize MongoDB replica set
print_status "Initializing MongoDB replica set..."
kubectl wait --for=condition=Complete job/mongodb-replica-init -n educational-platform-data --timeout=300s

# Deploy API Gateway
print_status "Deploying API Gateway..."
kubectl apply -f k8s/gateway/kong-gateway.yaml

# Wait for API Gateway to be ready
kubectl wait --for=condition=Ready pod -l app=kong-gateway -n educational-platform --timeout=300s

# Deploy observability stack
print_status "Deploying observability stack..."
kubectl apply -f k8s/observability/opentelemetry.yaml
kubectl apply -f k8s/observability/prometheus.yaml
kubectl apply -f k8s/observability/grafana.yaml

# Wait for observability services to be ready
kubectl wait --for=condition=Ready pod -l app=otel-collector -n educational-platform-monitoring --timeout=300s
kubectl wait --for=condition=Ready pod -l app=prometheus -n educational-platform-monitoring --timeout=300s
kubectl wait --for=condition=Ready pod -l app=grafana -n educational-platform-monitoring --timeout=300s

# Deploy cost monitoring
print_status "Deploying cost monitoring..."
kubectl apply -f k8s/observability/cost-monitoring.yaml

# Wait for cost monitoring to be ready
kubectl wait --for=condition=Ready pod -l app=kubecost-cost-analyzer -n educational-platform-monitoring --timeout=300s

print_status "Infrastructure deployment completed successfully!"

# Display service endpoints
print_status "Service endpoints:"
echo "📊 Grafana Dashboard: http://$(kubectl get svc grafana -n educational-platform-monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3000"
echo "🔍 Jaeger Tracing: http://$(kubectl get svc jaeger -n educational-platform-monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):16686"
echo "📈 Prometheus: http://$(kubectl get svc prometheus -n educational-platform-monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):9090"
echo "💰 Kubecost: http://$(kubectl get svc kubecost-cost-analyzer -n educational-platform-monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):9090"
echo "🌐 API Gateway: http://$(kubectl get svc kong-gateway -n educational-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):8000"

print_status "Default credentials:"
echo "Grafana: admin/admin"
echo "MongoDB: admin/admin_password"
echo "PostgreSQL: postgres/postgres_password"

print_warning "Please change default passwords in production!"

echo ""
print_status "Infrastructure is ready for microservice deployment!"