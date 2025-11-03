/// <reference types="cypress" />

// Custom command for accessibility testing
Cypress.Commands.add('checkA11y', (context?: string | Node, options?: any) => {
  cy.checkA11y(context, {
    rules: {
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'landmark-unique': { enabled: true },
      'page-has-heading-one': { enabled: true },
      'region': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    ...options,
  })
})

// Custom command for login
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-button"]').click()
  cy.url().should('include', '/dashboard')
})

// Custom command for mocking API responses
Cypress.Commands.add('mockAPI', () => {
  // Mock authentication
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 200,
    body: {
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        preferences: {
          theme: 'light',
          language: 'en',
          accessibility: {
            fontSize: 'medium',
            highContrast: false,
            reducedMotion: false,
          },
        },
        learningProfile: {
          learningStyle: 'visual',
          difficultyPreference: 'medium',
          pacePreference: 'medium',
        },
      },
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    },
  }).as('login')

  // Mock dashboard data
  cy.intercept('GET', '/api/learning/dashboard', {
    statusCode: 200,
    body: {
      analytics: {
        overallProgress: 75,
        completedLessons: 15,
        totalLessons: 20,
        currentStreak: 5,
        weeklyGoal: 7,
        weeklyProgress: 4,
        timeSpent: 1200,
        averageScore: 85,
      },
      recommendations: [
        {
          id: '1',
          title: 'Introduction to React',
          description: 'Learn React basics',
          duration: 30,
          difficulty: 'beginner',
        },
      ],
      assignments: [
        {
          id: '1',
          title: 'Math Quiz',
          dueDate: '2024-12-31',
          status: 'not_started',
        },
      ],
    },
  }).as('dashboardData')

  // Mock lessons
  cy.intercept('GET', '/api/learning/lessons/*', {
    statusCode: 200,
    body: {
      id: '1',
      title: 'Test Lesson',
      description: 'A test lesson',
      content: [
        {
          id: '1',
          type: 'text',
          title: 'Introduction',
          content: { text: 'Welcome to the lesson' },
        },
      ],
      duration: 300,
      difficulty: 'beginner',
    },
  }).as('lessonData')

  // Mock offline sync
  cy.intercept('POST', '/api/offline/sync', {
    statusCode: 200,
    body: { success: true, syncedAt: new Date().toISOString() },
  }).as('offlineSync')
})

// Custom command for waiting for offline sync
Cypress.Commands.add('waitForOfflineSync', () => {
  cy.get('[data-testid="sync-indicator"]', { timeout: 10000 }).should('not.exist')
})