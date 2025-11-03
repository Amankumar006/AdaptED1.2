import { pilotAPI, EngagementMetrics } from './api/pilotAPI';

interface SessionData {
  sessionId: string;
  startTime: number;
  pagesVisited: Set<string>;
  featuresUsed: Set<string>;
  interactionCount: number;
  errorCount: number;
  helpRequestCount: number;
  buddyAIInteractions: number;
  offlineUsage: number;
  lastActivityTime: number;
}

class PilotEngagementTracker {
  private sessionData: SessionData | null = null;
  private userId: string | null = null;
  private cohortId: string | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;

  // Initialize tracking for a pilot session
  initialize(userId: string, cohortId: string): void {
    this.userId = userId;
    this.cohortId = cohortId;
    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      pagesVisited: new Set(),
      featuresUsed: new Set(),
      interactionCount: 0,
      errorCount: 0,
      helpRequestCount: 0,
      buddyAIInteractions: 0,
      offlineUsage: 0,
      lastActivityTime: Date.now(),
    };

    this.startTracking();
  }

  // Start tracking user engagement
  private startTracking(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.trackPageVisit(window.location.pathname);
    this.setupEventListeners();
    this.startPeriodicReporting();
  }

  // Stop tracking and send final metrics
  stopTracking(): void {
    if (!this.isTracking || !this.sessionData) return;

    this.isTracking = false;
    this.removeEventListeners();
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.sendMetrics();
  }

  // Track page visits
  trackPageVisit(page: string): void {
    if (!this.sessionData) return;

    this.sessionData.pagesVisited.add(page);
    this.sessionData.lastActivityTime = Date.now();
  }

  // Track feature usage
  trackFeatureUsage(feature: string): void {
    if (!this.sessionData) return;

    this.sessionData.featuresUsed.add(feature);
    this.sessionData.interactionCount++;
    this.sessionData.lastActivityTime = Date.now();
  }

  // Track user interactions
  trackInteraction(): void {
    if (!this.sessionData) return;

    this.sessionData.interactionCount++;
    this.sessionData.lastActivityTime = Date.now();
  }

  // Track errors
  trackError(): void {
    if (!this.sessionData) return;

    this.sessionData.errorCount++;
  }

  // Track help requests
  trackHelpRequest(): void {
    if (!this.sessionData) return;

    this.sessionData.helpRequestCount++;
  }

  // Track BuddyAI interactions
  trackBuddyAIInteraction(): void {
    if (!this.sessionData) return;

    this.sessionData.buddyAIInteractions++;
    this.trackFeatureUsage('buddyai-chat');
  }

  // Track offline usage
  trackOfflineUsage(duration: number): void {
    if (!this.sessionData) return;

    this.sessionData.offlineUsage += duration;
  }

  // Setup event listeners for automatic tracking
  private setupEventListeners(): void {
    // Track page navigation
    window.addEventListener('popstate', this.handlePageChange);
    
    // Track user interactions
    document.addEventListener('click', this.handleInteraction);
    document.addEventListener('keydown', this.handleInteraction);
    document.addEventListener('scroll', this.handleInteraction);

    // Track errors
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);

    // Track offline/online status
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Track beforeunload to send final metrics
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Remove event listeners
  private removeEventListeners(): void {
    window.removeEventListener('popstate', this.handlePageChange);
    document.removeEventListener('click', this.handleInteraction);
    document.removeEventListener('keydown', this.handleInteraction);
    document.removeEventListener('scroll', this.handleInteraction);
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Event handlers
  private handlePageChange = (): void => {
    this.trackPageVisit(window.location.pathname);
  };

  private handleInteraction = (): void => {
    this.trackInteraction();
  };

  private handleError = (): void => {
    this.trackError();
  };

  private offlineStartTime: number | null = null;

  private handleOffline = (): void => {
    this.offlineStartTime = Date.now();
  };

  private handleOnline = (): void => {
    if (this.offlineStartTime) {
      const offlineDuration = Date.now() - this.offlineStartTime;
      this.trackOfflineUsage(offlineDuration);
      this.offlineStartTime = null;
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Page became hidden, send current metrics
      this.sendMetrics();
    } else {
      // Page became visible, update activity time
      if (this.sessionData) {
        this.sessionData.lastActivityTime = Date.now();
      }
    }
  };

  private handleBeforeUnload = (): void => {
    this.stopTracking();
  };

  // Start periodic reporting
  private startPeriodicReporting(): void {
    // Send metrics every 5 minutes
    this.trackingInterval = setInterval(() => {
      this.sendMetrics();
    }, 5 * 60 * 1000);
  }

  // Send metrics to the server
  private async sendMetrics(): Promise<void> {
    if (!this.sessionData || !this.userId || !this.cohortId) return;

    const sessionDuration = Date.now() - this.sessionData.startTime;
    const completionRate = this.calculateCompletionRate();

    const metrics: Omit<EngagementMetrics, 'timestamp'> = {
      userId: this.userId,
      cohortId: this.cohortId,
      sessionId: this.sessionData.sessionId,
      metrics: {
        sessionDuration,
        pagesVisited: this.sessionData.pagesVisited.size,
        featuresUsed: Array.from(this.sessionData.featuresUsed),
        interactionCount: this.sessionData.interactionCount,
        completionRate,
        errorCount: this.sessionData.errorCount,
        helpRequestCount: this.sessionData.helpRequestCount,
        buddyAIInteractions: this.sessionData.buddyAIInteractions,
        offlineUsage: this.sessionData.offlineUsage,
      },
    };

    try {
      await pilotAPI.trackEngagement(metrics);
    } catch (error) {
      console.error('Failed to send engagement metrics:', error);
    }
  }

  // Calculate completion rate based on expected user journey
  private calculateCompletionRate(): number {
    if (!this.sessionData) return 0;

    const expectedPages = [
      '/dashboard',
      '/lessons',
      '/practice',
      '/chat',
    ];

    const visitedExpectedPages = expectedPages.filter(page => 
      Array.from(this.sessionData!.pagesVisited).some(visited => visited.includes(page))
    );

    return (visitedExpectedPages.length / expectedPages.length) * 100;
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `pilot-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current session data for debugging
  getSessionData(): SessionData | null {
    return this.sessionData;
  }

  // Check if tracking is active
  isTrackingActive(): boolean {
    return this.isTracking;
  }
}

// Create singleton instance
export const pilotEngagementTracker = new PilotEngagementTracker();

// Helper hook for React components
export const usePilotEngagementTracker = () => {
  const trackFeature = (feature: string) => {
    pilotEngagementTracker.trackFeatureUsage(feature);
  };

  const trackHelpRequest = () => {
    pilotEngagementTracker.trackHelpRequest();
  };

  const trackBuddyAI = () => {
    pilotEngagementTracker.trackBuddyAIInteraction();
  };

  return {
    trackFeature,
    trackHelpRequest,
    trackBuddyAI,
    isTracking: pilotEngagementTracker.isTrackingActive(),
  };
};