import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/auth/login', async route => {
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
    });

    await page.route('**/api/dashboard/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          widgets: [],
          quickActions: [],
        }),
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'teacher@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
  });

  test('should render dashboard correctly across browsers', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Check main elements are visible
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-widgets"]')).toBeVisible();

    // Take screenshot for visual comparison
    await page.screenshot({ 
      path: `test-results/dashboard-${browserName}.png`,
      fullPage: true 
    });
  });

  test('should handle responsive design across browsers', async ({ page, browserName }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await page.screenshot({ 
      path: `test-results/desktop-${browserName}.png` 
    });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.screenshot({ 
      path: `test-results/tablet-${browserName}.png` 
    });

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.screenshot({ 
      path: `test-results/mobile-${browserName}.png` 
    });
  });

  test('should handle form interactions consistently', async ({ page, browserName }) => {
    await page.goto('/lessons/new');

    // Test input interactions
    const titleInput = page.locator('[data-testid="lesson-title-input"]');
    await titleInput.fill('Cross-browser Test Lesson');
    await expect(titleInput).toHaveValue('Cross-browser Test Lesson');

    // Test dropdown interactions
    const moduleTypeSelect = page.locator('[data-testid="module-type-select"]');
    await moduleTypeSelect.selectOption('text');
    await expect(moduleTypeSelect).toHaveValue('text');

    // Test button interactions
    const saveButton = page.locator('[data-testid="save-lesson-button"]');
    await expect(saveButton).toBeEnabled();
    
    // Test keyboard navigation
    await titleInput.press('Tab');
    await expect(moduleTypeSelect).toBeFocused();
  });

  test('should handle drag and drop consistently', async ({ page, browserName }) => {
    await page.goto('/lessons/new');

    // Add multiple modules first
    await page.click('[data-testid="add-module-text"]');
    await page.fill('[data-testid="module-title-input"]', 'Module 1');
    await page.click('[data-testid="confirm-module"]');

    await page.click('[data-testid="add-module-video"]');
    await page.fill('[data-testid="module-title-input"]', 'Module 2');
    await page.click('[data-testid="confirm-module"]');

    // Test drag and drop
    const firstModule = page.locator('[data-testid="lesson-module"]').first();
    const secondModule = page.locator('[data-testid="lesson-module"]').last();

    await firstModule.dragTo(secondModule);

    // Verify reordering worked
    await expect(page.locator('[data-testid="lesson-module"]').first()).toContainText('Module 2');
  });

  test('should handle accessibility features consistently', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test screen reader support
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toHaveAttribute('id');

    // Run accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle CSS animations and transitions', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Test sidebar toggle animation
    const sidebar = page.locator('[data-testid="sidebar"]');
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');

    await toggleButton.click();
    
    // Wait for animation to complete
    await page.waitForTimeout(500);
    
    await expect(sidebar).toHaveClass(/collapsed/);

    await toggleButton.click();
    await page.waitForTimeout(500);
    
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('should handle modal dialogs consistently', async ({ page, browserName }) => {
    await page.goto('/students');

    // Open student detail modal
    await page.click('[data-testid="student-row"]');
    
    const modal = page.locator('[data-testid="student-detail-modal"]');
    await expect(modal).toBeVisible();

    // Test modal focus trap
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    
    // Focus should be within modal
    const isWithinModal = await modal.locator(':focus').count() > 0;
    expect(isWithinModal).toBeTruthy();

    // Test ESC key closes modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should handle data loading states consistently', async ({ page, browserName }) => {
    // Simulate slow API response
    await page.route('**/api/students', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/students');

    // Check loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for data to load
    await expect(page.locator('[data-testid="students-list"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('should handle error states consistently', async ({ page, browserName }) => {
    // Mock API error
    await page.route('**/api/lessons', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/lessons');

    // Check error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load lessons');

    // Test retry functionality
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should handle print styles correctly', async ({ page, browserName }) => {
    await page.goto('/lessons/1');

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Check print-specific styles are applied
    const printOnlyElements = page.locator('.print\\:block');
    const screenOnlyElements = page.locator('.print\\:hidden');

    await expect(printOnlyElements.first()).toBeVisible();
    await expect(screenOnlyElements.first()).toBeHidden();

    // Take screenshot of print view
    await page.screenshot({ 
      path: `test-results/print-${browserName}.png`,
      fullPage: true 
    });
  });
});