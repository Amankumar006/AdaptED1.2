/**
 * Real-Time System Integration Test Suite
 * Tests the entire educational platform with realistic user workflows
 * Simulates concurrent users across all services
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class RealTimeSystemTester {
  constructor() {
    this.testResults = [];
    this.activeUsers = [];
    this.systemMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakConcurrentUsers: 0
    };
    
    // Test scenarios representing real user workflows
    this.userScenarios = [
      {
        role: 'student',
        workflow: 'complete_lesson_and_assessment',
        duration: 300000, // 5 minutes
        actions: [
          'login',
          'view_dashboard',
          'start_lesson',
          'interact_with_content',
          'chat_with_buddy_ai',
          'take_assessment',
          'submit_assessment',
          'view_results'
        ]
      },
      {
        role: 'teacher',
        workflow: 'create_and_monitor_lesson',
        duration: 600000, // 10 minutes
        actions: [
          'login',
          'view_analytics_dashboard',
          'create_new_lesson',
          'add_multimedia_content',
          'create_assessment',
          'publish_lesson',
          'monitor_student_progress',
          'provide_feedback'
        ]
      },
      {
        role: 'student',
        workflow: 'collaborative_learning',
        duration: 450000, // 7.5 minutes
        actions: [
          'login',
          'join_study_group',
          'participate_in_discussion',
          'share_practice_problems',
          'peer_review_work',
          'use_gamification_features'
        ]
      }
    ];
  }

  async runRealTimeSystemTest(options = {}) {
    const {
      concurrentUsers = 50,
      testDuration = 900000, // 15 minutes
      rampUpTime = 60000, // 1 minute
      baseUrl = 'http://localhost:3000'
    } = options;

    console.log('🚀 Starting Real-Time System Integration Test');
    console.log(`Concurrent Users: ${concurrentUsers}`);
    console.log(`Test Duration: ${testDuration / 1000}s`);
    console.log(`Base URL: ${baseUrl}`);
    console.log('==========================================\n');

    const startTime = Date.now();
    
    try {
      // Start system monitoring
      const monitoringPromise = this.startSystemMonitoring();
      
      // Ramp up users gradually
      await this.rampUpUsers(concurrentUsers, rampUpTime, baseUrl);
      
      // Run test for specified duration
      console.log(`🏃 Running test for ${testDuration / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, testDuration));
      
      // Stop all users
      await this.stopAllUsers();
      
      // Stop monitoring and collect results
      const systemMetrics = await this.stopSystemMonitoring();
      
      // Generate comprehensive report
      const report = await this.generateSystemTestReport(startTime, systemMetrics);
      
      return report;
      
    } catch (error) {
      console.error('❌ Real-time system test failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  async rampUpUsers(totalUsers, rampUpTime, baseUrl) {
    console.log(`📈 Ramping up ${totalUsers} users over ${rampUpTime / 1000}s...`);
    
    const userInterval = rampUpTime / totalUsers;
    
    for (let i = 0; i < totalUsers; i++) {
      // Select random scenario
      const scenario = this.userScenarios[Math.floor(Math.random() * this.userScenarios.length)];
      
      // Start user session
      this.startUserSession(i, scenario, baseUrl);
      
      // Wait before starting next user
      await new Promise(resolve => setTimeout(resolve, userInterval));
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Started ${i + 1}/${totalUsers} users`);
      }
    }
    
    console.log(`✅ All ${totalUsers} users started\n`);
  }

  async startUserSession(userId, scenario, baseUrl) {
    try {
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: `TestUser-${userId}-${scenario.role}`
      });
      
      const page = await context.newPage();
      
      const user = {
        id: userId,
        role: scenario.role,
        scenario: scenario.workflow,
        browser,
        context,
        page,
        startTime: Date.now(),
        actions: [],
        active: true
      };
      
      this.activeUsers.push(user);
      this.systemMetrics.peakConcurrentUsers = Math.max(
        this.systemMetrics.peakConcurrentUsers,
        this.activeUsers.filter(u => u.active).length
      );
      
      // Start executing user workflow
      this.executeUserWorkflow(user, scenario, baseUrl);
      
    } catch (error) {
      console.error(`Failed to start user ${userId}:`, error.message);
    }
  }

  async executeUserWorkflow(user, scenario, baseUrl) {
    try {
      for (const action of scenario.actions) {
        if (!user.active) break;
        
        const actionStart = Date.now();
        await this.executeUserAction(user, action, baseUrl);
        const actionDuration = Date.now() - actionStart;
        
        user.actions.push({
          action,
          duration: actionDuration,
          timestamp: new Date().toISOString(),
          success: true
        });
        
        this.updateSystemMetrics(actionDuration, true);
        
        // Random delay between actions (1-5 seconds)
        const delay = Math.random() * 4000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Keep user active for scenario duration
      setTimeout(() => {
        this.stopUser(user);
      }, scenario.duration);
      
    } catch (error) {
      console.error(`User ${user.id} workflow failed:`, error.message);
      user.actions.push({
        action: 'workflow_error',
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      });
      
      this.updateSystemMetrics(0, false);
      this.stopUser(user);
    }
  }

  async executeUserAction(user, action, baseUrl) {
    const { page } = user;
    
    switch (action) {
      case 'login':
        await page.goto(`${baseUrl}/login`);
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        await page.fill('input[type="email"]', `test-${user.role}-${user.id}@example.com`);
        await page.fill('input[type="password"]', 'testpassword123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        break;
        
      case 'view_dashboard':
        await page.goto(`${baseUrl}/dashboard`);
        await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
        break;
        
      case 'start_lesson':
        await page.goto(`${baseUrl}/lessons`);
        await page.waitForSelector('[data-testid="lesson-list"]', { timeout: 10000 });
        const lessons = await page.locator('[data-testid="lesson-item"]').count();
        if (lessons > 0) {
          await page.locator('[data-testid="lesson-item"]').first().click();
          await page.waitForSelector('[data-testid="lesson-content"]', { timeout: 10000 });
        }
        break;
        
      case 'interact_with_content':
        // Simulate reading and interacting with lesson content
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to interact with interactive elements
        const interactiveElements = await page.locator('button, [role="button"]').count();
        if (interactiveElements > 0) {
          await page.locator('button, [role="button"]').first().click();
        }
        break;
        
      case 'chat_with_buddy_ai':
        await page.goto(`${baseUrl}/chat`);
        await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
        await page.fill('[data-testid="chat-input"]', 'Can you help me understand this topic?');
        await page.click('[data-testid="send-button"]');
        await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
        break;
        
      case 'take_assessment':
        await page.goto(`${baseUrl}/assignments`);
        await page.waitForSelector('[data-testid="assessment-list"]', { timeout: 10000 });
        const assessments = await page.locator('[data-testid="assessment-item"]').count();
        if (assessments > 0) {
          await page.locator('[data-testid="assessment-item"]').first().click();
          await page.waitForSelector('[data-testid="assessment-question"]', { timeout: 10000 });
        }
        break;
        
      case 'submit_assessment':
        // Simulate answering questions
        const questions = await page.locator('[data-testid="question"]').count();
        for (let i = 0; i < Math.min(questions, 3); i++) {
          const options = await page.locator(`[data-testid="question-${i}"] input[type="radio"]`).count();
          if (options > 0) {
            const randomOption = Math.floor(Math.random() * options);
            await page.locator(`[data-testid="question-${i}"] input[type="radio"]`).nth(randomOption).click();
          }
        }
        
        const submitButton = await page.locator('[data-testid="submit-assessment"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForSelector('[data-testid="assessment-results"]', { timeout: 15000 });
        }
        break;
        
      case 'view_analytics_dashboard':
        await page.goto(`${baseUrl}/analytics`);
        await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 10000 });
        break;
        
      case 'create_new_lesson':
        await page.goto(`${baseUrl}/lessons/create`);
        await page.waitForSelector('[data-testid="lesson-builder"]', { timeout: 10000 });
        await page.fill('[data-testid="lesson-title"]', `Test Lesson ${Date.now()}`);
        await page.fill('[data-testid="lesson-description"]', 'This is a test lesson created during system testing');
        break;
        
      case 'monitor_student_progress':
        await page.goto(`${baseUrl}/students`);
        await page.waitForSelector('[data-testid="student-list"]', { timeout: 10000 });
        const students = await page.locator('[data-testid="student-item"]').count();
        if (students > 0) {
          await page.locator('[data-testid="student-item"]').first().click();
          await page.waitForSelector('[data-testid="student-progress"]', { timeout: 10000 });
        }
        break;
        
      default:
        // Generic action - just wait and scroll
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.evaluate(() => {
          window.scrollTo(0, Math.random() * document.body.scrollHeight);
        });
    }
  }

  updateSystemMetrics(responseTime, success) {
    this.systemMetrics.totalRequests++;
    
    if (success) {
      this.systemMetrics.successfulRequests++;
    } else {
      this.systemMetrics.failedRequests++;
    }
    
    // Update average response time
    const totalResponseTime = this.systemMetrics.averageResponseTime * (this.systemMetrics.totalRequests - 1) + responseTime;
    this.systemMetrics.averageResponseTime = totalResponseTime / this.systemMetrics.totalRequests;
  }

  async stopUser(user) {
    try {
      user.active = false;
      await user.browser.close();
      
      const userResult = {
        userId: user.id,
        role: user.role,
        scenario: user.scenario,
        duration: Date.now() - user.startTime,
        actionsCompleted: user.actions.length,
        successfulActions: user.actions.filter(a => a.success).length,
        errors: user.actions.filter(a => !a.success)
      };
      
      this.testResults.push(userResult);
      
    } catch (error) {
      console.error(`Error stopping user ${user.id}:`, error.message);
    }
  }

  async stopAllUsers() {
    console.log('🛑 Stopping all active users...');
    
    const stopPromises = this.activeUsers
      .filter(user => user.active)
      .map(user => this.stopUser(user));
    
    await Promise.all(stopPromises);
    
    console.log(`✅ Stopped ${stopPromises.length} users\n`);
  }

  async startSystemMonitoring() {
    // This would integrate with actual monitoring tools in a real implementation
    console.log('📊 Starting system monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      // Simulate collecting system metrics
      const activeUserCount = this.activeUsers.filter(u => u.active).length;
      console.log(`Active Users: ${activeUserCount}, Total Requests: ${this.systemMetrics.totalRequests}`);
    }, 30000); // Log every 30 seconds
  }

  async stopSystemMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    console.log('📊 System monitoring stopped\n');
    return this.systemMetrics;
  }

  async generateSystemTestReport(startTime, systemMetrics) {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    const report = {
      testSuite: 'Real-Time System Integration Test',
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      systemMetrics: {
        ...systemMetrics,
        successRate: (systemMetrics.successfulRequests / systemMetrics.totalRequests) * 100,
        requestsPerSecond: systemMetrics.totalRequests / (totalDuration / 1000)
      },
      userResults: this.testResults,
      summary: {
        totalUsers: this.testResults.length,
        averageSessionDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length,
        totalActionsCompleted: this.testResults.reduce((sum, r) => sum + r.actionsCompleted, 0),
        userSuccessRate: (this.testResults.filter(r => r.errors.length === 0).length / this.testResults.length) * 100
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed report
    await fs.mkdir('results', { recursive: true });
    await fs.writeFile(
      'results/real-time-system-test-report.json',
      JSON.stringify(report, null, 2)
    );
    
    // Print summary
    console.log('📋 Real-Time System Test Results');
    console.log('================================');
    console.log(`Test Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`Total Users: ${report.summary.totalUsers}`);
    console.log(`Peak Concurrent Users: ${systemMetrics.peakConcurrentUsers}`);
    console.log(`Total Requests: ${systemMetrics.totalRequests}`);
    console.log(`Success Rate: ${Math.round(report.systemMetrics.successRate * 100) / 100}%`);
    console.log(`Avg Response Time: ${Math.round(systemMetrics.averageResponseTime)}ms`);
    console.log(`Requests/Second: ${Math.round(report.systemMetrics.requestsPerSecond * 100) / 100}`);
    console.log(`User Success Rate: ${Math.round(report.summary.userSuccessRate * 100) / 100}%`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.systemMetrics.averageResponseTime > 2000) {
      recommendations.push('Average response time exceeds 2s - optimize backend performance');
    }
    
    if ((this.systemMetrics.successfulRequests / this.systemMetrics.totalRequests) < 0.95) {
      recommendations.push('Success rate below 95% - investigate and fix failing requests');
    }
    
    const userSuccessRate = this.testResults.filter(r => r.errors.length === 0).length / this.testResults.length;
    if (userSuccessRate < 0.9) {
      recommendations.push('User success rate below 90% - improve user experience and error handling');
    }
    
    if (this.systemMetrics.peakConcurrentUsers < 40) {
      recommendations.push('Consider testing with higher concurrent user loads');
    }
    
    return recommendations;
  }

  async cleanup() {
    await this.stopAllUsers();
    await this.stopSystemMonitoring();
  }
}

// Export for use in other test suites
module.exports = RealTimeSystemTester;

// Run if called directly
if (require.main === module) {
  const tester = new RealTimeSystemTester();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'users') options.concurrentUsers = parseInt(value);
    if (key === 'duration') options.testDuration = parseInt(value) * 1000;
    if (key === 'url') options.baseUrl = value;
  }
  
  tester.runRealTimeSystemTest(options)
    .then(report => {
      console.log('\n🎯 Real-Time System Test Complete');
      process.exit(report.systemMetrics.successRate >= 95 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Real-Time System Test Failed:', error);
      process.exit(1);
    });
}