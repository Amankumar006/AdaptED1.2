# Real-Time System Testing Guide

This guide explains how to test the entire educational platform system in real-time, from individual components to full integration testing.

## 🎯 Overview

The educational platform includes multiple testing approaches:

1. **Quick System Test** - Fast validation (1-2 minutes)
2. **Comprehensive Integration Test** - Full system validation (15+ minutes)
3. **Real-Time Monitoring Dashboard** - Live system health monitoring
4. **Performance Validation** - Phase Gate B criteria validation

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- All services running (or use auto-start scripts)
- Basic system connectivity

### Run Quick System Test

```bash
# Basic quick test (60 seconds, 10 users)
./scripts/quick-test.sh

# Custom parameters
./scripts/quick-test.sh --duration 120 --users 20 --url http://localhost:3000
```

### Run Comprehensive System Test

```bash
# Full integration test (15 minutes, 50 users)
./scripts/run-system-test.sh

# Custom load test
./scripts/run-system-test.sh --users 100 --duration 1800 --url http://localhost:3000
```

## 📊 Real-Time Monitoring

### Launch Monitoring Dashboard

1. Open `monitoring/real-time-dashboard.html` in your browser
2. The dashboard will show live system metrics
3. Use controls to adjust refresh rate and time ranges

### Dashboard Features

- **System Overview**: Health, active users, response times
- **Service Status**: Individual service health and latency
- **Performance Trends**: Real-time charts and metrics
- **User Activity**: Student/teacher activity monitoring
- **AI Metrics**: BuddyAI performance and safety metrics
- **System Resources**: CPU, memory, database usage

## 🧪 Test Types Explained

### 1. Quick System Test (`quick-system-test.js`)

**Purpose**: Fast validation of core system functionality

**What it tests**:
- Service connectivity (all microservices)
- Basic user workflows (login, lessons, assessments, AI chat)
- Load simulation with concurrent users
- Performance criteria validation

**Duration**: 1-5 minutes

**Usage**:
```bash
cd tests/integration
node quick-system-test.js --duration 60 --users 10 --url http://localhost:3000
```

### 2. Comprehensive Integration Test (`real-time-system-test.js`)

**Purpose**: Full system validation with realistic user scenarios

**What it tests**:
- End-to-end user workflows
- Concurrent user simulation (up to 100+ users)
- Cross-service integration
- Performance under sustained load
- Real user behavior patterns

**Duration**: 15-60 minutes

**Usage**:
```bash
cd tests/integration
node real-time-system-test.js --users 50 --duration 900 --url http://localhost:3000
```

### 3. Performance Validation Tests

**Phase Gate B Criteria**:
- Video performance: ≤ 3s start time
- AI guardrails: ≥ 98% pass rate
- Real-time analytics: ≤ 5s lag
- Authentication: p95 ≤ 300ms
- Assessment submission: p95 ≤ 500ms
- System availability: ≥ 99.9%

**Run individual validations**:
```bash
# Video performance
cd tests/performance
node video-validation-simple.js

# AI guardrails
cd tests/ai-safety
node ai-guardrail-validation.js

# Comprehensive validation
cd tests/performance
node comprehensive-validation.js
```

## 🔧 System Setup for Testing

### Automatic Service Startup

The test scripts can automatically start required services:

```bash
# Auto-start services and run test
./scripts/run-system-test.sh

# Skip health checks if services are already running
./scripts/run-system-test.sh --no-health-check
```

### Manual Service Startup

If you prefer to start services manually:

```bash
# Frontend services
cd student-portal && npm run dev &
cd teacher-portal && npm run dev &

# Backend services (if implemented)
cd services/auth-service && npm start &
cd services/content-service && npm start &
cd services/assessment-service && npm start &
cd services/analytics-service && npm start &
cd services/ai-service && npm start &
```

### Required Ports

- Student Portal: `3000`
- Teacher Portal: `3001`
- Auth Service: `8001`
- Content Service: `8002`
- Assessment Service: `8003`
- Analytics Service: `8004`
- AI Service: `8005`

## 📈 Understanding Test Results

### Success Criteria

**Quick Test**:
- Overall success rate ≥ 80%
- All critical workflows pass
- Performance within acceptable ranges

**Comprehensive Test**:
- System success rate ≥ 95%
- User success rate ≥ 90%
- Average response time ≤ 2s
- Peak concurrent users handled successfully

### Common Issues and Solutions

**Service Connectivity Failures**:
```bash
# Check if services are running
curl http://localhost:3000/health
curl http://localhost:8001/health

# Restart services if needed
./scripts/restart-services.sh
```

**Performance Issues**:
- High response times → Check system resources
- Low success rates → Check error logs
- Failed workflows → Verify UI elements and APIs

**Load Test Failures**:
- Increase system resources
- Optimize database connections
- Check network bandwidth

## 🎛️ Test Configuration

### Environment Variables

```bash
# Test configuration
export TEST_BASE_URL="http://localhost:3000"
export TEST_DURATION="900"
export TEST_CONCURRENT_USERS="50"
export TEST_RAMP_UP_TIME="60"

# Service endpoints
export AUTH_SERVICE_URL="http://localhost:8001"
export CONTENT_SERVICE_URL="http://localhost:8002"
export ASSESSMENT_SERVICE_URL="http://localhost:8003"
```

### Custom Test Scenarios

Create custom test scenarios by modifying the user workflows:

```javascript
// In real-time-system-test.js
this.userScenarios = [
  {
    role: 'student',
    workflow: 'custom_learning_path',
    duration: 600000,
    actions: [
      'login',
      'view_dashboard',
      'start_adaptive_lesson',
      'interact_with_ai_tutor',
      'complete_practice_problems',
      'take_formative_assessment',
      'review_progress_analytics'
    ]
  }
];
```

## 📊 Monitoring and Alerting

### Real-Time Alerts

The monitoring dashboard supports configurable alerts:

- Response time > 1000ms
- Success rate < 95%
- High concurrent user load
- Service failures

### Metrics Export

Export system metrics for analysis:

```bash
# From monitoring dashboard
# Click "Export Metrics" button

# Or programmatically
curl http://localhost:3000/api/metrics > system-metrics.json
```

### Integration with External Monitoring

The system can integrate with:
- Prometheus/Grafana
- New Relic
- DataDog
- AWS CloudWatch

## 🚨 Troubleshooting

### Common Test Failures

1. **Service Not Responding**
   ```bash
   # Check service status
   ./scripts/check-services.sh
   
   # Restart specific service
   ./scripts/restart-service.sh auth-service
   ```

2. **High Response Times**
   ```bash
   # Check system resources
   top
   free -h
   df -h
   
   # Check database connections
   ./scripts/check-db-connections.sh
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout values
   export TEST_TIMEOUT=30000
   
   # Reduce concurrent users
   ./scripts/run-system-test.sh --users 25
   ```

### Debug Mode

Enable debug logging for detailed test execution:

```bash
export DEBUG=true
export LOG_LEVEL=debug
./scripts/run-system-test.sh
```

## 📝 Test Reports

### Report Locations

- Quick test: `tests/integration/results/quick-system-test-report.json`
- Comprehensive test: `tests/integration/results/real-time-system-test-report.json`
- Performance validation: `tests/performance/results/phase-gate-b-validation.json`

### Report Analysis

```bash
# View test summary
jq '.summary' tests/integration/results/quick-system-test-report.json

# Check performance metrics
jq '.systemMetrics' tests/integration/results/real-time-system-test-report.json

# Extract recommendations
jq '.recommendations[]' tests/performance/results/phase-gate-b-validation.json
```

## 🎯 Best Practices

### Before Testing

1. Ensure all services are healthy
2. Clear caches and temporary data
3. Set up monitoring and logging
4. Prepare test data and user accounts

### During Testing

1. Monitor system resources
2. Watch for error patterns
3. Note performance degradation points
4. Collect logs for analysis

### After Testing

1. Analyze test reports
2. Document performance baselines
3. Create improvement action items
4. Update test scenarios based on findings

## 🔄 Continuous Integration

### Automated Testing Pipeline

```yaml
# .github/workflows/system-test.yml
name: System Integration Test
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  system-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Start Services
        run: ./scripts/start-all-services.sh
      - name: Run System Test
        run: ./scripts/run-system-test.sh --users 25 --duration 300
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: tests/*/results/
```

### Performance Regression Detection

Set up automated performance regression detection:

```bash
# Compare current test with baseline
./scripts/compare-performance.sh baseline.json current.json

# Alert if performance degrades > 20%
./scripts/performance-alert.sh --threshold 20
```

## 📚 Additional Resources

- [Performance Testing Best Practices](./docs/performance-testing.md)
- [Load Testing Strategies](./docs/load-testing.md)
- [Monitoring Setup Guide](./docs/monitoring-setup.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

---

## 🎉 Quick Commands Reference

```bash
# Quick system validation
./scripts/quick-test.sh

# Full integration test
./scripts/run-system-test.sh

# Performance validation
cd tests/performance && node comprehensive-validation.js

# Start monitoring dashboard
open monitoring/real-time-dashboard.html

# Check all services
./scripts/check-services.sh

# Export test results
./scripts/export-results.sh
```

For more detailed information, see the individual test documentation in the `tests/` directory.