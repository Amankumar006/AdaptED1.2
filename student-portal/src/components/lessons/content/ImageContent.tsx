import React, { useState, useEffect } from 'react'
import { LessonContent } from '../../../types'

interface ImageContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const ImageContent: React.FC<ImageContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    // Track image viewing
    const timer = setTimeout(() => {
      onInteraction()
    }, 3000) // Track after 3 seconds of viewing
    
    return () => clearTimeout(timer)
  }, [onInteraction])
  
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }
  
  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3))
  }
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5))
  }
  
  const handleResetZoom = () => {
    setZoomLevel(1)
    setIsZoomed(false)
  }
  
  const toggleFullscreen = () => {
    setIsZoomed(!isZoomed)
  }
  
  const getImageUrl = () => {
    if (isOffline && content.content.offlineUrl) {
      return content.content.offlineUrl
    }
    return content.content.url
  }
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'max-w-6xl mx-auto text-center'
      case 'immersive':
        return 'w-full min-h-screen flex flex-col justify-center bg-black'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  const renderAnnotations = () => {
    if (!content.content.annotations || !showAnnotations) return null
    
    return content.content.annotations.map((annotation: any, index: number) => (
      <div
        key={index}
        className="absolute cursor-pointer"
        style={{
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={() => setSelectedAnnotation(selectedAnnotation === index ? null : index)}
      >
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold hover:bg-blue-600 transition-colors">
          {index + 1}
        </div>
        
        {selectedAnnotation === index && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64 z-10">
            <h4 className="font-semibold mb-2">{annotation.title}</h4>
            <p className="text-sm text-gray-700">{annotation.description}</p>
            {annotation.link && (
              <a
                href={annotation.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
              >
                Learn more →
              </a>
            )}
          </div>
        )}
      </div>
    ))
  }
  
  return (
    <div className={`image-content p-6 ${getViewModeClasses()}`}>
      {/* Content Title */}
      {content.title && viewMode !== 'immersive' && (
        <h2 className={`font-bold mb-6 ${
          viewMode === 'presentation' ? 'text-3xl' : 'text-2xl'
        }`}>
          {content.title}
        </h2>
      )}
      
      {/* Image Container */}
      <div className="image-container relative">
        {/* Image Controls */}
        <div className="image-controls flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="btn btn-sm btn-ghost"
              disabled={zoomLevel <= 0.5}
              aria-label="Zoom out"
            >
              🔍-
            </button>
            <span className="text-sm text-gray-600">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="btn btn-sm btn-ghost"
              disabled={zoomLevel >= 3}
              aria-label="Zoom in"
            >
              🔍+
            </button>
            <button
              onClick={handleResetZoom}
              className="btn btn-sm btn-ghost"
              aria-label="Reset zoom"
            >
              Reset
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {content.content.annotations && content.content.annotations.length > 0 && (
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`btn btn-sm ${showAnnotations ? 'btn-primary' : 'btn-ghost'}`}
              >
                📍 Annotations ({content.content.annotations.length})
              </button>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="btn btn-sm btn-ghost"
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
        
        {/* Main Image */}
        <div className={`image-wrapper relative ${
          isZoomed ? 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center' : ''
        }`}>
          {isZoomed && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              aria-label="Close fullscreen"
            >
              ✕
            </button>
          )}
          
          <div 
            className="relative overflow-auto"
            style={{
              maxHeight: isZoomed ? '90vh' : 'none',
              maxWidth: isZoomed ? '90vw' : '100%'
            }}
          >
            {!imageLoaded && !imageError && (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {imageError && (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-gray-500 mb-2">📷</div>
                <p className="text-gray-600">Failed to load image</p>
                {isOffline && (
                  <p className="text-sm text-orange-600 mt-1">
                    Image not available offline
                  </p>
                )}
              </div>
            )}
            
            <img
              src={getImageUrl()}
              alt={content.content.alt || content.title || 'Lesson image'}
              className={`max-w-full h-auto rounded-lg transition-transform duration-300 ${
                imageLoaded ? 'block' : 'hidden'
              }`}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Annotations */}
            {imageLoaded && renderAnnotations()}
          </div>
        </div>
        
        {/* Offline Indicator */}
        {isOffline && imageLoaded && (
          <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
            Offline Mode
          </div>
        )}
      </div>
      
      {/* Image Caption */}
      {content.content.caption && (
        <div className="image-caption mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 text-center italic">{content.content.caption}</p>
        </div>
      )}
      
      {/* Image Description */}
      {content.content.description && (
        <div className="image-description mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Description</h3>
          <p className="text-blue-800">{content.content.description}</p>
        </div>
      )}
      
      {/* Accessibility Description */}
      {accessibilityMode && content.content.accessibilityDescription && (
        <div className="accessibility-description mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Detailed Description</h3>
          <p className="text-green-800">{content.content.accessibilityDescription}</p>
        </div>
      )}
      
      {/* Related Images */}
      {content.content.relatedImages && content.content.relatedImages.length > 0 && (
        <div className="related-images mt-6">
          <h3 className="font-semibold mb-4">Related Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {content.content.relatedImages.map((image: any, index: number) => (
              <div key={index} className="relative group cursor-pointer">
                <img
                  src={image.thumbnail || image.url}
                  alt={image.alt || `Related image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-white rounded-full p-2 shadow-lg">
                    👁️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Image Metadata */}
      {content.content.metadata && (
        <div className="image-metadata mt-6 text-sm text-gray-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {content.content.metadata.dimensions && (
              <div>
                <span className="font-medium">Dimensions:</span>
                <br />
                {content.content.metadata.dimensions}
              </div>
            )}
            {content.content.metadata.fileSize && (
              <div>
                <span className="font-medium">File Size:</span>
                <br />
                {content.content.metadata.fileSize}
              </div>
            )}
            {content.content.metadata.format && (
              <div>
                <span className="font-medium">Format:</span>
                <br />
                {content.content.metadata.format}
              </div>
            )}
            {content.content.metadata.source && (
              <div>
                <span className="font-medium">Source:</span>
                <br />
                {content.content.metadata.source}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}