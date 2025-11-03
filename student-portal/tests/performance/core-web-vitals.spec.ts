import { test, expect } from '@playwright/test'

test.describe('Core Web Vitals Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      
      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
            token: 'mock-jwt-token',
          }),
        })
      } else if (url.includes('/learning/dashboard')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            analytics: { overallProgress: 75, completedLessons: 15, totalLessons: 20 },
            recommendations: [],
            assignments: [],
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      }
    })
  })

  test('should meet Core Web Vitals thresholds on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')

    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          LCP: 0,
          FID: 0,
          CLS: 0,
          FCP: 0,
          TTFB: 0,
        }

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.LCP = lastEntry.startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            vitals.FID = entry.processingStart - entry.startTime
          })
        }).observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              vitals.CLS += entry.value
            }
          })
        }).observe({ entryTypes: ['layout-shift'] })

        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime
            }
          })
        }).observe({ entryTypes: ['paint'] })

        // Time to First Byte
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        vitals.TTFB = navigationEntry.responseStart - navigationEntry.requestStart

        // Wait for measurements to complete
        setTimeout(() => resolve(vitals), 3000)
      })
    })

    // Assert Core Web Vitals thresholds
    expect(vitals.LCP).toBeLessThan(2500) // LCP should be < 2.5s
    expect(vitals.FID).toBeLessThan(100)  // FID should be < 100ms
    expect(vitals.CLS).toBeLessThan(0.1)  // CLS should be < 0.1
    expect(vitals.FCP).toBeLessThan(1800) // FCP should be < 1.8s
    expect(vitals.TTFB).toBeLessThan(600) // TTFB should be < 600ms

    console.log('Core Web Vitals:', vitals)
  })

  test('should load lessons page efficiently', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/lessons')
    
    // Wait for content to be visible
    await page.waitForSelector('[data-testid="lesson-card"]')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds

    // Check for layout stability
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
        }).observe({ entryTypes: ['layout-shift'] })
        
        setTimeout(() => resolve(clsValue), 2000)
      })
    })

    expect(cls).toBeLessThan(0.1) // CLS should be minimal
  })

  test('should handle lesson viewer performance', async ({ page }) => {
    await page.goto('/lessons/1')

    // Measure time to interactive
    const tti = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              // Approximate TTI as FCP + processing time
              resolve(entry.startTime + 500)
            }
          })
        })
        observer.observe({ entryTypes: ['paint'] })
        
        setTimeout(() => resolve(5000), 5000) // Fallback
      })
    })

    expect(tti).toBeLessThan(3500) // TTI should be < 3.5s

    // Test interaction responsiveness
    const interactionStart = Date.now()
    await page.click('[data-testid="next-button"]')
    await page.waitForSelector('[data-testid="lesson-content"]')
    const interactionTime = Date.now() - interactionStart

    expect(interactionTime).toBeLessThan(200) // Interactions should be < 200ms
  })

  test('should optimize image loading performance', async ({ page }) => {
    await page.goto('/lessons/1')

    // Check for lazy loading implementation
    const images = await page.locator('img').all()
    
    for (const img of images) {
      const loading = await img.getAttribute('loading')
      const isAboveFold = await img.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        return rect.top < window.innerHeight
      })

      if (!isAboveFold) {
        expect(loading).toBe('lazy')
      }
    }

    // Measure image load times
    const imageLoadTimes = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return Promise.all(
        images.map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve(0)
            } else {
              const start = performance.now()
              img.onload = () => resolve(performance.now() - start)
              img.onerror = () => resolve(-1)
            }
          })
        })
      )
    })

    // Images should load within reasonable time
    imageLoadTimes.forEach((time) => {
      if (time > 0) {
        expect(time).toBeLessThan(2000) // < 2s per image
      }
    })
  })

  test('should handle chat interface performance', async ({ page }) => {
    await page.goto('/chat')

    // Measure initial render time
    const renderStart = Date.now()
    await page.waitForSelector('[data-testid="chat-interface"]')
    const renderTime = Date.now() - renderStart

    expect(renderTime).toBeLessThan(1000) // Should render within 1s

    // Test message sending performance
    const messageStart = Date.now()
    await page.fill('[data-testid="chat-input"]', 'Test message')
    await page.click('[data-testid="send-button"]')
    await page.waitForSelector('[data-testid="user-message"]')
    const messageTime = Date.now() - messageStart

    expect(messageTime).toBeLessThan(500) // Message should appear within 500ms
  })

  test('should optimize bundle size and loading', async ({ page }) => {
    // Measure resource loading
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource')
      return entries.map((entry) => ({
        name: entry.name,
        size: entry.transferSize || entry.encodedBodySize,
        duration: entry.duration,
        type: entry.initiatorType,
      }))
    })

    // Check JavaScript bundle sizes
    const jsResources = resources.filter((r) => r.name.includes('.js'))
    const totalJSSize = jsResources.reduce((sum, r) => sum + r.size, 0)
    
    expect(totalJSSize).toBeLessThan(1024 * 1024) // Total JS should be < 1MB

    // Check CSS bundle sizes
    const cssResources = resources.filter((r) => r.name.includes('.css'))
    const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0)
    
    expect(totalCSSSize).toBeLessThan(200 * 1024) // Total CSS should be < 200KB

    // Check resource loading times
    resources.forEach((resource) => {
      expect(resource.duration).toBeLessThan(3000) // Each resource should load < 3s
    })
  })

  test('should handle offline performance', async ({ page }) => {
    // First, load the page online
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="welcome-message"]')

    // Go offline
    await page.context().setOffline(true)

    // Measure offline page load performance
    const offlineStart = Date.now()
    await page.reload()
    await page.waitForSelector('[data-testid="offline-indicator"]')
    const offlineTime = Date.now() - offlineStart

    expect(offlineTime).toBeLessThan(2000) // Offline page should load < 2s

    // Test offline functionality performance
    const navigationStart = Date.now()
    await page.click('[data-testid="lessons-nav"]')
    await page.waitForSelector('[data-testid="offline-lessons"]')
    const navigationTime = Date.now() - navigationStart

    expect(navigationTime).toBeLessThan(1000) // Offline navigation should be < 1s
  })

  test('should maintain performance under load', async ({ page }) => {
    // Simulate heavy dashboard with many widgets
    await page.goto('/dashboard')

    // Add multiple widgets to test performance
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        // Simulate adding widgets dynamically
        const widget = document.createElement('div')
        widget.className = 'dashboard-widget'
        widget.innerHTML = `<h3>Widget ${Date.now()}</h3><p>Content...</p>`
        document.querySelector('[data-testid="dashboard-grid"]')?.appendChild(widget)
      })
    }

    // Measure rendering performance with many widgets
    const renderingMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const longTasks = entries.filter((entry) => entry.duration > 50)
          resolve({
            longTaskCount: longTasks.length,
            maxTaskDuration: Math.max(...entries.map((e) => e.duration)),
          })
        })
        observer.observe({ entryTypes: ['longtask'] })
        
        setTimeout(() => resolve({ longTaskCount: 0, maxTaskDuration: 0 }), 3000)
      })
    })

    // Should not have excessive long tasks
    expect(renderingMetrics.longTaskCount).toBeLessThan(5)
    expect(renderingMetrics.maxTaskDuration).toBeLessThan(200)
  })
})