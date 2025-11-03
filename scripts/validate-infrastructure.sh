#!/bin/bash

# Educational Platform Infrastructure Validation Script
set -e

echo "🔍 Validating Educational Platform Infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Validation counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to validate service
validate_service() {
    local service_name=$1
    local namespace=$2
    local expected_replicas=$3
    
    print_info "Validating $service_name in namespace $namespace..."
    
    # Check if pods are running
    local running_pods=$(kubectl get pods -n $namespace -l app=$service_name --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    if [ "$running_pods" -ge "$expected_replicas" ]; then
        print_status "$service_name: $running_pods/$expected_replicas pods running"
        ((PASSED++))
    else
        print_error "$service_name: Only $running_pods/$expected_replicas pods running"
        ((FAILED++))
    fi
}

# Function to validate endpoint
validate_endpoint() {
    local service_name=$1
    local namespace=$2
    local port=$3
    local path=${4:-"/"}
    
    print_info "Validating $service_name endpoint..."
    
    # Port forward in background
    kubectl port-forward -n $namespace svc/$service_name $port:$port &
    local pf_pid=$!
    sleep 5
    
    # Test endpoint
    if curl -s -f "http://localhost:$port$path" > /dev/null 2>&1; then
        print_status "$service_name endpoint is accessible"
        ((PASSED++))
    else
        print_error "$service_name endpoint is not accessible"
        ((FAILED++))
    fi
    
    # Kill port forward
    kill $pf_pid 2>/dev/null || true
    sleep 2
}

# Function to validate database connection
validate_database() {
    local db_type=$1
    local service_name=$2
    local namespace=$3
    
    print_info "Validating $db_type database connection..."
    
    case $db_type in
        "postgresql")
            if kubectl exec -n $namespace deployment/$service_name -- pg_isready -U postgres > /dev/null 2>&1; then
                print_status "$db_type database is ready"
                ((PASSED++))
            else
                print_error "$db_type database is not ready"
                ((FAILED++))
            fi
            ;;
        "mongodb")
            if kubectl exec -n $namespace deployment/$service_name -- mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
                print_status "$db_type database is ready"
                ((PASSED++))
            else
                print_error "$db_type database is not ready"
                ((FAILED++))
            fi
            ;;
        "redis")
            if kubectl exec -n $namespace statefulset/$service_name -- redis-cli ping > /dev/null 2>&1; then
                print_status "$db_type database is ready"
                ((PASSED++))
            else
                print_error "$db_type database is not ready"
                ((FAILED++))
            fi
            ;;
    esac
}

echo "🏗️ Infrastructure Validation Report"
echo "=================================="

# Check if kubectl is available and cluster is accessible
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_status "Connected to Kubernetes cluster"

# Validate namespaces
print_info "Validating namespaces..."
for namespace in educational-platform educational-platform-data educational-platform-monitoring; do
    if kubectl get namespace $namespace > /dev/null 2>&1; then
        print_status "Namespace $namespace exists"
        ((PASSED++))
    else
        print_error "Namespace $namespace does not exist"
        ((FAILED++))
    fi
done

# Validate data services
echo ""
print_info "🗄️ Validating Data Services"
print_info "============================"

validate_service "postgres-primary" "educational-platform-data" 1
validate_service "postgres-replica" "educational-platform-data" 1
validate_service "mongodb-primary" "educational-platform-data" 1
validate_service "mongodb-secondary" "educational-platform-data" 2
validate_service "redis-cluster" "educational-platform-data" 6
validate_service "kafka" "educational-platform-data" 3
validate_service "zookeeper" "educational-platform-data" 3

# Validate database connections
validate_database "postgresql" "postgres-primary" "educational-platform-data"
validate_database "mongodb" "mongodb-primary" "educational-platform-data"
validate_database "redis" "redis-cluster" "educational-platform-data"

# Validate API Gateway
echo ""
print_info "🌐 Validating API Gateway"
print_info "========================="

validate_service "kong-gateway" "educational-platform" 3
validate_endpoint "kong-gateway" "educational-platform" 8001 "/status"

# Validate observability services
echo ""
print_info "📊 Validating Observability Services"
print_info "===================================="

validate_service "otel-collector" "educational-platform-monitoring" 2
validate_service "jaeger" "educational-platform-monitoring" 1
validate_service "prometheus" "educational-platform-monitoring" 1
validate_service "grafana" "educational-platform-monitoring" 1
validate_service "kubecost-cost-analyzer" "educational-platform-monitoring" 1

# Validate observability endpoints
validate_endpoint "prometheus" "educational-platform-monitoring" 9090 "/-/ready"
validate_endpoint "grafana" "educational-platform-monitoring" 3000 "/api/health"
validate_endpoint "jaeger" "educational-platform-monitoring" 16686

# Validate Istio configuration
echo ""
print_info "🔒 Validating Istio Configuration"
print_info "================================="

# Check if Istio is installed
if kubectl get namespace istio-system > /dev/null 2>&1; then
    print_status "Istio namespace exists"
    ((PASSED++))
    
    # Check Istio components
    local istio_pods=$(kubectl get pods -n istio-system --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    if [ "$istio_pods" -gt 0 ]; then
        print_status "Istio components are running ($istio_pods pods)"
        ((PASSED++))
    else
        print_error "No Istio components are running"
        ((FAILED++))
    fi
    
    # Check if educational-platform namespace has Istio injection enabled
    local injection_label=$(kubectl get namespace educational-platform -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null)
    if [ "$injection_label" = "enabled" ]; then
        print_status "Istio injection enabled for educational-platform namespace"
        ((PASSED++))
    else
        print_warning "Istio injection not enabled for educational-platform namespace"
        ((WARNINGS++))
    fi
else
    print_error "Istio namespace does not exist"
    ((FAILED++))
fi

# Check Istio Gateway and VirtualService
if kubectl get gateway educational-platform-gateway -n educational-platform > /dev/null 2>&1; then
    print_status "Istio Gateway configured"
    ((PASSED++))
else
    print_error "Istio Gateway not configured"
    ((FAILED++))
fi

if kubectl get virtualservice educational-platform-vs -n educational-platform > /dev/null 2>&1; then
    print_status "Istio VirtualService configured"
    ((PASSED++))
else
    print_error "Istio VirtualService not configured"
    ((FAILED++))
fi

# Validate resource quotas and limits
echo ""
print_info "📏 Validating Resource Management"
print_info "================================="

for namespace in educational-platform educational-platform-data educational-platform-monitoring; do
    if kubectl get resourcequota -n $namespace > /dev/null 2>&1; then
        print_status "Resource quota configured for $namespace"
        ((PASSED++))
    else
        print_warning "No resource quota configured for $namespace"
        ((WARNINGS++))
    fi
    
    if kubectl get limitrange -n $namespace > /dev/null 2>&1; then
        print_status "Limit range configured for $namespace"
        ((PASSED++))
    else
        print_warning "No limit range configured for $namespace"
        ((WARNINGS++))
    fi
done

# Validate persistent volumes
echo ""
print_info "💾 Validating Storage"
print_info "===================="

local pvc_count=$(kubectl get pvc --all-namespaces --no-headers 2>/dev/null | wc -l)
if [ "$pvc_count" -gt 0 ]; then
    print_status "Persistent Volume Claims configured ($pvc_count PVCs)"
    ((PASSED++))
    
    # Check if PVCs are bound
    local bound_pvcs=$(kubectl get pvc --all-namespaces --field-selector=status.phase=Bound --no-headers 2>/dev/null | wc -l)
    if [ "$bound_pvcs" -eq "$pvc_count" ]; then
        print_status "All PVCs are bound ($bound_pvcs/$pvc_count)"
        ((PASSED++))
    else
        print_error "Some PVCs are not bound ($bound_pvcs/$pvc_count)"
        ((FAILED++))
    fi
else
    print_error "No Persistent Volume Claims found"
    ((FAILED++))
fi

# Summary
echo ""
echo "📋 Validation Summary"
echo "===================="
print_status "Passed: $PASSED"
if [ $WARNINGS -gt 0 ]; then
    print_warning "Warnings: $WARNINGS"
fi
if [ $FAILED -gt 0 ]; then
    print_error "Failed: $FAILED"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    print_status "🎉 Infrastructure validation completed successfully!"
    if [ $WARNINGS -gt 0 ]; then
        print_warning "Please review warnings above"
    fi
    echo ""
    print_info "Infrastructure is ready for microservice deployment!"
    exit 0
else
    print_error "❌ Infrastructure validation failed!"
    print_error "Please fix the issues above before proceeding"
    exit 1
fi