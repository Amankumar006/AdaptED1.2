import React, { useRef, useState, useEffect } from 'react'
import { LessonContent } from '../../../types'

interface VideoContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const VideoContent: React.FC<VideoContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showCaptions, setShowCaptions] = useState(accessibilityMode)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onInteraction() // Track video watching
    }
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onInteraction() // Track completion
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onInteraction])
  
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    
    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }
  
  const handleSeek = (time: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = time
    setCurrentTime(time)
  }
  
  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.playbackRate = rate
    setPlaybackRate(rate)
  }
  
  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.volume = newVolume
    setVolume(newVolume)
  }
  
  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    
    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  const getVideoUrl = () => {
    if (isOffline && content.content.offlineUrl) {
      return content.content.offlineUrl
    }
    return content.content.url
  }
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'max-w-5xl mx-auto'
      case 'immersive':
        return 'w-full h-screen'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  return (
    <div className={`video-content p-6 ${getViewModeClasses()}`}>
      {/* Content Title */}
      {content.title && viewMode !== 'immersive' && (
        <h2 className="text-2xl font-bold mb-6">{content.title}</h2>
      )}
      
      {/* Video Player */}
      <div className="video-player-container relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-auto"
          poster={content.content.thumbnail}
          crossOrigin="anonymous"
          preload="metadata"
        >
          <source src={getVideoUrl()} type="video/mp4" />
          
          {/* Captions */}
          {content.content.captions && (
            <track
              kind="captions"
              src={content.content.captions}
              srcLang="en"
              label="English"
              default={showCaptions}
            />
          )}
          
          Your browser does not support the video tag.
        </video>
        
        {/* Custom Controls */}
        <div className="video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          {/* Progress Bar */}
          <div className="progress-bar mb-4">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-blue-400 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVolumeChange(volume > 0 ? 0 : 1)}
                  className="text-white hover:text-blue-400"
                  aria-label={volume > 0 ? 'Mute' : 'Unmute'}
                >
                  {volume > 0 ? '🔊' : '🔇'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Playback Speed */}
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              
              {/* Captions Toggle */}
              {accessibilityMode && content.content.captions && (
                <button
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`text-white hover:text-blue-400 ${showCaptions ? 'text-blue-400' : ''}`}
                  aria-label="Toggle captions"
                >
                  CC
                </button>
              )}
              
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-blue-400"
                aria-label="Toggle fullscreen"
              >
                ⛶
              </button>
            </div>
          </div>
        </div>
        
        {/* Offline Indicator */}
        {isOffline && (
          <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
            Offline Mode
          </div>
        )}
      </div>
      
      {/* Video Description */}
      {content.content.description && (
        <div className="video-description mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{content.content.description}</p>
        </div>
      )}
      
      {/* Transcript */}
      {content.content.transcript && (
        <div className="transcript mt-6">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="btn btn-ghost mb-4"
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>
          
          {showTranscript && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Transcript</h3>
              <div className="prose prose-sm max-w-none">
                {content.content.transcript.split('\n').map((line: string, index: number) => (
                  <p key={index} className="mb-2">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Chapter Markers */}
      {content.content.chapters && content.content.chapters.length > 0 && (
        <div className="chapters mt-6">
          <h3 className="font-semibold mb-4">Chapters</h3>
          <div className="space-y-2">
            {content.content.chapters.map((chapter: any, index: number) => (
              <button
                key={index}
                onClick={() => handleSeek(chapter.time)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
              >
                <span className="font-medium">{chapter.title}</span>
                <span className="text-sm text-gray-500">{formatTime(chapter.time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}