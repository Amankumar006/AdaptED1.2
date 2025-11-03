import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { removeNotification } from '../../store/slices/uiSlice';

const NotificationCenter: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((state) => state.ui);

  useEffect(() => {
    // Auto-remove notifications after 5 seconds
    const timers = notifications.map((notification) => {
      return setTimeout(() => {
        dispatch(removeNotification(notification.id));
      }, 5000);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full border rounded-lg p-4 shadow-lg transition-all duration-300 ${getNotificationStyles(
            notification.type
          )}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => dispatch(removeNotification(notification.id))}
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;