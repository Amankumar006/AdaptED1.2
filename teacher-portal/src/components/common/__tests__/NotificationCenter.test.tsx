import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import NotificationCenter from '../NotificationCenter';
import authSlice from '../../../store/slices/authSlice';
import uiSlice from '../../../store/slices/uiSlice';

const createTestStore = (notifications = []) => {
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
        notifications,
        theme: 'light',
        sidebarOpen: false,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement, notifications = []) => {
  const store = createTestStore(notifications);
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('NotificationCenter', () => {
  const user = userEvent.setup();

  const mockNotifications = [
    {
      id: '1',
      type: 'success',
      title: 'Success',
      message: 'Operation completed successfully',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      read: false,
    },
    {
      id: '2',
      type: 'warning',
      title: 'Warning',
      message: 'Please review your settings',
      timestamp: new Date('2024-01-15T09:00:00Z'),
      read: false,
    },
    {
      id: '3',
      type: 'error',
      title: 'Error',
      message: 'Failed to save changes',
      timestamp: new Date('2024-01-15T08:00:00Z'),
      read: true,
    },
  ];

  it('renders notification center button', () => {
    renderWithProviders(<NotificationCenter />);
    
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });

  it('shows notification count badge', () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 unread notifications
  });

  it('opens notification panel when clicked', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('displays notifications with correct styling', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    const successNotification = screen.getByTestId('notification-1');
    const warningNotification = screen.getByTestId('notification-2');
    const errorNotification = screen.getByTestId('notification-3');
    
    expect(successNotification).toHaveClass('bg-green-50');
    expect(warningNotification).toHaveClass('bg-yellow-50');
    expect(errorNotification).toHaveClass('bg-red-50');
  });

  it('marks notification as read when clicked', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    const unreadNotification = screen.getByTestId('notification-1');
    await user.click(unreadNotification);
    
    expect(unreadNotification).not.toHaveClass('font-bold');
  });

  it('clears all notifications', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    const clearAllButton = screen.getByText('Clear All');
    await user.click(clearAllButton);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('filters notifications by type', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    const errorFilter = screen.getByText('Errors');
    await user.click(errorFilter);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
    expect(screen.queryByText('Warning')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    renderWithProviders(<NotificationCenter />, []);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText('You\'re all caught up!')).toBeInTheDocument();
  });

  it('closes panel when clicking outside', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    
    fireEvent.click(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(<NotificationCenter />, mockNotifications);
    
    const notificationButton = screen.getByTitle('Notifications');
    notificationButton.focus();
    
    expect(notificationButton).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('handles real-time notification updates', async () => {
    const { rerender } = renderWithProviders(<NotificationCenter />, []);
    
    const notificationButton = screen.getByTitle('Notifications');
    await user.click(notificationButton);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    
    // Simulate new notification
    rerender(
      <Provider store={createTestStore([mockNotifications[0]])}>
        <NotificationCenter />
      </Provider>
    );
    
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});