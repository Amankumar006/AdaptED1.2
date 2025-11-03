#!/bin/bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Auth Service Deployment Script ===${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating namespace if not exists${NC}"
kubectl apply -f k8s/namespace.yaml

echo -e "${YELLOW}Step 2: Applying secrets (skipping values - populate manually)${NC}"
# Don't apply secrets automatically - they should be managed externally
echo "Note: Ensure secrets are created manually or via sealed-secrets/external-secrets"
echo "  - k8s/secrets/database-secrets.yaml"
echo "  - k8s/secrets/app-secrets.yaml"

echo -e "${YELLOW}Step 3: Deploying auth-service ConfigMap${NC}"
kubectl apply -f k8s/services/auth-service-configmap.yaml

echo -e "${YELLOW}Step 4: Deploying auth-service Deployment${NC}"
kubectl apply -f k8s/services/auth-service-deployment.yaml

echo -e "${YELLOW}Step 5: Creating Service${NC}"
kubectl apply -f k8s/services/auth-service-service.yaml

echo -e "${YELLOW}Step 6: Configuring Istio mesh policies${NC}"
kubectl apply -f k8s/istio/auth-service-mesh.yaml

echo -e "${YELLOW}Step 7: Configuring Kong ingress routes${NC}"
kubectl apply -f k8s/gateway/kong-auth-routes.yaml

echo -e "${YELLOW}Step 8: Setting up monitoring${NC}"
kubectl apply -f k8s/observability/auth-service-monitoring.yaml

echo -e "${YELLOW}Step 9: Configuring high availability${NC}"
kubectl apply -f k8s/pdb/auth-service-pdb.yaml
kubectl apply -f k8s/hpa/auth-service-hpa.yaml

echo -e "${YELLOW}Step 10: Waiting for rollout to complete${NC}"
kubectl rollout status deployment/auth-service -n educational-platform --timeout=5m

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${YELLOW}Verification steps:${NC}"
echo "1. Check pods: kubectl get pods -n educational-platform -l app=auth-service"
echo "2. Check service: kubectl get svc -n educational-platform auth-service"
echo "3. Check HPA: kubectl get hpa -n educational-platform auth-service-hpa"
echo "4. Check PDB: kubectl get pdb -n educational-platform auth-service-pdb"
echo "5. View logs: kubectl logs -n educational-platform -l app=auth-service -f"
echo "6. Run validation: ./scripts/validate-auth-service.sh"
