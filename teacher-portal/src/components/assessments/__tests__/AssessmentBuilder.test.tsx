import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AssessmentBuilder from '../AssessmentBuilder';
import authSlice from '../../../store/slices/authSlice';
import uiSlice from '../../../store/slices/uiSlice';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock API
vi.mock('../../../services/api/assessmentAPI', () => ({
  assessmentAPI: {
    createAssessment: vi.fn().mockResolvedValue({ id: '1', title: 'Test Assessment' }),
    updateAssessment: vi.fn().mockResolvedValue({ id: '1', title: 'Updated Assessment' }),
    getQuestionTypes: vi.fn().mockResolvedValue([
      { id: 'multiple-choice', name: 'Multiple Choice', icon: '☑️' },
      { id: 'essay', name: 'Essay', icon: '📝' },
      { id: 'true-false', name: 'True/False', icon: '✓' },
    ]),
  },
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
          email: 'teacher@example.com',
          firstName: 'Test',
          lastName: 'Teacher',
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

describe('AssessmentBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders assessment builder interface', () => {
    renderWithProviders(<AssessmentBuilder />);
    
    expect(screen.getByText('Assessment Builder')).toBeInTheDocument();
  });

  it('allows entering assessment title', async () => {
    renderWithProviders(<AssessmentBuilder />);
    
    const titleInput = screen.getByPlaceholderText('Assessment Title');
    fireEvent.change(titleInput, { target: { value: 'My Test Assessment' } });
    
    expect(titleInput).toHaveValue('My Test Assessment');
  });

  it('displays question type options', async () => {
    renderWithProviders(<AssessmentBuilder />);
    
    const addQuestionButton = screen.getByText('Add Question');
    fireEvent.click(addQuestionButton);
    
    await waitFor(() => {
      expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
      expect(screen.getByText('Essay')).toBeInTheDocument();
      expect(screen.getByText('True/False')).toBeInTheDocument();
    });
  });

  it('saves assessment', async () => {
    const mockOnSave = vi.fn();
    renderWithProviders(<AssessmentBuilder onSave={mockOnSave} />);
    
    const titleInput = screen.getByPlaceholderText('Assessment Title');
    fireEvent.change(titleInput, { target: { value: 'Test Assessment' } });
    
    const saveButton = screen.getByText('Save Assessment');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('shows validation errors for empty title', async () => {
    renderWithProviders(<AssessmentBuilder />);
    
    const saveButton = screen.getByText('Save Assessment');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Assessment title is required')).toBeInTheDocument();
  });

  it('shows preview mode', async () => {
    renderWithProviders(<AssessmentBuilder />);
    
    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);
    
    expect(screen.getByText('Assessment Preview')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    renderWithProviders(<AssessmentBuilder />);
    
    const titleInput = screen.getByPlaceholderText('Assessment Title');
    titleInput.focus();
    
    expect(titleInput).toHaveFocus();
  });
});