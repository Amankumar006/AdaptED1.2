import React, { useState } from 'react'

interface ChatSafetyProps {
  onEscalateToHuman: (reason: string) => void
  sessionId?: string
}

export const ChatSafety: React.FC<ChatSafetyProps> = ({
  onEscalateToHuman
}) => {
  const [showSafetyMenu, setShowSafetyMenu] = useState(false)
  const [showEscalationDialog, setShowEscalationDialog] = useState(false)
  const [escalationReason, setEscalationReason] = useState('')

  const handleEscalate = () => {
    if (escalationReason.trim()) {
      onEscalateToHuman(escalationReason)
      setShowEscalationDialog(false)
      setEscalationReason('')
      setShowSafetyMenu(false)
    }
  }

  const safetyTips = [
    {
      icon: '🔒',
      title: 'Privacy Protection',
      description: 'Never share personal information like passwords, addresses, or phone numbers.'
    },
    {
      icon: '🎓',
      title: 'Academic Integrity',
      description: 'Use BuddyAI for learning and understanding, not for completing assignments directly.'
    },
    {
      icon: '🤝',
      title: 'Respectful Communication',
      description: 'Maintain respectful language and appropriate topics in all conversations.'
    },
    {
      icon: '👨‍🏫',
      title: 'Human Support',
      description: 'Connect with a human teacher anytime if you need additional help or have concerns.'
    }
  ]

  const escalationReasons = [
    'BuddyAI provided incorrect information',
    'I need help with a sensitive topic',
    'Technical issues with the AI',
    'I prefer to speak with a human teacher',
    'Safety or inappropriate content concern',
    'Complex question requiring human expertise'
  ]

  return (
    <>
      {/* Safety button */}
      <div className="relative">
        <button
          onClick={() => setShowSafetyMenu(!showSafetyMenu)}
          className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
          title="Safety & Support"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>

        {/* Safety menu */}
        {showSafetyMenu && (
          <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Safety & Support</h3>
                <button
                  onClick={() => setShowSafetyMenu(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Safety tips */}
              <div className="space-y-3">
                {safetyTips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-lg">{tip.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{tip.title}</h4>
                      <p className="text-xs text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => {
                    setShowEscalationDialog(true)
                    setShowSafetyMenu(false)
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium">Connect with Human Teacher</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/help"
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Help Center</span>
                  </a>

                  <a
                    href="/privacy"
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm">Privacy</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Escalation dialog */}
      {showEscalationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Connect with Human Teacher</h3>
                  <p className="text-sm text-gray-600">Let us know why you'd like to speak with a human teacher</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-gray-700">
                  Reason for escalation:
                </label>
                <div className="space-y-2">
                  {escalationReasons.map((reason) => (
                    <label key={reason} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="escalationReason"
                        value={reason}
                        checked={escalationReason === reason}
                        onChange={(e) => setEscalationReason(e.target.value)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>What happens next:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• You'll receive a ticket ID for tracking</li>
                      <li>• A human teacher will join the conversation</li>
                      <li>• Average wait time is 5-10 minutes</li>
                      <li>• Your chat history will be shared for context</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEscalationDialog(false)
                    setEscalationReason('')
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={!escalationReason}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Connect with Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close safety menu */}
      {showSafetyMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowSafetyMenu(false)}
        />
      )}
    </>
  )
}