/// <reference types="cypress" />

describe('Assessment Creation Workflow', () => {
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

    cy.intercept('GET', '/api/assessments', {
      statusCode: 200,
      body: [],
    }).as('getAssessments');

    cy.intercept('POST', '/api/assessments', {
      statusCode: 201,
      body: {
        id: '1',
        title: 'New Assessment',
        questions: [],
        createdAt: new Date().toISOString(),
      },
    }).as('createAssessment');

    cy.intercept('GET', '/api/assessments/question-types', {
      statusCode: 200,
      body: [
        { id: 'multiple-choice', name: 'Multiple Choice', icon: '☑️' },
        { id: 'essay', name: 'Essay', icon: '📝' },
        { id: 'true-false', name: 'True/False', icon: '✓' },
      ],
    }).as('getQuestionTypes');

    cy.login();
  });

  it('should create a new assessment successfully', () => {
    cy.visit('/assessments');
    cy.wait('@getAssessments');

    // Click create assessment button
    cy.get('[data-testid="create-assessment-button"]').click();

    // Verify assessment builder opens
    cy.url().should('include', '/assessments/new');
    cy.get('[data-testid="assessment-builder"]').should('be.visible');

    // Enter assessment title
    cy.get('[data-testid="assessment-title-input"]')
      .clear()
      .type('Mathematics Quiz');

    // Add description
    cy.get('[data-testid="assessment-description-input"]')
      .type('A quiz covering basic mathematical concepts');

    // Add a multiple choice question
    cy.get('[data-testid="add-question-button"]').click();
    cy.wait('@getQuestionTypes');

    cy.get('[data-testid="question-type-multiple-choice"]').click();

    // Fill in question details
    cy.get('[data-testid="question-text-input"]')
      .type('What is 2 + 2?');

    cy.get('[data-testid="option-input-0"]').type('3');
    cy.get('[data-testid="option-input-1"]').type('4');
    cy.get('[data-testid="option-input-2"]').type('5');
    cy.get('[data-testid="option-input-3"]').type('6');

    // Mark correct answer
    cy.get('[data-testid="correct-answer-1"]').click();

    // Set points
    cy.get('[data-testid="question-points-input"]').clear().type('10');

    // Save the assessment
    cy.get('[data-testid="save-assessment-button"]').click();
    cy.wait('@createAssessment');

    // Verify success message
    cy.get('[data-testid="success-notification"]')
      .should('be.visible')
      .and('contain', 'Assessment saved successfully');
  });

  it('should add different question types', () => {
    cy.visit('/assessments/new');

    // Add multiple choice question
    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-multiple-choice"]').click();
    cy.get('[data-testid="question-text-input"]')
      .type('Multiple choice question');
    cy.get('[data-testid="confirm-question"]').click();

    // Add essay question
    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-essay"]').click();
    cy.get('[data-testid="question-text-input"]')
      .type('Essay question');
    cy.get('[data-testid="confirm-question"]').click();

    // Add true/false question
    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-true-false"]').click();
    cy.get('[data-testid="question-text-input"]')
      .type('True/false question');
    cy.get('[data-testid="confirm-question"]').click();

    // Verify all questions are added
    cy.get('[data-testid="question-item"]').should('have.length', 3);
  });

  it('should reorder questions using drag and drop', () => {
    cy.visit('/assessments/new');

    // Add two questions
    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-multiple-choice"]').click();
    cy.get('[data-testid="question-text-input"]').type('Question 1');
    cy.get('[data-testid="confirm-question"]').click();

    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-essay"]').click();
    cy.get('[data-testid="question-text-input"]').type('Question 2');
    cy.get('[data-testid="confirm-question"]').click();

    // Verify initial order
    cy.get('[data-testid="question-item"]').first()
      .should('contain', 'Question 1');

    // Drag and drop to reorder
    cy.get('[data-testid="question-item"]').first()
      .trigger('dragstart');
    cy.get('[data-testid="question-item"]').last()
      .trigger('drop');

    // Verify new order
    cy.get('[data-testid="question-item"]').first()
      .should('contain', 'Question 2');
  });

  it('should validate assessment before saving', () => {
    cy.visit('/assessments/new');

    // Try to save without title
    cy.get('[data-testid="save-assessment-button"]').click();

    // Verify validation error
    cy.get('[data-testid="validation-error"]')
      .should('be.visible')
      .and('contain', 'Assessment title is required');

    // Add title but no questions
    cy.get('[data-testid="assessment-title-input"]')
      .type('Test Assessment');

    cy.get('[data-testid="save-assessment-button"]').click();

    // Verify validation error for questions
    cy.get('[data-testid="validation-error"]')
      .should('be.visible')
      .and('contain', 'At least one question is required');
  });

  it('should preview assessment', () => {
    cy.visit('/assessments/new');

    // Add assessment content
    cy.get('[data-testid="assessment-title-input"]')
      .type('Preview Test Assessment');

    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-multiple-choice"]').click();
    cy.get('[data-testid="question-text-input"]')
      .type('Sample question for preview');
    cy.get('[data-testid="option-input-0"]').type('Option A');
    cy.get('[data-testid="option-input-1"]').type('Option B');
    cy.get('[data-testid="confirm-question"]').click();

    // Open preview
    cy.get('[data-testid="preview-assessment-button"]').click();
    cy.get('[data-testid="assessment-preview"]').should('be.visible');

    // Verify preview content
    cy.get('[data-testid="preview-title"]')
      .should('contain', 'Preview Test Assessment');
    cy.get('[data-testid="preview-question"]')
      .should('contain', 'Sample question for preview');

    // Close preview
    cy.get('[data-testid="close-preview-button"]').click();
    cy.get('[data-testid="assessment-preview"]').should('not.exist');
  });

  it('should import questions from question bank', () => {
    cy.intercept('GET', '/api/question-bank', {
      statusCode: 200,
      body: [
        {
          id: '1',
          text: 'Imported question 1',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 1,
        },
        {
          id: '2',
          text: 'Imported question 2',
          type: 'essay',
        },
      ],
    }).as('getQuestionBank');

    cy.visit('/assessments/new');

    // Open question bank
    cy.get('[data-testid="question-bank-button"]').click();
    cy.wait('@getQuestionBank');

    cy.get('[data-testid="question-bank-modal"]').should('be.visible');

    // Select questions to import
    cy.get('[data-testid="question-bank-item-1"]').click();
    cy.get('[data-testid="question-bank-item-2"]').click();

    // Import selected questions
    cy.get('[data-testid="import-questions-button"]').click();

    // Verify questions are imported
    cy.get('[data-testid="question-item"]').should('have.length', 2);
    cy.get('[data-testid="question-item"]').first()
      .should('contain', 'Imported question 1');
  });

  it('should set assessment settings', () => {
    cy.visit('/assessments/new');

    // Open settings
    cy.get('[data-testid="assessment-settings-button"]').click();
    cy.get('[data-testid="settings-modal"]').should('be.visible');

    // Set time limit
    cy.get('[data-testid="time-limit-input"]').clear().type('60');

    // Set attempts allowed
    cy.get('[data-testid="attempts-allowed-input"]').clear().type('3');

    // Enable randomize questions
    cy.get('[data-testid="randomize-questions-checkbox"]').check();

    // Set passing score
    cy.get('[data-testid="passing-score-input"]').clear().type('70');

    // Save settings
    cy.get('[data-testid="save-settings-button"]').click();

    // Verify settings are applied
    cy.get('[data-testid="settings-summary"]')
      .should('contain', '60 minutes')
      .and('contain', '3 attempts')
      .and('contain', '70% passing score');
  });

  it('should be accessible via keyboard navigation', () => {
    cy.visit('/assessments/new');

    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'assessment-title-input');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'assessment-description-input');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'add-question-button');

    // Test Enter key activation
    cy.focused().type('{enter}');
    cy.get('[data-testid="question-type-selector"]').should('be.visible');
  });

  it('should check accessibility compliance', () => {
    cy.visit('/assessments/new');
    
    // Check for accessibility violations
    cy.checkA11y();

    // Test after adding content
    cy.get('[data-testid="add-question-button"]').click();
    cy.get('[data-testid="question-type-multiple-choice"]').click();
    cy.checkA11y();

    // Test preview accessibility
    cy.get('[data-testid="assessment-title-input"]').type('Test Assessment');
    cy.get('[data-testid="question-text-input"]').type('Test question');
    cy.get('[data-testid="confirm-question"]').click();
    
    cy.get('[data-testid="preview-assessment-button"]').click();
    cy.checkA11y('[data-testid="assessment-preview"]');
  });
});