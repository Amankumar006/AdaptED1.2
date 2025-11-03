#!/bin/bash
set -e

echo "========================================="
echo "Auth Service Deployment Validation"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Namespace
NAMESPACE="educational-platform"
MONITORING_NS="educational-platform-monitoring"
GATEWAY_NS="educational-platform-gateway"

# Function to check if resource exists
check_resource() {
    local resource_type=$1
    local resource_name=$2
    local namespace=$3
    
    if kubectl get $resource_type $resource_name -n $namespace &>/dev/null; then
        echo -e "${GREEN}✓${NC} $resource_type/$resource_name exists in $namespace"
        return 0
    else
        echo -e "${RED}✗${NC} $resource_type/$resource_name NOT FOUND in $namespace"
        return 1
    fi
}

# Check namespaces
echo "1. Checking Namespaces..."
kubectl get namespace $NAMESPACE &>/dev/null || echo -e "${YELLOW}⚠${NC} Namespace $NAMESPACE does not exist. Create with: kubectl create namespace $NAMESPACE"
kubectl get namespace $MONITORING_NS &>/dev/null || echo -e "${YELLOW}⚠${NC} Namespace $MONITORING_NS does not exist"
kubectl get namespace $GATEWAY_NS &>/dev/null || echo -e "${YELLOW}⚠${NC} Namespace $GATEWAY_NS does not exist"
echo ""

# Check secrets
echo "2. Checking Secrets..."
check_resource secret postgres-credentials $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/secrets/database-secrets.yaml"
check_resource secret mongodb-credentials $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/secrets/database-secrets.yaml"
check_resource secret redis-credentials $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/secrets/database-secrets.yaml"
check_resource secret jwt-signing-keys $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/secrets/app-secrets.yaml"
check_resource secret oauth-credentials $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/secrets/app-secrets.yaml"
echo ""

# Check ConfigMap
echo "3. Checking ConfigMaps..."
check_resource configmap auth-service-config $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/services/auth-service-configmap.yaml"
echo ""

# Check deployment
echo "4. Checking Deployment..."
if check_resource deployment auth-service $NAMESPACE; then
    # Check pod status
    READY_PODS=$(kubectl get deployment auth-service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    DESIRED_PODS=$(kubectl get deployment auth-service -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [ "$READY_PODS" == "$DESIRED_PODS" ]; then
        echo -e "${GREEN}✓${NC} All pods ready ($READY_PODS/$DESIRED_PODS)"
    else
        echo -e "${YELLOW}⚠${NC} Pods not ready: $READY_PODS/$DESIRED_PODS"
        kubectl get pods -n $NAMESPACE -l app=auth-service
    fi
else
    echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/services/auth-service-deployment.yaml"
fi
echo ""

# Check service
echo "5. Checking Service..."
check_resource service auth-service $NAMESPACE
echo ""

# Check Istio resources
echo "6. Checking Istio Configuration..."
check_resource virtualservice auth-service $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/istio/auth-service-mesh.yaml"
check_resource destinationrule auth-service $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/istio/auth-service-mesh.yaml"
check_resource peerauthentication auth-service $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/istio/auth-service-mesh.yaml"
check_resource authorizationpolicy auth-service-authz $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/istio/auth-service-mesh.yaml"
echo ""

# Check Kong resources
echo "7. Checking Kong Configuration..."
check_resource ingress auth-service-ingress $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/gateway/kong-auth-routes.yaml"
check_resource kongplugin rate-limiting-auth $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/gateway/kong-auth-routes.yaml"
check_resource kongplugin cors-auth $NAMESPACE || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/gateway/kong-auth-routes.yaml"
echo ""

# Check monitoring
echo "8. Checking Monitoring Configuration..."
check_resource servicemonitor auth-service $MONITORING_NS || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/observability/auth-service-monitoring.yaml"
check_resource prometheusrule auth-service-alerts $MONITORING_NS || echo -e "${YELLOW}⚠${NC} Apply: kubectl apply -f k8s/observability/auth-service-monitoring.yaml"
echo ""

# Test endpoints (if pods are running)
if kubectl get deployment auth-service -n $NAMESPACE &>/dev/null; then
    echo "9. Testing Health Endpoints..."
    
    POD=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$POD" ]; then
        echo "Testing pod: $POD"
        
        # Health endpoint
        if kubectl exec -n $NAMESPACE $POD -- wget -q -O- http://localhost:8080/health &>/dev/null; then
            echo -e "${GREEN}✓${NC} /health endpoint responding"
        else
            echo -e "${RED}✗${NC} /health endpoint not responding"
        fi
        
        # Ready endpoint
        if kubectl exec -n $NAMESPACE $POD -- wget -q -O- http://localhost:8080/ready &>/dev/null; then
            echo -e "${GREEN}✓${NC} /ready endpoint responding"
        else
            echo -e "${RED}✗${NC} /ready endpoint not responding"
        fi
        
        # Metrics endpoint
        if kubectl exec -n $NAMESPACE $POD -- wget -q -O- http://localhost:8080/metrics | grep -q "http_requests_total"; then
            echo -e "${GREEN}✓${NC} /metrics endpoint exposing Prometheus metrics"
        else
            echo -e "${RED}✗${NC} /metrics endpoint not exposing metrics"
        fi
    else
        echo -e "${YELLOW}⚠${NC} No pods found for testing"
    fi
fi
echo ""

# Check Prometheus targets
echo "10. Checking Prometheus Scraping..."
echo -e "${YELLOW}⚠${NC} Manual check required: Port-forward Prometheus and verify target is up"
echo "   kubectl port-forward -n $MONITORING_NS svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo "   Visit http://localhost:9090/targets and look for auth-service"
echo ""

# Check Jaeger traces
echo "11. Checking OpenTelemetry Tracing..."
echo -e "${YELLOW}⚠${NC} Manual check required: Port-forward Jaeger and verify traces"
echo "   kubectl port-forward -n $MONITORING_NS svc/jaeger-query 16686:16686"
echo "   Visit http://localhost:16686 and select auth-service"
echo ""

echo "========================================="
echo "Validation Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "- If all checks pass, auth-service is ready"
echo "- If warnings appear, apply the suggested kubectl commands"
echo "- For manual checks, follow the port-forward instructions"
echo ""
echo "Next steps:"
echo "1. Deploy remaining services (user-management, content, assessment, analytics, ai-llm)"
echo "2. Configure service-to-service communication"
echo "3. Set up Grafana dashboards"
echo "4. Configure AlertManager notifications"
