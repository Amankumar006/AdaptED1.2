describe('Learning Workflow', () => {
  beforeEach(() => {
    cy.mockAPI()
    cy.visit('/')
  })

  it('should complete a full learning session workflow', () => {
    // Login
    cy.login()

    // Navigate to lessons
    cy.get('[data-testid="lessons-nav"]').click()
    cy.url().should('include', '/lessons')

    // Select a lesson
    cy.get('[data-testid="lesson-card"]').first().click()
    cy.url().should('include', '/lessons/')

    // Check accessibility of lesson viewer
    cy.checkA11y()

    // Interact with lesson content
    cy.get('[data-testid="lesson-content"]').should('be.visible')
    cy.get('[data-testid="next-button"]').should('be.visible')

    // Test keyboard navigation
    cy.get('[data-testid="next-button"]').focus()
    cy.get('[data-testid="next-button"]').should('have.focus')
    cy.get('[data-testid="next-button"]').type('{enter}')

    // Complete lesson
    cy.get('[data-testid="complete-lesson-button"]').click()
    cy.get('[data-testid="lesson-completed-message"]').should('be.visible')

    // Check accessibility after completion
    cy.checkA11y()

    // Return to dashboard
    cy.get('[data-testid="back-to-dashboard"]').click()
    cy.url().should('include', '/dashboard')

    // Verify progress update
    cy.get('[data-testid="progress-widget"]').should('contain', 'Completed')
  })

  it('should handle offline learning workflow', () => {
    cy.login()

    // Navigate to lessons
    cy.get('[data-testid="lessons-nav"]').click()

    // Download lesson for offline use
    cy.get('[data-testid="download-lesson"]').first().click()
    cy.get('[data-testid="download-progress"]').should('be.visible')
    cy.get('[data-testid="download-complete"]').should('be.visible')

    // Simulate offline mode
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false)
      win.dispatchEvent(new Event('offline'))
    })

    // Verify offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible')

    // Access downloaded lesson
    cy.get('[data-testid="lesson-card"]').first().click()
    cy.get('[data-testid="lesson-content"]').should('be.visible')

    // Complete lesson offline
    cy.get('[data-testid="complete-lesson-button"]').click()
    cy.get('[data-testid="sync-pending-indicator"]').should('be.visible')

    // Go back online
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(true)
      win.dispatchEvent(new Event('online'))
    })

    // Wait for sync
    cy.waitForOfflineSync()
    cy.get('[data-testid="sync-complete-message"]').should('be.visible')

    // Check accessibility throughout offline workflow
    cy.checkA11y()
  })

  it('should support note-taking during lessons', () => {
    cy.login()
    cy.get('[data-testid="lessons-nav"]').click()
    cy.get('[data-testid="lesson-card"]').first().click()

    // Open notes panel
    cy.get('[data-testid="notes-button"]').click()
    cy.get('[data-testid="notes-panel"]').should('be.visible')

    // Check accessibility of notes panel
    cy.checkA11y()

    // Add a note
    cy.get('[data-testid="note-input"]').type('This is an important concept')
    cy.get('[data-testid="save-note-button"]').click()

    // Verify note is saved
    cy.get('[data-testid="note-item"]').should('contain', 'This is an important concept')

    // Test keyboard navigation in notes
    cy.get('[data-testid="note-input"]').focus()
    cy.get('[data-testid="note-input"]').should('have.focus')
    cy.get('[data-testid="note-input"]').tab()
    cy.get('[data-testid="save-note-button"]').should('have.focus')
  })

  it('should handle assessment workflow', () => {
    cy.login()
    cy.get('[data-testid="assignments-nav"]').click()

    // Start an assessment
    cy.get('[data-testid="assignment-card"]').first().click()
    cy.get('[data-testid="start-assessment-button"]').click()

    // Check accessibility of assessment interface
    cy.checkA11y()

    // Answer questions
    cy.get('[data-testid="question-1"]').should('be.visible')
    cy.get('[data-testid="answer-option-a"]').click()
    cy.get('[data-testid="next-question-button"]').click()

    // Test keyboard navigation
    cy.get('[data-testid="answer-option-b"]').focus()
    cy.get('[data-testid="answer-option-b"]').should('have.focus')
    cy.get('[data-testid="answer-option-b"]').type(' ') // Space to select

    // Submit assessment
    cy.get('[data-testid="submit-assessment-button"]').click()
    cy.get('[data-testid="assessment-results"]').should('be.visible')

    // Check accessibility of results page
    cy.checkA11y()
  })

  it('should support BuddyAI chat workflow', () => {
    cy.login()

    // Open BuddyAI chat
    cy.get('[data-testid="buddyai-widget"]').click()
    cy.get('[data-testid="chat-interface"]').should('be.visible')

    // Check accessibility of chat interface
    cy.checkA11y()

    // Send a message
    cy.get('[data-testid="chat-input"]').type('Help me with algebra')
    cy.get('[data-testid="send-button"]').click()

    // Wait for response
    cy.get('[data-testid="ai-response"]').should('be.visible')

    // Test voice input
    cy.get('[data-testid="voice-input-button"]').click()
    cy.get('[data-testid="voice-status"]').should('contain', 'Listening')

    // Test image input
    cy.get('[data-testid="image-input-button"]').click()
    cy.get('[data-testid="image-upload"]').should('be.visible')

    // Check keyboard navigation in chat
    cy.get('[data-testid="chat-input"]').focus()
    cy.get('[data-testid="chat-input"]').should('have.focus')
    cy.get('[data-testid="chat-input"]').tab()
    cy.get('[data-testid="send-button"]').should('have.focus')
  })

  it('should handle practice session workflow', () => {
    cy.login()
    cy.get('[data-testid="practice-nav"]').click()

    // Start practice session
    cy.get('[data-testid="start-practice-button"]').click()
    cy.get('[data-testid="practice-interface"]').should('be.visible')

    // Check accessibility
    cy.checkA11y()

    // Complete practice problems
    cy.get('[data-testid="practice-problem"]').should('be.visible')
    cy.get('[data-testid="answer-input"]').type('42')
    cy.get('[data-testid="check-answer-button"]').click()

    // View feedback
    cy.get('[data-testid="feedback-message"]').should('be.visible')

    // Continue to next problem
    cy.get('[data-testid="next-problem-button"]').click()

    // End session
    cy.get('[data-testid="end-session-button"]').click()
    cy.get('[data-testid="session-summary"]').should('be.visible')

    // Check accessibility of summary
    cy.checkA11y()
  })

  it('should support collaborative learning workflow', () => {
    cy.login()
    cy.get('[data-testid="collaboration-nav"]').click()

    // Join study group
    cy.get('[data-testid="study-group-card"]').first().click()
    cy.get('[data-testid="join-group-button"]').click()

    // Check accessibility of group interface
    cy.checkA11y()

    // Participate in discussion
    cy.get('[data-testid="discussion-input"]').type('I have a question about this topic')
    cy.get('[data-testid="post-message-button"]').click()

    // View responses
    cy.get('[data-testid="discussion-message"]').should('be.visible')

    // Test keyboard navigation in discussion
    cy.get('[data-testid="discussion-input"]').focus()
    cy.get('[data-testid="discussion-input"]').should('have.focus')
  })
})