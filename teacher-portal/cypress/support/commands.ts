/// <reference types="cypress" />
/// <reference types="cypress-axe" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      checkA11y(context?: string | Node, options?: any): Chainable<void>;
      createLesson(title: string): Chainable<void>;
      createAssessment(title: string): Chainable<void>;
      navigateToPage(page: string): Chainable<void>;
    }
  }
}

// Custom command for login
Cypress.Commands.add('login', (email = 'teacher@example.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

// Custom command for accessibility testing
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.checkA11y(context, {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true },
      'aria-labels': { enabled: true },
      'heading-order': { enabled: true },
      'landmark-roles': { enabled: true },
    },
    ...options,
  });
});

// Custom command for creating a lesson
Cypress.Commands.add('createLesson', (title: string) => {
  cy.get('[data-testid="create-lesson-button"]').click();
  cy.get('[data-testid="lesson-title-input"]').clear().type(title);
  cy.get('[data-testid="save-lesson-button"]').click();
});

// Custom command for creating an assessment
Cypress.Commands.add('createAssessment', (title: string) => {
  cy.get('[data-testid="create-assessment-button"]').click();
  cy.get('[data-testid="assessment-title-input"]').clear().type(title);
  cy.get('[data-testid="save-assessment-button"]').click();
});

// Custom command for navigation
Cypress.Commands.add('navigateToPage', (page: string) => {
  cy.get(`[data-testid="nav-${page}"]`).click();
  cy.url().should('include', `/${page}`);
});