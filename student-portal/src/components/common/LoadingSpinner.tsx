import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'secondary' | 'white'
  text?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  text,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-4 w-4'
      case 'large':
        return 'h-12 w-12'
      default:
        return 'h-8 w-8'
    }
  }
  
  const getColorClasses = () => {
    switch (color) {
      case 'secondary':
        return 'border-gray-600'
      case 'white':
        return 'border-white'
      default:
        return 'border-blue-600'
    }
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-t-transparent ${getSizeClasses()} ${getColorClasses()}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
}