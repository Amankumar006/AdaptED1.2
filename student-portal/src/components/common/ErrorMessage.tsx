import React from 'react'

interface ErrorMessageProps {
  message: string
  type?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  onRetry,
  onDismiss,
  className = ''
}) => {
  const getTypeClasses = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-red-50 border-red-200 text-red-800'
    }
  }
  
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '❌'
    }
  }
  
  return (
    <div className={`border rounded-lg p-4 ${getTypeClasses()} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <span className="text-lg">{getIcon()}</span>
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="btn btn-sm btn-ghost"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="btn btn-sm btn-ghost"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="flex-shrink-0 ml-3">
            <button
              onClick={onDismiss}
              className="text-current hover:opacity-75"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}