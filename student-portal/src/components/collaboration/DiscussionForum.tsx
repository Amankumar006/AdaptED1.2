import React, { useState, useEffect } from 'react'
import { collaborationAPI } from '../../services/api/collaborationAPI'
import { Discussion, DiscussionReply } from '../../types'

interface DiscussionForumProps {
  studyGroupId?: string
  courseId?: string
  lessonId?: string
}

export const DiscussionForum: React.FC<DiscussionForumProps> = ({
  studyGroupId,
  courseId,
  lessonId
}) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'open' | 'resolved' | undefined>(undefined)

  useEffect(() => {
    loadDiscussions()
  }, [studyGroupId, courseId, lessonId, searchTerm, filterStatus])

  const loadDiscussions = async () => {
    setIsLoading(true)
    try {
      const response = await collaborationAPI.getDiscussions({
        studyGroupId,
        courseId,
        lessonId,
        search: searchTerm || undefined,
        status: filterStatus,
        limit: 20
      })
      setDiscussions(response.data)
    } catch (error) {
      console.error('Failed to load discussions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDiscussion = async (data: {
    title: string
    content: string
    tags: string[]
  }) => {
    try {
      const discussion = await collaborationAPI.createDiscussion({
        ...data,
        studyGroupId,
        courseId,
        lessonId
      })
      setDiscussions(prev => [discussion, ...prev])
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create discussion:', error)
    }
  }

  const handleUpvoteDiscussion = async (discussionId: string) => {
    try {
      const result = await collaborationAPI.upvoteDiscussion(discussionId)
      setDiscussions(prev => prev.map(d => 
        d.id === discussionId ? { ...d, upvotes: result.upvotes } : d
      ))
      if (selectedDiscussion?.id === discussionId) {
        setSelectedDiscussion(prev => prev ? { ...prev, upvotes: result.upvotes } : null)
      }
    } catch (error) {
      console.error('Failed to upvote discussion:', error)
    }
  }

  if (selectedDiscussion) {
    return (
      <DiscussionDetail
        discussion={selectedDiscussion}
        onBack={() => setSelectedDiscussion(null)}
        onUpdate={(updated) => {
          setSelectedDiscussion(updated)
          setDiscussions(prev => prev.map(d => d.id === updated.id ? updated : d))
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Discussions</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Start Discussion
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus || 'all'}
          onChange={(e) => {
            const value = e.target.value
            setFilterStatus(value === 'all' ? undefined : value as 'open' | 'resolved')
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Discussions</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Discussions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map(discussion => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              onClick={() => setSelectedDiscussion(discussion)}
              onUpvote={() => handleUpvoteDiscussion(discussion.id)}
            />
          ))}
        </div>
      )}

      {discussions.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No discussions found</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start the First Discussion
          </button>
        </div>
      )}

      {/* Create Discussion Modal */}
      {showCreateForm && (
        <CreateDiscussionModal
          onClose={() => setShowCreateForm(false)}
          onCreated={handleCreateDiscussion}
        />
      )}
    </div>
  )
}

interface DiscussionCardProps {
  discussion: Discussion
  onClick: () => void
  onUpvote: () => void
}

const DiscussionCard: React.FC<DiscussionCardProps> = ({
  discussion,
  onClick,
  onUpvote
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 
          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex-1"
          onClick={onClick}
        >
          {discussion.title}
        </h3>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 text-xs rounded-full ${
            discussion.isResolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {discussion.isResolved ? 'Resolved' : 'Open'}
          </span>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {discussion.content}
      </p>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>By {discussion.author}</span>
          <span>{discussion.replies.length} replies</span>
          <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {discussion.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
              {tag}
            </span>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpvote()
            }}
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
          >
            <span>👍</span>
            <span>{discussion.upvotes}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface DiscussionDetailProps {
  discussion: Discussion
  onBack: () => void
  onUpdate: (discussion: Discussion) => void
}

const DiscussionDetail: React.FC<DiscussionDetailProps> = ({
  discussion,
  onBack,
  onUpdate
}) => {
  const [newReply, setNewReply] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim()) return

    setIsSubmitting(true)
    try {
      const reply = await collaborationAPI.createReply(discussion.id, {
        content: newReply
      })
      
      const updatedDiscussion = {
        ...discussion,
        replies: [...discussion.replies, reply]
      }
      onUpdate(updatedDiscussion)
      setNewReply('')
    } catch (error) {
      console.error('Failed to submit reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpvoteReply = async (replyId: string) => {
    try {
      const result = await collaborationAPI.upvoteReply(discussion.id, replyId)
      const updatedDiscussion = {
        ...discussion,
        replies: discussion.replies.map(r => 
          r.id === replyId ? { ...r, upvotes: result.upvotes } : r
        )
      }
      onUpdate(updatedDiscussion)
    } catch (error) {
      console.error('Failed to upvote reply:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{discussion.title}</h1>
      </div>

      {/* Original Post */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {discussion.author[0].toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900">{discussion.author}</div>
              <div className="text-sm text-gray-500">{new Date(discussion.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            discussion.isResolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {discussion.isResolved ? 'Resolved' : 'Open'}
          </span>
        </div>

        <div className="prose max-w-none mb-4">
          {discussion.content}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {discussion.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
          <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600">
            <span>👍</span>
            <span>{discussion.upvotes}</span>
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Replies ({discussion.replies.length})
        </h3>
        
        {discussion.replies.map(reply => (
          <div key={reply.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm">
                  {reply.author[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{reply.author}</div>
                  <div className="text-sm text-gray-500">{new Date(reply.createdAt).toLocaleString()}</div>
                </div>
              </div>
              {reply.isAccepted && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Accepted Answer
                </span>
              )}
            </div>

            <div className="prose max-w-none mb-3">
              {reply.content}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleUpvoteReply(reply.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
              >
                <span>👍</span>
                <span>{reply.upvotes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h4>
        <form onSubmit={handleSubmitReply}>
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write your reply..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !newReply.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CreateDiscussionModalProps {
  onClose: () => void
  onCreated: (data: { title: string; content: string; tags: string[] }) => void
}

const CreateDiscussionModal: React.FC<CreateDiscussionModalProps> = ({
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onCreated({
        title,
        content,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
    } catch (error) {
      console.error('Failed to create discussion:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Discussion</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., homework, algebra, help"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {isSubmitting ? 'Creating...' : 'Create Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}