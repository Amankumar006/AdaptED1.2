import React, { useState } from 'react';
import { QuickAction } from '../../services/api/analyticsAPI';

interface QuickActionsPanelProps {
  actions: QuickAction[];
  isCustomizable?: boolean;
  onCustomize?: (actions: QuickAction[]) => void;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  isCustomizable = true,
  onCustomize,
}) => {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>(
    actions.map(action => action.id)
  );

  const categoryColors = {
    content: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    assessment: 'bg-green-50 hover:bg-green-100 border-green-200',
    analytics: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    communication: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  };

  const categoryIcons = {
    content: '📚',
    assessment: '📝',
    analytics: '📊',
    communication: '📢',
  };

  const handleActionToggle = (actionId: string) => {
    setSelectedActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleSaveCustomization = () => {
    if (onCustomize) {
      const customizedActions = actions.filter(action =>
        selectedActions.includes(action.id)
      );
      onCustomize(customizedActions);
    }
    setIsCustomizing(false);
  };

  const visibleActions = isCustomizing
    ? actions
    : actions.filter(action => selectedActions.includes(action.id));

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        {isCustomizable && (
          <div className="flex items-center space-x-2">
            {isCustomizing ? (
              <>
                <button
                  onClick={() => setIsCustomizing(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsCustomizing(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Customize actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleActions.map((action) => (
            <div key={action.id} className="relative">
              {isCustomizing && (
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(action.id)}
                    onChange={() => handleActionToggle(action.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              )}
              <button
                onClick={isCustomizing ? undefined : action.action}
                disabled={isCustomizing}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  categoryColors[action.category]
                } ${
                  isCustomizing
                    ? selectedActions.includes(action.id)
                      ? 'opacity-100'
                      : 'opacity-50'
                    : 'hover:shadow-md transform hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">
                      {action.icon || categoryIcons[action.category]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {action.description}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        action.category === 'content' ? 'bg-blue-100 text-blue-800' :
                        action.category === 'assessment' ? 'bg-green-100 text-green-800' :
                        action.category === 'analytics' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {action.category}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {visibleActions.length === 0 && !isCustomizing && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p>No quick actions configured</p>
            <p className="text-sm">Click the settings icon to add actions</p>
          </div>
        )}
      </div>

      {/* Add Action Button (when customizing) */}
      {isCustomizing && (
        <div className="border-t border-gray-200 p-4">
          <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">Add Custom Action</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickActionsPanel;