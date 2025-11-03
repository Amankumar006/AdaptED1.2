import { apiClient } from './client'
import { 
  StudyGroup, 
  StudyGroupMember,
  Discussion,
  DiscussionReply,
  ApiResponse,
  PaginatedResponse 
} from '../../types'

export interface StudyGroupCreationRequest {
  name: string
  description: string
  courseId: string
  isPublic: boolean
  maxMembers: number
  tags?: string[]
}

export interface PeerTutoringSession {
  id: string
  tutorId: string
  studentId: string
  topicId: string
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  scheduledAt: string
  duration: number
  notes?: string
  rating?: number
  feedback?: string
  createdAt: string
}

export interface PeerRecognition {
  id: string
  fromUserId: string
  toUserId: string
  type: 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative'
  message: string
  contextId?: string
  contextType?: 'discussion' | 'study_group' | 'tutoring'
  createdAt: string
}

class CollaborationAPI {
  // Study Groups
  async createStudyGroup(data: StudyGroupCreationRequest): Promise<StudyGroup> {
    const response = await apiClient.post<ApiResponse<StudyGroup>>('/collaboration/study-groups', data)
    return response.data
  }

  async getStudyGroups(params?: {
    courseId?: string
    isPublic?: boolean
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<StudyGroup>> {
    const response = await apiClient.get<PaginatedResponse<StudyGroup>>('/collaboration/study-groups', {
      params,
    })
    return response
  }

  async getStudyGroup(groupId: string): Promise<StudyGroup> {
    const response = await apiClient.get<ApiResponse<StudyGroup>>(`/collaboration/study-groups/${groupId}`)
    return response.data
  }

  async joinStudyGroup(groupId: string): Promise<StudyGroupMember> {
    const response = await apiClient.post<ApiResponse<StudyGroupMember>>(`/collaboration/study-groups/${groupId}/join`)
    return response.data
  }

  async leaveStudyGroup(groupId: string): Promise<void> {
    await apiClient.post(`/collaboration/study-groups/${groupId}/leave`)
  }

  async updateStudyGroup(groupId: string, data: Partial<StudyGroupCreationRequest>): Promise<StudyGroup> {
    const response = await apiClient.patch<ApiResponse<StudyGroup>>(`/collaboration/study-groups/${groupId}`, data)
    return response.data
  }

  async deleteStudyGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/collaboration/study-groups/${groupId}`)
  }

  async inviteToStudyGroup(groupId: string, userIds: string[]): Promise<void> {
    await apiClient.post(`/collaboration/study-groups/${groupId}/invite`, { userIds })
  }

  async updateMemberRole(groupId: string, userId: string, role: 'owner' | 'moderator' | 'member'): Promise<void> {
    await apiClient.patch(`/collaboration/study-groups/${groupId}/members/${userId}`, { role })
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await apiClient.delete(`/collaboration/study-groups/${groupId}/members/${userId}`)
  }

  // Discussions
  async createDiscussion(data: {
    title: string
    content: string
    courseId?: string
    lessonId?: string
    studyGroupId?: string
    tags?: string[]
  }): Promise<Discussion> {
    const response = await apiClient.post<ApiResponse<Discussion>>('/collaboration/discussions', data)
    return response.data
  }

  async getDiscussions(params?: {
    courseId?: string
    lessonId?: string
    studyGroupId?: string
    search?: string
    tags?: string[]
    status?: 'open' | 'resolved'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Discussion>> {
    const response = await apiClient.get<PaginatedResponse<Discussion>>('/collaboration/discussions', {
      params,
    })
    return response
  }

  async getDiscussion(discussionId: string): Promise<Discussion> {
    const response = await apiClient.get<ApiResponse<Discussion>>(`/collaboration/discussions/${discussionId}`)
    return response.data
  }

  async updateDiscussion(discussionId: string, data: {
    title?: string
    content?: string
    tags?: string[]
  }): Promise<Discussion> {
    const response = await apiClient.patch<ApiResponse<Discussion>>(`/collaboration/discussions/${discussionId}`, data)
    return response.data
  }

  async deleteDiscussion(discussionId: string): Promise<void> {
    await apiClient.delete(`/collaboration/discussions/${discussionId}`)
  }

  async upvoteDiscussion(discussionId: string): Promise<{ upvotes: number }> {
    const response = await apiClient.post<ApiResponse<{ upvotes: number }>>(`/collaboration/discussions/${discussionId}/upvote`)
    return response.data
  }

  async markDiscussionResolved(discussionId: string): Promise<void> {
    await apiClient.post(`/collaboration/discussions/${discussionId}/resolve`)
  }

  // Discussion Replies
  async createReply(discussionId: string, data: {
    content: string
    parentId?: string
  }): Promise<DiscussionReply> {
    const response = await apiClient.post<ApiResponse<DiscussionReply>>(`/collaboration/discussions/${discussionId}/replies`, data)
    return response.data
  }

  async updateReply(discussionId: string, replyId: string, content: string): Promise<DiscussionReply> {
    const response = await apiClient.patch<ApiResponse<DiscussionReply>>(`/collaboration/discussions/${discussionId}/replies/${replyId}`, { content })
    return response.data
  }

  async deleteReply(discussionId: string, replyId: string): Promise<void> {
    await apiClient.delete(`/collaboration/discussions/${discussionId}/replies/${replyId}`)
  }

  async upvoteReply(discussionId: string, replyId: string): Promise<{ upvotes: number }> {
    const response = await apiClient.post<ApiResponse<{ upvotes: number }>>(`/collaboration/discussions/${discussionId}/replies/${replyId}/upvote`)
    return response.data
  }

  async acceptReply(discussionId: string, replyId: string): Promise<void> {
    await apiClient.post(`/collaboration/discussions/${discussionId}/replies/${replyId}/accept`)
  }

  // Peer Tutoring
  async requestTutoring(data: {
    topicId: string
    description: string
    preferredTime: string
    duration: number
  }): Promise<PeerTutoringSession> {
    const response = await apiClient.post<ApiResponse<PeerTutoringSession>>('/collaboration/tutoring/request', data)
    return response.data
  }

  async getTutoringRequests(params?: {
    status?: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
    role?: 'tutor' | 'student'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<PeerTutoringSession>> {
    const response = await apiClient.get<PaginatedResponse<PeerTutoringSession>>('/collaboration/tutoring/requests', {
      params,
    })
    return response
  }

  async acceptTutoringRequest(sessionId: string): Promise<PeerTutoringSession> {
    const response = await apiClient.post<ApiResponse<PeerTutoringSession>>(`/collaboration/tutoring/requests/${sessionId}/accept`)
    return response.data
  }

  async declineTutoringRequest(sessionId: string, reason?: string): Promise<void> {
    await apiClient.post(`/collaboration/tutoring/requests/${sessionId}/decline`, { reason })
  }

  async startTutoringSession(sessionId: string): Promise<PeerTutoringSession> {
    const response = await apiClient.post<ApiResponse<PeerTutoringSession>>(`/collaboration/tutoring/sessions/${sessionId}/start`)
    return response.data
  }

  async completeTutoringSession(sessionId: string, data: {
    notes?: string
    rating: number
    feedback: string
  }): Promise<PeerTutoringSession> {
    const response = await apiClient.post<ApiResponse<PeerTutoringSession>>(`/collaboration/tutoring/sessions/${sessionId}/complete`, data)
    return response.data
  }

  async cancelTutoringSession(sessionId: string, reason: string): Promise<void> {
    await apiClient.post(`/collaboration/tutoring/sessions/${sessionId}/cancel`, { reason })
  }

  // Peer Recognition
  async givePeerRecognition(data: {
    toUserId: string
    type: 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative'
    message: string
    contextId?: string
    contextType?: 'discussion' | 'study_group' | 'tutoring'
  }): Promise<PeerRecognition> {
    const response = await apiClient.post<ApiResponse<PeerRecognition>>('/collaboration/recognition', data)
    return response.data
  }

  async getPeerRecognitions(params?: {
    userId?: string
    type?: 'helpful' | 'knowledgeable' | 'supportive' | 'collaborative'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<PeerRecognition>> {
    const response = await apiClient.get<PaginatedResponse<PeerRecognition>>('/collaboration/recognition', {
      params,
    })
    return response
  }

  // Social Learning Features
  async getStudyBuddyRecommendations(): Promise<Array<{
    userId: string
    userName: string
    avatar?: string
    commonCourses: string[]
    compatibilityScore: number
    learningStyle: string
    timezone: string
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      userId: string
      userName: string
      avatar?: string
      commonCourses: string[]
      compatibilityScore: number
      learningStyle: string
      timezone: string
    }>>>('/collaboration/study-buddy-recommendations')
    return response.data
  }

  async sendStudyBuddyRequest(userId: string, message?: string): Promise<void> {
    await apiClient.post('/collaboration/study-buddy-request', { userId, message })
  }

  async respondToStudyBuddyRequest(requestId: string, accept: boolean): Promise<void> {
    await apiClient.post(`/collaboration/study-buddy-request/${requestId}/respond`, { accept })
  }

  async getStudyBuddies(): Promise<Array<{
    userId: string
    userName: string
    avatar?: string
    status: 'online' | 'offline' | 'studying'
    currentActivity?: string
    connectedAt: string
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      userId: string
      userName: string
      avatar?: string
      status: 'online' | 'offline' | 'studying'
      currentActivity?: string
      connectedAt: string
    }>>>('/collaboration/study-buddies')
    return response.data
  }

  // Collaboration Analytics
  async getCollaborationStats(): Promise<{
    studyGroupsJoined: number
    discussionsParticipated: number
    helpfulVotes: number
    tutoringSessionsCompleted: number
    recognitionsReceived: number
    collaborationScore: number
    topContributions: Array<{
      type: 'discussion' | 'reply' | 'tutoring'
      title: string
      upvotes: number
      date: string
    }>
  }> {
    const response = await apiClient.get<ApiResponse<{
      studyGroupsJoined: number
      discussionsParticipated: number
      helpfulVotes: number
      tutoringSessionsCompleted: number
      recognitionsReceived: number
      collaborationScore: number
      topContributions: Array<{
        type: 'discussion' | 'reply' | 'tutoring'
        title: string
        upvotes: number
        date: string
      }>
    }>>('/collaboration/stats')
    return response.data
  }
}

export const collaborationAPI = new CollaborationAPI()
export default collaborationAPI