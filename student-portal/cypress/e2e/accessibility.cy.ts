describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.mockAPI()
  })

  it('should pass accessibility audit on login page', () => {
    cy.visit('/login')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on dashboard', () => {
    cy.login()
    cy.visit('/dashboard')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on lessons page', () => {
    cy.login()
    cy.visit('/lessons')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on lesson viewer', () => {
    cy.login()
    cy.visit('/lessons/1')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on practice page', () => {
    cy.login()
    cy.visit('/practice')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on chat page', () => {
    cy.login()
    cy.visit('/chat')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should pass accessibility audit on progress page', () => {
    cy.login()
    cy.visit('/progress')
    cy.injectAxe()
    cy.checkA11y()
  })

  it('should support keyboard navigation throughout the app', () => {
    cy.login()
    cy.visit('/dashboard')

    // Test tab navigation through main navigation
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-testid', 'dashboard-nav')

    cy.focused().tab()
    cy.focused().should('have.attr', 'data-testid', 'lessons-nav')

    cy.focused().tab()
    cy.focused().should('have.attr', 'data-testid', 'practice-nav')

    cy.focused().tab()
    cy.focused().should('have.attr', 'data-testid', 'chat-nav')

    // Test Enter key activation
    cy.focused().type('{enter}')
    cy.url().should('include', '/chat')
  })

  it('should work with screen reader simulation', () => {
    cy.login()
    cy.visit('/dashboard')

    // Check for proper ARIA labels
    cy.get('[aria-label]').should('have.length.greaterThan', 0)
    cy.get('[aria-describedby]').should('have.length.greaterThan', 0)

    // Check for live regions
    cy.get('[aria-live]').should('have.length.greaterThan', 0)

    // Check for proper heading structure
    cy.get('h1').should('have.length', 1)
    cy.get('h2, h3, h4, h5, h6').should('have.length.greaterThan', 0)
  })

  it('should handle high contrast mode', () => {
    // Simulate high contrast mode
    cy.visit('/dashboard', {
      onBeforeLoad: (win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: true,
            addListener: cy.stub(),
            removeListener: cy.stub(),
          }),
        })
      },
    })

    cy.login()
    cy.injectAxe()
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
  })

  it('should respect reduced motion preferences', () => {
    cy.visit('/dashboard', {
      onBeforeLoad: (win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: true,
            addListener: cy.stub(),
            removeListener: cy.stub(),
          }),
        })
      },
    })

    cy.login()

    // Verify that animations are disabled or reduced
    cy.get('[data-testid="animated-element"]').should('have.css', 'animation-duration', '0s')
  })

  it('should provide skip links', () => {
    cy.login()
    cy.visit('/dashboard')

    // Check for skip to main content link
    cy.get('body').tab()
    cy.focused().should('contain.text', 'Skip to main content')
    cy.focused().type('{enter}')
    cy.focused().should('have.attr', 'id', 'main-content')
  })

  it('should have proper focus management in modals', () => {
    cy.login()
    cy.visit('/dashboard')

    // Open a modal
    cy.get('[data-testid="open-modal-button"]').click()
    cy.get('[data-testid="modal"]').should('be.visible')

    // Focus should be trapped in modal
    cy.focused().should('be.within', '[data-testid="modal"]')

    // Test Escape key to close modal
    cy.get('body').type('{esc}')
    cy.get('[data-testid="modal"]').should('not.exist')

    // Focus should return to trigger element
    cy.focused().should('have.attr', 'data-testid', 'open-modal-button')
  })

  it('should provide error messages that are accessible', () => {
    cy.visit('/login')

    // Submit form with invalid data
    cy.get('[data-testid="login-button"]').click()

    // Check for accessible error messages
    cy.get('[role="alert"]').should('be.visible')
    cy.get('[aria-invalid="true"]').should('exist')
    cy.get('[aria-describedby]').should('exist')
  })

  it('should support voice control simulation', () => {
    cy.login()
    cy.visit('/chat')

    // Test voice input button
    cy.get('[data-testid="voice-input-button"]').should('have.attr', 'aria-label')
    cy.get('[data-testid="voice-input-button"]').click()

    // Check for voice status announcement
    cy.get('[aria-live="polite"]').should('contain', 'Listening')
  })

  it('should handle form validation accessibly', () => {
    cy.visit('/login')

    // Test required field validation
    cy.get('[data-testid="email-input"]').focus().blur()
    cy.get('[data-testid="email-input"]').should('have.attr', 'aria-invalid', 'true')
    cy.get('[data-testid="email-error"]').should('be.visible')

    // Test valid input
    cy.get('[data-testid="email-input"]').type('test@example.com')
    cy.get('[data-testid="email-input"]').should('have.attr', 'aria-invalid', 'false')
    cy.get('[data-testid="email-error"]').should('not.exist')
  })
})