import React, { useState } from 'react';
import { CollaborationSession } from '../../types';

interface CollaborationIndicatorProps {
  session: CollaborationSession;
}

const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({ session }) => {
  const [showDetails, setShowDetails] = useState(false);

  const onlineParticipants = session.participants.filter(p => p.isOnline);
  const offlineParticipants = session.participants.filter(p => !p.isOnline);

  const getRoleColor = (role: string) => {
    const colors = {
      owner: 'bg-blue-500',
      editor: 'bg-green-500',
      viewer: 'bg-gray-500'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      owner: '👑',
      editor: '✏️',
      viewer: '👁️'
    };
    return icons[role as keyof typeof icons] || '👤';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">
              Live Collaboration
            </span>
          </div>

          {/* Participant Avatars */}
          <div className="flex -space-x-2">
            {onlineParticipants.slice(0, 4).map((participant) => (
              <div
                key={participant.userId}
                className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${getRoleColor(participant.role)}`}
                title={`${participant.name} (${participant.role})`}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {onlineParticipants.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                +{onlineParticipants.length - 4}
              </div>
            )}
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="space-y-3">
              {/* Online Participants */}
              {onlineParticipants.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Online ({onlineParticipants.length})
                  </h4>
                  <div className="space-y-2">
                    {onlineParticipants.map((participant) => (
                      <div key={participant.userId} className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getRoleColor(participant.role)}`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {participant.name}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">
                              {getRoleIcon(participant.role)} {participant.role}
                            </span>
                            {participant.cursor && (
                              <span className="text-xs text-blue-600">
                                • editing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Participants */}
              {offlineParticipants.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Offline ({offlineParticipants.length})
                  </h4>
                  <div className="space-y-2">
                    {offlineParticipants.map((participant) => (
                      <div key={participant.userId} className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">
                            {participant.name}
                          </p>
                          <span className="text-xs text-gray-500">
                            {getRoleIcon(participant.role)} {participant.role}
                          </span>
                        </div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Info */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Session started</span>
                  <span>{new Date(session.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>Last activity</span>
                  <span>{new Date(session.lastActivity).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  Invite Others
                </button>
                <button className="flex-1 px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                  Share Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Activity Notifications */}
      <div className="mt-2 space-y-1">
        {onlineParticipants
          .filter(p => p.cursor && p.userId !== 'current-user-id') // Exclude current user
          .map((participant) => (
            <div
              key={participant.userId}
              className="bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 animate-fade-in"
            >
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <span>
                  {participant.name} is editing a module
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default CollaborationIndicator;