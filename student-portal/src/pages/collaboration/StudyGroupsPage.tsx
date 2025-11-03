import React, { useState } from 'react'
import { StudyGroupManager } from '../../components/collaboration/StudyGroupManager'
import { DiscussionForum } from '../../components/collaboration/DiscussionForum'
import { StudyGroup } from '../../types'

type ViewMode = 'groups' | 'group-detail' | 'discussions'

export const StudyGroupsPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('groups')
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null)

  const handleGroupSelected = (group: StudyGroup) => {
    setSelectedGroup(group)
    setViewMode('group-detail')
  }

  const handleBackToGroups = () => {
    setViewMode('groups')
    setSelectedGroup(null)
  }

  const handleViewDiscussions = () => {
    setViewMode('discussions')
  }

  return (
    <div className="space-y-6">
      {viewMode === 'groups' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
            <p className="mt-2 text-gray-600">Join and manage study groups</p>
          </div>
          
          <StudyGroupManager onGroupSelected={handleGroupSelected} />
        </>
      )}

      {viewMode === 'group-detail' && selectedGroup && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToGroups}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Groups
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h1>
                <p className="text-gray-600">{selectedGroup.description}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleViewDiscussions}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                View Discussions
              </button>
            </div>
          </div>

          {/* Group Info */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600 mt-1">{selectedGroup.description}</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Members:</span>
                    <span className="text-gray-600">{selectedGroup.members.length}/{selectedGroup.maxMembers}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedGroup.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedGroup.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Activity:</span>
                    <span className="text-gray-600">{new Date(selectedGroup.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      JD
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">John Doe started a new discussion</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                      AS
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Alice Smith shared study notes</div>
                      <div className="text-xs text-gray-500">5 hours ago</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                      MB
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Mike Brown joined the group</div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
                <div className="space-y-3">
                  {selectedGroup.members.map(member => (
                    <div key={member.userId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">
                          {member.userId.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">User {member.userId}</div>
                          <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        member.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleViewDiscussions}
                    className="w-full px-4 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <div className="font-medium text-blue-900">View Discussions</div>
                    <div className="text-sm text-blue-700">Join group conversations</div>
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left bg-green-50 hover:bg-green-100 rounded-md transition-colors">
                    <div className="font-medium text-green-900">Schedule Study Session</div>
                    <div className="text-sm text-green-700">Plan group study time</div>
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left bg-purple-50 hover:bg-purple-100 rounded-md transition-colors">
                    <div className="font-medium text-purple-900">Share Resources</div>
                    <div className="text-sm text-purple-700">Upload study materials</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'discussions' && selectedGroup && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('group-detail')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to {selectedGroup.name}
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Group Discussions</h1>
          </div>
          
          <DiscussionForum studyGroupId={selectedGroup.id} />
        </div>
      )}
    </div>
  )
}