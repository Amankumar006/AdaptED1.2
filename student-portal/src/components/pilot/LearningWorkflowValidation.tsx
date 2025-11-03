import React, { useState, useEffect } from 'react';
import { pilotAPI, LearningWorkflowValidation as LearningWorkflowValidationType } from '../../services/api/pilotAPI';

interface WorkflowStep {
  stepId: string;
  stepName: string;
  startTime: string;
  endTime: string;
  success: boolean;
  errors: string[];
  userFeedback: string;
}

interface WorkflowValidationProps {
  userId: string;
  cohortId: string;
  onValidationComplete?: (validation: LearningWorkflowValidationType) => void;
}

const workflowTemplates = {
  'lesson-completion': {
    title: 'Lesson Completion Workflow',
    description: 'Complete a full lesson from start to finish',
    steps: [
      { id: 'navigate-to-lessons', name: 'Navigate to Lessons', description: 'Find and access the lessons section' },
      { id: 'select-lesson', name: 'Select Lesson', description: 'Choose a lesson to complete' },
      { id: 'view-content', name: 'View Content', description: 'Read/watch the lesson content' },
      { id: 'take-notes', name: 'Take Notes', description: 'Use the note-taking feature' },
      { id: 'complete-lesson', name: 'Complete Lesson', description: 'Mark the lesson as complete' },
    ],
  },
  'assessment-taking': {
    title: 'Assessment Taking Workflow',
    description: 'Take and submit an assessment',
    steps: [
      { id: 'access-assessment', name: 'Access Assessment', description: 'Navigate to and open an assessment' },
      { id: 'read-instructions', name: 'Read Instructions', description: 'Review assessment instructions' },
      { id: 'answer-questions', name: 'Answer Questions', description: 'Complete assessment questions' },
      { id: 'review-answers', name: 'Review Answers', description: 'Review responses before submission' },
      { id: 'submit-assessment', name: 'Submit Assessment', description: 'Submit the completed assessment' },
    ],
  },
  'practice-session': {
    title: 'Practice Session Workflow',
    description: 'Use practice tools for self-study',
    steps: [
      { id: 'access-practice', name: 'Access Practice', description: 'Navigate to practice section' },
      { id: 'select-topic', name: 'Select Topic', description: 'Choose a practice topic' },
      { id: 'solve-problems', name: 'Solve Problems', description: 'Work through practice problems' },
      { id: 'get-feedback', name: 'Get Feedback', description: 'Review feedback and hints' },
      { id: 'track-progress', name: 'Track Progress', description: 'View practice progress' },
    ],
  },
  'collaboration': {
    title: 'Collaboration Workflow',
    description: 'Participate in collaborative learning activities',
    steps: [
      { id: 'join-study-group', name: 'Join Study Group', description: 'Find and join a study group' },
      { id: 'participate-discussion', name: 'Participate in Discussion', description: 'Engage in group discussions' },
      { id: 'share-resources', name: 'Share Resources', description: 'Share learning materials' },
      { id: 'peer-review', name: 'Peer Review', description: 'Review peer work or get feedback' },
      { id: 'complete-group-task', name: 'Complete Group Task', description: 'Finish collaborative assignment' },
    ],
  },
};

const LearningWorkflowValidation: React.FC<WorkflowValidationProps> = ({
  userId,
  cohortId,
  onValidationComplete,
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<keyof typeof workflowTemplates | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [workflowStartTime, setWorkflowStartTime] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationComplete, setValidationComplete] = useState<boolean>(false);
  const [overallUsabilityScore, setOverallUsabilityScore] = useState<number>(5);

  const startWorkflowValidation = (workflowType: keyof typeof workflowTemplates) => {
    setSelectedWorkflow(workflowType);
    setWorkflowStartTime(new Date().toISOString());
    setCurrentStepIndex(0);
    setIsValidating(true);
    
    const template = workflowTemplates[workflowType];
    const initialSteps: WorkflowStep[] = template.steps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      startTime: '',
      endTime: '',
      success: false,
      errors: [],
      userFeedback: '',
    }));
    
    setWorkflowSteps(initialSteps);
    
    // Start first step
    startStep(0, initialSteps);
  };

  const startStep = (stepIndex: number, steps: WorkflowStep[]) => {
    const updatedSteps = [...steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      startTime: new Date().toISOString(),
    };
    setWorkflowSteps(updatedSteps);
  };

  const completeStep = (
    stepIndex: number,
    success: boolean,
    errors: string[],
    feedback: string
  ) => {
    const updatedSteps = [...workflowSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      endTime: new Date().toISOString(),
      success,
      errors,
      userFeedback: feedback,
    };
    setWorkflowSteps(updatedSteps);

    // Move to next step or complete workflow
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < workflowSteps.length) {
      setCurrentStepIndex(nextStepIndex);
      startStep(nextStepIndex, updatedSteps);
    } else {
      completeWorkflowValidation(updatedSteps);
    }
  };

  const completeWorkflowValidation = async (finalSteps: WorkflowStep[]) => {
    if (!selectedWorkflow) return;

    const workflowEndTime = new Date().toISOString();
    const startTime = new Date(workflowStartTime).getTime();
    const endTime = new Date(workflowEndTime).getTime();
    const completionTime = endTime - startTime;
    const overallSuccess = finalSteps.every(step => step.success);

    const validation: LearningWorkflowValidationType = {
      userId,
      workflowType: selectedWorkflow,
      steps: finalSteps,
      overallSuccess,
      completionTime,
      usabilityScore: overallUsabilityScore,
    };

    try {
      await pilotAPI.validateLearningWorkflow(validation);
      setValidationComplete(true);
      
      if (onValidationComplete) {
        onValidationComplete(validation);
      }
    } catch (error) {
      console.error('Failed to submit workflow validation:', error);
    }
  };

  const resetValidation = () => {
    setSelectedWorkflow(null);
    setCurrentStepIndex(0);
    setWorkflowSteps([]);
    setWorkflowStartTime('');
    setIsValidating(false);
    setValidationComplete(false);
    setOverallUsabilityScore(5);
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
            Workflow Validation Complete
          </h2>
          <p className="text-gray-600 mb-4">
            Thank you for validating the {selectedWorkflow && workflowTemplates[selectedWorkflow].title}.
          </p>
          <button
            onClick={resetValidation}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
          >
            Validate Another Workflow
          </button>
        </div>
      </div>
    );
  }

  if (!selectedWorkflow) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Learning Workflow Validation
          </h2>
          <p className="text-gray-600 mb-6">
            Select a learning workflow to validate. You'll be guided through each step
            and asked to provide feedback on the user experience.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(workflowTemplates).map(([key, template]) => (
              <div
                key={key}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => startWorkflowValidation(key as keyof typeof workflowTemplates)}
              >
                <h3 className="font-medium text-gray-900 mb-2">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>
                <div className="text-xs text-gray-500">
                  {template.steps.length} steps • ~{template.steps.length * 2} minutes
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentTemplate = workflowTemplates[selectedWorkflow];
  const currentStep = currentTemplate.steps[currentStepIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentTemplate.title}
            </h2>
            <p className="text-gray-600">
              {currentTemplate.description}
            </p>
          </div>
          <button
            onClick={resetValidation}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStepIndex + 1} of {currentTemplate.steps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / currentTemplate.steps.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / currentTemplate.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {currentStep.name}
          </h3>
          <p className="text-blue-700 mb-4">
            {currentStep.description}
          </p>
          <div className="bg-blue-100 p-3 rounded text-sm text-blue-800">
            <strong>Instructions:</strong> Please perform this step in the application,
            then return here to provide feedback about your experience.
          </div>
        </div>

        {/* Step Validation Form */}
        <StepValidationForm
          stepIndex={currentStepIndex}
          stepName={currentStep.name}
          onComplete={completeStep}
        />

        {/* Steps Overview */}
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-3">Workflow Steps</h4>
          <div className="space-y-2">
            {currentTemplate.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-2 rounded ${
                  index < currentStepIndex
                    ? 'bg-green-50 text-green-700'
                    : index === currentStepIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStepIndex
                    ? 'bg-green-200 text-green-800'
                    : index === currentStepIndex
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                <span className="text-sm font-medium">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step validation form component
const StepValidationForm: React.FC<{
  stepIndex: number;
  stepName: string;
  onComplete: (stepIndex: number, success: boolean, errors: string[], feedback: string) => void;
}> = ({ stepIndex, stepName, onComplete }) => {
  const [success, setSuccess] = useState<boolean>(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [newError, setNewError] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(3);

  const addError = () => {
    if (newError.trim() && !errors.includes(newError.trim())) {
      setErrors(prev => [...prev, newError.trim()]);
      setNewError('');
      setSuccess(false);
    }
  };

  const removeError = (error: string) => {
    setErrors(prev => prev.filter(e => e !== error));
    if (errors.length === 1) {
      setSuccess(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(stepIndex, success, errors, feedback);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Were you able to complete this step successfully?
        </label>
        <div className="space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={success}
              onChange={() => {
                setSuccess(true);
                setErrors([]);
              }}
              className="form-radio text-green-600"
            />
            <span className="ml-2 text-sm text-gray-700">Yes, completed successfully</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={!success}
              onChange={() => setSuccess(false)}
              className="form-radio text-red-600"
            />
            <span className="ml-2 text-sm text-gray-700">No, encountered issues</span>
          </label>
        </div>
      </div>

      {!success && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What issues did you encounter?
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newError}
              onChange={(e) => setNewError(e.target.value)}
              placeholder="Describe the issue..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addError}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Add Issue
            </button>
          </div>
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded">
                  <span className="text-sm text-red-700">{error}</span>
                  <button
                    type="button"
                    onClick={() => removeError(error)}
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
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How difficult was this step? (1 = Very Easy, 5 = Very Difficult)
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`w-8 h-8 rounded ${
                level <= difficulty
                  ? level <= 2
                    ? 'bg-green-500 text-white'
                    : level <= 3
                    ? 'bg-yellow-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              } hover:opacity-80 transition-colors`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
          Additional Feedback
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Share your thoughts about this step, suggestions for improvement, or any other observations..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Complete Step
        </button>
      </div>
    </form>
  );
};

export default LearningWorkflowValidation;