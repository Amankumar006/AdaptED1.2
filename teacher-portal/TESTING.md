# Teacher Portal Testing Guide

This document outlines the comprehensive testing strategy for the Teacher Portal, including unit tests, integration tests, accessibility testing, and performance testing.

## Testing Stack

- **Unit Testing**: Vitest + React Testing Library
- **E2E Testing**: Cypress
- **Cross-browser Testing**: Playwright
- **Accessibility Testing**: axe-core, cypress-axe, vitest-axe
- **Performance Testing**: Lighthouse CI
- **Visual Regression**: Playwright screenshots

## Test Scripts

```bash
# Unit tests
npm run test                    # Run all unit tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage report
npm run test:a11y              # Run accessibility-specific tests

# E2E tests
npm run cypress:open           # Open Cypress UI
npm run cypress:run            # Run Cypress tests headlessly
npm run e2e                    # Alias for cypress:run

# Cross-browser tests
npm run playwright             # Run Playwright tests
npm run playwright:ui          # Run with UI mode

# Performance tests
npm run lighthouse             # Run Lighthouse CI

# All tests
npm run test:all               # Run all test suites
```

## Test Structure

### Unit Tests
Located in `src/**/__tests__/` directories:

- **Component Tests**: Test React component rendering, props, and user interactions
- **Accessibility Tests**: Test WCAG 2.1 AA compliance using axe-core
- **Service Tests**: Test API services and utilities
- **Hook Tests**: Test custom React hooks

### Integration Tests
Located in `cypress/e2e/`:

- **Lesson Creation Workflow**: End-to-end lesson building process
- **Assessment Creation Workflow**: Complete assessment creation flow
- **Student Management**: Student list, details, and management features
- **Dashboard Analytics**: Dashboard widgets and analytics features

### Cross-browser Tests
Located in `tests/playwright/`:

- **Cross-browser Compatibility**: Test across Chrome, Firefox, Safari
- **Responsive Design**: Test mobile, tablet, and desktop viewports
- **Form Interactions**: Test form behavior across browsers
- **Drag and Drop**: Test drag-and-drop functionality
- **Modal Dialogs**: Test modal behavior and focus management

### Performance Tests
Located in `tests/performance/`:

- **Lighthouse Audits**: Performance, accessibility, best practices, SEO
- **Core Web Vitals**: LCP, FID, CLS measurements
- **Bundle Size**: Monitor JavaScript bundle sizes
- **Memory Usage**: Test for memory leaks
- **Load Times**: Measure page load performance

## Accessibility Testing

### Automated Accessibility Checks

The testing suite includes comprehensive accessibility validation:

1. **Unit Level**: Each component has accessibility tests using vitest-axe
2. **Integration Level**: Cypress tests include accessibility checks with cypress-axe
3. **CI/CD Level**: Automated accessibility audits in GitHub Actions

### WCAG 2.1 AA Compliance

Tests validate:
- Color contrast ratios
- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels and roles
- Heading hierarchy
- Form labels and validation
- Skip links and landmarks

### Accessibility Test Examples

```typescript
// Unit test with accessibility check
it('should be accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results.violations).toEqual([]);
});

// Cypress test with accessibility check
it('should be accessible', () => {
  cy.visit('/page');
  cy.checkA11y();
});
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/accessibility-ci.yml` workflow:

1. **Runs on**: Push to main/develop, Pull Requests
2. **Node Versions**: Tests on Node 18.x and 20.x
3. **Test Stages**:
   - Unit tests with accessibility checks
   - Build application
   - E2E tests with Cypress
   - Cross-browser tests with Playwright
   - Performance audits with Lighthouse CI

### Quality Gates

Tests must pass these criteria:
- **Performance**: Lighthouse score ≥ 80
- **Accessibility**: Lighthouse score ≥ 95
- **Best Practices**: Lighthouse score ≥ 90
- **Unit Test Coverage**: ≥ 80% (branches, functions, lines, statements)
- **Zero Critical Accessibility Violations**: No WCAG 2.1 AA violations

### PR Comments

The CI automatically comments on PRs with:
- Lighthouse scores
- Accessibility compliance status
- Test results summary
- Links to detailed reports

## Test Data Management

### Mock Data
- Consistent mock data across all test types
- Realistic data volumes for performance testing
- Edge cases and error scenarios

### Test Utilities
- Shared test utilities in `src/test/utils.tsx`
- Custom render functions with providers
- Accessibility testing helpers
- Performance measurement utilities

## Best Practices

### Writing Tests

1. **Test Behavior, Not Implementation**: Focus on what users see and do
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Test Accessibility**: Include accessibility checks in component tests
4. **Mock External Dependencies**: Mock APIs, third-party libraries
5. **Use Real User Interactions**: Prefer `fireEvent` and `userEvent` over direct state manipulation

### Accessibility Testing

1. **Test with Real Assistive Technology**: Use screen readers during development
2. **Include Keyboard Navigation**: Test all interactive elements with keyboard
3. **Test Color Contrast**: Ensure sufficient contrast ratios
4. **Validate ARIA**: Check ARIA labels, roles, and properties
5. **Test Focus Management**: Ensure proper focus flow and trapping

### Performance Testing

1. **Test with Realistic Data**: Use production-like data volumes
2. **Monitor Bundle Sizes**: Set limits on JavaScript bundle sizes
3. **Test Core Web Vitals**: Measure LCP, FID, CLS consistently
4. **Test on Various Networks**: Include slow network conditions
5. **Monitor Memory Usage**: Check for memory leaks

## Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor` for async state updates
2. **Timer Issues**: Mock timers with `vi.useFakeTimers()`
3. **Network Requests**: Mock API calls consistently
4. **Component State**: Wrap state updates in `act()`
5. **Accessibility Violations**: Check console for axe-core violations

### Debug Commands

```bash
# Run specific test file
npm run test -- ResponsiveDashboard.test.tsx

# Run tests with verbose output
npm run test -- --reporter=verbose

# Run tests with UI
npm run test:ui

# Debug Cypress tests
npm run cypress:open

# Debug Playwright tests
npm run playwright:ui
```

## Continuous Improvement

### Metrics to Monitor

1. **Test Coverage**: Maintain >80% coverage
2. **Test Performance**: Keep test execution time reasonable
3. **Accessibility Violations**: Trend toward zero violations
4. **Performance Scores**: Maintain high Lighthouse scores
5. **Test Reliability**: Minimize flaky tests

### Regular Reviews

1. **Monthly Test Review**: Assess test effectiveness and coverage
2. **Accessibility Audit**: Quarterly comprehensive accessibility review
3. **Performance Baseline**: Update performance benchmarks regularly
4. **Test Maintenance**: Remove obsolete tests, update mocks
5. **Tool Updates**: Keep testing tools and dependencies current

This comprehensive testing strategy ensures the Teacher Portal maintains high quality, accessibility, and performance standards while providing confidence in new features and changes.