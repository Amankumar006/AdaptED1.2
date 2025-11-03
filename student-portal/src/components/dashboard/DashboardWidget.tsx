import React, { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DashboardWidgetProps {
  id: string
  title: string
  children: ReactNode
  className?: string
  isDraggable?: boolean
  onRemove?: () => void
  onSettings?: () => void
  isLoading?: boolean
  error?: string
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  id,
  title,
  children,
  className = '',
  isDraggable = true,
  onRemove,
  onSettings,
  isLoading = false,
  error,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className} ${
        isDragging ? 'z-50' : ''
      }`}
      {...attributes}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-2">
          {isDraggable && (
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
              aria-label="Drag to reorder"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        
        <div className="flex items-center space-x-1">
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              aria-label="Widget settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
              aria-label="Remove widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-500">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}