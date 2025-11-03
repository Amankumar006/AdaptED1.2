// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'

// Import global styles
import '../../src/index.css'

import { mount } from 'cypress/react18'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import authSlice from '../../src/store/slices/authSlice'
import uiSlice from '../../src/store/slices/uiSlice'
import learningSlice from '../../src/store/slices/learningSlice'
import offlineSlice from '../../src/store/slices/offlineSlice'

// Create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      ui: uiSlice,
      learning: learningSlice,
      offline: offlineSlice,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  })
}

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount(
        component: React.ReactNode,
        options?: {
          store?: ReturnType<typeof createTestStore>
          preloadedState?: any
        }
      ): Chainable<any>
    }
  }
}

Cypress.Commands.add('mount', (component, options = {}) => {
  const { store = createTestStore(options.preloadedState) } = options

  const wrapped = (
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )

  return mount(wrapped)
})