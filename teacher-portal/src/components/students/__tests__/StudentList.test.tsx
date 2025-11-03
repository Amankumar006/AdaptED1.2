import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StudentList from '../StudentList';
import authSlice from '../../../store/slices/authSlice';
import uiSlice from '../../../store/slices/uiSlice';

// Mock API
vi.mock('../../../services/api/studentsAPI', () => ({
  studentsAPI: {
    getStudents: vi.fn().mockResolvedValue([
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        grade: 'A',
        lastActive: new Date('2024-01-15'),
        progress: 85,
        status: 'active',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        grade: 'B+',
        lastActive: new Date('2024-01-14'),
        progress: 78,
        status: 'active',
      },
    ]),
    updateStudent: vi.fn().mockResolvedValue({}),
    deleteStudent: vi.fn().mockResolvedValue({}),
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

describe('StudentList', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student list with data', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
  });

  it('displays student progress and grades', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B+')).toBeInTheDocument();
    });
  });

  it('filters students by search term', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search students...');
    await user.type(searchInput, 'John');
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('sorts students by different criteria', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByDisplayValue('Name');
    await user.selectOptions(sortSelect, 'progress');
    
    // Verify sorting is applied (Jane should come first with 78% < John's 85%)
    const studentRows = screen.getAllByTestId(/student-row-/);
    expect(studentRows[0]).toHaveTextContent('Jane Smith');
    expect(studentRows[1]).toHaveTextContent('John Doe');
  });

  it('opens student detail modal', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      const johnRow = screen.getByText('John Doe');
      fireEvent.click(johnRow);
    });
    
    expect(screen.getByText('Student Details')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles bulk selection', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const selectAllCheckbox = screen.getByLabelText('Select all students');
    await user.click(selectAllCheckbox);
    
    expect(screen.getByText('2 students selected')).toBeInTheDocument();
  });

  it('exports student data', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);
    
    expect(screen.getByText('Export Students')).toBeInTheDocument();
  });

  it('handles empty state', () => {
    vi.mocked(require('../../../services/api/studentsAPI').studentsAPI.getStudents)
      .mockResolvedValueOnce([]);
    
    renderWithProviders(<StudentList />);
    
    expect(screen.getByText('No students found')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    renderWithProviders(<StudentList />);
    
    expect(screen.getByText('Loading students...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    vi.mocked(require('../../../services/api/studentsAPI').studentsAPI.getStudents)
      .mockRejectedValueOnce(new Error('Failed to load students'));
    
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading students')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(<StudentList />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search students...');
    searchInput.focus();
    
    expect(searchInput).toHaveFocus();
    
    await user.tab();
    expect(screen.getByDisplayValue('Name')).toHaveFocus();
  });
});