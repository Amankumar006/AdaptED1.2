# ADR-001: API Gateway and Ingress Strategy

## Status
Accepted

## Context

The educational platform requires a robust API gateway solution to handle:
- External traffic routing to microservices
- Rate limiting per service and user
- Authentication/authorization enforcement
- API analytics and monitoring
- Cross-origin resource sharing (CORS)
- Request/response transformations

Current state shows dual gateway layers (Istio + Kong) which creates complexity:
- Istio IngressGateway with VirtualService routing
- Kong API Gateway with declarative configuration
- Both route to the same backend services
- Unclear single entry point for external traffic

## Decision

**We will use Kong Gateway as the primary north-south traffic entry point, with Istio service mesh for east-west (inter-service) communication.**

Rationale:
1. **Kong strengths**:
   - Mature API management features (rate limiting, auth plugins, transformations)
   - Declarative configuration suitable for GitOps
   - Excellent observability with Prometheus plugin
   - Rich ecosystem of plugins for API-specific concerns
   - Better for developer-facing API management

2. **Istio strengths**:
   - Zero-trust mTLS for service-to-service communication
   - Advanced traffic management (circuit breaking, retries, timeouts)
   - Service mesh observability (distributed tracing, metrics)
   - Better for operational concerns and security between services

3. **Clear separation**:
   - Kong = North-South (external → services)
   - Istio = East-West (service → service)
   - No overlap or confusion about traffic path

## Architecture

```
                     Internet/Clients
                            |
                            ↓
                   [Load Balancer]
                            |
                            ↓
                   [Kong Gateway]
                    (north-south)
                      - Rate limiting
                      - Auth enforcement
                      - API analytics
                      - CORS
                            |
                +-----------+------------+
                |           |            |
                ↓           ↓            ↓
         [Auth Service] [Content]  [Assessment]
                |           |            |
           (Istio mTLS for inter-service calls)
                |           |            |
                ↓           ↓            ↓
         [User Service] [Analytics] [AI Service]
```

### Traffic Flow

1. **External Request**: Client → Load Balancer → Kong Gateway
2. **Kong Processing**:
   - Rate limit check
   - Authentication (JWT validation)
   - Route to appropriate service
   - Collect metrics
3. **Service Mesh**: Service-to-service calls use Istio mTLS
4. **Response**: Service → Kong → Client

## Implementation

### Kong Configuration

```yaml
# Kong routes all /api/* paths to services
routes:
  - name: auth-route
    service: auth-service
    paths: ["/api/auth"]
    
  - name: content-route
    service: content-service
    paths: ["/api/content"]
```

### Istio Configuration

```yaml
# Istio handles service-to-service communication
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT  # All inter-service calls require mTLS
```

### Service Definition

```yaml
# Each service is a standard Kubernetes Service
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  labels:
    app: auth-service
spec:
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  selector:
    app: auth-service
```

## Consequences

### Positive

- **Clear separation of concerns**: API management (Kong) vs service mesh (Istio)
- **Simplified external traffic**: Single entry point through Kong
- **Best of both worlds**: Kong for API features, Istio for security/reliability
- **Developer-friendly**: Kong provides API documentation, rate limits, etc.
- **Operations-friendly**: Istio provides zero-trust security and advanced traffic management

### Negative

- **Dual technology stack**: Team needs expertise in both Kong and Istio
- **Increased complexity**: More components to monitor and manage
- **Potential performance overhead**: Two hops (Kong → Istio sidecar → service)

### Mitigations

- Comprehensive documentation for both Kong and Istio
- Clear ownership: Platform team manages Kong/Istio, app teams focus on services
- Performance testing to validate acceptable latency
- Gradual rollout with fallback options

## Alternatives Considered

### Alternative 1: Istio-Only

Use Istio IngressGateway for all traffic.

**Pros**:
- Single technology stack
- Fewer components
- Tighter integration

**Cons**:
- Less mature API management features
- Complex configuration for API-specific concerns (rate limiting, transformations)
- Harder to expose developer-friendly API documentation

**Decision**: Rejected - Istio excels at service mesh, not API management

### Alternative 2: Kong-Only

Use Kong for both north-south and inter-service traffic.

**Pros**:
- Single gateway technology
- Simpler architecture
- Less operational overhead

**Cons**:
- No native mTLS for service-to-service communication
- Misses Istio's advanced traffic management features
- Kong plugins add complexity for every service call

**Decision**: Rejected - Kong not designed for service mesh use case

### Alternative 3: Dual Layer (Istio → Kong)

Route external traffic through Istio IngressGateway to Kong.

**Pros**:
- Istio handles TLS termination
- Kong as internal API gateway

**Cons**:
- Extra hop adds latency
- Unclear value of Istio at edge
- More complex troubleshooting

**Decision**: Rejected - Unnecessary complexity

## Migration Path

1. **Phase 1** (Current): Deploy Kong as primary ingress
   - Update Load Balancer to point to Kong Service
   - Configure Kong routes for all services
   - Remove or disable Istio IngressGateway for external traffic

2. **Phase 2**: Enable Istio for inter-service communication
   - Maintain Kong for north-south
   - Enable PeerAuthentication STRICT mode
   - Validate mTLS between services

3. **Phase 3**: Advanced features
   - Kong: Fine-tune rate limits, add custom plugins
   - Istio: Add circuit breakers, retry policies, fault injection

## Monitoring

### Kong Metrics
- Request rates per route
- Response times per service
- Rate limit violations
- Authentication failures

### Istio Metrics
- mTLS success/failure rates
- Inter-service latency
- Circuit breaker activations
- Retry attempts

### Dashboards
- Combined Kong + Istio dashboard in Grafana
- Service dependency map from Jaeger traces
- Cost breakdown per service from Kubecost

## References

- [Kong Gateway Documentation](https://docs.konghq.com/)
- [Istio Service Mesh](https://istio.io/latest/docs/)
- [Kong + Istio Integration Guide](https://konghq.com/blog/kong-istio-integration)

## Date
2025-11-02

## Participants
- Platform Architecture Team
- DevOps Team
- Security Team
