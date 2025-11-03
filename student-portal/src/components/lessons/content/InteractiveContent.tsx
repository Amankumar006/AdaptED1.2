import React, { useState, useEffect, useRef } from 'react'
import { LessonContent } from '../../../types'

interface InteractiveContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const InteractiveContent: React.FC<InteractiveContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInputs, setUserInputs] = useState<Record<string, any>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  useEffect(() => {
    // Track interactions
    if (interactionCount > 0) {
      onInteraction()
    }
  }, [interactionCount, onInteraction])
  
  const handleUserInput = (key: string, value: any) => {
    setUserInputs(prev => ({ ...prev, [key]: value }))
    setInteractionCount(prev => prev + 1)
  }
  
  const handleStepNavigation = (direction: 'next' | 'prev') => {
    const steps = content.content.steps || []
    if (direction === 'next' && currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else if (direction === 'prev' && currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
    setInteractionCount(prev => prev + 1)
  }
  
  const handleComplete = () => {
    setIsCompleted(true)
    onInteraction()
  }
  
  const renderSimulation = () => {
    if (!content.content.simulation) return null
    
    return (
      <div className="simulation-container bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Interactive Simulation</h3>
        
        {content.content.simulation.type === 'iframe' && (
          <iframe
            ref={iframeRef}
            src={content.content.simulation.url}
            className="w-full h-96 border border-gray-300 rounded-lg"
            title="Interactive Simulation"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
        
        {content.content.simulation.type === 'canvas' && (
          <div className="canvas-container">
            <canvas
              id="interactive-canvas"
              className="w-full h-96 border border-gray-300 rounded-lg bg-white"
            />
          </div>
        )}
        
        {content.content.simulation.type === 'widget' && (
          <div className="widget-container">
            {renderCustomWidget()}
          </div>
        )}
      </div>
    )
  }
  
  const renderCustomWidget = () => {
    const widget = content.content.simulation?.widget
    if (!widget) return null
    
    switch (widget.type) {
      case 'calculator':
        return renderCalculator()
      case 'diagram':
        return renderInteractiveDiagram()
      case 'timeline':
        return renderInteractiveTimeline()
      case 'map':
        return renderInteractiveMap()
      default:
        return <div className="p-4 text-gray-500">Widget type not supported</div>
    }
  }
  
  const renderCalculator = () => {
    const [display, setDisplay] = useState('0')
    const [operation, setOperation] = useState<string | null>(null)
    const [previousValue, setPreviousValue] = useState<number | null>(null)
    
    const handleNumber = (num: string) => {
      setDisplay(prev => prev === '0' ? num : prev + num)
      setInteractionCount(prev => prev + 1)
    }
    
    const handleOperation = (op: string) => {
      setPreviousValue(parseFloat(display))
      setOperation(op)
      setDisplay('0')
      setInteractionCount(prev => prev + 1)
    }
    
    const calculate = () => {
      if (previousValue !== null && operation) {
        const current = parseFloat(display)
        let result = 0
        
        switch (operation) {
          case '+':
            result = previousValue + current
            break
          case '-':
            result = previousValue - current
            break
          case '*':
            result = previousValue * current
            break
          case '/':
            result = previousValue / current
            break
        }
        
        setDisplay(result.toString())
        setOperation(null)
        setPreviousValue(null)
        setInteractionCount(prev => prev + 1)
      }
    }
    
    const clear = () => {
      setDisplay('0')
      setOperation(null)
      setPreviousValue(null)
    }
    
    return (
      <div className="calculator bg-white p-4 rounded-lg border border-gray-300 max-w-xs mx-auto">
        <div className="display bg-gray-900 text-white p-4 rounded mb-4 text-right text-xl font-mono">
          {display}
        </div>
        <div className="buttons grid grid-cols-4 gap-2">
          <button onClick={clear} className="btn btn-secondary col-span-2">Clear</button>
          <button onClick={() => handleOperation('/')} className="btn btn-primary">÷</button>
          <button onClick={() => handleOperation('*')} className="btn btn-primary">×</button>
          
          <button onClick={() => handleNumber('7')} className="btn btn-ghost">7</button>
          <button onClick={() => handleNumber('8')} className="btn btn-ghost">8</button>
          <button onClick={() => handleNumber('9')} className="btn btn-ghost">9</button>
          <button onClick={() => handleOperation('-')} className="btn btn-primary">-</button>
          
          <button onClick={() => handleNumber('4')} className="btn btn-ghost">4</button>
          <button onClick={() => handleNumber('5')} className="btn btn-ghost">5</button>
          <button onClick={() => handleNumber('6')} className="btn btn-ghost">6</button>
          <button onClick={() => handleOperation('+')} className="btn btn-primary">+</button>
          
          <button onClick={() => handleNumber('1')} className="btn btn-ghost">1</button>
          <button onClick={() => handleNumber('2')} className="btn btn-ghost">2</button>
          <button onClick={() => handleNumber('3')} className="btn btn-ghost">3</button>
          <button onClick={calculate} className="btn btn-success row-span-2">=</button>
          
          <button onClick={() => handleNumber('0')} className="btn btn-ghost col-span-2">0</button>
          <button onClick={() => handleNumber('.')} className="btn btn-ghost">.</button>
        </div>
      </div>
    )
  }
  
  const renderInteractiveDiagram = () => {
    const [selectedParts, setSelectedParts] = useState<string[]>([])
    
    const handlePartClick = (partId: string) => {
      setSelectedParts(prev => 
        prev.includes(partId) 
          ? prev.filter(id => id !== partId)
          : [...prev, partId]
      )
      setInteractionCount(prev => prev + 1)
    }
    
    return (
      <div className="interactive-diagram">
        <div className="diagram-container relative bg-white border border-gray-300 rounded-lg p-4">
          <svg viewBox="0 0 400 300" className="w-full h-64">
            {/* Example diagram parts */}
            <circle
              cx="100"
              cy="100"
              r="30"
              fill={selectedParts.includes('part1') ? '#3B82F6' : '#E5E7EB'}
              className="cursor-pointer hover:fill-blue-400 transition-colors"
              onClick={() => handlePartClick('part1')}
            />
            <rect
              x="200"
              y="80"
              width="60"
              height="40"
              fill={selectedParts.includes('part2') ? '#10B981' : '#E5E7EB'}
              className="cursor-pointer hover:fill-green-400 transition-colors"
              onClick={() => handlePartClick('part2')}
            />
            <polygon
              points="150,200 200,250 100,250"
              fill={selectedParts.includes('part3') ? '#F59E0B' : '#E5E7EB'}
              className="cursor-pointer hover:fill-yellow-400 transition-colors"
              onClick={() => handlePartClick('part3')}
            />
          </svg>
        </div>
        
        <div className="diagram-info mt-4">
          <h4 className="font-semibold mb-2">Selected Parts:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedParts.map(partId => (
              <span key={partId} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {partId}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  const renderInteractiveTimeline = () => {
    const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
    const events = content.content.timeline?.events || []
    
    return (
      <div className="interactive-timeline">
        <div className="timeline-container relative">
          <div className="timeline-line absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          
          {events.map((event: any, index: number) => (
            <div
              key={index}
              className={`timeline-event relative pl-12 pb-8 cursor-pointer ${
                selectedEvent === index ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                setSelectedEvent(selectedEvent === index ? null : index)
                setInteractionCount(prev => prev + 1)
              }}
            >
              <div className="timeline-marker absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
              <div className="timeline-content">
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-sm text-gray-600">{event.date}</p>
                {selectedEvent === index && (
                  <p className="mt-2 text-gray-700">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const renderInteractiveMap = () => {
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
    
    return (
      <div className="interactive-map">
        <div className="map-container bg-blue-50 rounded-lg p-4">
          <svg viewBox="0 0 400 300" className="w-full h-64">
            {/* Simplified world map regions */}
            <path
              d="M50,100 L150,80 L180,120 L120,150 Z"
              fill={selectedRegion === 'region1' ? '#3B82F6' : '#94A3B8'}
              className="cursor-pointer hover:fill-blue-400 transition-colors"
              onClick={() => {
                setSelectedRegion('region1')
                setInteractionCount(prev => prev + 1)
              }}
            />
            <path
              d="M200,90 L300,85 L320,140 L250,160 Z"
              fill={selectedRegion === 'region2' ? '#10B981' : '#94A3B8'}
              className="cursor-pointer hover:fill-green-400 transition-colors"
              onClick={() => {
                setSelectedRegion('region2')
                setInteractionCount(prev => prev + 1)
              }}
            />
          </svg>
        </div>
        
        {selectedRegion && (
          <div className="region-info mt-4 p-4 bg-white border border-gray-300 rounded-lg">
            <h4 className="font-semibold">Region Information</h4>
            <p className="text-gray-700 mt-2">
              Information about {selectedRegion} would be displayed here.
            </p>
          </div>
        )}
      </div>
    )
  }
  
  const renderSteppedContent = () => {
    const steps = content.content.steps || []
    if (steps.length === 0) return null
    
    const currentStepData = steps[currentStep]
    
    return (
      <div className="stepped-content">
        <div className="step-header flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            Step {currentStep + 1} of {steps.length}: {currentStepData.title}
          </h3>
          
          <div className="step-progress">
            <div className="flex space-x-1">
              {steps.map((_: any, index: number) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="step-content mb-6">
          <p className="text-gray-700 mb-4">{currentStepData.description}</p>
          
          {currentStepData.input && (
            <div className="step-input">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {currentStepData.input.label}
              </label>
              
              {currentStepData.input.type === 'text' && (
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder={currentStepData.input.placeholder}
                  value={userInputs[currentStepData.input.key] || ''}
                  onChange={(e) => handleUserInput(currentStepData.input.key, e.target.value)}
                />
              )}
              
              {currentStepData.input.type === 'select' && (
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={userInputs[currentStepData.input.key] || ''}
                  onChange={(e) => handleUserInput(currentStepData.input.key, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {currentStepData.input.options.map((option: any, index: number) => (
                    <option key={index} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        
        <div className="step-navigation flex items-center justify-between">
          <button
            onClick={() => handleStepNavigation('prev')}
            disabled={currentStep === 0}
            className="btn btn-ghost"
          >
            ← Previous
          </button>
          
          {showHints && currentStepData.hint && (
            <div className="hint bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-4 flex-1">
              <p className="text-sm text-yellow-800">💡 {currentStepData.hint}</p>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {currentStepData.hint && (
              <button
                onClick={() => setShowHints(!showHints)}
                className="btn btn-ghost btn-sm"
              >
                💡 Hint
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => handleStepNavigation('next')}
                className="btn btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="btn btn-success"
                disabled={isCompleted}
              >
                {isCompleted ? '✓ Completed' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'max-w-5xl mx-auto'
      case 'immersive':
        return 'w-full min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  return (
    <div className={`interactive-content p-6 ${getViewModeClasses()}`}>
      {/* Content Title */}
      {content.title && (
        <h2 className={`font-bold mb-6 ${
          viewMode === 'presentation' ? 'text-3xl' : 
          viewMode === 'immersive' ? 'text-4xl text-center' : 'text-2xl'
        }`}>
          {content.title}
        </h2>
      )}
      
      {/* Interactive Elements */}
      {content.content.type === 'simulation' && renderSimulation()}
      {content.content.type === 'steps' && renderSteppedContent()}
      
      {/* Interaction Summary */}
      {interactionCount > 0 && (
        <div className="interaction-summary mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            Great job! You've made {interactionCount} interactions with this content.
            {isCompleted && ' 🎉 Activity completed!'}
          </p>
        </div>
      )}
      
      {/* Offline Notice */}
      {isOffline && (
        <div className="offline-notice mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-sm">
            ⚠️ Some interactive features may be limited in offline mode.
          </p>
        </div>
      )}
    </div>
  )
}