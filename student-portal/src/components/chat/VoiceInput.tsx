import React, { useState, useRef, useEffect } from 'react'

interface VoiceInputProps {
  onVoiceInput: (audioBlob: Blob) => void
  isLoading: boolean
  maxDuration?: number // in seconds
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onVoiceInput,
  isLoading,
  maxDuration = 300 // 5 minutes
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    checkMicrophonePermission()
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      startTimer()
      startAudioLevelMonitoring()
    } else {
      stopTimer()
      stopAudioLevelMonitoring()
    }
  }, [isRecording])

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setHasPermission(permission.state === 'granted')
      
      permission.addEventListener('change', () => {
        setHasPermission(permission.state === 'granted')
      })
    } catch (error) {
      console.warn('Permission API not supported')
      setHasPermission(null)
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      setHasPermission(true)

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onVoiceInput(audioBlob)
        cleanup()
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

    } catch (error: any) {
      console.error('Failed to start recording:', error)
      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.')
        setHasPermission(false)
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Failed to start recording. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      chunksRef.current = [] // Clear chunks to prevent sending
    }
    cleanup()
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
    mediaRecorderRef.current = null
    
    stopTimer()
    stopAudioLevelMonitoring()
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1
        if (newTime >= maxDuration) {
          stopRecording()
        }
        return newTime
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startAudioLevelMonitoring = () => {
    const updateAudioLevel = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        setAudioLevel(average / 255) // Normalize to 0-1
      }
      
      if (isRecording) {
        animationRef.current = requestAnimationFrame(updateAudioLevel)
      }
    }
    
    updateAudioLevel()
  }

  const stopAudioLevelMonitoring = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setAudioLevel(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAudioLevelColor = () => {
    if (audioLevel < 0.1) return 'bg-gray-300'
    if (audioLevel < 0.3) return 'bg-green-400'
    if (audioLevel < 0.7) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  if (hasPermission === false) {
    return (
      <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <svg className="w-12 h-12 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Microphone Access Required</h3>
        <p className="text-yellow-700 mb-4">
          Please allow microphone access to use voice input with BuddyAI.
        </p>
        <button
          onClick={checkMicrophonePermission}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          Check Permission
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Recording interface */}
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        {/* Audio level visualization */}
        {isRecording && (
          <div className="flex items-center space-x-1 mb-4">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  audioLevel * 20 > i ? getAudioLevelColor() : 'bg-gray-200'
                }`}
                style={{
                  height: `${Math.max(4, Math.min(32, (audioLevel * 20 > i ? audioLevel * 32 : 4)))}px`
                }}
              />
            ))}
          </div>
        )}

        {/* Recording button */}
        <div className="relative">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isRecording ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Recording status */}
        <div className="text-center">
          {isRecording ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                Recording... {formatTime(recordingTime)}
              </p>
              <p className="text-sm text-gray-600">
                Tap the button to stop recording
              </p>
              <div className="text-xs text-gray-500">
                Max duration: {formatTime(maxDuration)}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                {isLoading ? 'Processing...' : 'Ready to Record'}
              </p>
              <p className="text-sm text-gray-600">
                {isLoading 
                  ? 'Converting your voice to text...'
                  : 'Tap the microphone to start recording'
                }
              </p>
            </div>
          )}
        </div>

        {/* Cancel button (only shown when recording) */}
        {isRecording && (
          <button
            onClick={cancelRecording}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel Recording
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-600 space-y-1">
        <p>• Speak clearly and at a normal pace</p>
        <p>• Recording will automatically stop after {Math.floor(maxDuration / 60)} minutes</p>
        <p>• Your voice will be converted to text and sent to BuddyAI</p>
      </div>
    </div>
  )
}