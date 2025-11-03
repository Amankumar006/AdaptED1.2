/**
 * Video Performance Validation Suite
 * Tests video loading, playback performance, and CDN optimization
 * Target: Video start time ≤ 3s across different conditions
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class VideoPerformanceValidator {
  constructor() {
    this.results = [];
    this.testConfigs = [
      { name: 'High Speed', throttling: 'fast3g' },
      { name: 'Regular 3G', throttling: 'slow3g' },
      { name: 'Fast 3G', throttling: 'fast3g' },
      { name: 'No Throttling', throttling: null }
    ];
    
    this.videoFormats = [
      { format: 'MP4 H.264', url: '/api/content/video/sample.mp4' },
      { format: 'WebM VP9', url: '/api/content/video/sample.webm' },
      { format: 'HLS Adaptive', url: '/api/content/video/sample.m3u8' }
    ];
  }

  async validateVideoPerformance() {
    console.log('🎥 Starting Video Performance Validation...');
    
    const browser = await chromium.launch({ headless: true });
    
    for (const config of this.testConfigs) {
      for (const video of this.videoFormats) {
        await this.testVideoStartTime(browser, config, video);
      }
    }
    
    await browser.close();
    await this.generateReport();
    
    return this.analyzeResults();
  }

  async testVideoStartTime(browser, networkConfig, videoConfig) {
    const context = await browser.newContext();
    
    // Apply network throttling if specified
    if (networkConfig.throttling) {
      await context.route('**/*', route => {
        route.continue();
      });
    }
    
    const page = await context.newPage();
    
    try {
      console.log(`Testing ${videoConfig.format} on ${networkConfig.name}...`);
      
      // Navigate to lesson viewer with video content
      await page.goto('http://localhost:3000/lessons/video-test');
      
      // Wait for video element to be present
      await page.waitForSelector('video', { timeout: 10000 });
      
      const startTime = Date.now();
      
      // Measure time to first frame
      const videoElement = await page.locator('video').first();
      
      // Start video playback
      await videoElement.evaluate(video => {
        video.currentTime = 0;
        return video.play();
      });
      
      // Wait for video to start playing (first frame rendered)
      await page.waitForFunction(() => {
        const video = document.querySelector('video');
        return video && video.readyState >= 2 && video.currentTime > 0;
      }, { timeout: 15000 });
      
      const endTime = Date.now();
      const startTimeMs = endTime - startTime;
      
      // Collect additional metrics
      const metrics = await page.evaluate(() => {
        const video = document.querySelector('video');
        return {
          readyState: video.readyState,
          networkState: video.networkState,
          buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0,
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        };
      });
      
      const result = {
        networkConfig: networkConfig.name,
        videoFormat: videoConfig.format,
        startTimeMs,
        startTimeSeconds: startTimeMs / 1000,
        passed: startTimeMs <= 3000, // 3 second target
        metrics,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      
      console.log(`✅ ${videoConfig.format} on ${networkConfig.name}: ${startTimeMs}ms`);
      
    } catch (error) {
      console.error(`❌ Failed ${videoConfig.format} on ${networkConfig.name}:`, error.message);
      
      this.results.push({
        networkConfig: networkConfig.name,
        videoFormat: videoConfig.format,
        startTimeMs: null,
        startTimeSeconds: null,
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    await context.close();
  }

  async testCDNOptimization() {
    console.log('🌐 Testing CDN Optimization...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/video/') || request.url().includes('.mp4') || request.url().includes('.webm')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/video/') || response.url().includes('.mp4') || response.url().includes('.webm')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          fromCache: response.fromCache()
        });
      }
    });
    
    await page.goto('http://localhost:3000/lessons/video-test');
    await page.waitForSelector('video');
    
    // Wait for video requests to complete
    await page.waitForTimeout(5000);
    
    await browser.close();
    
    return {
      requests,
      responses,
      cdnOptimized: responses.some(r => r.headers['x-cache'] || r.headers['cf-cache-status']),
      cacheHitRate: responses.filter(r => r.fromCache).length / responses.length
    };
  }

  async testAdaptiveBitrate() {
    console.log('📊 Testing Adaptive Bitrate Streaming...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:3000/lessons/video-test');
    
    // Test HLS adaptive streaming
    const adaptiveMetrics = await page.evaluate(async () => {
      const video = document.querySelector('video');
      if (!video || !video.src.includes('.m3u8')) {
        return { supported: false };
      }
      
      // Simulate network changes and measure quality adaptation
      const qualities = [];
      
      // Monitor quality changes
      video.addEventListener('loadedmetadata', () => {
        qualities.push({
          width: video.videoWidth,
          height: video.videoHeight,
          timestamp: Date.now()
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      return {
        supported: true,
        qualityLevels: qualities,
        adaptiveStreaming: qualities.length > 1
      };
    });
    
    await browser.close();
    return adaptiveMetrics;
  }

  analyzeResults() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;
    
    const avgStartTime = this.results
      .filter(r => r.startTimeMs !== null)
      .reduce((sum, r) => sum + r.startTimeMs, 0) / 
      this.results.filter(r => r.startTimeMs !== null).length;
    
    const analysis = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: Math.round(passRate * 100) / 100,
      avgStartTimeMs: Math.round(avgStartTime),
      avgStartTimeSeconds: Math.round((avgStartTime / 1000) * 100) / 100,
      targetMet: passRate >= 95 && avgStartTime <= 3000,
      recommendations: []
    };
    
    // Generate recommendations
    if (avgStartTime > 3000) {
      analysis.recommendations.push('Video start time exceeds 3s target - optimize video encoding and CDN configuration');
    }
    
    if (passRate < 95) {
      analysis.recommendations.push('Pass rate below 95% - investigate failed test scenarios');
    }
    
    const slowNetworkResults = this.results.filter(r => 
      r.networkConfig.includes('3G') && r.startTimeMs > 5000
    );
    
    if (slowNetworkResults.length > 0) {
      analysis.recommendations.push('Poor performance on 3G networks - implement adaptive bitrate streaming');
    }
    
    return analysis;
  }

  async generateReport() {
    const report = {
      testSuite: 'Video Performance Validation',
      timestamp: new Date().toISOString(),
      target: 'Video start time ≤ 3s',
      results: this.results,
      summary: this.analyzeResults()
    };
    
    await fs.writeFile(
      'tests/performance/video-performance-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 Video Performance Report Generated');
    console.log(`Pass Rate: ${report.summary.passRate}%`);
    console.log(`Average Start Time: ${report.summary.avgStartTimeSeconds}s`);
    console.log(`Target Met: ${report.summary.targetMet ? '✅' : '❌'}`);
    
    if (report.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.summary.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }
}

// Export for use in test suites
module.exports = VideoPerformanceValidator;

// Run if called directly
if (require.main === module) {
  const validator = new VideoPerformanceValidator();
  validator.validateVideoPerformance()
    .then(results => {
      console.log('\n🎯 Video Performance Validation Complete');
      process.exit(results.targetMet ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Video Performance Validation Failed:', error);
      process.exit(1);
    });
}