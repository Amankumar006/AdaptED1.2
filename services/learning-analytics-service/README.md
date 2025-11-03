# Learning Analytics Service

A comprehensive, scalable learning analytics service that provides real-time event processing, predictive analytics, multi-level dashboards, and custom reporting for educational platforms.

## Features

### 🚀 Real-Time Analytics Processing
- **Event Streaming**: Kafka-based event ingestion with horizontal scaling
- **Real-Time Metrics**: Sub-5-second processing SLO for learning events
- **Multi-Level Aggregations**: Micro (individual), meso (classroom), and macro (institutional) analytics
- **Distributed Processing**: Handles unlimited concurrent users with auto-scaling

### 🤖 Predictive Analytics & ML
- **Multiple Model Types**: Risk prediction, engagement forecasting, performance prediction, and content recommendation
- **Adaptive Learning**: Personalized learning paths based on ML-driven insights
- **Recommendation Engine**: Context-aware content and activity recommendations
- **Model Performance Tracking**: Continuous accuracy monitoring and retraining

### 📊 Multi-Level Dashboards
- **Micro-Level**: Individual student analytics with personalized insights
- **Meso-Level**: Classroom and cohort analytics for educators
- **Macro-Level**: Institutional analytics for administrators
- **Real-Time Updates**: Live dashboard updates with configurable refresh rates

### 📋 Custom Reporting & Export
- **Flexible Report Builder**: Create custom reports with various visualization types
- **Multiple Export Formats**: CSV, XLSX, JSON, and PDF export capabilities
- **Scheduled Reports**: Automated report generation and delivery
- **Large Dataset Support**: Handles exports of 100K+ records efficiently

### 🔒 Data Privacy & Compliance
- **GDPR/FERPA/COPPA Compliance**: Built-in privacy controls and data protection
- **Data Lifecycle Management**: Automated archival, anonymization, and deletion
- **Data Quality Monitoring**: Continuous data quality assessment and alerts
- **Audit Trails**: Comprehensive logging for compliance reporting

### ⚡ Performance & Monitoring
- **SLO Monitoring**: Real-time tracking of service level objectives
- **Performance Metrics**: Detailed performance monitoring and alerting
- **Auto-Scaling**: Kubernetes-based horizontal scaling
- **Health Checks**: Comprehensive system health monitoring

## Architecture

### Microservices Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Analytics Service               │
├─────────────────────────────────────────────────────────────┤
│  Real-Time Analytics  │  Predictive Analytics  │  Dashboard │
│  • Event Processing   │  • ML Models           │  • Multi-  │
│  • Metrics Calc.      │  • Predictions         │    Level   │
│  • Aggregations       │  • Recommendations     │  • Widgets │
├─────────────────────────────────────────────────────────────┤
│  Reporting Service    │  Data Lifecycle        │  Monitoring│
│  • Custom Reports     │  • Archival Policies   │  • SLO     │
│  • Export Formats     │  • Data Minimization   │  • Alerts  │
│  • Scheduling         │  • Quality Checks      │  • Health  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Learning Events → Kafka → Real-Time Processing → Database/Cache
                    ↓
              ML Models ← Training Data ← Historical Events
                    ↓
            Predictions → Recommendations → Dashboards
                    ↓
              Reports → Exports → Scheduled Delivery
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Apache Kafka 2.8+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd services/learning-analytics-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Start the service
npm run dev
```

### Docker Setup

```bash
# Build the service
docker build -t learning-analytics-service .

# Run with docker-compose
docker-compose up -d
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Performance metrics
- `GET /api/v1/monitoring/dashboard` - Monitoring dashboard

### Dashboards
- `GET /api/v1/dashboards/micro/:userId` - Individual student dashboard
- `GET /api/v1/dashboards/meso/:entityId` - Classroom/course dashboard
- `GET /api/v1/dashboards/macro/:organizationId` - Institutional dashboard

### Predictions & Recommendations
- `GET /api/v1/predictions/:userId` - Get user predictions
- `GET /api/v1/recommendations/:userId` - Get personalized recommendations

### Reports & Exports
- `GET /api/v1/reports` - List reports
- `POST /api/v1/reports` - Create new report
- `POST /api/v1/reports/:reportId/generate` - Generate report
- `POST /api/v1/exports` - Create data export
- `GET /api/v1/exports/:exportId` - Get export status

### Models
- `GET /api/v1/models` - List ML models
- `POST /api/v1/models/:modelId/train` - Train model

## Configuration

### Environment Variables

```bash
# Server
PORT=3007
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=learning_analytics
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPICS=learning-events,user-events,content-events

# Analytics
ANALYTICS_BATCH_SIZE=1000
REAL_TIME_LAG_THRESHOLD=5000
DATA_RETENTION_DAYS=365

# ML
ML_MODEL_UPDATE_INTERVAL=86400000
PREDICTION_CONFIDENCE_THRESHOLD=0.7
```

### SLO Configuration

The service monitors several key SLOs:

- **Real-time Processing Lag**: ≤ 5 seconds
- **API Response Time P95**: ≤ 2 seconds
- **Dashboard Generation**: ≤ 30 seconds
- **Report Generation**: ≤ 60 seconds
- **Data Quality Score**: ≥ 95%
- **System Availability**: ≥ 99.9%
- **Error Rate**: ≤ 1%
- **Prediction Accuracy**: ≥ 70%

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Performance Tests
```bash
npm run test:performance
```

### Pilot Validation
```bash
npm run test:pilot
```

## Deployment

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learning-analytics-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learning-analytics-service
  template:
    metadata:
      labels:
        app: learning-analytics-service
    spec:
      containers:
      - name: learning-analytics-service
        image: learning-analytics-service:latest
        ports:
        - containerPort: 3007
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### Scaling Configuration

The service supports horizontal scaling:

- **Event Processing**: Auto-scales based on Kafka lag
- **API Endpoints**: Auto-scales based on CPU/memory usage
- **ML Training**: Scales based on training queue length
- **Report Generation**: Scales based on export queue length

## Monitoring & Alerting

### Metrics Collection

The service exposes metrics in Prometheus format:

- `analytics_events_processed_total` - Total events processed
- `analytics_processing_time_seconds` - Event processing time
- `analytics_api_response_time_seconds` - API response times
- `analytics_model_accuracy` - ML model accuracy scores
- `analytics_data_quality_score` - Data quality metrics

### Alerting Rules

Key alerts configured:

- **High Processing Lag**: When real-time lag > 5 seconds
- **API Latency**: When P95 response time > 2 seconds
- **Model Accuracy Drop**: When accuracy < 70%
- **Data Quality Issues**: When quality score < 95%
- **System Errors**: When error rate > 1%

## Data Privacy & Compliance

### GDPR Compliance

- **Right to Access**: API endpoints for data export
- **Right to Rectification**: Data update capabilities
- **Right to Erasure**: Automated data deletion
- **Data Portability**: Multiple export formats
- **Privacy by Design**: Built-in anonymization

### FERPA Compliance

- **Educational Records Protection**: Secure data handling
- **Directory Information**: Configurable data sharing
- **Parental Rights**: Guardian access controls
- **Audit Trails**: Comprehensive access logging

### Data Lifecycle Management

- **Automated Archival**: Configurable retention policies
- **Data Minimization**: Automatic anonymization rules
- **Quality Monitoring**: Continuous data quality checks
- **Compliance Reporting**: Automated compliance reports

## Performance Benchmarks

### Throughput
- **Event Processing**: 1000+ events/second
- **API Requests**: 500+ requests/second
- **Dashboard Generation**: 10+ dashboards/second
- **Report Generation**: 5+ reports/minute

### Latency
- **Event Processing**: < 100ms average
- **API Response**: < 500ms P95
- **Dashboard Load**: < 2 seconds
- **Report Generation**: < 30 seconds

### Scalability
- **Concurrent Users**: 10,000+
- **Data Volume**: 100M+ events/day
- **Storage**: Multi-TB datasets
- **Geographic**: Multi-region deployment

## Troubleshooting

### Common Issues

1. **High Processing Lag**
   - Check Kafka consumer lag
   - Verify database connection pool
   - Monitor Redis memory usage

2. **Dashboard Timeout**
   - Check data volume in time range
   - Verify aggregation cache status
   - Monitor database query performance

3. **Model Training Failures**
   - Verify training data availability
   - Check memory allocation
   - Monitor training job status

4. **Export Failures**
   - Check disk space availability
   - Verify export format support
   - Monitor export queue length

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

Monitor service health:

```bash
curl http://localhost:3007/health
curl http://localhost:3007/metrics
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage > 90%
- Document all public APIs
- Follow semantic versioning
- Update CHANGELOG.md

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting guide
- Review the API documentation
- Contact the development team

---

**Learning Analytics Service** - Empowering education through intelligent analytics and insights.