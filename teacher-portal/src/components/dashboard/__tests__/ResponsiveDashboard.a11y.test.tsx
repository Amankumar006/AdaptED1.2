import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import ResponsiveDashboard from '../ResponsiveDashboard';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';

// Mock the analytics API
vi.mock('../../../services/api/analyticsAPI', () => ({
  analyticsAPI: {
    getMockDashboardData: vi.fn().mockResolvedValue({
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
    }),
    getQuickActions: vi.fn().mockResolvedValue([
      {
        id: 'test-action',
        title: 'Test Action',
        description: 'Test description',
        icon: '📊',
        action: vi.fn(),
        category: 'analytics',
      },
    ]),
    getMesoLevelDashboard: vi.fn().mockResolvedValue({}),
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['teacher'],
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      ui: {
        notifications: [],
        theme: 'light',
        sidebarOpen: false,
      },
    },
  });
};

describe('ResponsiveDashboard Accessibility', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should have proper ARIA labels for interactive elements', async () => {
    const { container } = render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    // Check for ARIA labels on buttons
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(
        button.hasAttribute('aria-label') || 
        button.hasAttribute('aria-labelledby') ||
        button.textContent?.trim()
      ).toBeTruthy();
    });
  });

  it('should be keyboard navigable', async () => {
    const { container } = render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      expect(element).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('should have proper form labels', async () => {
    const { container } = render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      expect(
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        container.querySelector(`label[for="${input.id}"]`)
      ).toBeTruthy();
    });
  });
});