import React, { useState, useEffect } from 'react'
import { collaborationAPI } from '../../services/api/collaborationAPI'

interface StudyBuddy {
  userId: string
  userName: string
  avatar?: string
  status: 'online' | 'offline' | 'studying'
  currentActivity?: string
  connectedAt: string
}

interface StudyBuddyRecommendation {
  userId: string
  userName: string
  avatar?: string
  commonCourses: string[]
  compatibilityScore: number
  learningStyle: string
  timezone: string
}

export const SocialLearning: React.FC = () => {
  const [studyBuddies, setStudyBuddies] = useState<StudyBuddy[]>([])
  const [recommendations, setRecommendations] = useState<StudyBuddyRecommendation[]>([])
  const [activeTab, setActiveTab] = useState<'buddies' | 'recommendations'>('buddies')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSocialData()
  }, [activeTab])

  const loadSocialData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'buddies') {
        const buddies = await collaborationAPI.getStudyBuddies()
        setStudyBuddies(buddies)
      } else {
        const recs = await collaborationAPI.getStudyBuddyRecommendations()
        setRecommendations(recs)
      }
    } catch (error) {
      console.error('Failed to load social data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendBuddyRequest = async (userId: string) => {
    try {
      await collaborationAPI.sendStudyBuddyRequest(userId, 'Hi! Would you like to be study buddies?')
      // Remove from recommendations after sending request
      setRecommendations(prev => prev.filter(r => r.userId !== userId))
    } catch (error) {
      console.error('Failed to send buddy request:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'studying': return 'bg-blue-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online'
      case 'studying': return 'Studying'
      case 'offline': return 'Offline'
      default: return 'Unknown'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Social Learning</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('buddies')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeTab === 'buddies'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Study Buddies
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeTab === 'recommendations'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Find Buddies
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'buddies' && (
            <div className="space-y-3">
              {studyBuddies.length > 0 ? (
                studyBuddies.map(buddy => (
                  <div key={buddy.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {buddy.avatar ? (
                          <img
                            src={buddy.avatar}
                            alt={buddy.userName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                            {buddy.userName[0].toUpperCase()}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(buddy.status)}`}></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{buddy.userName}</div>
                        <div className="text-sm text-gray-600">
                          {getStatusText(buddy.status)}
                          {buddy.currentActivity && ` • ${buddy.currentActivity}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
                        Message
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200">
                        Study Together
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">No study buddies yet</div>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Find study buddies →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map(rec => (
                  <div key={rec.userId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {rec.avatar ? (
                          <img
                            src={rec.avatar}
                            alt={rec.userName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                            {rec.userName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{rec.userName}</div>
                          <div className="text-sm text-gray-600">{rec.learningStyle} learner</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {rec.compatibilityScore}% match
                        </div>
                        <div className="text-xs text-gray-500">{rec.timezone}</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-600 mb-1">Common courses:</div>
                      <div className="flex flex-wrap gap-1">
                        {rec.commonCourses.map(course => (
                          <span key={course} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {course}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleSendBuddyRequest(rec.userId)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Send Study Buddy Request
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">No recommendations available</div>
                  <div className="text-sm text-gray-400">Complete more courses to find compatible study partners</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}