import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'student',
          },
          token: 'mock-jwt-token',
        }),
      })
    })

    await page.route('**/api/learning/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          analytics: {
            overallProgress: 75,
            completedLessons: 15,
            totalLessons: 20,
          },
          recommendations: [],
          assignments: [],
        }),
      })
    })
  })

  test('should work consistently across all browsers', async ({ page, browserName }) => {
    await page.goto('/')

    // Login
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/)

    // Check that main elements are visible
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="progress-widget"]')).toBeVisible()

    // Test navigation
    await page.click('[data-testid="lessons-nav"]')
    await expect(page).toHaveURL(/.*lessons/)

    // Run accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])

    console.log(`✅ ${browserName}: All tests passed`)
  })

  test('should handle responsive design across browsers', async ({ page, browserName }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/dashboard')

    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()

    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()

    console.log(`✅ ${browserName}: Responsive design tests passed`)
  })

  test('should support keyboard navigation across browsers', async ({ page, browserName }) => {
    await page.goto('/dashboard')

    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'skip-link')

    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'dashboard-nav')

    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'lessons-nav')

    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/.*lessons/)

    console.log(`✅ ${browserName}: Keyboard navigation tests passed`)
  })

  test('should handle form interactions consistently', async ({ page, browserName }) => {
    await page.goto('/login')

    // Test form validation
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()

    // Test successful form submission
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL(/.*dashboard/)

    console.log(`✅ ${browserName}: Form interaction tests passed`)
  })

  test('should handle media content across browsers', async ({ page, browserName }) => {
    await page.goto('/lessons/1')

    // Test video playback
    const video = page.locator('video').first()
    if (await video.count() > 0) {
      await expect(video).toBeVisible()
      
      // Test video controls
      await video.hover()
      await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
    }

    // Test audio playback
    const audio = page.locator('audio').first()
    if (await audio.count() > 0) {
      await expect(audio).toBeVisible()
    }

    // Test image loading
    const images = page.locator('img')
    const imageCount = await images.count()
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      await expect(img).toBeVisible()
      await expect(img).toHaveAttribute('alt')
    }

    console.log(`✅ ${browserName}: Media content tests passed`)
  })

  test('should handle offline functionality across browsers', async ({ page, browserName }) => {
    await page.goto('/lessons')

    // Test service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })
    expect(swRegistered).toBe(true)

    // Simulate offline mode
    await page.context().setOffline(true)
    await page.reload()

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

    // Go back online
    await page.context().setOffline(false)
    await page.reload()

    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()

    console.log(`✅ ${browserName}: Offline functionality tests passed`)
  })

  test('should handle animations and transitions consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard')

    // Test CSS animations
    const animatedElement = page.locator('[data-testid="animated-widget"]').first()
    if (await animatedElement.count() > 0) {
      await expect(animatedElement).toBeVisible()
      
      // Check that animations are working
      const hasAnimation = await animatedElement.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el)
        return computedStyle.animationName !== 'none'
      })
      
      // Animation should be present unless reduced motion is preferred
      const prefersReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      })
      
      if (!prefersReducedMotion) {
        expect(hasAnimation).toBe(true)
      }
    }

    console.log(`✅ ${browserName}: Animation tests passed`)
  })

  test('should handle touch interactions on mobile browsers', async ({ page, browserName }) => {
    // Only run on mobile browsers
    if (!browserName.includes('Mobile')) {
      test.skip()
    }

    await page.goto('/dashboard')

    // Test touch gestures
    const widget = page.locator('[data-testid="draggable-widget"]').first()
    if (await widget.count() > 0) {
      const box = await widget.boundingBox()
      if (box) {
        // Test tap
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
        
        // Test swipe
        await page.touchscreen.tap(box.x + 10, box.y + box.height / 2)
        await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
      }
    }

    console.log(`✅ ${browserName}: Touch interaction tests passed`)
  })

  test('should handle local storage consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard')

    // Test localStorage functionality
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value')
    })

    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('test-key')
    })
    expect(storedValue).toBe('test-value')

    // Test sessionStorage functionality
    await page.evaluate(() => {
      sessionStorage.setItem('session-key', 'session-value')
    })

    const sessionValue = await page.evaluate(() => {
      return sessionStorage.getItem('session-key')
    })
    expect(sessionValue).toBe('session-value')

    console.log(`✅ ${browserName}: Storage tests passed`)
  })

  test('should handle WebRTC features consistently', async ({ page, browserName }) => {
    await page.goto('/chat')

    // Test WebRTC support for voice input
    const webRTCSupported = await page.evaluate(() => {
      return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    })

    if (webRTCSupported) {
      // Test voice input button
      await expect(page.locator('[data-testid="voice-input-button"]')).toBeVisible()
      
      // Note: Actual microphone access would require user permission
      // This test just verifies the API is available
    }

    console.log(`✅ ${browserName}: WebRTC tests passed`)
  })
})