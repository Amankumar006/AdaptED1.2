import React, { useState } from 'react'

interface BookmarkButtonProps {
  isBookmarked: boolean
  onToggle: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  isBookmarked,
  onToggle,
  disabled = false,
  size = 'md',
  showLabel = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  
  const handleClick = () => {
    if (disabled) return
    
    setIsAnimating(true)
    onToggle()
    
    // Reset animation after a short delay
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm text-sm'
      case 'lg':
        return 'btn-lg text-lg'
      default:
        return 'btn-md'
    }
  }
  
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm'
      case 'lg':
        return 'text-xl'
      default:
        return 'text-base'
    }
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`btn ${getSizeClasses()} ${
        isBookmarked 
          ? 'btn-primary' 
          : 'btn-ghost hover:btn-ghost-primary'
      } ${isAnimating ? 'animate-pulse' : ''} transition-all duration-200`}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <span className={`bookmark-icon ${getIconSize()} ${
        isAnimating ? 'animate-bounce' : ''
      }`}>
        {isBookmarked ? '🔖' : '📑'}
      </span>
      
      {showLabel && (
        <span className="bookmark-label ml-2">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
      
      {/* Visual feedback animation */}
      {isAnimating && (
        <span className="absolute inset-0 rounded-lg bg-current opacity-20 animate-ping"></span>
      )}
    </button>
  )
}