import React, { useState, useEffect } from 'react';
import { Message, Announcement, MessageType, MessagePriority } from '../../types';

const CommunicationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadCommunications();
  }, []);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: 'teacher-1',
          recipientIds: ['parent-1'],
          subject: 'Emma\'s Progress Update',
          content: 'I wanted to update you on Emma\'s excellent progress in Algebra. She has been consistently performing well and shows great understanding of the concepts.',
          type: 'direct',
          priority: 'normal',
          attachments: [],
          sentAt: new Date('2024-01-15T10:30:00Z'),
          readBy: [{ userId: 'parent-1', readAt: new Date('2024-01-15T11:00:00Z') }],
          tags: ['progress', 'positive']
        },
        {
          id: '2',
          senderId: 'parent-2',
          recipientIds: ['teacher-1'],
          subject: 'Michael\'s Math Struggles',
          content: 'Hi, I\'ve noticed Michael is having difficulty with his math homework. Could we schedule a meeting to discuss strategies to help him?',
          type: 'direct',
          priority: 'high',
          attachments: [],
          sentAt: new Date('2024-01-14T16:45:00Z'),
          readBy: [],
          tags: ['concern', 'meeting-request']
        }
      ];

      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'Upcoming Parent-Teacher Conferences',
          content: 'Parent-teacher conferences are scheduled for next week. Please sign up for your preferred time slot using the online booking system.',
          authorId: 'teacher-1',
          targetAudience: 'parents',
          classroomIds: ['math-101'],
          priority: 'high',
          attachments: [],
          createdAt: new Date('2024-01-10T09:00:00Z'),
          updatedAt: new Date('2024-01-10T09:00:00Z'),
          readBy: []
        },
        {
          id: '2',
          title: 'Math Test Next Friday',
          content: 'Students, don\'t forget about the algebra test next Friday. Please review chapters 3-5 and complete the practice problems.',
          authorId: 'teacher-1',
          targetAudience: 'students',
          classroomIds: ['math-101'],
          priority: 'normal',
          attachments: [],
          createdAt: new Date('2024-01-12T14:00:00Z'),
          updatedAt: new Date('2024-01-12T14:00:00Z'),
          readBy: []
        }
      ];

      setMessages(mockMessages);
      setAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Failed to load communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'direct': return '💬';
      case 'announcement': return '📢';
      case 'reminder': return '⏰';
      case 'alert': return '⚠️';
      default: return '📧';
    }
  };

  const isUnread = (message: Message) => {
    return message.readBy.length === 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Communication Center</h2>
            <p className="text-sm text-gray-600">Manage messages and announcements</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowComposeModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Compose Message
            </button>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Create Announcement
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'messages'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>💬</span>
              <span>Messages ({messages.length})</span>
              {messages.filter(isUnread).length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {messages.filter(isUnread).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === 'announcements'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>📢</span>
              <span>Announcements ({announcements.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Messages</h3>
              <div className="flex space-x-2">
                <select className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="all">All Messages</option>
                  <option value="unread">Unread</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-6 hover:bg-gray-50 cursor-pointer ${isUnread(message) ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-2xl">{getTypeIcon(message.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`text-sm font-medium text-gray-900 ${isUnread(message) ? 'font-bold' : ''}`}>
                          {message.subject}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(message.priority)}`}>
                          {message.priority}
                        </span>
                        {isUnread(message) && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{message.content}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(message.sentAt).toLocaleDateString()}</span>
                        <span>{message.attachments.length > 0 && `📎 ${message.attachments.length}`}</span>
                        {message.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {message.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      📧
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📧</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages</h3>
              <p className="text-gray-500">Messages from students and parents will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{announcement.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        {announcement.targetAudience}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{announcement.content}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                      {announcement.expiresAt && (
                        <span>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                      )}
                      <span>Read by: {announcement.readBy.length} recipients</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      ✏️
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {announcements.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📢</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
              <p className="text-gray-500">Your announcements will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Compose Message</h3>
            
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipients
                  </label>
                  <select multiple className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="parent-1">Sarah Johnson (Emma's Parent)</option>
                    <option value="parent-2">Li Chen (Michael's Parent)</option>
                    <option value="parent-3">Maria Rodriguez (Sophia's Parent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Enter message subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  rows={6}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments
                </label>
                <input
                  type="file"
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Announcement</h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Enter announcement title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All</option>
                    <option value="students">Students</option>
                    <option value="parents">Parents</option>
                    <option value="specific">Specific Groups</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter announcement content..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule For (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Create Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedMessage.priority)}`}>
                  {selectedMessage.priority}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(selectedMessage.sentAt).toLocaleString()}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800">{selectedMessage.content}</p>
              </div>

              {selectedMessage.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
                  <div className="space-y-1">
                    {selectedMessage.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-sm text-blue-600">
                        <span>📎</span>
                        <span>{attachment.filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                  Reply
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationCenter;