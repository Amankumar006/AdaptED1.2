# Auth Service Deployment Guide

## Overview
This guide covers deploying the auth-service to Kubernetes with full observability (Prometheus metrics + OpenTelemetry tracing).

## Prerequisites
- Kubernetes cluster with Istio service mesh
- Kong API Gateway installed
- Prometheus Operator installed (for ServiceMonitor CRD)
- OpenTelemetry Collector deployed
- Secrets created (see k8s/secrets/README.md)

## Deployment Steps

### 1. Create Secrets
```bash
# Apply database secrets
kubectl apply -f k8s/secrets/database-secrets.yaml

# Apply application secrets
kubectl apply -f k8s/secrets/app-secrets.yaml
```

### 2. Build Docker Image
```bash
cd services/auth-service

# Build the image
docker build -t educational-platform/auth-service:latest .

# Tag for your registry
docker tag educational-platform/auth-service:latest <YOUR_REGISTRY>/auth-service:latest

# Push to registry
docker push <YOUR_REGISTRY>/auth-service:latest
```

### 3. Deploy ConfigMap
```bash
kubectl apply -f k8s/services/auth-service-configmap.yaml
```

### 4. Deploy Application
```bash
# Deploy the service
kubectl apply -f k8s/services/auth-service-deployment.yaml

# Check deployment status
kubectl get pods -n educational-platform -l app=auth-service

# Watch logs
kubectl logs -f -n educational-platform -l app=auth-service
```

### 5. Configure Istio Service Mesh
```bash
# Apply Istio VirtualService, DestinationRule, and AuthorizationPolicy
kubectl apply -f k8s/istio/auth-service-mesh.yaml

# Verify mesh configuration
istioctl analyze -n educational-platform
```

### 6. Configure Kong Gateway Routes
```bash
# Apply Kong Ingress and plugins
kubectl apply -f k8s/gateway/kong-auth-routes.yaml

# Verify Kong configuration
kubectl get kongplugins -n educational-platform
kubectl get ingress -n educational-platform
```

### 7. Enable Prometheus Monitoring
```bash
# Apply ServiceMonitor and PrometheusRules
kubectl apply -f k8s/observability/auth-service-monitoring.yaml

# Verify metrics are being scraped
kubectl port-forward -n educational-platform-monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Visit http://localhost:9090 and query: up{app="auth-service"}
```

## Verification

### Health Checks
```bash
# Port-forward to service
kubectl port-forward -n educational-platform svc/auth-service 8080:80

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/live
curl http://localhost:8080/metrics
```

### Test Authentication Flow
```bash
# Through Kong Gateway
curl -X POST https://api.educational-platform.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Check Traces in Jaeger
```bash
# Port-forward Jaeger UI
kubectl port-forward -n educational-platform-monitoring svc/jaeger-query 16686:16686

# Visit http://localhost:16686
# Select "auth-service" from service dropdown
```

### View Prometheus Metrics
```bash
# Sample queries
up{app="auth-service"}
rate(http_requests_total{app="auth-service"}[5m])
http_request_duration_seconds{app="auth-service",quantile="0.95"}
auth_success_total
auth_failure_total
```

### Check Grafana Dashboards
```bash
# Port-forward Grafana
kubectl port-forward -n educational-platform-monitoring svc/grafana 3000:3000

# Visit http://localhost:3000
# Default credentials: admin / prom-operator
```

## Traffic Flow

```
Internet/Users
    ↓
Kong API Gateway (North-South)
    ↓ (TLS termination, rate limiting, CORS)
Istio Service Mesh (East-West)
    ↓ (mTLS, circuit breaking, retries)
Auth Service Pods (3 replicas)
    ↓
PostgreSQL (auth data)
    ↓
Redis (sessions, tokens)
```

## Observability Stack

### Metrics
- **Prometheus** scrapes `/metrics` every 15s
- **Custom metrics**: `auth_success_total`, `auth_failure_total`
- **HTTP metrics**: request duration, request count, errors
- **Default metrics**: CPU, memory, heap, GC

### Traces
- **OpenTelemetry SDK** auto-instruments Express, HTTP, Redis
- **OTLP Exporter** sends traces to OTel Collector (port 4318)
- **Jaeger** stores and visualizes distributed traces
- **Correlation**: trace_id propagated via HTTP headers

### Logs
- **Structured JSON** logs to stdout
- **Correlation**: includes trace_id, span_id
- **Levels**: error, warn, info, debug

### Alerts
- High error rate (>5%)
- High auth failure rate (>20%)
- High latency (p95 > 1s)
- Pod down (< 2 replicas)
- Memory/CPU usage (>90%)

## Scaling

### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service
  namespace: educational-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod -n educational-platform -l app=auth-service
kubectl logs -n educational-platform -l app=auth-service --previous
```

### No metrics in Prometheus
```bash
# Check ServiceMonitor
kubectl get servicemonitor -n educational-platform-monitoring auth-service -o yaml

# Check Prometheus targets
kubectl port-forward -n educational-platform-monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Visit http://localhost:9090/targets
```

### No traces in Jaeger
```bash
# Check OTel Collector logs
kubectl logs -n educational-platform-monitoring deployment/otel-collector

# Verify OTEL_EXPORTER_OTLP_ENDPOINT is correct
kubectl get pods -n educational-platform -l app=auth-service -o yaml | grep OTEL
```

### Istio mTLS issues
```bash
# Check peer authentication
kubectl get peerauthentication -n educational-platform

# Verify certificates
istioctl proxy-config secret -n educational-platform deploy/auth-service
```

## Next Steps
1. Deploy user-management-service following the same pattern
2. Deploy content-management-service
3. Deploy assessment-engine-service
4. Deploy learning-analytics-service
5. Deploy ai-llm-service
6. Wire services together via Istio routing
7. Set up centralized logging (Loki/ELK)
8. Configure distributed tracing sampling
9. Create Grafana dashboards
10. Set up AlertManager for notifications
