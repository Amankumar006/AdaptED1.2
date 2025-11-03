// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions that we don't care about
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  return true
})

// Set up accessibility testing
beforeEach(() => {
  cy.injectAxe()
})

// Add custom commands for accessibility testing
declare global {
  namespace Cypress {
    interface Chainable {
      checkA11y(context?: string | Node, options?: any): Chainable<Element>
      login(email?: string, password?: string): Chainable<Element>
      mockAPI(): Chainable<Element>
      waitForOfflineSync(): Chainable<Element>
    }
  }
}