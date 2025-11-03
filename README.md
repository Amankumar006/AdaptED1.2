# Educational Platform - Foundational Infrastructure

This repository contains the foundational infrastructure setup for the Educational Platform, a comprehensive, scalable, and modern educational system designed to support diverse learning communities.

## 🏗️ Architecture Overview

The platform is built on a microservices architecture with the following core components:

### Infrastructure Components

- **Container Orchestration**: Kubernetes with Docker containerization
- **Service Mesh**: Istio for mTLS, traffic management, and observability
- **API Gateway**: Kong for rate limiting, routing, and API management
- **Databases**: 
  - PostgreSQL cluster (primary-replica) for relational data
  - MongoDB cluster with replica sets for document storage
  - Redis cluster for caching and session management
- **Event Streaming**: Apache Kafka for inter-service communication
- **Observability**: OpenTelemetry, Prometheus, Grafana, and Jaeger
- **Cost Monitoring**: Kubecost for resource usage and budget tracking

### Security Features

- **Zero-Trust Architecture**: mTLS-by-default communication
- **Network Policies**: Istio security policies for service isolation
- **Resource Limits**: Kubernetes resource quotas and limits
- **Monitoring**: Comprehensive security and performance monitoring

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose (for local development)
- Kubernetes cluster (for production deployment)
- kubectl configured to access your cluster
- Istio installed on your Kubernetes cluster

### Local Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd educational-platform
   ```

2. **Deploy infrastructure**
   ```bash
   chmod +x scripts/deploy-docker-compose.sh
   ./scripts/deploy-docker-compose.sh
   ```

3. **Access services**
   - Grafana Dashboard: http://localhost:3000 (admin/admin)
   - Jaeger Tracing: http://localhost:16686
   - Prometheus: http://localhost:9090
   - API Gateway: http://localhost:8000
   - Kong Admin: http://localhost:8001

### Production Deployment on Kubernetes

1. **Ensure Istio is installed**
   ```bash
   istioctl install --set values.defaultRevision=default
   ```

2. **Deploy infrastructure**
   ```bash
   chmod +x scripts/deploy-infrastructure.sh
   ./scripts/deploy-infrastructure.sh
   ```

3. **Verify deployment**
   ```bash
   kubectl get pods -n educational-platform
   kubectl get pods -n educational-platform-data
   kubectl get pods -n educational-platform-monitoring
   ```

## 📊 Monitoring and Observability

### Dashboards

The infrastructure includes pre-configured Grafana dashboards for:

- **Kubernetes Overview**: Cluster resource utilization, pod status
- **Services Overview**: Request rates, response times, error rates
- **Database Monitoring**: PostgreSQL, MongoDB, and Redis metrics
- **Cost Analysis**: Resource usage and budget tracking

### Alerting

Prometheus alerting rules are configured for:

- High error rates (>10% for 5 minutes)
- High latency (95th percentile >500ms)
- Database connection issues
- Memory and CPU usage thresholds
- Pod crash loops

### Tracing

Jaeger provides distributed tracing for:

- Request flow across microservices
- Performance bottleneck identification
- Error propagation tracking

## 🔒 Security Configuration

### Service Mesh Security

- **mTLS**: Automatic mutual TLS between all services
- **Authorization Policies**: Fine-grained access control
- **Network Policies**: Traffic isolation and security

### API Gateway Security

- **Rate Limiting**: Per-service rate limits
- **CORS**: Cross-origin resource sharing configuration
- **Request ID**: Distributed request tracking

## 💰 Cost Management

### Budget Controls

- **Resource Quotas**: Namespace-level resource limits
- **Budget Alerts**: Automated cost threshold notifications
- **Usage Tracking**: Per-service and per-namespace cost analysis

### Optimization

- **Auto-scaling**: Horizontal pod autoscaling based on metrics
- **Resource Limits**: Container-level CPU and memory limits
- **Storage Optimization**: Persistent volume claim management

## 🗄️ Database Configuration

### PostgreSQL Cluster

- **Primary-Replica Setup**: High availability configuration
- **Connection Pooling**: Optimized connection management
- **Backup Strategy**: Automated backup and recovery

### MongoDB Cluster

- **Replica Set**: 3-node replica set for high availability
- **Sharding Ready**: Prepared for horizontal scaling
- **Index Optimization**: Performance-optimized indexes

### Redis Cluster

- **6-Node Cluster**: High availability and performance
- **Persistence**: RDB and AOF persistence enabled
- **Memory Optimization**: Optimized memory usage policies

## 📨 Event Streaming

### Kafka Configuration

- **Topics**: Pre-configured topics for each service domain
- **Partitioning**: Optimized partition strategy
- **Retention**: Configurable message retention policies

### Event Schema

- **User Events**: Authentication, profile changes
- **Content Events**: Content creation, updates, access
- **Assessment Events**: Submissions, grading, results
- **Analytics Events**: Learning interactions, progress
- **Gamification Events**: Achievements, points, badges
- **Notification Events**: Alerts, messages, reminders

## 🔧 Configuration Management

### Environment Variables

Key configuration parameters:

```bash
# Database Connections
POSTGRES_PRIMARY_URL=postgresql://postgres:password@postgres-primary:5432/educational_platform
POSTGRES_REPLICA_URL=postgresql://postgres:password@postgres-replica:5432/educational_platform
MONGODB_URL=mongodb://admin:password@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/educational_platform?replicaSet=rs0
REDIS_CLUSTER_URLS=redis://redis-node1:7001,redis://redis-node2:7002,redis://redis-node3:7003

# Event Streaming
KAFKA_BROKERS=kafka:9092

# Observability
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
PROMETHEUS_URL=http://prometheus:9090
```

### Secrets Management

- Database passwords stored in Kubernetes secrets
- API keys and tokens managed through secret management
- TLS certificates automated through cert-manager

## 🚦 Health Checks and Readiness

### Service Health Endpoints

All services expose standard health check endpoints:

- `/health` - Basic health check
- `/ready` - Readiness probe
- `/metrics` - Prometheus metrics

### Monitoring Probes

- **Liveness Probes**: Automatic container restart on failure
- **Readiness Probes**: Traffic routing based on service readiness
- **Startup Probes**: Graceful startup for slow-starting services

## 📈 Scaling Configuration

### Horizontal Pod Autoscaling

```yaml
# Example HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: service-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Pod Autoscaling

VPA recommendations for optimal resource allocation based on historical usage patterns.

## 🔄 Backup and Recovery

### Database Backups

- **PostgreSQL**: Automated pg_dump with point-in-time recovery
- **MongoDB**: Replica set backup with mongodump
- **Redis**: RDB snapshots with configurable intervals

### Disaster Recovery

- **RTO Target**: 15 minutes for critical services
- **RPO Target**: 5 minutes maximum data loss
- **Backup Retention**: 30 days for operational backups, 1 year for compliance

## 📚 Next Steps

After the infrastructure is deployed, you can proceed with:

1. **Microservice Development**: Implement individual services
2. **Frontend Applications**: Deploy teacher and student portals
3. **Mobile Applications**: Deploy cross-platform mobile apps
4. **Integration Testing**: End-to-end testing across services
5. **Performance Optimization**: Load testing and optimization
6. **Security Hardening**: Security scanning and penetration testing

## 🤝 Contributing

Please refer to the project's contribution guidelines for development practices and code standards.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting guide
- Review the monitoring dashboards for system health

---

**Note**: This infrastructure setup provides the foundation for a scalable educational platform. Ensure proper security configurations and monitoring are in place before deploying to production environments.# AdaptED1.2
