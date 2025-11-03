import React, { useRef, useState, useEffect } from 'react'
import { LessonContent } from '../../../types'

interface AudioContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const AudioContent: React.FC<AudioContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [showTranscript, setShowTranscript] = useState(accessibilityMode)
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      onInteraction() // Track listening
    }
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    
    const handleLoadStart = () => setIsLoading(true)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onInteraction() // Track completion
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onInteraction])
  
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }
  
  const handleSeek = (time: number) => {
    const audio = audioRef.current
    if (!audio) return
    
    audio.currentTime = time
    setCurrentTime(time)
  }
  
  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current
    if (!audio) return
    
    audio.playbackRate = rate
    setPlaybackRate(rate)
  }
  
  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current
    if (!audio) return
    
    audio.volume = newVolume
    setVolume(newVolume)
  }
  
  const skipTime = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    handleSeek(newTime)
  }
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  const getAudioUrl = () => {
    if (isOffline && content.content.offlineUrl) {
      return content.content.offlineUrl
    }
    return content.content.url
  }
  
  const getProgressPercentage = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0
  }
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'max-w-4xl mx-auto text-center'
      case 'immersive':
        return 'w-full min-h-screen flex flex-col justify-center bg-gradient-to-br from-purple-900 to-blue-900 text-white'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  return (
    <div className={`audio-content p-6 ${getViewModeClasses()}`}>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
      >
        <source src={getAudioUrl()} type="audio/mpeg" />
        <source src={getAudioUrl()} type="audio/wav" />
        Your browser does not support the audio element.
      </audio>
      
      {/* Content Title */}
      {content.title && (
        <h2 className={`font-bold mb-6 ${
          viewMode === 'presentation' ? 'text-3xl' : 
          viewMode === 'immersive' ? 'text-4xl text-center' : 'text-2xl'
        }`}>
          {content.title}
        </h2>
      )}
      
      {/* Audio Player Interface */}
      <div className={`audio-player ${
        viewMode === 'immersive' ? 
          'bg-black bg-opacity-30 backdrop-blur-lg rounded-2xl p-8' : 
          'bg-white border border-gray-200 rounded-xl p-6 shadow-lg'
      }`}>
        {/* Waveform Visualization (Placeholder) */}
        <div className="waveform-container mb-6">
          <div className="relative h-20 bg-gray-100 rounded-lg overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 opacity-30 transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-gray-400 rounded-full transition-all duration-150 ${
                      i < (getProgressPercentage() / 2) ? 'bg-blue-500' : ''
                    }`}
                    style={{ 
                      height: `${Math.random() * 60 + 20}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="progress-section mb-6">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
            disabled={isLoading}
          />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Main Controls */}
        <div className="main-controls flex items-center justify-center space-x-6 mb-6">
          <button
            onClick={() => skipTime(-15)}
            className="btn btn-ghost btn-lg"
            aria-label="Skip back 15 seconds"
            disabled={isLoading}
          >
            ⏪
          </button>
          
          <button
            onClick={togglePlay}
            className={`btn btn-lg ${
              viewMode === 'immersive' ? 'btn-white' : 'btn-primary'
            } rounded-full w-16 h-16 flex items-center justify-center`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <button
            onClick={() => skipTime(15)}
            className="btn btn-ghost btn-lg"
            aria-label="Skip forward 15 seconds"
            disabled={isLoading}
          >
            ⏩
          </button>
        </div>
        
        {/* Secondary Controls */}
        <div className="secondary-controls flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleVolumeChange(volume > 0 ? 0 : 1)}
              className="btn btn-ghost btn-sm"
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
              className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* Playback Speed */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
              className="bg-transparent border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
          
          {/* Transcript Toggle */}
          {content.content.transcript && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`btn btn-sm ${showTranscript ? 'btn-primary' : 'btn-ghost'}`}
            >
              📄 Transcript
            </button>
          )}
        </div>
        
        {/* Offline Indicator */}
        {isOffline && (
          <div className="offline-indicator mt-4 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
              🔄 Playing offline
            </span>
          </div>
        )}
      </div>
      
      {/* Audio Description */}
      {content.content.description && (
        <div className="audio-description mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{content.content.description}</p>
        </div>
      )}
      
      {/* Transcript */}
      {content.content.transcript && showTranscript && (
        <div className="transcript mt-6 bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-4">Transcript</h3>
          <div className="prose prose-sm max-w-none">
            {content.content.transcript.split('\n').map((line: string, index: number) => (
              <p key={index} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      )}
      
      {/* Chapter Markers */}
      {content.content.chapters && content.content.chapters.length > 0 && (
        <div className="chapters mt-6">
          <h3 className="font-semibold mb-4">Chapters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {content.content.chapters.map((chapter: any, index: number) => (
              <button
                key={index}
                onClick={() => handleSeek(chapter.time)}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
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