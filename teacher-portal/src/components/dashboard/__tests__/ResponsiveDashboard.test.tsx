import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResponsiveDashboard from '../ResponsiveDashboard';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';

import { vi } from 'vitest';

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
    getMesoLevelDashboard: vi.fn().mockRejectedValue(new Error('Service unavailable')),
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

describe('ResponsiveDashboard', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('renders dashboard with loading state initially', () => {
    render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('renders dashboard widgets after loading', async () => {
    render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Widget')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders quick actions panel', async () => {
    render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Action')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    // Should fallback to mock data when API fails
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('renders responsive controls', async () => {
    render(
      <Provider store={store}>
        <ResponsiveDashboard
          entityId="test-entity"
          level="meso"
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Daily')).toBeInTheDocument();
    });

    expect(screen.getByText('Customize')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh data')).toBeInTheDocument();
  });
});