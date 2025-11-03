/// <reference types="cypress" />

describe('Lesson Creation Workflow', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'teacher@example.com',
          firstName: 'Test',
          lastName: 'Teacher',
          roles: ['teacher'],
        },
      },
    }).as('login');

    cy.intercept('GET', '/api/lessons', {
      statusCode: 200,
      body: [],
    }).as('getLessons');

    cy.intercept('POST', '/api/lessons', {
      statusCode: 201,
      body: {
        id: '1',
        title: 'New Lesson',
        modules: [],
        createdAt: new Date().toISOString(),
      },
    }).as('createLesson');

    cy.intercept('GET', '/api/ai/suggestions', {
      statusCode: 200,
      body: {
        suggestions: [
          'Introduction to the topic',
          'Key concepts and definitions',
          'Practical examples',
          'Summary and review',
        ],
      },
    }).as('getAISuggestions');

    cy.login();
  });

  it('should create a new lesson successfully', () => {
    cy.visit('/lessons');
    cy.wait('@getLessons');

    // Click create lesson button
    cy.get('[data-testid="create-lesson-button"]').click();

    // Verify lesson builder opens
    cy.url().should('include', '/lessons/new');
    cy.get('[data-testid="lesson-builder"]').should('be.visible');

    // Enter lesson title
    cy.get('[data-testid="lesson-title-input"]')
      .clear()
      .type('Introduction to Mathematics');

    // Add a text module
    cy.get('[data-testid="add-module-text"]').click();
    cy.get('[data-testid="module-editor"]').should('be.visible');

    // Add content to the module
    cy.get('[data-testid="module-content-editor"]')
      .type('This is an introduction to basic mathematical concepts.');

    // Save the lesson
    cy.get('[data-testid="save-lesson-button"]').click();
    cy.wait('@createLesson');

    // Verify success message
    cy.get('[data-testid="success-notification"]')
      .should('be.visible')
      .and('contain', 'Lesson saved successfully');
  });

  it('should use AI assistant to generate lesson outline', () => {
    cy.visit('/lessons/new');

    // Open AI assistant
    cy.get('[data-testid="ai-assistant-button"]').click();
    cy.get('[data-testid="ai-assistant-panel"]').should('be.visible');

    // Enter topic for AI generation
    cy.get('[data-testid="ai-topic-input"]')
      .type('Introduction to Algebra');

    // Generate outline
    cy.get('[data-testid="generate-outline-button"]').click();
    cy.wait('@getAISuggestions');

    // Verify suggestions appear
    cy.get('[data-testid="ai-suggestions"]').should('be.visible');
    cy.get('[data-testid="suggestion-item"]').should('have.length.at.least', 1);

    // Apply a suggestion
    cy.get('[data-testid="suggestion-item"]').first().click();
    cy.get('[data-testid="apply-suggestion-button"]').click();

    // Verify module was added
    cy.get('[data-testid="lesson-module"]').should('exist');
  });

  it('should handle drag and drop module reordering', () => {
    cy.visit('/lessons/new');

    // Add multiple modules
    cy.get('[data-testid="add-module-text"]').click();
    cy.get('[data-testid="module-title-input"]').type('Module 1');
    cy.get('[data-testid="confirm-module"]').click();

    cy.get('[data-testid="add-module-video"]').click();
    cy.get('[data-testid="module-title-input"]').type('Module 2');
    cy.get('[data-testid="confirm-module"]').click();

    // Verify initial order
    cy.get('[data-testid="lesson-module"]').first().should('contain', 'Module 1');
    cy.get('[data-testid="lesson-module"]').last().should('contain', 'Module 2');

    // Drag and drop to reorder
    cy.get('[data-testid="lesson-module"]').first()
      .trigger('dragstart');
    cy.get('[data-testid="lesson-module"]').last()
      .trigger('drop');

    // Verify new order
    cy.get('[data-testid="lesson-module"]').first().should('contain', 'Module 2');
    cy.get('[data-testid="lesson-module"]').last().should('contain', 'Module 1');
  });

  it('should validate required fields', () => {
    cy.visit('/lessons/new');

    // Try to save without title
    cy.get('[data-testid="save-lesson-button"]').click();

    // Verify validation error
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Lesson title is required');

    // Enter title and try again
    cy.get('[data-testid="lesson-title-input"]')
      .type('Valid Lesson Title');

    cy.get('[data-testid="save-lesson-button"]').click();
    cy.wait('@createLesson');

    // Verify success
    cy.get('[data-testid="success-notification"]').should('be.visible');
  });

  it('should support collaborative editing', () => {
    cy.visit('/lessons/new');

    // Enable collaboration
    cy.get('[data-testid="collaboration-button"]').click();
    cy.get('[data-testid="collaboration-panel"]').should('be.visible');

    // Invite collaborator
    cy.get('[data-testid="invite-email-input"]')
      .type('colleague@example.com');
    cy.get('[data-testid="send-invite-button"]').click();

    // Verify collaboration indicator
    cy.get('[data-testid="collaboration-indicator"]')
      .should('be.visible')
      .and('contain', '1 collaborator');
  });

  it('should preview lesson before saving', () => {
    cy.visit('/lessons/new');

    // Add lesson content
    cy.get('[data-testid="lesson-title-input"]')
      .type('Preview Test Lesson');

    cy.get('[data-testid="add-module-text"]').click();
    cy.get('[data-testid="module-content-editor"]')
      .type('This is preview content.');
    cy.get('[data-testid="confirm-module"]').click();

    // Open preview
    cy.get('[data-testid="preview-button"]').click();
    cy.get('[data-testid="lesson-preview"]').should('be.visible');

    // Verify preview content
    cy.get('[data-testid="preview-title"]')
      .should('contain', 'Preview Test Lesson');
    cy.get('[data-testid="preview-content"]')
      .should('contain', 'This is preview content.');

    // Close preview
    cy.get('[data-testid="close-preview-button"]').click();
    cy.get('[data-testid="lesson-preview"]').should('not.exist');
  });

  it('should handle auto-save functionality', () => {
    cy.visit('/lessons/new');

    // Enter content
    cy.get('[data-testid="lesson-title-input"]')
      .type('Auto-save Test');

    // Wait for auto-save indicator
    cy.get('[data-testid="auto-save-indicator"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Saved');
  });

  it('should be accessible via keyboard navigation', () => {
    cy.visit('/lessons/new');

    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'lesson-title-input');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'add-module-text');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'add-module-video');

    // Test Enter key activation
    cy.focused().type('{enter}');
    cy.get('[data-testid="module-editor"]').should('be.visible');
  });

  it('should check accessibility compliance', () => {
    cy.visit('/lessons/new');
    
    // Check for accessibility violations
    cy.checkA11y();

    // Test with specific context
    cy.get('[data-testid="lesson-builder"]').then($el => {
      cy.checkA11y($el[0]);
    });

    // Test after adding content
    cy.get('[data-testid="add-module-text"]').click();
    cy.checkA11y();
  });
});