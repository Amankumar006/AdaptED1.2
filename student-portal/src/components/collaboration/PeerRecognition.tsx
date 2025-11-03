import React, { useState, useEffect } from 'react'
import { collaborationAPI, PeerRecognition as PeerRecognitionType } from '../../services/api/collaborationAPI'

interface PeerRecognitionProps {
  contextId?: string
  contextType?: 'discussion' | 'study_group' | 'tutoring'
}

export const PeerRecognition: React.FC<PeerRecognitionProps> = ({
  contextId,
  contextType
}) => {
  const [recognitions, setRecognitions] = useState<PeerRecognitionType[]>([])
  const [showGiveForm, setShowGiveForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecognitions()
  }, [])

  const loadRecognitions = async () => {
    setIsLoading(true)
    try {
      const response = await collaborationAPI.getPeerRecognitions({ limit: 10 })
      setRecognitions(response.data)
    } catch (error) {
      console.error('Failed to load peer recognitions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGiveRecognition = async (data: {
    toUserId: string
    type: 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative'
    message: string
  }) => {
    try {
      const recognition = await collaborationAPI.givePeerRecognition({
        ...data,
        contextId,
        contextType
      })
      setRecognitions(prev => [recognition, ...prev])
      setShowGiveForm(false)
    } catch (error) {
      console.error('Failed to give recognition:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Peer Recognition</h3>
        <button
          onClick={() => setShowGiveForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Give Recognition
        </button>
      </div>

      {/* Recognition Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {recognitions.map(recognition => (
            <RecognitionCard key={recognition.id} recognition={recognition} />
          ))}
        </div>
      )}

      {recognitions.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No recognitions yet</div>
          <button
            onClick={() => setShowGiveForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Give the First Recognition
          </button>
        </div>
      )}

      {/* Give Recognition Modal */}
      {showGiveForm && (
        <GiveRecognitionModal
          onClose={() => setShowGiveForm(false)}
          onSubmit={handleGiveRecognition}
        />
      )}
    </div>
  )
}

interface RecognitionCardProps {
  recognition: PeerRecognitionType
}

const RecognitionCard: React.FC<RecognitionCardProps> = ({ recognition }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'helpful': return '🤝'
      case 'knowledgeable': return '🧠'
      case 'supportive': return '💪'
      case 'collaborative': return '👥'
      default: return '⭐'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'helpful': return 'bg-blue-100 text-blue-800'
      case 'knowledgeable': return 'bg-green-100 text-green-800'
      case 'supportive': return 'bg-purple-100 text-purple-800'
      case 'collaborative': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start space-x-4">
        <div className="text-2xl">{getTypeIcon(recognition.type)}</div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-gray-900">
              User {recognition.fromUserId}
            </span>
            <span className="text-gray-500">recognized</span>
            <span className="font-medium text-gray-900">
              User {recognition.toUserId}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(recognition.type)}`}>
              {recognition.type}
            </span>
          </div>
          
          <p className="text-gray-700 mb-3">{recognition.message}</p>
          
          <div className="text-sm text-gray-500">
            {new Date(recognition.createdAt).toLocaleDateString()}
            {recognition.contextType && (
              <span className="ml-2">• in {recognition.contextType.replace('_', ' ')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface GiveRecognitionModalProps {
  onClose: () => void
  onSubmit: (data: {
    toUserId: string
    type: 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative'
    message: string
  }) => void
}

const GiveRecognitionModal: React.FC<GiveRecognitionModalProps> = ({
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    toUserId: '',
    type: 'helpful' as 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Failed to submit recognition:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Give Recognition</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recognize User
            </label>
            <select
              value={formData.toUserId}
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a user</option>
              <option value="user-1">John Doe</option>
              <option value="user-2">Alice Smith</option>
              <option value="user-3">Mike Brown</option>
              <option value="user-4">Sarah Wilson</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recognition Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'helpful', label: '🤝 Helpful', desc: 'Always ready to help others' },
                { value: 'knowledgeable', label: '🧠 Knowledgeable', desc: 'Shares great insights' },
                { value: 'supportive', label: '💪 Supportive', desc: 'Encourages and motivates' },
                { value: 'collaborative', label: '👥 Collaborative', desc: 'Great team player' }
              ].map(type => (
                <label
                  key={type.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-gray-600">{type.desc}</div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Share why you're recognizing this person..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Give Recognition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}