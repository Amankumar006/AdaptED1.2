import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store/index.ts'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA functionality using VitePWA
// The VitePWA plugin handles this automatically with registerType: 'autoUpdate'
// No manual registration needed

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)