import React, { useState, useEffect } from 'react'
import { collaborationAPI } from '../../../services/api/collaborationAPI'
import { DashboardWidget } from '../DashboardWidget'

interface StudyBuddy {
  userId: string
  userName: string
  avatar?: string
  status: 'online' | 'offline' | 'studying'
  currentActivity?: string
}

interface RecentActivity {
  id: string
  type: 'discussion' | 'recognition' | 'study_group'
  title: string
  user: string
  timestamp: string
}

export const SocialWidget: React.FC = () => {
  const [studyBuddies, setStudyBuddies] = useState<StudyBuddy[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [activeTab, setActiveTab] = useState<'buddies' | 'activity'>('buddies')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSocialData()
  }, [])

  const loadSocialData = async () => {
    setIsLoading(true)
    try {
      const buddies = await collaborationAPI.getStudyBuddies()
      setStudyBuddies(buddies.slice(0, 4)) // Show only first 4

      // Mock recent activity - in real implementation, this would come from an API
      setRecentActivity([
        {
          id: '1',
          type: 'discussion',
          title: 'New discussion in Math Study Group',
          user: 'Alice Smith',
          timestamp: '2 hours ago'
        },
        {
          id: '2',
          type: 'recognition',
          title: 'You received recognition for being helpful',
          user: 'John Doe',
          timestamp: '4 hours ago'
        },
        {
          id: '3',
          type: 'study_group',
          title: 'Physics Study Group meeting tomorrow',
          user: 'Mike Brown',
          timestamp: '6 hours ago'
        }
      ])
    } catch (error) {
      console.error('Failed to load social data:', error)
    } finally {
      setIsLoading(false)
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'discussion': return '💬'
      case 'recognition': return '⭐'
      case 'study_group': return '👥'
      default: return '📝'
    }
  }

  if (isLoading) {
    return (
      <DashboardWidget title="Social Learning" className="h-64">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget title="Social Learning" className="h-64">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('buddies')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'buddies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Study Buddies
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 text-sm font-medium ${
              activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent Activity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'buddies' && (
            <div className="space-y-3">
              {studyBuddies.length > 0 ? (
                studyBuddies.map(buddy => (
                  <div key={buddy.userId} className="flex items-center space-x-3">
                    <div className="relative">
                      {buddy.avatar ? (
                        <img
                          src={buddy.avatar}
                          alt={buddy.userName}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                          {buddy.userName[0].toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(buddy.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{buddy.userName}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {buddy.status === 'studying' && buddy.currentActivity
                          ? buddy.currentActivity
                          : buddy.status}
                      </div>
                    </div>
                    <button className="text-xs text-blue-600 hover:text-blue-800">
                      Message
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500 mb-2">No study buddies yet</div>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    Find study buddies
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="text-lg">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{activity.title}</div>
                    <div className="text-xs text-gray-500">
                      {activity.user} • {activity.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button className="flex-1 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">
              Join Study Group
            </button>
            <button className="flex-1 px-3 py-2 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100">
              Start Discussion
            </button>
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
}