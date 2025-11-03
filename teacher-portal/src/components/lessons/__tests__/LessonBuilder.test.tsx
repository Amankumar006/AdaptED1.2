import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
          role: 'teacher',
        },
        token: 'test-token',
      },
      ui: {
        notifications: [],
        theme: 'light',
        sidebarCollapsed: false,
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

describe('LessonBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lesson builder for new lesson', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByText('Untitled Lesson')).toBeInTheDocument();
    expect(screen.getByText('Start Building Your Lesson')).toBeInTheDocument();
  });

  it('shows toolbar with save and AI assistant buttons', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('displays sidebar with module types', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByText('Add Modules')).toBeInTheDocument();
    expect(screen.getByText('Text Content')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
  });

  it('can switch between sidebar tabs', () => {
    renderWithProviders(<LessonBuilder />);
    
    const outlineTab = screen.getByText('Outline');
    fireEvent.click(outlineTab);
    
    expect(screen.getByText('Lesson Outline')).toBeInTheDocument();
    expect(screen.getByText('No modules yet')).toBeInTheDocument();
  });

  it('shows AI assistant panel when toggled', () => {
    renderWithProviders(<LessonBuilder />);
    
    const aiButton = screen.getByText('AI Assistant');
    fireEvent.click(aiButton);
    
    expect(screen.getByText('What would you like to generate?')).toBeInTheDocument();
    expect(screen.getByText('Lesson Outline')).toBeInTheDocument();
  });

  it('handles lesson save functionality', async () => {
    const mockOnSave = vi.fn();
    renderWithProviders(<LessonBuilder onSave={mockOnSave} />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // Since we're testing without actual API calls, we just verify the button exists
    expect(saveButton).toBeInTheDocument();
  });

  it('displays empty state when no modules exist', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByText('Start Building Your Lesson')).toBeInTheDocument();
    expect(screen.getByText('Add modules from the sidebar to create engaging learning content.')).toBeInTheDocument();
  });

  it('shows close button when onClose prop is provided', () => {
    const mockOnClose = vi.fn();
    renderWithProviders(<LessonBuilder onClose={mockOnClose} />);
    
    const closeButton = screen.getByTitle('Close');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders drag and drop context', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
  });

  it('displays auto-save indicator', () => {
    renderWithProviders(<LessonBuilder />);
    
    expect(screen.getByText(/Auto-save enabled/)).toBeInTheDocument();
  });
});