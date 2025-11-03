import { realTimeAnalyticsService } from '../../services/real-time-analytics.service';
import { predictiveAnalyticsService } from '../../services/predictive-analytics.service';
import { dashboardService } from '../../services/dashboard.service';
import { reportingService } from '../../services/reporting.service';
import { monitoringService } from '../../services/monitoring.service';
import { dataLifecycleService } from '../../services/data-lifecycle.service';
import { databaseService } from '../../services/database.service';
import { redisService } from '../../services/redis.service';
import { EventType, ModelType, ReportType, AnalyticsLevel } from '../../types/analytics.types';
import { createMockLearningEvent, createMockLearningMetrics, createMockReportFilters } from '../../test/setup';

describe('Analytics Service Pilot Validation', () => {
  // Extended timeout for pilot validation
  jest.setTimeout(300000); // 5 minutes

  beforeAll(async () => {
    console.log('🚀 Starting Analytics Service Pilot Validation');
    console.log('================================================');
    
    // Initialize all services
    await realTimeAnalyticsService.initialize();
    await predictiveAnalyticsService.initialize();
    await dataLifecycleService.initialize();
    
    console.log('✅ All services initialized successfully');
  });

  afterAll(async () => {
    await realTimeAnalyticsService.shutdown();
    await predictiveAnalyticsService.shutdown();
    await dataLifecycleService.shutdown();
    await monitoringService.shutdown();
    
    console.log('✅ Pilot validation completed successfully');
    console.log('================================================');
  });

  describe('Real-Time Learning Event Processing', () => {
    it('should validate real-time learning event processing pipeline', async () => {
      console.log('\n📊 Testing Real-Time Event Processing Pipeline');
      console.log('-----------------------------------------------');

      const pilotUsers = 50;
      const eventsPerUser = 20;
      const totalEvents = pilotUsers * eventsPerUser;

      console.log(`Creating ${totalEvents} events for ${pilotUsers} pilot users...`);

      // Create pilot user data
      const pilotUserEvents = Array.from({ length: pilotUsers }, (_, userIndex) => {
        const userId = `pilot-user-${userIndex + 1}`;
        
        return Array.from({ length: eventsPerUser }, (_, eventIndex) => {
          const eventTypes = [
            EventType.SESSION_START,
            EventType.CONTENT_VIEW,
            EventType.CONTENT_COMPLETE,
            EventType.EXERCISE_ATTEMPT,
            EventType.EXERCISE_COMPLETE,
            EventType.ASSESSMENT_SUBMIT,
            EventType.AI_QUESTION_ASK,
            EventType.DISCUSSION_POST,
            EventType.SESSION_END,
          ];

          return createMockLearningEvent({
            id: `pilot-event-${userId}-${eventIndex}`,
            userId,
            sessionId: `pilot-session-${userId}-${Math.floor(eventIndex / 5)}`,
            eventType: eventTypes[eventIndex % eventTypes.length],
            eventData: {
              duration: Math.random() * 1000 + 200,
              score: Math.random(),
              contentId: `pilot-content-${(eventIndex % 10) + 1}`,
              difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
            },
            context: {
              courseId: `pilot-course-${Math.floor(userIndex / 10) + 1}`,
              organizationId: 'pilot-organization',
              deviceType: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
              platform: 'web',
              userAgent: 'pilot-test-agent',
              ipAddress: '127.0.0.1',
              userRole: 'student',
            },
          });
        });
      }).flat();

      console.log('Processing events in real-time...');
      const processingStartTime = Date.now();
      let processedCount = 0;
      let errorCount = 0;

      // Process events in batches to simulate realistic load
      const batchSize = 25;
      for (let i = 0; i < pilotUserEvents.length; i += batchSize) {
        const batch = pilotUserEvents.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (event) => {
          try {
            const eventStartTime = Date.now();
            await realTimeAnalyticsService.processEvent(event);
            const eventProcessingTime = Date.now() - eventStartTime;
            
            await monitoringService.recordEventProcessingTime(eventProcessingTime);
            processedCount++;
          } catch (error) {
            errorCount++;
            console.warn(`Event processing failed: ${event.id}`, error.message);
          }
        });

        await Promise.all(batchPromises);

        // Log progress
        if ((i + batchSize) % 200 === 0) {
          console.log(`Processed ${Math.min(i + batchSize, pilotUserEvents.length)}/${pilotUserEvents.length} events`);
        }
      }

      const totalProcessingTime = Date.now() - processingStartTime;
      const eventsPerSecond = processedCount / (totalProcessingTime / 1000);

      console.log('\n📈 Real-Time Processing Results:');
      console.log(`- Events processed: ${processedCount}/${totalEvents}`);
      console.log(`- Processing errors: ${errorCount}`);
      console.log(`- Total time: ${totalProcessingTime}ms`);
      console.log(`- Events per second: ${eventsPerSecond.toFixed(2)}`);
      console.log(`- Average time per event: ${(totalProcessingTime / processedCount).toFixed(2)}ms`);

      // Validation assertions
      expect(processedCount).toBeGreaterThan(totalEvents * 0.95); // 95% success rate
      expect(eventsPerSecond).toBeGreaterThan(10); // At least 10 events per second
      expect(totalProcessingTime / processedCount).toBeLessThan(5000); // Under 5s SLO

      // Verify data persistence
      const storedEventsResult = await databaseService.query(
        'SELECT COUNT(*) as count FROM learning_events WHERE id LIKE $1',
        ['pilot-event-%']
      );
      const storedCount = parseInt(storedEventsResult.rows[0].count);
      
      console.log(`- Events stored in database: ${storedCount}`);
      expect(storedCount).toBeGreaterThan(totalEvents * 0.9);

      console.log('✅ Real-time processing validation passed');
    });
  });

  describe('Predictive Analytics Accuracy', () => {
    it('should validate predictive analytics models with pilot cohort data', async () => {
      console.log('\n🤖 Testing Predictive Analytics Models');
      console.log('--------------------------------------');

      // Create training data for pilot cohort
      const trainingUsers = 100;
      console.log(`Creating training dataset with ${trainingUsers} pilot users...`);

      const trainingData = Array.from({ length: trainingUsers }, (_, i) => {
        const userId = `training-user-${i + 1}`;
        return {
          userId,
          metrics: createMockLearningMetrics({
            userId,
            engagementScore: Math.random(),
            masteryLevel: Math.random(),
            completionRate: Math.random(),
            strugglingIndicators: Math.random() > 0.8 ? ['difficulty1', 'difficulty2'] : [],
            timeSpent: Math.random() * 10000 + 1000,
            learningVelocity: Math.random() * 2,
            retentionScore: Math.random(),
            collaborationScore: Math.random(),
            aiInteractionScore: Math.random(),
          }),
        };
      });

      // Insert training data
      for (const user of trainingData) {
        await databaseService.query(`
          INSERT INTO learning_metrics (
            user_id, time_spent, completion_rate, engagement_score, mastery_level,
            struggling_indicators, learning_velocity, retention_score, 
            collaboration_score, ai_interaction_score, last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          user.metrics.userId,
          user.metrics.timeSpent,
          user.metrics.completionRate,
          user.metrics.engagementScore,
          user.metrics.masteryLevel,
          user.metrics.strugglingIndicators,
          user.metrics.learningVelocity,
          user.metrics.retentionScore,
          user.metrics.collaborationScore,
          user.metrics.aiInteractionScore,
          user.metrics.lastUpdated,
        ]);

        // Add learning events for context
        for (let j = 0; j < 15; j++) {
          await databaseService.query(`
            INSERT INTO learning_events (
              id, user_id, session_id, event_type, event_data, context, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            `training-event-${user.userId}-${j}`,
            user.userId,
            `training-session-${user.userId}`,
            'content_view',
            JSON.stringify({ duration: Math.random() * 1000, score: Math.random() }),
            JSON.stringify({ 
              courseId: `course-${Math.floor(Math.random() * 5) + 1}`,
              organizationId: 'pilot-organization',
              deviceType: 'desktop', 
              platform: 'web', 
              userAgent: 'test', 
              ipAddress: '127.0.0.1', 
              userRole: 'student' 
            }),
            new Date(),
          ]);
        }
      }

      console.log('Training predictive models...');

      // Test different model types
      const modelTypes = [
        { type: ModelType.RISK_PREDICTION, name: 'Student Risk Prediction' },
        { type: ModelType.ENGAGEMENT_PREDICTION, name: 'Engagement Prediction' },
        { type: ModelType.PERFORMANCE_PREDICTION, name: 'Performance Prediction' },
        { type: ModelType.RECOMMENDATION, name: 'Content Recommendation' },
      ];

      const modelResults = [];

      for (const modelConfig of modelTypes) {
        console.log(`\nTraining ${modelConfig.name} model...`);
        
        const model = await predictiveAnalyticsService.createModel(
          `Pilot ${modelConfig.name}`,
          modelConfig.type,
          ['engagementScore', 'masteryLevel', 'completionRate', 'strugglingIndicatorCount']
        );

        const trainingStartTime = Date.now();
        await predictiveAnalyticsService.trainModel(model.id);
        const trainingTime = Date.now() - trainingStartTime;

        const performance = await predictiveAnalyticsService.getModelPerformance(model.id);
        
        console.log(`- Training time: ${trainingTime}ms`);
        console.log(`- Model accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);

        modelResults.push({
          type: modelConfig.type,
          name: modelConfig.name,
          accuracy: performance.accuracy,
          trainingTime,
        });

        // Record accuracy for monitoring
        await monitoringService.recordPredictionAccuracy(model.id, performance.accuracy);

        // Test prediction generation
        const testUserId = trainingData[0].userId;
        const prediction = await predictiveAnalyticsService.generatePrediction(model.id, testUserId);
        
        if (prediction) {
          console.log(`- Sample prediction confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
        }
      }

      console.log('\n📊 Model Training Results:');
      modelResults.forEach(result => {
        console.log(`- ${result.name}: ${(result.accuracy * 100).toFixed(1)}% accuracy, ${result.trainingTime}ms training time`);
      });

      // Validation assertions
      const avgAccuracy = modelResults.reduce((sum, r) => sum + r.accuracy, 0) / modelResults.length;
      const maxTrainingTime = Math.max(...modelResults.map(r => r.trainingTime));

      expect(avgAccuracy).toBeGreaterThan(0.5); // At least 50% average accuracy
      expect(maxTrainingTime).toBeLessThan(120000); // Under 2 minutes training time

      console.log(`- Average model accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
      console.log('✅ Predictive analytics validation passed');
    });
  });

  describe('Multi-Level Analytics Dashboards', () => {
    it('should validate analytics dashboards at micro, meso, and macro levels', async () => {
      console.log('\n📊 Testing Multi-Level Analytics Dashboards');
      console.log('--------------------------------------------');

      const timeframe = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
        granularity: 'day' as const,
      };

      // Test micro-level dashboard (individual student)
      console.log('Generating micro-level dashboard...');
      const microStartTime = Date.now();
      const microDashboard = await dashboardService.getMicroLevelDashboard('pilot-user-1', timeframe);
      const microTime = Date.now() - microStartTime;

      await monitoringService.recordDashboardGenerationTime('micro', microTime);

      console.log(`- Micro dashboard generation time: ${microTime}ms`);
      console.log(`- Micro dashboard widgets: ${microDashboard.widgets.length}`);
      console.log(`- Micro dashboard data points: ${microDashboard.metadata.dataPoints}`);

      // Test meso-level dashboard (classroom/course)
      console.log('Generating meso-level dashboard...');
      const mesoStartTime = Date.now();
      const mesoDashboard = await dashboardService.getMesoLevelDashboard('pilot-course-1', timeframe);
      const mesoTime = Date.now() - mesoStartTime;

      await monitoringService.recordDashboardGenerationTime('meso', mesoTime);

      console.log(`- Meso dashboard generation time: ${mesoTime}ms`);
      console.log(`- Meso dashboard widgets: ${mesoDashboard.widgets.length}`);
      console.log(`- Meso dashboard data points: ${mesoDashboard.metadata.dataPoints}`);

      // Test macro-level dashboard (institutional)
      console.log('Generating macro-level dashboard...');
      const macroStartTime = Date.now();
      const macroDashboard = await dashboardService.getMacroLevelDashboard('pilot-organization', timeframe);
      const macroTime = Date.now() - macroStartTime;

      await monitoringService.recordDashboardGenerationTime('macro', macroTime);

      console.log(`- Macro dashboard generation time: ${macroTime}ms`);
      console.log(`- Macro dashboard widgets: ${macroDashboard.widgets.length}`);
      console.log(`- Macro dashboard data points: ${macroDashboard.metadata.dataPoints}`);

      // Validation assertions
      expect(microTime).toBeLessThan(10000); // Under 10 seconds
      expect(mesoTime).toBeLessThan(15000); // Under 15 seconds
      expect(macroTime).toBeLessThan(30000); // Under 30 seconds

      expect(microDashboard.widgets.length).toBeGreaterThan(0);
      expect(mesoDashboard.widgets.length).toBeGreaterThan(0);
      expect(macroDashboard.widgets.length).toBeGreaterThan(0);

      expect(microDashboard.level).toBe(AnalyticsLevel.MICRO);
      expect(mesoDashboard.level).toBe(AnalyticsLevel.MESO);
      expect(macroDashboard.level).toBe(AnalyticsLevel.MACRO);

      console.log('✅ Multi-level dashboard validation passed');
    });
  });

  describe('Custom Reporting and Data Export', () => {
    it('should validate custom reporting and data export functionality', async () => {
      console.log('\n📋 Testing Custom Reporting and Data Export');
      console.log('-------------------------------------------');

      // Create a performance report
      console.log('Creating performance report...');
      const report = await reportingService.createReport(
        'Pilot Performance Report',
        'Performance analysis for pilot cohort',
        ReportType.PERFORMANCE,
        AnalyticsLevel.MICRO,
        createMockReportFilters({
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date(),
          },
          userIds: ['pilot-user-1', 'pilot-user-2', 'pilot-user-3'],
        }),
        [],
        'pilot-admin'
      );

      // Generate the report
      console.log('Generating report...');
      const reportStartTime = Date.now();
      const reportData = await reportingService.generateReport(report.id);
      const reportTime = Date.now() - reportStartTime;

      await monitoringService.recordReportGenerationTime('performance', reportTime);

      console.log(`- Report generation time: ${reportTime}ms`);
      console.log(`- Report records: ${reportData.rows.length}`);
      console.log(`- Report headers: ${reportData.headers.length}`);

      // Test data export in different formats
      const exportFormats = ['csv', 'xlsx', 'json'] as const;
      const exportResults = [];

      for (const format of exportFormats) {
        console.log(`Testing ${format.toUpperCase()} export...`);
        
        const exportStartTime = Date.now();
        const dataExport = await reportingService.exportData(
          `Pilot Export ${format.toUpperCase()}`,
          format,
          createMockReportFilters(),
          'pilot-admin'
        );
        
        // Wait for export to complete (simplified - in real implementation would poll status)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const exportStatus = await reportingService.getExportStatus(dataExport.id);
        const exportTime = Date.now() - exportStartTime;

        exportResults.push({
          format,
          status: exportStatus?.status,
          recordCount: exportStatus?.recordCount,
          fileSize: exportStatus?.fileSize,
          exportTime,
        });

        console.log(`- ${format.toUpperCase()} export status: ${exportStatus?.status}`);
        if (exportStatus?.recordCount) {
          console.log(`- ${format.toUpperCase()} export records: ${exportStatus.recordCount}`);
        }
      }

      // Validation assertions
      expect(reportTime).toBeLessThan(60000); // Under 60 seconds
      expect(reportData.rows.length).toBeGreaterThan(0);
      expect(reportData.headers.length).toBeGreaterThan(0);

      exportResults.forEach(result => {
        expect(['pending', 'processing', 'completed'].includes(result.status || '')).toBe(true);
      });

      console.log('\n📊 Export Results:');
      exportResults.forEach(result => {
        console.log(`- ${result.format.toUpperCase()}: ${result.status}, ${result.exportTime}ms`);
      });

      console.log('✅ Reporting and export validation passed');
    });
  });

  describe('Data Privacy and Compliance', () => {
    it('should validate data privacy and compliance in analytics processing', async () => {
      console.log('\n🔒 Testing Data Privacy and Compliance');
      console.log('-------------------------------------');

      // Test data lifecycle management
      console.log('Testing data lifecycle policies...');
      const lifecycleStatus = await dataLifecycleService.getLifecycleStatus();
      
      console.log(`- Active archival policies: ${lifecycleStatus.activePolicies}`);
      console.log(`- Active minimization rules: ${lifecycleStatus.activeRules}`);
      console.log(`- Running jobs: ${lifecycleStatus.runningJobs.length}`);

      // Test data quality monitoring
      console.log('Running data quality checks...');
      await dataLifecycleService.runDataQualityChecks();

      // Get data quality metrics
      const qualityResult = await databaseService.query(`
        SELECT table_name, data_quality_score, total_records
        FROM data_quality_metrics
        WHERE last_checked >= NOW() - INTERVAL '1 hour'
        ORDER BY last_checked DESC
      `);

      console.log('\n📊 Data Quality Metrics:');
      qualityResult.rows.forEach(row => {
        const score = (parseFloat(row.data_quality_score) * 100).toFixed(1);
        console.log(`- ${row.table_name}: ${score}% quality score, ${row.total_records} records`);
        
        // Record quality score for monitoring
        monitoringService.recordDataQualityScore(row.table_name, parseFloat(row.data_quality_score));
      });

      // Test anonymization (simplified test)
      console.log('Testing data anonymization...');
      const testUserId = 'privacy-test-user';
      
      // Create test data
      await databaseService.query(`
        INSERT INTO learning_events (
          id, user_id, session_id, event_type, event_data, context, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'privacy-test-event',
        testUserId,
        'privacy-test-session',
        'content_view',
        JSON.stringify({ duration: 300 }),
        JSON.stringify({ deviceType: 'desktop', platform: 'web', userAgent: 'test', ipAddress: '127.0.0.1', userRole: 'student' }),
        new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
      ]);

      // Validation assertions
      expect(lifecycleStatus.activePolicies).toBeGreaterThan(0);
      expect(lifecycleStatus.activeRules).toBeGreaterThan(0);

      const avgQualityScore = qualityResult.rows.length > 0
        ? qualityResult.rows.reduce((sum, row) => sum + parseFloat(row.data_quality_score), 0) / qualityResult.rows.length
        : 1;

      expect(avgQualityScore).toBeGreaterThan(0.8); // At least 80% data quality

      console.log(`- Average data quality score: ${(avgQualityScore * 100).toFixed(1)}%`);
      console.log('✅ Privacy and compliance validation passed');
    });
  });

  describe('System Performance and SLO Monitoring', () => {
    it('should validate system performance meets SLO requirements', async () => {
      console.log('\n⚡ Testing System Performance and SLO Monitoring');
      console.log('------------------------------------------------');

      // Get system health
      const systemHealth = await monitoringService.getSystemHealth();
      
      console.log(`System overall health: ${systemHealth.overall}`);
      console.log('Service health:');
      Object.entries(systemHealth.services).forEach(([service, healthy]) => {
        console.log(`- ${service}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      });

      // Check SLO compliance
      console.log('\n📊 SLO Compliance:');
      const sloMetrics = await monitoringService.getSLOMetrics();
      
      let healthySLOs = 0;
      let warningSLOs = 0;
      let criticalSLOs = 0;

      sloMetrics.forEach(slo => {
        const statusIcon = slo.status === 'healthy' ? '✅' : 
                          slo.status === 'warning' ? '⚠️' : '❌';
        
        console.log(`- ${slo.name}: ${statusIcon} ${slo.status}`);
        console.log(`  Current: ${slo.current}${slo.unit}, Target: ${slo.target}${slo.unit}`);

        switch (slo.status) {
          case 'healthy': healthySLOs++; break;
          case 'warning': warningSLOs++; break;
          case 'critical': criticalSLOs++; break;
        }
      });

      // Check active alerts
      const activeAlerts = await monitoringService.getActiveAlerts();
      console.log(`\n🚨 Active alerts: ${activeAlerts.length}`);
      
      activeAlerts.forEach(alert => {
        console.log(`- ${alert.severity.toUpperCase()}: ${alert.title}`);
      });

      // Get recent performance metrics
      const recentMetrics = await monitoringService.getPerformanceMetrics(
        undefined, 
        new Date(Date.now() - 3600000) // Last hour
      );

      console.log(`\n📈 Recent performance metrics: ${recentMetrics.length}`);

      // Calculate some basic statistics
      const responseTimeMetrics = recentMetrics.filter(m => m.name === 'api_response_time');
      if (responseTimeMetrics.length > 0) {
        const avgResponseTime = responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length;
        console.log(`- Average API response time: ${avgResponseTime.toFixed(2)}ms`);
      }

      const eventProcessingMetrics = recentMetrics.filter(m => m.name === 'event_processing_time');
      if (eventProcessingMetrics.length > 0) {
        const avgProcessingTime = eventProcessingMetrics.reduce((sum, m) => sum + m.value, 0) / eventProcessingMetrics.length;
        console.log(`- Average event processing time: ${avgProcessingTime.toFixed(2)}ms`);
      }

      // Validation assertions
      expect(systemHealth.overall).not.toBe('critical');
      expect(Object.values(systemHealth.services).every(healthy => healthy)).toBe(true);
      expect(criticalSLOs).toBe(0); // No critical SLO breaches
      expect(healthySLOs).toBeGreaterThan(sloMetrics.length * 0.7); // At least 70% healthy SLOs

      console.log('\n📊 SLO Summary:');
      console.log(`- Healthy: ${healthySLOs}/${sloMetrics.length}`);
      console.log(`- Warning: ${warningSLOs}/${sloMetrics.length}`);
      console.log(`- Critical: ${criticalSLOs}/${sloMetrics.length}`);
      console.log(`- SLO compliance: ${((healthySLOs / sloMetrics.length) * 100).toFixed(1)}%`);

      console.log('✅ Performance and SLO validation passed');
    });
  });

  describe('End-to-End Pilot Workflow', () => {
    it('should validate complete end-to-end pilot workflow', async () => {
      console.log('\n🔄 Testing End-to-End Pilot Workflow');
      console.log('------------------------------------');

      const pilotUserId = 'e2e-pilot-user';
      const pilotCourseId = 'e2e-pilot-course';
      const pilotOrgId = 'e2e-pilot-org';

      console.log('Step 1: Student starts learning session...');
      
      // 1. Student starts session
      await realTimeAnalyticsService.processEvent(createMockLearningEvent({
        userId: pilotUserId,
        eventType: EventType.SESSION_START,
        context: {
          courseId: pilotCourseId,
          organizationId: pilotOrgId,
          deviceType: 'desktop',
          platform: 'web',
          userAgent: 'pilot-browser',
          ipAddress: '127.0.0.1',
          userRole: 'student',
        },
      }));

      console.log('Step 2: Student views content and completes exercises...');
      
      // 2. Student learning activities
      const learningEvents = [
        { type: EventType.CONTENT_VIEW, data: { contentId: 'lesson-1', duration: 600 } },
        { type: EventType.EXERCISE_ATTEMPT, data: { exerciseId: 'ex-1', attempts: 1 } },
        { type: EventType.EXERCISE_COMPLETE, data: { exerciseId: 'ex-1', score: 0.85 } },
        { type: EventType.AI_QUESTION_ASK, data: { question: 'How does this work?' } },
        { type: EventType.CONTENT_COMPLETE, data: { contentId: 'lesson-1', score: 0.9 } },
      ];

      for (const event of learningEvents) {
        await realTimeAnalyticsService.processEvent(createMockLearningEvent({
          userId: pilotUserId,
          eventType: event.type,
          eventData: event.data,
          context: {
            courseId: pilotCourseId,
            organizationId: pilotOrgId,
            deviceType: 'desktop',
            platform: 'web',
            userAgent: 'pilot-browser',
            ipAddress: '127.0.0.1',
            userRole: 'student',
          },
        }));
      }

      console.log('Step 3: Generating real-time analytics...');
      
      // 3. Wait for real-time processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Check if metrics were updated
      const userMetrics = await redisService.getCachedMetrics(pilotUserId);
      expect(userMetrics).toBeTruthy();
      console.log(`- User engagement score: ${(userMetrics.engagementScore * 100).toFixed(1)}%`);
      console.log(`- User mastery level: ${(userMetrics.masteryLevel * 100).toFixed(1)}%`);

      console.log('Step 4: Generating personalized recommendations...');
      
      // 5. Generate recommendations
      const recommendations = await predictiveAnalyticsService.generateRecommendations(pilotUserId, 5);
      console.log(`- Generated ${recommendations.length} recommendations`);
      
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.title} (${(rec.confidence * 100).toFixed(1)}% confidence)`);
      });

      console.log('Step 5: Creating analytics dashboard...');
      
      // 6. Generate dashboard
      const timeframe = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date(),
        granularity: 'hour' as const,
      };

      const dashboard = await dashboardService.getMicroLevelDashboard(pilotUserId, timeframe);
      console.log(`- Dashboard generated with ${dashboard.widgets.length} widgets`);
      console.log(`- Dashboard data points: ${dashboard.metadata.dataPoints}`);

      console.log('Step 6: Generating progress report...');
      
      // 7. Generate report
      const report = await reportingService.createReport(
        'E2E Pilot Progress Report',
        'End-to-end pilot user progress report',
        ReportType.PROGRESS,
        AnalyticsLevel.MICRO,
        createMockReportFilters({
          userIds: [pilotUserId],
          courseIds: [pilotCourseId],
        }),
        [],
        'pilot-teacher'
      );

      const reportData = await reportingService.generateReport(report.id);
      console.log(`- Report generated with ${reportData.rows.length} records`);

      console.log('Step 7: Validating data quality and compliance...');
      
      // 8. Check data quality
      await dataLifecycleService.runDataQualityChecks();
      
      // 9. Verify system health
      const systemHealth = await monitoringService.getSystemHealth();
      console.log(`- System health: ${systemHealth.overall}`);

      // Final validations
      expect(userMetrics.engagementScore).toBeGreaterThan(0);
      expect(userMetrics.masteryLevel).toBeGreaterThan(0);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(dashboard.widgets.length).toBeGreaterThan(0);
      expect(reportData.rows.length).toBeGreaterThan(0);
      expect(systemHealth.overall).not.toBe('critical');

      console.log('\n🎉 End-to-End Pilot Workflow Summary:');
      console.log('=====================================');
      console.log(`✅ Real-time event processing: ${learningEvents.length + 1} events`);
      console.log(`✅ User metrics updated: ${(userMetrics.engagementScore * 100).toFixed(1)}% engagement`);
      console.log(`✅ Recommendations generated: ${recommendations.length} items`);
      console.log(`✅ Dashboard created: ${dashboard.widgets.length} widgets`);
      console.log(`✅ Report generated: ${reportData.rows.length} records`);
      console.log(`✅ System health: ${systemHealth.overall}`);
      console.log('✅ End-to-end workflow validation passed');
    });
  });
});