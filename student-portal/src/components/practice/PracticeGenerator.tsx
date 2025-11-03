import React, { useState, useEffect } from 'react'
import { practiceAPI, PracticeGenerationRequest } from '../../services/api/practiceAPI'
import { PracticeSession } from '../../types'

interface PracticeGeneratorProps {
  onSessionGenerated: (session: PracticeSession) => void
  onError: (error: string) => void
}

export const PracticeGenerator: React.FC<PracticeGeneratorProps> = ({
  onSessionGenerated,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [topics, setTopics] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState<PracticeGenerationRequest>({
    topicId: '',
    difficulty: 'medium',
    questionCount: 10,
    questionTypes: ['multiple_choice', 'true_false']
  })

  useEffect(() => {
    // Mock topics - in real implementation, fetch from API
    setTopics([
      { id: 'math-algebra', name: 'Algebra' },
      { id: 'math-geometry', name: 'Geometry' },
      { id: 'science-physics', name: 'Physics' },
      { id: 'science-chemistry', name: 'Chemistry' },
      { id: 'english-grammar', name: 'Grammar' },
      { id: 'history-world', name: 'World History' }
    ])
  }, [])

  const handleGenerate = async () => {
    if (!formData.topicId) {
      onError('Please select a topic')
      return
    }

    setIsGenerating(true)
    try {
      const session = await practiceAPI.generatePracticeSession(formData)
      onSessionGenerated(session)
    } catch (error: any) {
      onError(error.message || 'Failed to generate practice session')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQuestionTypeToggle = (type: string) => {
    const currentTypes = formData.questionTypes || []
    const newTypes = currentTypes.includes(type as any)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type as any]
    
    setFormData({ ...formData, questionTypes: newTypes })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Practice Session</h3>
      
      <div className="space-y-4">
        {/* Topic Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic
          </label>
          <select
            value={formData.topicId}
            onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a topic</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty
          </label>
          <div className="flex space-x-4">
            {['easy', 'medium', 'hard'].map(difficulty => (
              <label key={difficulty} className="flex items-center">
                <input
                  type="radio"
                  name="difficulty"
                  value={difficulty}
                  checked={formData.difficulty === difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="mr-2"
                />
                <span className="capitalize">{difficulty}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <select
            value={formData.questionCount}
            onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
          </select>
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Types
          </label>
          <div className="space-y-2">
            {[
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'true_false', label: 'True/False' },
              { value: 'fill_blank', label: 'Fill in the Blank' },
              { value: 'essay', label: 'Short Answer' }
            ].map(type => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.questionTypes?.includes(type.value as any) || false}
                  onChange={() => handleQuestionTypeToggle(type.value)}
                  className="mr-2"
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !formData.topicId}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            'Generate Practice Session'
          )}
        </button>
      </div>
    </div>
  )
}