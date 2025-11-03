# Student Portal Testing Framework

This document describes the comprehensive testing framework for the Student Portal, focusing on accessibility, performance, and user experience validation.

## Overview

The testing framework includes:
- **Unit Tests** with accessibility checks using Vitest and vitest-axe
- **Integration Tests** for learning workflows using Cypress
- **Cross-Browser Tests** using Playwright
- **Performance Tests** for Core Web Vitals and offline synchronization
- **Accessibility Audits** using Lighthouse and axe-core
- **Automated CI/CD** pipeline with GitHub Actions

## Test Structure

```
student-portal/
├── src/
│   └── components/
│       └── **/__tests__/
│           ├── *.test.tsx          # Unit tests
│           └── *.a11y.test.tsx     # Accessibility unit tests
├── cypress/
│   ├── e2e/
│   │   ├── accessibility.cy.ts     # E2E accessibility tests
│   │   ├── learning-workflow.cy.ts # Learning workflow tests
│   │   └── offline-performance.cy.ts # Offline sync tests
│   └── support/
│       ├── commands.ts             # Custom Cypress commands
│       └── e2e.ts                  # Cypress setup
├── tests/
│   ├── playwright/
│   │   └── cross-browser.spec.ts   # Cross-browser tests
│   └── performance/
│       └── core-web-vitals.spec.ts # Performance tests
└── scripts/
    └── run-accessibility-tests.sh  # Test runner script
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:accessibility  # Unit + E2E accessibility tests
npm run test:performance   # Performance + offline sync tests
npm run test:integration   # Learning workflows + cross-browser tests
```

### Individual Test Types

#### Unit Tests with Accessibility

```bash
# Run all unit tests
npm run test:unit

# Run accessibility-focused unit tests
npm run test:a11y

# Run with coverage
npm run test:coverage
```

#### Integration Tests

```bash
# Run Cypress tests (headless)
npm run cypress:run

# Run specific Cypress test suites
npm run cypress:accessibility
npm run cypress:learning
npm run cypress:offline

# Open Cypress UI
npm run cypress:open
```

#### Cross-Browser Tests

```bash
# Run Playwright tests
npm run playwright

# Run cross-browser specific tests
npm run playwright:cross-browser

# Open Playwright UI
npm run playwright:ui
```

#### Performance Tests

```bash
# Run Core Web Vitals tests
npm run performance

# Run Lighthouse audit
npm run lighthouse
```

### Comprehensive Test Runner

```bash
# Run the complete accessibility test suite
./scripts/run-accessibility-tests.sh
```

This script runs all tests and generates an HTML report at `test-results/accessibility/report.html`.

## Test Categories

### 1. Unit Tests with Accessibility

**Location**: `src/components/**/__tests__/*.a11y.test.tsx`

**Purpose**: Test individual components for WCAG 2.1 AA compliance

**Key Features**:
- Automated accessibility violation detection using vitest-axe
- Keyboard navigation testing
- Screen reader compatibility validation
- High contrast mode support
- Reduced motion preference handling
- Focus management testing

**Example**:
```typescript
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

it('should not have accessibility violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### 2. Learning Workflow Tests

**Location**: `cypress/e2e/learning-workflow.cy.ts`

**Purpose**: Test complete learning user journeys for accessibility and functionality

**Workflows Tested**:
- Lesson viewing and completion
- Note-taking and bookmarking
- Assessment workflows
- BuddyAI chat interactions
- Practice sessions
- Collaborative learning
- Offline learning scenarios

**Key Features**:
- End-to-end accessibility validation
- Keyboard navigation testing
- Screen reader simulation
- Offline functionality testing
- Performance monitoring

### 3. Cross-Browser Compatibility

**Location**: `tests/playwright/cross-browser.spec.ts`

**Purpose**: Ensure consistent experience across browsers and devices

**Browsers Tested**:
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome Mobile, Safari Mobile

**Features Tested**:
- Responsive design accessibility
- Touch interaction support
- Media content playback
- Offline functionality
- Local storage compatibility
- WebRTC features

### 4. Performance and Core Web Vitals

**Location**: `tests/performance/core-web-vitals.spec.ts`

**Purpose**: Monitor performance metrics that affect accessibility

**Metrics Monitored**:
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Contentful Paint (FCP)**: < 1.8s
- **Time to First Byte (TTFB)**: < 600ms

**Performance Tests**:
- Dashboard loading performance
- Lesson viewer responsiveness
- Chat interface performance
- Image loading optimization
- Bundle size monitoring
- Offline performance

### 5. Offline Synchronization

**Location**: `cypress/e2e/offline-performance.cy.ts`

**Purpose**: Test offline functionality and sync performance

**Features Tested**:
- Content download efficiency
- Offline-to-online sync performance
- Storage management
- Network interruption handling
- Content optimization
- Concurrent sync operations

## Accessibility Standards

### WCAG 2.1 AA Compliance

The testing framework validates compliance with:

- **Perceivable**:
  - Alternative text for images
  - Captions for videos
  - Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
  - Resizable text up to 200%

- **Operable**:
  - Keyboard accessibility
  - No seizure-inducing content
  - Sufficient time limits
  - Skip links for navigation

- **Understandable**:
  - Readable and understandable text
  - Predictable functionality
  - Input assistance and error identification

- **Robust**:
  - Compatible with assistive technologies
  - Valid HTML markup
  - Progressive enhancement

### Testing Tools

- **vitest-axe**: Automated accessibility testing in unit tests
- **cypress-axe**: E2E accessibility testing
- **@axe-core/playwright**: Cross-browser accessibility testing
- **Lighthouse**: Comprehensive accessibility audits
- **@axe-core/cli**: Command-line accessibility auditing

## CI/CD Integration

### GitHub Actions Workflow

**Location**: `.github/workflows/accessibility-ci.yml`

**Triggers**:
- Push to main/develop branches
- Pull requests

**Jobs**:
1. **accessibility-tests**: Unit tests, Cypress, Playwright, Lighthouse
2. **accessibility-audit**: Comprehensive axe-core audit
3. **performance-monitoring**: Core Web Vitals testing
4. **offline-sync-tests**: Offline functionality validation

**Artifacts**:
- Test results and screenshots
- Performance reports
- Accessibility audit results
- Coverage reports

### Pull Request Integration

The CI pipeline automatically:
- Runs all accessibility tests
- Comments on PRs with results
- Fails builds on accessibility violations
- Provides detailed reports and recommendations

## Best Practices

### Writing Accessible Tests

1. **Test Real User Scenarios**:
   ```typescript
   it('should support keyboard navigation', () => {
     cy.get('body').tab()
     cy.focused().should('have.attr', 'data-testid', 'first-element')
   })
   ```

2. **Validate ARIA Attributes**:
   ```typescript
   it('should have proper ARIA labels', () => {
     expect(screen.getByRole('button')).toHaveAttribute('aria-label')
   })
   ```

3. **Test with Assistive Technologies**:
   ```typescript
   it('should announce changes to screen readers', () => {
     const liveRegion = screen.getByRole('status')
     expect(liveRegion).toHaveAttribute('aria-live', 'polite')
   })
   ```

### Performance Testing

1. **Monitor Core Web Vitals**:
   ```typescript
   const vitals = await page.evaluate(() => measureCoreWebVitals())
   expect(vitals.LCP).toBeLessThan(2500)
   ```

2. **Test Offline Performance**:
   ```typescript
   await page.context().setOffline(true)
   const loadTime = await measureOfflineLoadTime()
   expect(loadTime).toBeLessThan(2000)
   ```

### Continuous Improvement

1. **Regular Audits**: Run comprehensive accessibility audits monthly
2. **User Testing**: Include users with disabilities in testing processes
3. **Performance Monitoring**: Track Core Web Vitals in production
4. **Accessibility Training**: Keep team updated on accessibility best practices

## Troubleshooting

### Common Issues

1. **Accessibility Violations**:
   - Check console output for specific violations
   - Use browser dev tools accessibility panel
   - Test with screen readers

2. **Performance Issues**:
   - Analyze Lighthouse reports
   - Check network tab for slow resources
   - Monitor Core Web Vitals in real-time

3. **Cross-Browser Issues**:
   - Test in actual browsers, not just automation
   - Check for polyfill requirements
   - Validate CSS compatibility

### Getting Help

- Review test output and error messages
- Check browser console for additional errors
- Use accessibility dev tools for debugging
- Consult WCAG 2.1 guidelines for standards clarification

## Reporting

### Test Results

Test results are available in multiple formats:
- **HTML Reports**: `test-results/accessibility/report.html`
- **JSON Reports**: `test-results/playwright-report.json`
- **Coverage Reports**: `coverage/index.html`
- **Lighthouse Reports**: `.lighthouseci/`

### Metrics Dashboard

Key metrics tracked:
- Accessibility compliance score
- Performance metrics (Core Web Vitals)
- Test coverage percentage
- Cross-browser compatibility status
- Offline functionality status

## Contributing

When adding new features:
1. Write accessibility-focused unit tests
2. Add E2E tests for new user workflows
3. Update cross-browser tests if needed
4. Ensure performance impact is minimal
5. Run full test suite before submitting PR

The testing framework ensures the Student Portal provides an inclusive, performant, and reliable learning experience for all users.