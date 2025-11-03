import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PilotDashboard from '../PilotDashboard';
import PilotFeedbackModal from '../PilotFeedbackModal';
import BuddyAIValidation from '../BuddyAIValidation';
import LearningWorkflowValidation from '../LearningWorkflowValidation';
import { pilotAPI } from '../../../services/api/pilotAPI';

// Mock the pilot API
vi.mock('../../../services/api/pilotAPI', () => ({
  pilotAPI: {
    getCohort: vi.fn(),
    getSessions: vi.fn(),
    getPilotAnalytics: vi.fn(),
    submitFeedback: vi.fn(),
    validateBuddyAI: vi.fn(),
    validateLearningWorkflow: vi.fn(),
  },
}));

// Mock engagement tracker
vi.mock('../../../services/pilotEngagementTracker', () => ({
  pilotEngagementTracker: {
    initialize: vi.fn(),
    stopTracking: vi.fn(),
    trackFeatureUsage: vi.fn(),
    getSessionData: vi.fn(() => ({ sessionDuration: 300000 })),
    isTrackingActive: vi.fn(() => true),
  },
  usePilotEngagementTracker: () => ({
    trackFeature: vi.fn(),
    trackHelpRequest: vi.fn(),
    trackBuddyAI: vi.fn(),
    isTracking: true,
  }),
}));

const mockCohort = {
  id: 'cohort-1',
  name: 'Pilot Cohort 2024',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  participants: [
    { id: 'p1', userId: 'user-1', cohortId: 'cohort-1', role: 'student' as const, joinedAt: '2024-01-01', status: 'active' as const, demographics: { ageGroup: '18-25', educationLevel: 'undergraduate', techExperience: 'intermediate', learningStyle: 'visual' } },
  ],
  status: 'active' as const,
};

const mockSessions = [
  {
    id: 'session-1',
    cohortId: 'cohort-1',
    title: 'Platform Introduction',
    description: 'Introduction to the platform features',
    scheduledAt: '2024-12-01T10:00:00Z',
    duration: 60,
    facilitator: 'Dr. Smith',
    participants: ['user-1'],
    objectives: ['Learn navigation', 'Understand features'],
    status: 'scheduled' as const,
    feedback: [],
    metrics: [],
  },
];

const mockAnalytics = {
  participantCount: 25,
  activeUsers: 20,
  completionRates: { lessons: 85, assessments: 78 },
  averageEngagement: 82,
  feedbackSummary: {
    averageRating: 4.2,
    totalFeedback: 150,
    categoryBreakdown: { usability: 45, features: 60, bugs: 25, suggestions: 20 },
  },
  issuesSummary: {
    totalIssues: 12,
    resolvedIssues: 8,
    criticalIssues: 2,
  },
};

describe('Pilot Validation Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pilotAPI.getCohort as any).mockResolvedValue(mockCohort);
    (pilotAPI.getSessions as any).mockResolvedValue(mockSessions);
    (pilotAPI.getPilotAnalytics as any).mockResolvedValue(mockAnalytics);
  });

  describe('PilotDashboard', () => {
    it('renders pilot dashboard with cohort information', async () => {
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('Pilot Program Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Pilot Cohort 2024 • active')).toBeInTheDocument();
      });
    });

    it('displays pilot statistics correctly', async () => {
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument(); // Active Users
        expect(screen.getByText('82%')).toBeInTheDocument(); // Avg Engagement
        expect(screen.getByText('4.2/5')).toBeInTheDocument(); // Feedback Rating
        expect(screen.getByText('12')).toBeInTheDocument(); // Issues Reported
      });
    });

    it('opens feedback modal when feedback button is clicked', async () => {
      const user = userEvent.setup();
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('Provide Feedback')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Provide Feedback'));
      
      await waitFor(() => {
        expect(screen.getByText('Pilot Feedback')).toBeInTheDocument();
      });
    });

    it('switches to BuddyAI validation mode', async () => {
      const user = userEvent.setup();
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('Validate BuddyAI')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate BuddyAI'));
      
      await waitFor(() => {
        expect(screen.getByText('BuddyAI Interaction Validation')).toBeInTheDocument();
      });
    });

    it('switches to workflow validation mode', async () => {
      const user = userEvent.setup();
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('Validate Workflows')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate Workflows'));
      
      await waitFor(() => {
        expect(screen.getByText('Learning Workflow Validation')).toBeInTheDocument();
      });
    });
  });

  describe('PilotFeedbackModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      userId: 'user-1',
      cohortId: 'cohort-1',
      sessionId: 'session-1',
      context: {
        page: '/dashboard',
        feature: 'dashboard',
        sessionDuration: 300000,
      },
    };

    it('renders feedback form when open', () => {
      render(<PilotFeedbackModal {...defaultProps} />);

      expect(screen.getByText('Pilot Feedback')).toBeInTheDocument();
      expect(screen.getByLabelText('Feedback Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Comments')).toBeInTheDocument();
    });

    it('submits feedback successfully', async () => {
      const user = userEvent.setup();
      (pilotAPI.submitFeedback as any).mockResolvedValue({ id: 'feedback-1' });

      render(<PilotFeedbackModal {...defaultProps} />);

      // Fill out the form
      await user.selectOptions(screen.getByLabelText('Feedback Type'), 'usability');
      await user.selectOptions(screen.getByLabelText('Category'), 'navigation');
      await user.type(screen.getByLabelText('Comments'), 'Great navigation experience!');

      // Set rating
      await user.click(screen.getAllByRole('button', { name: /Rate \d stars/ })[4]); // 5 stars

      // Submit
      await user.click(screen.getByText('Submit Feedback'));

      await waitFor(() => {
        expect(pilotAPI.submitFeedback).toHaveBeenCalledWith({
          userId: 'user-1',
          cohortId: 'cohort-1',
          sessionId: 'session-1',
          feedbackType: 'usability',
          rating: 5,
          comment: 'Great navigation experience!',
          category: 'navigation',
          metadata: {
            page: '/dashboard',
            feature: 'dashboard',
            userAgent: expect.any(String),
            sessionDuration: 300000,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
      });
    });

    it('does not render when closed', () => {
      render(<PilotFeedbackModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Pilot Feedback')).not.toBeInTheDocument();
    });
  });

  describe('BuddyAIValidation', () => {
    const defaultProps = {
      userId: 'user-1',
      cohortId: 'cohort-1',
      sessionId: 'session-1',
      onValidationComplete: vi.fn(),
    };

    it('renders BuddyAI validation interface', () => {
      render(<BuddyAIValidation {...defaultProps} />);

      expect(screen.getByText('BuddyAI Interaction Validation')).toBeInTheDocument();
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('validates interactions and submits results', async () => {
      const user = userEvent.setup();
      (pilotAPI.validateBuddyAI as any).mockResolvedValue({});

      render(<BuddyAIValidation {...defaultProps} />);

      // Validate first interaction
      await user.click(screen.getAllByRole('button', { name: /Rate \d stars/ })[4]); // Accuracy: 5 stars
      await user.click(screen.getAllByRole('button', { name: /Rate \d stars/ })[9]); // Helpfulness: 5 stars
      await user.type(screen.getByLabelText('Additional Comments (Optional)'), 'Very helpful response');
      await user.click(screen.getByText('Validate Interaction'));

      // Continue through all interactions
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Validate Interaction'));
      
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Validate Interaction'));

      await user.click(screen.getByText('Review & Submit'));

      // Final review and submission
      await user.click(screen.getAllByRole('button', { name: /Rate \d stars/ })[4]); // Overall satisfaction
      await user.click(screen.getByText('Submit Validation'));

      await waitFor(() => {
        expect(pilotAPI.validateBuddyAI).toHaveBeenCalled();
        expect(defaultProps.onValidationComplete).toHaveBeenCalled();
      });
    });
  });

  describe('LearningWorkflowValidation', () => {
    const defaultProps = {
      userId: 'user-1',
      cohortId: 'cohort-1',
      onValidationComplete: vi.fn(),
    };

    it('renders workflow selection interface', () => {
      render(<LearningWorkflowValidation {...defaultProps} />);

      expect(screen.getByText('Learning Workflow Validation')).toBeInTheDocument();
      expect(screen.getByText('Lesson Completion Workflow')).toBeInTheDocument();
      expect(screen.getByText('Assessment Taking Workflow')).toBeInTheDocument();
      expect(screen.getByText('Practice Session Workflow')).toBeInTheDocument();
      expect(screen.getByText('Collaboration Workflow')).toBeInTheDocument();
    });

    it('starts workflow validation when workflow is selected', async () => {
      const user = userEvent.setup();
      render(<LearningWorkflowValidation {...defaultProps} />);

      await user.click(screen.getByText('Lesson Completion Workflow'));

      await waitFor(() => {
        expect(screen.getByText('Navigate to Lessons')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      });
    });

    it('completes workflow validation successfully', async () => {
      const user = userEvent.setup();
      (pilotAPI.validateLearningWorkflow as any).mockResolvedValue({});

      render(<LearningWorkflowValidation {...defaultProps} />);

      // Start lesson completion workflow
      await user.click(screen.getByText('Lesson Completion Workflow'));

      // Complete each step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByLabelText('Yes, completed successfully'));
        await user.type(screen.getByLabelText('Additional Feedback'), `Step ${i + 1} completed successfully`);
        await user.click(screen.getByText('Complete Step'));
      }

      await waitFor(() => {
        expect(pilotAPI.validateLearningWorkflow).toHaveBeenCalled();
        expect(defaultProps.onValidationComplete).toHaveBeenCalled();
      });
    });

    it('handles workflow step failures', async () => {
      const user = userEvent.setup();
      render(<LearningWorkflowValidation {...defaultProps} />);

      await user.click(screen.getByText('Lesson Completion Workflow'));

      // Report a failure
      await user.click(screen.getByLabelText('No, encountered issues'));
      
      await user.type(screen.getByPlaceholderText('Describe the issue...'), 'Navigation was confusing');
      await user.click(screen.getByText('Add Issue'));

      expect(screen.getByText('Navigation was confusing')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('tracks engagement metrics during validation', async () => {
      const user = userEvent.setup();
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        expect(screen.getByText('Validate BuddyAI')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Validate BuddyAI'));

      // Engagement tracking should be initialized
      const { pilotEngagementTracker } = await import('../../../services/pilotEngagementTracker');
      expect(pilotEngagementTracker.initialize).toHaveBeenCalledWith('user-1', 'cohort-1');
    });

    it('handles API errors gracefully', async () => {
      (pilotAPI.getCohort as any).mockRejectedValue(new Error('API Error'));
      
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      // Should still render loading state and not crash
      expect(screen.getByText('Loading pilot dashboard...')).toBeInTheDocument();
    });

    it('provides accessibility support', async () => {
      render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);

      await waitFor(() => {
        // Check for proper ARIA labels
        expect(screen.getByLabelText('Provide feedback')).toBeInTheDocument();
      });

      // Check keyboard navigation
      const feedbackButton = screen.getByText('Provide Feedback');
      expect(feedbackButton).toBeInTheDocument();
      
      fireEvent.keyDown(feedbackButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Pilot Feedback')).toBeInTheDocument();
      });
    });
  });
});

describe('Pilot Validation Performance', () => {
  it('loads pilot dashboard within performance budget', async () => {
    const startTime = performance.now();
    
    render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Pilot Program Dashboard')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    // Should load within 1 second
    expect(loadTime).toBeLessThan(1000);
  });

  it('handles large datasets efficiently', async () => {
    // Mock large dataset
    const largeSessions = Array.from({ length: 100 }, (_, i) => ({
      ...mockSessions[0],
      id: `session-${i}`,
      title: `Session ${i}`,
    }));
    
    (pilotAPI.getSessions as any).mockResolvedValue(largeSessions);
    
    const startTime = performance.now();
    
    render(<PilotDashboard userId="user-1" cohortId="cohort-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Pilot Program Dashboard')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    // Should still load efficiently with large datasets
    expect(loadTime).toBeLessThan(2000);
  });
});