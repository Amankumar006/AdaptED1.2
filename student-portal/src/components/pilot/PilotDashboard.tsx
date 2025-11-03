import React, { useState, useEffect } from 'react';
import { pilotAPI, PilotCohort, PilotSession } from '../../services/api/pilotAPI';
import { pilotEngagementTracker } from '../../services/pilotEngagementTracker';
import PilotFeedbackModal from './PilotFeedbackModal';
import BuddyAIValidation from './BuddyAIValidation';
import LearningWorkflowValidation from './LearningWorkflowValidation';

interface PilotDashboardProps {
  userId: string;
  cohortId: string;
}

type ValidationMode = 'none' | 'buddyai' | 'workflow' | 'feedback';

const PilotDashboard: React.FC<PilotDashboardProps> = ({ userId, cohortId }) => {
  const [cohort, setCohort] = useState<PilotCohort | null>(null);
  const [sessions, setSessions] = useState<PilotSession[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [validationMode, setValidationMode] = useState<ValidationMode>('none');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPilotData();
    
    // Initialize engagement tracking
    pilotEngagementTracker.initialize(userId, cohortId);
    
    return () => {
      pilotEngagementTracker.stopTracking();
    };
  }, [userId, cohortId]);

  const loadPilotData = async () => {
    try {
      const [cohortData, sessionsData, analyticsData] = await Promise.all([
        pilotAPI.getCohort(cohortId),
        pilotAPI.getSessions(cohortId),
        pilotAPI.getPilotAnalytics(cohortId),
      ]);

      setCohort(cohortData);
      setSessions(sessionsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load pilot data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidationComplete = () => {
    setValidationMode('none');
    loadPilotData(); // Refresh analytics
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pilot dashboard...</p>
        </div>
      </div>
    );
  }

  if (validationMode === 'buddyai') {
    return (
      <BuddyAIValidation
        userId={userId}
        cohortId={cohortId}
        sessionId={`session-${Date.now()}`}
        onValidationComplete={handleValidationComplete}
      />
    );
  }

  if (validationMode === 'workflow') {
    return (
      <LearningWorkflowValidation
        userId={userId}
        cohortId={cohortId}
        onValidationComplete={handleValidationComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pilot Program Dashboard
              </h1>
              <p className="text-gray-600">
                {cohort?.name} • {cohort?.status}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Provide Feedback
              </button>
              <button
                onClick={() => setValidationMode('workflow')}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Validate Workflows
              </button>
              <button
                onClick={() => setValidationMode('buddyai')}
                className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-md hover:bg-purple-200"
              >
                Validate BuddyAI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pilot Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Pilot Progress
              </h2>
              
              {cohort && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pilot Duration</span>
                    <span className="font-medium">
                      {new Date(cohort.startDate).toLocaleDateString()} - {new Date(cohort.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Participants</span>
                    <span className="font-medium">{cohort.participants.length}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((Date.now() - new Date(cohort.startDate).getTime()) / (new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime())) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Sessions
              </h2>
              
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions
                    .filter(session => session.status === 'scheduled' || session.status === 'in-progress')
                    .slice(0, 3)
                    .map(session => (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{session.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>📅 {new Date(session.scheduledAt).toLocaleDateString()}</span>
                              <span>⏱️ {session.duration} minutes</span>
                              <span>👨‍🏫 {session.facilitator}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            session.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No upcoming sessions scheduled
                </p>
              )}
            </div>

            {/* Validation Tasks */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Validation Tasks
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">🤖</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">BuddyAI Validation</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Test and provide feedback on AI assistant interactions
                      </p>
                      <button
                        onClick={() => setValidationMode('buddyai')}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Start Validation →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">📚</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Learning Workflows</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Validate key learning workflows and user journeys
                      </p>
                      <button
                        onClick={() => setValidationMode('workflow')}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Start Validation →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            {analytics && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pilot Statistics
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <span className="font-medium">{analytics.activeUsers}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg. Engagement</span>
                    <span className="font-medium">{analytics.averageEngagement}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Feedback Rating</span>
                    <span className="font-medium">
                      {analytics.feedbackSummary.averageRating.toFixed(1)}/5
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Issues Reported</span>
                    <span className="font-medium text-red-600">
                      {analytics.issuesSummary.totalIssues}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setFeedbackModalOpen(true)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  💬 Submit Feedback
                </button>
                
                <button
                  onClick={() => window.open('mailto:pilot-support@enhanced-edu.com')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  📧 Contact Support
                </button>
                
                <button
                  onClick={() => pilotEngagementTracker.trackFeatureUsage('help-documentation')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  📖 View Documentation
                </button>
                
                <button
                  onClick={() => pilotEngagementTracker.trackFeatureUsage('pilot-forum')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  👥 Join Discussion Forum
                </button>
              </div>
            </div>

            {/* Pilot Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                💡 Pilot Tips
              </h3>
              
              <div className="space-y-3 text-sm text-blue-700">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Provide feedback regularly to help improve the platform</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Try different features and workflows to give comprehensive feedback</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Report any bugs or issues immediately</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Participate in scheduled sessions and discussions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <PilotFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        userId={userId}
        cohortId={cohortId}
        sessionId={`feedback-${Date.now()}`}
        context={{
          page: '/pilot-dashboard',
          feature: 'pilot-dashboard',
          sessionDuration: pilotEngagementTracker.getSessionData()?.sessionDuration || 0,
        }}
      />

      {/* Floating Feedback Button */}
      <button
        onClick={() => setFeedbackModalOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Provide feedback"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
};

export default PilotDashboard;