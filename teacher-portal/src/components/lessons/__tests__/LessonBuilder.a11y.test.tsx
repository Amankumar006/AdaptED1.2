import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LessonBuilder from '../LessonBuilder';
import authSlice from '../../../store/slices/authSlice';
import uiSlice from '../../../store/slices/uiSlice';

// Mock the API modules
vi.mock('../../../services/api/lessonsAPI', () => ({
  lessonsAPI: {
    getLesson: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
  },
  aiContentAPI: {
    getSuggestions: vi.fn(),
    generateOutline: vi.fn(),
  },
  collaborationAPI: {
    startCollaboration: vi.fn(),
  },
}));

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: {},
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice,
    },
    preloadedState: {
      auth: {
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
      },
      ui: {
        notifications: [],
        theme: 'light',
        sidebarOpen: false,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('LessonBuilder Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
    
    // Check heading order
    let previousLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      expect(level).toBeGreaterThanOrEqual(previousLevel - 1); // Allow skipping one level
      previousLevel = level;
    });
  });

  it('should have proper button accessibility', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      // Each button should have accessible text
      expect(
        button.hasAttribute('aria-label') ||
        button.hasAttribute('aria-labelledby') ||
        button.textContent?.trim() ||
        button.querySelector('svg[aria-label]') ||
        button.querySelector('[aria-hidden="false"]')
      ).toBeTruthy();
    });
  });

  it('should have proper form accessibility', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    const formElements = container.querySelectorAll('input, select, textarea');
    formElements.forEach(element => {
      // Each form element should have a label
      expect(
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby') ||
        element.hasAttribute('placeholder') ||
        container.querySelector(`label[for="${element.id}"]`)
      ).toBeTruthy();
    });
  });

  it('should be keyboard navigable', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      expect(element).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('should handle focus management in modals', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    // Check for proper focus trap in modal dialogs
    const modals = container.querySelectorAll('[role="dialog"]');
    modals.forEach(modal => {
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(
        modal.hasAttribute('aria-labelledby') ||
        modal.hasAttribute('aria-label')
      ).toBeTruthy();
    });
  });

  it('should have proper ARIA live regions for dynamic content', async () => {
    const { container } = renderWithProviders(<LessonBuilder />);

    // Check for live regions for status updates
    const liveRegions = container.querySelectorAll('[aria-live]');
    liveRegions.forEach(region => {
      expect(['polite', 'assertive', 'off']).toContain(
        region.getAttribute('aria-live')
      );
    });
  });
});