import React, { useState, useEffect } from 'react';
import { pilotAPI } from '../../services/api/pilotAPI';
import { pilotEngagementTracker } from '../../services/pilotEngagementTracker';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onComplete: () => void }>;
  completed: boolean;
}

interface PilotOnboardingProps {
  userId: string;
  cohortId: string;
  onComplete: () => void;
}

const PilotOnboarding: React.FC<PilotOnboardingProps> = ({
  userId,
  cohortId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState<{
    completedSteps: string[];
    totalSteps: number;
    currentStep: string;
    completionPercentage: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to the Pilot Program',
      description: 'Learn about the pilot program and your role as a participant',
      component: WelcomeStep,
      completed: false,
    },
    {
      id: 'platform-overview',
      title: 'Platform Overview',
      description: 'Get familiar with the main features and navigation',
      component: PlatformOverviewStep,
      completed: false,
    },
    {
      id: 'dashboard-tour',
      title: 'Dashboard Tour',
      description: 'Explore your personalized dashboard and widgets',
      component: DashboardTourStep,
      completed: false,
    },
    {
      id: 'buddyai-intro',
      title: 'Meet BuddyAI',
      description: 'Learn how to interact with your AI learning assistant',
      component: BuddyAIIntroStep,
      completed: false,
    },
    {
      id: 'learning-tools',
      title: 'Learning Tools',
      description: 'Discover lessons, practice sessions, and collaboration features',
      component: LearningToolsStep,
      completed: false,
    },
    {
      id: 'feedback-setup',
      title: 'Feedback & Support',
      description: 'Learn how to provide feedback and get help during the pilot',
      component: FeedbackSetupStep,
      completed: false,
    },
  ];

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = async () => {
    try {
      const progressData = await pilotAPI.getOnboardingProgress(userId);
      setProgress(progressData);
      
      // Find current step index
      const currentStepIndex = onboardingSteps.findIndex(
        step => step.id === progressData.currentStep
      );
      setCurrentStep(currentStepIndex >= 0 ? currentStepIndex : 0);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
      setIsLoading(false);
    }
  };

  const completeStep = async (stepId: string) => {
    try {
      await pilotAPI.completeOnboardingStep(userId, stepId);
      
      // Track completion in engagement metrics
      pilotEngagementTracker.trackFeatureUsage(`onboarding-${stepId}`);
      
      // Move to next step
      const nextStepIndex = currentStep + 1;
      if (nextStepIndex < onboardingSteps.length) {
        setCurrentStep(nextStepIndex);
      } else {
        // Onboarding complete
        onComplete();
      }
      
      // Reload progress
      await loadProgress();
    } catch (error) {
      console.error('Failed to complete onboarding step:', error);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (progress && stepIndex <= progress.completedSteps.length) {
      setCurrentStep(stepIndex);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = onboardingSteps[currentStep]?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Pilot Program Onboarding
            </h1>
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {onboardingSteps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / onboardingSteps.length) * 100}%`,
              }}
            />
          </div>
          
          {/* Step Navigation */}
          <div className="flex space-x-4 overflow-x-auto">
            {onboardingSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={progress && index > progress.completedSteps.length}
                className={`flex-shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  index === currentStep
                    ? 'bg-blue-100 text-blue-700'
                    : progress && progress.completedSteps.includes(step.id)
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : index <= (progress?.completedSteps.length || 0)
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {onboardingSteps[currentStep]?.title}
            </h2>
            <p className="text-gray-600">
              {onboardingSteps[currentStep]?.description}
            </p>
          </div>

          {CurrentStepComponent && (
            <CurrentStepComponent
              onComplete={() => completeStep(onboardingSteps[currentStep].id)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Individual onboarding step components
const WelcomeStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Welcome to the Enhanced Educational Platform Pilot!
      </h3>
    </div>
    
    <div className="prose max-w-none">
      <p>
        Thank you for participating in our pilot program. As a pilot participant, you'll:
      </p>
      <ul>
        <li>Be among the first to experience our innovative learning platform</li>
        <li>Help shape the future of education technology</li>
        <li>Provide valuable feedback to improve the platform</li>
        <li>Access cutting-edge AI-powered learning tools</li>
      </ul>
      
      <p>
        Your feedback and engagement are crucial to the success of this pilot program.
        We'll be collecting usage data and feedback to continuously improve the platform.
      </p>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Get Started
      </button>
    </div>
  </div>
);

const PlatformOverviewStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Key Features</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 mt-1">📊</div>
            <div>
              <h4 className="font-medium">Personalized Dashboard</h4>
              <p className="text-sm text-gray-600">Adaptive interface that learns your preferences</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 mt-1">🤖</div>
            <div>
              <h4 className="font-medium">BuddyAI Assistant</h4>
              <p className="text-sm text-gray-600">24/7 AI tutor for personalized help</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 mt-1">📚</div>
            <div>
              <h4 className="font-medium">Interactive Lessons</h4>
              <p className="text-sm text-gray-600">Multimedia content with offline support</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 mt-1">🎯</div>
            <div>
              <h4 className="font-medium">Practice Tools</h4>
              <p className="text-sm text-gray-600">Self-paced learning and skill building</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Navigation</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">
            Use the sidebar to navigate between different sections:
          </p>
          <ul className="text-sm space-y-1">
            <li>• <strong>Dashboard:</strong> Your learning overview</li>
            <li>• <strong>Lessons:</strong> Course content and materials</li>
            <li>• <strong>Practice:</strong> Self-study tools</li>
            <li>• <strong>Chat:</strong> BuddyAI assistant</li>
            <li>• <strong>Progress:</strong> Track your learning journey</li>
          </ul>
        </div>
      </div>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Continue
      </button>
    </div>
  </div>
);

const DashboardTourStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Your Personalized Dashboard
      </h3>
      <p className="text-gray-600">
        The dashboard adapts to your learning style and preferences
      </p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Progress Widget</h4>
        <p className="text-sm text-blue-700">
          Track your learning progress and achievements
        </p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Recommendations</h4>
        <p className="text-sm text-green-700">
          AI-powered suggestions for your next learning steps
        </p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">BuddyAI Widget</h4>
        <p className="text-sm text-purple-700">
          Quick access to your AI learning assistant
        </p>
      </div>
    </div>
    
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="text-yellow-600 mt-1">💡</div>
        <div>
          <h4 className="font-medium text-yellow-900">Pro Tip</h4>
          <p className="text-sm text-yellow-700">
            You can drag and drop widgets to customize your dashboard layout!
          </p>
        </div>
      </div>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Explore Dashboard
      </button>
    </div>
  </div>
);

const BuddyAIIntroStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <div className="text-6xl mb-4">🤖</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Meet BuddyAI - Your Learning Assistant
      </h3>
      <p className="text-gray-600">
        Available 24/7 to help with questions, explanations, and guidance
      </p>
    </div>
    
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">What BuddyAI Can Do:</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <span>Answer questions about course content</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <span>Provide step-by-step explanations</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <span>Help with homework and assignments</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <span>Suggest learning resources</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600">✓</span>
            <span>Support multiple languages</span>
          </li>
        </ul>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">How to Interact:</h4>
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">💬</span>
            <span className="text-sm">Type your questions naturally</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">🎤</span>
            <span className="text-sm">Use voice input for hands-free interaction</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">📷</span>
            <span className="text-sm">Upload images for visual problems</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 mb-2">Safety & Privacy</h4>
      <p className="text-sm text-blue-700">
        BuddyAI is designed with student safety in mind. All conversations are monitored
        for appropriate content, and you can always escalate to a human teacher if needed.
      </p>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Try BuddyAI
      </button>
    </div>
  </div>
);

const LearningToolsStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
      Explore Your Learning Tools
    </h3>
    
    <div className="grid md:grid-cols-2 gap-6">
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="text-blue-600 mr-2">📚</span>
          Interactive Lessons
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Multi-media content (video, audio, text)</li>
          <li>• Note-taking and bookmarking</li>
          <li>• Offline access for mobile learning</li>
          <li>• Progress tracking and completion</li>
        </ul>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="text-green-600 mr-2">🎯</span>
          Practice Sessions
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Self-paced problem solving</li>
          <li>• Adaptive difficulty adjustment</li>
          <li>• Instant feedback and hints</li>
          <li>• Flashcards and review tools</li>
        </ul>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="text-purple-600 mr-2">👥</span>
          Collaboration
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Study groups and discussions</li>
          <li>• Peer learning and tutoring</li>
          <li>• Social learning features</li>
          <li>• Group projects and activities</li>
        </ul>
      </div>
      
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="text-orange-600 mr-2">🏆</span>
          Progress & Achievements
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Learning analytics and insights</li>
          <li>• Achievement badges and rewards</li>
          <li>• Progress visualization</li>
          <li>• Goal setting and tracking</li>
        </ul>
      </div>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Start Learning
      </button>
    </div>
  </div>
);

const FeedbackSetupStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Help Us Improve
      </h3>
      <p className="text-gray-600">
        Your feedback is essential for making the platform better
      </p>
    </div>
    
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">How to Provide Feedback:</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 mt-1">💬</span>
            <div>
              <h5 className="font-medium text-sm">Feedback Button</h5>
              <p className="text-xs text-gray-600">
                Click the feedback button in the bottom-right corner anytime
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-green-600 mt-1">📋</span>
            <div>
              <h5 className="font-medium text-sm">Weekly Surveys</h5>
              <p className="text-xs text-gray-600">
                Short surveys about your experience (5 minutes max)
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-purple-600 mt-1">🎤</span>
            <div>
              <h5 className="font-medium text-sm">Focus Groups</h5>
              <p className="text-xs text-gray-600">
                Optional group discussions about platform features
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Getting Help:</h4>
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">🤖</span>
            <span className="text-sm">Ask BuddyAI for immediate help</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-600">📧</span>
            <span className="text-sm">Email: pilot-support@enhanced-edu.com</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-purple-600">💬</span>
            <span className="text-sm">Live chat during business hours</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 className="font-medium text-green-900 mb-2">Thank You!</h4>
      <p className="text-sm text-green-700">
        You're all set to begin your pilot experience. Remember, your participation
        and feedback help shape the future of educational technology.
      </p>
    </div>
    
    <div className="flex justify-end">
      <button
        onClick={onComplete}
        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        Complete Onboarding
      </button>
    </div>
  </div>
);

export default PilotOnboarding;