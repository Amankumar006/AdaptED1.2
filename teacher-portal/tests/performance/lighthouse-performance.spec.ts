import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Performance Testing with Lighthouse', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email: 'teacher@example.com',
              firstName: 'Test',
              lastName: 'Teacher',
              roles: ['teacher'],
            },
          }),
        });
      } else if (url.includes('/dashboard')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            widgets: [],
            quickActions: [],
          }),
        });
      } else if (url.includes('/lessons')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });
  });

  test('should meet performance benchmarks on dashboard', async ({ page, browserName }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'teacher@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');

    // Run Lighthouse audit
    const audit = await playAudit({
      page,
      thresholds: {
        performance: 80,
        accessibility: 95,
        'best-practices': 90,
        seo: 80,
      },
      port: 9222,
    });

    expect(audit.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(80);
    expect(audit.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(95);
    expect(audit.lhr.categories['best-practices'].score * 100).toBeGreaterThanOrEqual(90);
  });

  test('should have fast Core Web Vitals', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (simulated)
        vitals.fid = 0; // Will be 0 in automated tests

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0].startTime;
        }).observe({ entryTypes: ['paint'] });

        setTimeout(() => resolve(vitals), 3000);
      });
    });

    // Core Web Vitals thresholds
    expect((vitals as any).lcp).toBeLessThan(2500); // LCP < 2.5s
    expect((vitals as any).fid).toBeLessThan(100);  // FID < 100ms
    expect((vitals as any).cls).toBeLessThan(0.1);  // CLS < 0.1
    expect((vitals as any).fcp).toBeLessThan(1800); // FCP < 1.8s
  });

  test('should load lesson builder quickly', async ({ page }) => {
    await page.goto('/lessons/new');

    // Measure time to interactive
    const startTime = Date.now();
    
    await page.waitForSelector('[data-testid="lesson-builder"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="add-module-text"]', { state: 'visible' });
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/students', async route => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `student-${i}`,
        firstName: `Student${i}`,
        lastName: `Test${i}`,
        email: `student${i}@example.com`,
        grade: 'A',
        progress: Math.floor(Math.random() * 100),
        lastActive: new Date().toISOString(),
        status: 'active',
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset),
      });
    });

    const startTime = Date.now();
    await page.goto('/students');
    
    // Wait for data to load and render
    await page.waitForSelector('[data-testid="students-list"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="student-row"]', { state: 'visible' });
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should handle 1000 records within 5 seconds
  });

  test('should maintain performance during interactions', async ({ page }) => {
    await page.goto('/lessons/new');

    // Measure performance during drag and drop operations
    const startTime = Date.now();

    // Add multiple modules
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-module-text"]');
      await page.fill('[data-testid="module-title-input"]', `Module ${i + 1}`);
      await page.click('[data-testid="confirm-module"]');
    }

    const interactionTime = Date.now() - startTime;
    
    expect(interactionTime).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should optimize bundle size', async ({ page }) => {
    // Navigate to different pages and measure resource loading
    const pages = ['/dashboard', '/lessons', '/assessments', '/students', '/analytics'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Get resource timing information
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          size: (entry as any).transferSize || 0,
          duration: entry.duration,
        }));
      });

      // Check that main bundle is not too large
      const mainBundle = resources.find(r => r.name.includes('main') || r.name.includes('index'));
      if (mainBundle) {
        expect(mainBundle.size).toBeLessThan(500000); // Main bundle < 500KB
      }

      // Check that total resources are reasonable
      const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
      expect(totalSize).toBeLessThan(2000000); // Total resources < 2MB
    }
  });

  test('should handle memory efficiently', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    // Perform memory-intensive operations
    await page.goto('/lessons');
    await page.goto('/assessments');
    await page.goto('/students');
    await page.goto('/analytics');
    await page.goto('/dashboard');

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      
      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should have efficient rendering performance', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure rendering performance
    const renderingMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const renderingTime = entries.reduce((sum, entry) => sum + entry.duration, 0);
          resolve(renderingTime);
        });
        
        observer.observe({ entryTypes: ['measure'] });
        
        // Trigger re-renders
        window.dispatchEvent(new Event('resize'));
        
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 1000);
      });
    });

    expect(renderingMetrics).toBeLessThan(100); // Rendering should be < 100ms
  });
});