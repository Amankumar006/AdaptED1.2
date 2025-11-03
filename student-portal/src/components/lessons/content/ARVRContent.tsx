import React, { useState, useEffect, useRef } from 'react'
import { LessonContent } from '../../../types'

interface ARVRContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const ARVRContent: React.FC<ARVRContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const [isVRSupported, setIsVRSupported] = useState(false)
  const [isARSupported, setIsARSupported] = useState(false)
  const [currentMode, setCurrentMode] = useState<'2d' | 'ar' | 'vr'>('2d')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interactionCount, setInteractionCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    checkXRSupport()
  }, [])
  
  useEffect(() => {
    if (interactionCount > 0) {
      onInteraction()
    }
  }, [interactionCount, onInteraction])
  
  const checkXRSupport = async () => {
    if ('xr' in navigator) {
      try {
        // Check VR support
        const vrSupported = await (navigator as any).xr.isSessionSupported('immersive-vr')
        setIsVRSupported(vrSupported)
        
        // Check AR support
        const arSupported = await (navigator as any).xr.isSessionSupported('immersive-ar')
        setIsARSupported(arSupported)
      } catch (error) {
        console.warn('XR support check failed:', error)
      }
    }
  }
  
  const initializeVR = async () => {
    if (!isVRSupported) {
      setError('VR is not supported on this device')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const xr = (navigator as any).xr
      const session = await xr.requestSession('immersive-vr')
      
      // Initialize VR scene
      await setupVRScene(session)
      setCurrentMode('vr')
      setInteractionCount(prev => prev + 1)
    } catch (error) {
      setError('Failed to initialize VR session')
      console.error('VR initialization error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const initializeAR = async () => {
    if (!isARSupported) {
      setError('AR is not supported on this device')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const xr = (navigator as any).xr
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      })
      
      // Initialize AR scene
      await setupARScene(session)
      setCurrentMode('ar')
      setInteractionCount(prev => prev + 1)
    } catch (error) {
      setError('Failed to initialize AR session')
      console.error('AR initialization error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const setupVRScene = async (session: any) => {
    // This would typically use WebGL/Three.js for actual VR rendering
    // For now, we'll simulate the setup
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('VR scene initialized')
        resolve(true)
      }, 1000)
    })
  }
  
  const setupARScene = async (session: any) => {
    // This would typically use WebGL/Three.js for actual AR rendering
    // For now, we'll simulate the setup
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('AR scene initialized')
        resolve(true)
      }, 1000)
    })
  }
  
  const exitXR = () => {
    setCurrentMode('2d')
    setInteractionCount(prev => prev + 1)
  }
  
  const render360Video = () => {
    if (!content.content.video360Url) return null
    
    return (
      <div className="video-360-container relative w-full h-96 bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          controls
          crossOrigin="anonymous"
        >
          <source src={content.content.video360Url} type="video/mp4" />
          Your browser does not support 360° video.
        </video>
        
        <div className="video-controls absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setInteractionCount(prev => prev + 1)}
                className="btn btn-sm bg-black bg-opacity-50 text-white hover:bg-opacity-75"
              >
                🎮 Look Around
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {isVRSupported && (
                <button
                  onClick={initializeVR}
                  className="btn btn-sm bg-black bg-opacity-50 text-white hover:bg-opacity-75"
                  disabled={isLoading}
                >
                  🥽 VR Mode
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const render3DModel = () => {
    if (!content.content.model3DUrl) return null
    
    return (
      <div className="model-3d-container relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onClick={() => setInteractionCount(prev => prev + 1)}
        />
        
        <div className="model-controls absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setInteractionCount(prev => prev + 1)}
                className="btn btn-sm bg-white shadow-md"
              >
                🔄 Rotate
              </button>
              <button
                onClick={() => setInteractionCount(prev => prev + 1)}
                className="btn btn-sm bg-white shadow-md"
              >
                🔍 Zoom
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {isARSupported && (
                <button
                  onClick={initializeAR}
                  className="btn btn-sm bg-white shadow-md"
                  disabled={isLoading}
                >
                  📱 AR View
                </button>
              )}
              {isVRSupported && (
                <button
                  onClick={initializeVR}
                  className="btn btn-sm bg-white shadow-md"
                  disabled={isLoading}
                >
                  🥽 VR View
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Placeholder 3D model visualization */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">🏛️</div>
            <p className="text-gray-600">3D Model Viewer</p>
            <p className="text-sm text-gray-500">Click and drag to interact</p>
          </div>
        </div>
      </div>
    )
  }
  
  const renderVirtualEnvironment = () => {
    if (!content.content.virtualEnvironment) return null
    
    return (
      <div className="virtual-environment w-full h-96 bg-gradient-to-b from-blue-400 to-green-400 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-8xl mb-4">🌍</div>
            <h3 className="text-2xl font-bold mb-2">Virtual Environment</h3>
            <p className="mb-4">{content.content.virtualEnvironment.description}</p>
            
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setInteractionCount(prev => prev + 1)}
                className="btn btn-white"
              >
                🚶 Explore
              </button>
              
              {isVRSupported && (
                <button
                  onClick={initializeVR}
                  className="btn btn-white"
                  disabled={isLoading}
                >
                  🥽 Enter VR
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Environment hotspots */}
        {content.content.virtualEnvironment.hotspots?.map((hotspot: any, index: number) => (
          <div
            key={index}
            className="absolute cursor-pointer"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => setInteractionCount(prev => prev + 1)}
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <span className="text-lg">{hotspot.icon}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  const renderXRInterface = () => {
    if (currentMode === '2d') return null
    
    return (
      <div className="xr-interface fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">
            {currentMode === 'vr' ? '🥽' : '📱'}
          </div>
          <h2 className="text-2xl font-bold mb-4">
            {currentMode === 'vr' ? 'VR Mode Active' : 'AR Mode Active'}
          </h2>
          <p className="mb-6">
            {currentMode === 'vr' 
              ? 'Put on your VR headset to experience the content in virtual reality.'
              : 'Point your device camera at a flat surface to place AR objects.'
            }
          </p>
          
          <div className="space-x-4">
            <button
              onClick={exitXR}
              className="btn btn-white"
            >
              Exit {currentMode.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  const renderFallback = () => (
    <div className="ar-vr-fallback text-center py-12">
      <div className="text-6xl mb-4">🥽</div>
      <h3 className="text-xl font-bold mb-4">Immersive Content</h3>
      <p className="text-gray-600 mb-6">
        This content is designed for AR/VR viewing but can also be experienced in 2D mode.
      </p>
      
      <div className="capability-check bg-gray-50 rounded-lg p-6 max-w-md mx-auto mb-6">
        <h4 className="font-semibold mb-3">Device Capabilities</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>VR Support:</span>
            <span className={isVRSupported ? 'text-green-600' : 'text-red-600'}>
              {isVRSupported ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>AR Support:</span>
            <span className={isARSupported ? 'text-green-600' : 'text-red-600'}>
              {isARSupported ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
        </div>
      </div>
      
      {!isVRSupported && !isARSupported && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-blue-800 text-sm">
            💡 For the best experience, try this content on a VR headset or AR-capable mobile device.
          </p>
        </div>
      )}
    </div>
  )
  
  return (
    <div className="ar-vr-content p-6">
      {/* Content Title */}
      {content.title && (
        <h2 className="text-2xl font-bold mb-6 text-center">{content.title}</h2>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="loading-state text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing immersive experience...</p>
        </div>
      )}
      
      {/* Content Rendering */}
      {!isLoading && (
        <>
          {content.content.video360Url && render360Video()}
          {content.content.model3DUrl && render3DModel()}
          {content.content.virtualEnvironment && renderVirtualEnvironment()}
          {!content.content.video360Url && !content.content.model3DUrl && !content.content.virtualEnvironment && renderFallback()}
        </>
      )}
      
      {/* XR Interface Overlay */}
      {renderXRInterface()}
      
      {/* Interaction Summary */}
      {interactionCount > 0 && (
        <div className="interaction-summary mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            🎉 Great exploration! You've interacted with the immersive content {interactionCount} times.
          </p>
        </div>
      )}
      
      {/* Accessibility Notice */}
      {accessibilityMode && (
        <div className="accessibility-notice mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Accessibility Information</h4>
          <p className="text-blue-800 text-sm">
            This immersive content includes alternative descriptions and can be navigated using keyboard controls.
            {content.content.accessibilityDescription && (
              <span> {content.content.accessibilityDescription}</span>
            )}
          </p>
        </div>
      )}
      
      {/* Offline Notice */}
      {isOffline && (
        <div className="offline-notice mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-sm">
            ⚠️ Some immersive features may be limited in offline mode. AR/VR functionality requires an internet connection.
          </p>
        </div>
      )}
    </div>
  )
}