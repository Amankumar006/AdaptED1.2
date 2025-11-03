import React, { useState, useEffect } from 'react';
import { pilotAPI, BuddyAIValidation as BuddyAIValidationType } from '../../services/api/pilotAPI';

interface BuddyAIValidationProps {
  userId: string;
  cohortId: string;
  sessionId: string;
  onValidationComplete?: (validation: BuddyAIValidationType) => void;
}

interface InteractionValidation {
  id: string;
  query: string;
  response: string;
  responseTime: number;
  accuracy: number;
  helpfulness: number;
  safety: boolean;
  escalated: boolean;
  timestamp: string;
  userFeedback?: {
    accuracyRating: number;
    helpfulnessRating: number;
    safetyIssue: boolean;
    comments: string;
  };
}

const BuddyAIValidation: React.FC<BuddyAIValidationProps> = ({
  userId,
  cohortId,
  sessionId,
  onValidationComplete,
}) => {
  const [interactions, setInteractions] = useState<InteractionValidation[]>([]);
  const [currentInteractionIndex, setCurrentInteractionIndex] = useState<number>(0);
  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(5);
  const [issuesReported, setIssuesReported] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationComplete, setValidationComplete] = useState<boolean>(false);

  // Sample interactions for validation (in real implementation, these would come from actual chat history)
  useEffect(() => {
    // Load recent BuddyAI interactions for validation
    loadInteractions();
  }, [sessionId]);

  const loadInteractions = async () => {
    // In a real implementation, this would fetch actual chat interactions
    // For now, we'll use sample data
    const sampleInteractions: InteractionValidation[] = [
      {
        id: '1',
        query: 'Can you explain photosynthesis?',
        response: 'Photosynthesis is the process by which plants convert light energy into chemical energy...',
        responseTime: 1200,
        accuracy: 0,
        helpfulness: 0,
        safety: true,
        escalated: false,
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        query: 'Help me solve this math problem: 2x + 5 = 15',
        response: 'I\'ll help you solve this step by step. First, subtract 5 from both sides...',
        responseTime: 800,
        accuracy: 0,
        helpfulness: 0,
        safety: true,
        escalated: false,
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        query: 'What are the main causes of World War I?',
        response: 'The main causes of World War I include militarism, alliances, imperialism, and nationalism...',
        responseTime: 1500,
        accuracy: 0,
        helpfulness: 0,
        safety: true,
        escalated: false,
        timestamp: new Date().toISOString(),
      },
    ];

    setInteractions(sampleInteractions);
  };

  const validateInteraction = (
    interactionId: string,
    accuracyRating: number,
    helpfulnessRating: number,
    safetyIssue: boolean,
    comments: string
  ) => {
    setInteractions(prev => prev.map(interaction => 
      interaction.id === interactionId
        ? {
            ...interaction,
            accuracy: accuracyRating,
            helpfulness: helpfulnessRating,
            safety: !safetyIssue,
            userFeedback: {
              accuracyRating,
              helpfulnessRating,
              safetyIssue,
              comments,
            },
          }
        : interaction
    ));

    // Move to next interaction
    if (currentInteractionIndex < interactions.length - 1) {
      setCurrentInteractionIndex(prev => prev + 1);
    }
  };

  const addIssue = (issue: string) => {
    if (issue.trim() && !issuesReported.includes(issue.trim())) {
      setIssuesReported(prev => [...prev, issue.trim()]);
    }
  };

  const removeIssue = (issue: string) => {
    setIssuesReported(prev => prev.filter(i => i !== issue));
  };

  const submitValidation = async () => {
    setIsSubmitting(true);

    try {
      const validation: BuddyAIValidationType = {
        sessionId,
        userId,
        interactions: interactions.map(interaction => ({
          id: interaction.id,
          query: interaction.query,
          response: interaction.response,
          responseTime: interaction.responseTime,
          accuracy: interaction.accuracy,
          helpfulness: interaction.helpfulness,
          safety: interaction.safety,
          escalated: interaction.escalated,
          timestamp: interaction.timestamp,
        })),
        overallSatisfaction,
        issuesReported,
      };

      await pilotAPI.validateBuddyAI(validation);
      setValidationComplete(true);
      
      if (onValidationComplete) {
        onValidationComplete(validation);
      }
    } catch (error) {
      console.error('Failed to submit BuddyAI validation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (validationComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            BuddyAI Validation Complete
          </h2>
          <p className="text-gray-600">
            Thank you for validating the BuddyAI interactions. Your feedback helps improve the AI assistant.
          </p>
        </div>
      </div>
    );
  }

  const currentInteraction = interactions[currentInteractionIndex];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            BuddyAI Interaction Validation
          </h2>
          <div className="text-sm text-gray-600">
            {currentInteractionIndex + 1} of {interactions.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentInteractionIndex + 1) / interactions.length) * 100}%`,
            }}
          />
        </div>

        {currentInteraction && (
          <InteractionValidationForm
            interaction={currentInteraction}
            onValidate={validateInteraction}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentInteractionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentInteractionIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentInteractionIndex === interactions.length - 1 ? (
            <button
              onClick={() => setCurrentInteractionIndex(interactions.length)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Review & Submit
            </button>
          ) : (
            <button
              onClick={() => setCurrentInteractionIndex(prev => prev + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Final Review */}
      {currentInteractionIndex >= interactions.length && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Final Review
          </h3>

          {/* Overall Satisfaction */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Satisfaction with BuddyAI (1-5 stars)
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setOverallSatisfaction(star)}
                  className={`w-8 h-8 ${
                    star <= overallSatisfaction ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Issues Reported */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issues or Concerns
            </label>
            <IssueReporter
              issues={issuesReported}
              onAddIssue={addIssue}
              onRemoveIssue={removeIssue}
            />
          </div>

          {/* Validation Summary */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Validation Summary</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Average Accuracy</div>
                <div className="text-lg font-semibold text-blue-900">
                  {(interactions.reduce((sum, i) => sum + i.accuracy, 0) / interactions.length).toFixed(1)}/5
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Average Helpfulness</div>
                <div className="text-lg font-semibold text-green-900">
                  {(interactions.reduce((sum, i) => sum + i.helpfulness, 0) / interactions.length).toFixed(1)}/5
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Safety Issues</div>
                <div className="text-lg font-semibold text-purple-900">
                  {interactions.filter(i => !i.safety).length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={submitValidation}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Validation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual interaction validation form
const InteractionValidationForm: React.FC<{
  interaction: InteractionValidation;
  onValidate: (id: string, accuracy: number, helpfulness: number, safetyIssue: boolean, comments: string) => void;
}> = ({ interaction, onValidate }) => {
  const [accuracyRating, setAccuracyRating] = useState<number>(5);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number>(5);
  const [safetyIssue, setSafetyIssue] = useState<boolean>(false);
  const [comments, setComments] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onValidate(interaction.id, accuracyRating, helpfulnessRating, safetyIssue, comments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interaction Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Student Question:</h4>
          <p className="text-gray-700 bg-white p-3 rounded border">
            {interaction.query}
          </p>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">BuddyAI Response:</h4>
          <p className="text-gray-700 bg-white p-3 rounded border">
            {interaction.response}
          </p>
        </div>
        
        <div className="text-sm text-gray-600">
          Response time: {interaction.responseTime}ms
        </div>
      </div>

      {/* Validation Form */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accuracy Rating (1-5 stars)
          </label>
          <div className="flex space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setAccuracyRating(star)}
                className={`w-6 h-6 ${
                  star <= accuracyRating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            How accurate was the response?
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Helpfulness Rating (1-5 stars)
          </label>
          <div className="flex space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setHelpfulnessRating(star)}
                className={`w-6 h-6 ${
                  star <= helpfulnessRating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            How helpful was the response?
          </p>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={safetyIssue}
            onChange={(e) => setSafetyIssue(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            This response contains inappropriate or unsafe content
          </span>
        </label>
      </div>

      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Comments (Optional)
        </label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional feedback about this interaction..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Validate Interaction
        </button>
      </div>
    </form>
  );
};

// Issue reporter component
const IssueReporter: React.FC<{
  issues: string[];
  onAddIssue: (issue: string) => void;
  onRemoveIssue: (issue: string) => void;
}> = ({ issues, onAddIssue, onRemoveIssue }) => {
  const [newIssue, setNewIssue] = useState<string>('');

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIssue.trim()) {
      onAddIssue(newIssue);
      setNewIssue('');
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleAddIssue} className="flex space-x-2">
        <input
          type="text"
          value={newIssue}
          onChange={(e) => setNewIssue(e.target.value)}
          placeholder="Describe any issues or concerns..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Add Issue
        </button>
      </form>

      {issues.length > 0 && (
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded">
              <span className="text-sm text-red-700">{issue}</span>
              <button
                onClick={() => onRemoveIssue(issue)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuddyAIValidation;