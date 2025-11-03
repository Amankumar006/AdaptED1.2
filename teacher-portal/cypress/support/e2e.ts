import './commands';
import 'cypress-axe';

// Import commands.js using ES2015 syntax:
// Alternatively you can use CommonJS syntax:
// require('./commands')

beforeEach(() => {
  // Inject axe-core before each test
  cy.injectAxe();
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});