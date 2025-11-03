import React, { useState, useEffect } from 'react';
import { pilotAPI, PilotFeedback } from '../../services/api/pilotAPI';

interface PilotFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  cohortId: string;
  sessionId: string;
  context?: {
    page: string;
    feature: string;
    sessionDuration: number;
  };
}

const PilotFeedbackModal: React.FC<PilotFeedbackModalProps> = ({
  isOpen,
  onClose,
  userId,
  cohortId,
  sessionId,
  context,
}) => {
  const [feedbackType, setFeedbackType] = useState<PilotFeedback['feedbackType']>('satisfaction');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [category, setCategory] = useState<string>('general');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const feedbackTypes = [
    { value: 'usability', label: 'Usability Issue' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'satisfaction', label: 'General Satisfaction' },
  ];

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'navigation', label: 'Navigation' },
    { value: 'lessons', label: 'Lessons' },
    { value: 'buddyai', label: 'BuddyAI' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'practice', label: 'Practice Tools' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'performance', label: 'Performance' },
    { value: 'accessibility', label: 'Accessibility' },
  ];

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setComment('');
      setRating(5);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await pilotAPI.submitFeedback({
        userId,
        cohortId,
        sessionId,
        feedbackType,
        rating,
        comment,
        category,
        metadata: {
          page: context?.page || window.location.pathname,
          feature: context?.feature || 'unknown',
          userAgent: navigator.userAgent,
          sessionDuration: context?.sessionDuration || 0,
        },
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Pilot Feedback
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close feedback modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Thank you for your feedback!
            </h3>
            <p className="text-gray-600">
              Your input helps us improve the platform.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback Type
              </label>
              <select
                id="feedbackType"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as PilotFeedback['feedbackType'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {feedbackTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating (1-5 stars)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                    aria-label={`Rate ${star} stars`}
                  >
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please share your thoughts, suggestions, or report any issues..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PilotFeedbackModal;