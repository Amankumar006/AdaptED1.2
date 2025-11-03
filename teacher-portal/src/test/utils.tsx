import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, Store } from '@reduxjs/toolkit';
import authSlice, { AuthState } from '../store/slices/authSlice';
import uiSlice, { UIState } from '../store/slices/uiSlice';

// Default state for tests
const defaultAuthState: AuthState = {
  isAuthenticated: true,
  user: {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['teacher'],
  },
  token: 'test-token',
  isLoading: false,
  error: null,
};

const defaultUIState: UIState = {
  notifications: [],
  theme: 'light',
  sidebarOpen: false,
};

interface TestStoreOptions {
  auth?: Partial<AuthState>;
  ui?: Partial<UIState>;
}

export function createTestStore(options: TestStoreOptions = {}): Store {
  return configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice,
    },
    preloadedState: {
      auth: { ...defaultAuthState, ...options.auth },
      ui: { ...defaultUIState, ...options.ui },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: Store;
  storeOptions?: TestStoreOptions;
  withRouter?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    store = createTestStore(),
    storeOptions,
    withRouter = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  if (storeOptions && !store) {
    store = createTestStore(storeOptions);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    const content = <Provider store={store}>{children}</Provider>;
    
    if (withRouter) {
      return <BrowserRouter>{content}</BrowserRouter>;
    }
    
    return content;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock API responses
export const mockApiResponses = {
  auth: {
    login: {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: 'teacher@example.com',
        firstName: 'Test',
        lastName: 'Teacher',
        roles: ['teacher'],
      },
    },
  },
  lessons: {
    list: [
      {
        id: '1',
        title: 'Test Lesson 1',
        description: 'A test lesson',
        modules: [],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        title: 'Test Lesson 2',
        description: 'Another test lesson',
        modules: [],
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      },
    ],
    single: {
      id: '1',
      title: 'Test Lesson',
      description: 'A test lesson',
      modules: [
        {
          id: '1',
          type: 'text',
          title: 'Introduction',
          content: 'This is the introduction module.',
          order: 0,
        },
      ],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
  },
  assessments: {
    list: [
      {
        id: '1',
        title: 'Test Assessment 1',
        description: 'A test assessment',
        questions: [],
        createdAt: '2024-01-15T10:00:00Z',
      },
    ],
    single: {
      id: '1',
      title: 'Test Assessment',
      description: 'A test assessment',
      questions: [
        {
          id: '1',
          type: 'multiple-choice',
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 1,
          points: 10,
        },
      ],
      createdAt: '2024-01-15T10:00:00Z',
    },
  },
  students: {
    list: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        grade: 'A',
        progress: 85,
        lastActive: '2024-01-15T10:00:00Z',
        status: 'active',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        grade: 'B+',
        progress: 78,
        lastActive: '2024-01-14T10:00:00Z',
        status: 'active',
      },
    ],
  },
  analytics: {
    dashboard: {
      level: 'meso',
      entityId: 'test-entity',
      timeframe: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        granularity: 'day',
      },
      widgets: [
        {
          id: 'test-widget',
          type: 'metric_card',
          title: 'Test Widget',
          data: {
            metrics: [
              { label: 'Test Metric', value: 100, format: 'number' },
            ],
          },
          configuration: {},
          position: { x: 0, y: 0, width: 4, height: 4 },
        },
      ],
      metadata: {
        lastUpdated: new Date(),
        dataPoints: 1,
        refreshRate: 300,
      },
    },
    quickActions: [
      {
        id: 'test-action',
        title: 'Test Action',
        description: 'Test description',
        icon: '📊',
        action: () => {},
        category: 'analytics',
      },
    ],
  },
};

// Accessibility test helpers
export const a11yTestOptions = {
  rules: {
    // Disable color-contrast for tests (can be flaky in JSDOM)
    'color-contrast': { enabled: false },
    // Enable important accessibility rules
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-roles': { enabled: true },
  },
};

// Custom matchers for accessibility testing
export const expectAccessible = async (container: HTMLElement) => {
  const { axe } = await import('vitest-axe');
  const results = await axe(container, a11yTestOptions);
  expect(results).toHaveNoViolations();
};

// Keyboard navigation test helper
export const testKeyboardNavigation = async (
  container: HTMLElement,
  expectedFocusableElements: string[]
) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  expect(focusableElements.length).toBeGreaterThan(0);

  // Test that all focusable elements are actually focusable
  focusableElements.forEach((element, index) => {
    if (expectedFocusableElements[index]) {
      expect(element).toHaveAttribute('data-testid', expectedFocusableElements[index]);
    }
    expect(element).not.toHaveAttribute('tabindex', '-1');
  });
};

// Screen reader test helper
export const testScreenReaderSupport = (container: HTMLElement) => {
  // Check for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  expect(headings.length).toBeGreaterThan(0);

  // Check for ARIA labels on interactive elements
  const interactiveElements = container.querySelectorAll(
    'button, [role="button"], input, select, textarea, a'
  );

  interactiveElements.forEach(element => {
    expect(
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.querySelector('[aria-label]')
    ).toBeTruthy();
  });

  // Check for proper form labels
  const formElements = container.querySelectorAll('input, select, textarea');
  formElements.forEach(element => {
    expect(
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('placeholder') ||
      container.querySelector(`label[for="${element.id}"]`)
    ).toBeTruthy();
  });
};

// Performance test helper
export const measureRenderTime = (renderFn: () => void): number => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Wait for async operations
export const waitForAsyncOperations = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock intersection observer for tests
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

// Mock resize observer for tests
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
};

export * from '@testing-library/react';
export { renderWithProviders as render };