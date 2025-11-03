import React, { useState, useEffect } from 'react'
import { collaborationAPI, StudyGroupCreationRequest } from '../../services/api/collaborationAPI'
import { StudyGroup } from '../../types'

interface StudyGroupManagerProps {
  onGroupSelected: (group: StudyGroup) => void
}

export const StudyGroupManager: React.FC<StudyGroupManagerProps> = ({
  onGroupSelected
}) => {
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPublic, setFilterPublic] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    loadStudyGroups()
  }, [searchTerm, filterPublic])

  const loadStudyGroups = async () => {
    setIsLoading(true)
    try {
      const response = await collaborationAPI.getStudyGroups({
        search: searchTerm || undefined,
        isPublic: filterPublic,
        limit: 20
      })
      setStudyGroups(response.data)
    } catch (error) {
      console.error('Failed to load study groups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    try {
      await collaborationAPI.joinStudyGroup(groupId)
      loadStudyGroups() // Refresh the list
    } catch (error) {
      console.error('Failed to join study group:', error)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    try {
      await collaborationAPI.leaveStudyGroup(groupId)
      loadStudyGroups() // Refresh the list
    } catch (error) {
      console.error('Failed to leave study group:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Study Groups</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Group
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search study groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterPublic === undefined ? 'all' : filterPublic ? 'public' : 'private'}
          onChange={(e) => {
            const value = e.target.value
            setFilterPublic(value === 'all' ? undefined : value === 'public')
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Groups</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* Study Groups List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studyGroups.map(group => (
            <StudyGroupCard
              key={group.id}
              group={group}
              onJoin={() => handleJoinGroup(group.id)}
              onLeave={() => handleLeaveGroup(group.id)}
              onSelect={() => onGroupSelected(group)}
            />
          ))}
        </div>
      )}

      {studyGroups.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No study groups found</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First Group
          </button>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateForm && (
        <CreateStudyGroupModal
          onClose={() => setShowCreateForm(false)}
          onCreated={(group) => {
            setStudyGroups(prev => [group, ...prev])
            setShowCreateForm(false)
          }}
        />
      )}
    </div>
  )
}

interface StudyGroupCardProps {
  group: StudyGroup
  onJoin: () => void
  onLeave: () => void
  onSelect: () => void
}

const StudyGroupCard: React.FC<StudyGroupCardProps> = ({
  group,
  onJoin,
  onLeave,
  onSelect
}) => {
  const currentUserId = 'current-user-id' // This would come from auth context
  const isMember = group.members.some(member => member.userId === currentUserId)
  const memberCount = group.members.length

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600" onClick={onSelect}>
          {group.name}
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          group.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {group.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {group.description}
      </p>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>{memberCount}/{group.maxMembers} members</span>
        <span>{new Date(group.lastActivity).toLocaleDateString()}</span>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onSelect}
          className="flex-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          View
        </button>
        {isMember ? (
          <button
            onClick={onLeave}
            className="px-3 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
          >
            Leave
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={memberCount >= group.maxMembers}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join
          </button>
        )}
      </div>
    </div>
  )
}

interface CreateStudyGroupModalProps {
  onClose: () => void
  onCreated: (group: StudyGroup) => void
}

const CreateStudyGroupModal: React.FC<CreateStudyGroupModalProps> = ({
  onClose,
  onCreated
}) => {
  const [formData, setFormData] = useState<StudyGroupCreationRequest>({
    name: '',
    description: '',
    courseId: '',
    isPublic: true,
    maxMembers: 10
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const group = await collaborationAPI.createStudyGroup(formData)
      onCreated(group)
    } catch (error) {
      console.error('Failed to create study group:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Study Group</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course
            </label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a course</option>
              <option value="math-101">Mathematics 101</option>
              <option value="physics-201">Physics 201</option>
              <option value="chemistry-101">Chemistry 101</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Members
            </label>
            <select
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 members</option>
              <option value={10}>10 members</option>
              <option value={15}>15 members</option>
              <option value={20}>20 members</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this group public
            </label>
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
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}