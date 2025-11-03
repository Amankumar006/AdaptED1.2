import React, { useState } from 'react';
import { Lesson, AIContentSuggestion } from '../../types';

interface AIAssistantPanelProps {
  lesson: Lesson | null;
  suggestions: AIContentSuggestion[];
  onGenerate: (type: string, prompt: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  lesson,
  suggestions,
  onGenerate,
  onClose,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'suggestions' | 'improve'>('generate');
  const [generateType, setGenerateType] = useState('outline');
  const [prompt, setPrompt] = useState('');
  const [improveContent, setImproveContent] = useState('');
  const [improveInstructions, setImproveInstructions] = useState('');

  const generateOptions = [
    {
      type: 'outline',
      name: 'Lesson Outline',
      icon: '📋',
      description: 'Generate a structured lesson outline with modules',
      placeholder: 'e.g., Introduction to Machine Learning for beginners'
    },
    {
      type: 'content',
      name: 'Module Content',
      icon: '📝',
      description: 'Create detailed content for a specific topic',
      placeholder: 'e.g., Explain linear regression with examples'
    },
    {
      type: 'objectives',
      name: 'Learning Objectives',
      icon: '🎯',
      description: 'Define clear learning objectives for your lesson',
      placeholder: 'e.g., Python programming fundamentals'
    },
    {
      type: 'assessment',
      name: 'Assessment Questions',
      icon: '❓',
      description: 'Generate quiz questions and assessments',
      placeholder: 'e.g., Test understanding of photosynthesis process'
    }
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(generateType, prompt);
    setPrompt('');
  };

  const handleImprove = () => {
    if (!improveContent.trim()) return;
    onGenerate('improve', improveContent);
    setImproveContent('');
    setImproveInstructions('');
  };

  const applySuggestion = (suggestion: AIContentSuggestion) => {
    // This would integrate with the lesson builder to apply the suggestion
    console.log('Applying suggestion:', suggestion);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'generate'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Suggestions
            {suggestions.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">
                {suggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('improve')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'improve'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Improve
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'generate' && (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">What would you like to generate?</h3>
              <div className="space-y-2">
                {generateOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setGenerateType(option.type)}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      generateType === option.type
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-xl">{option.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {option.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe what you want to create
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={generateOptions.find(o => o.type === generateType)?.placeholder}
              />
            </div>

            {lesson && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Context</h4>
                <p className="text-xs text-blue-700">
                  Lesson: {lesson.title} • {lesson.difficulty} level • {lesson.estimatedDuration} minutes
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : (
                `Generate ${generateOptions.find(o => o.type === generateType)?.name}`
              )}
            </button>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💡</div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No suggestions yet</h3>
                <p className="text-xs text-gray-500">
                  AI suggestions will appear here as you build your lesson
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">AI Suggestions</h3>
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {suggestion.type}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        className="text-xs text-purple-600 hover:text-purple-800"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.content.substring(0, 150)}...
                    </p>
                    {suggestion.sources && suggestion.sources.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Sources: {suggestion.sources.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'improve' && (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Improve existing content</h3>
              <p className="text-xs text-gray-500 mb-4">
                Paste your content below and AI will suggest improvements
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content to improve
              </label>
              <textarea
                value={improveContent}
                onChange={(e) => setImproveContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Paste your lesson content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Improvement instructions (optional)
              </label>
              <textarea
                value={improveInstructions}
                onChange={(e) => setImproveInstructions(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Make it more engaging for high school students, add more examples..."
              />
            </div>

            <button
              onClick={handleImprove}
              disabled={!improveContent.trim() || isLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Improving...</span>
                </div>
              ) : (
                'Improve Content'
              )}
            </button>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-yellow-800">AI Improvement Tips</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Be specific about what you want to improve: clarity, engagement, difficulty level, examples, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>AI-generated content should be reviewed before use</span>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;