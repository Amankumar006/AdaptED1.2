import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:3000/api',
  },
  writable: true,
})

// Mock React DOM for compatibility
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock user agent for React DOM compatibility
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  writable: true,
})

// Mock React version for compatibility
if (typeof React !== 'undefined' && React.version) {
  Object.defineProperty(React, 'version', {
    value: '19.2.0',
    writable: true,
  })
}

// Disable React version check for tests
const originalConsoleError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Incompatible React versions')
  ) {
    return
  }
  originalConsoleError(...args)
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      register: vi.fn(() => Promise.resolve()),
    },
  },
  writable: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock PublicKeyCredential for biometric authentication
Object.defineProperty(window, 'PublicKeyCredential', {
  writable: true,
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  },
})

// Mock fetch
global.fetch = vi.fn()

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('React Router Future Flag Warning')
  ) {
    return
  }
  originalConsoleWarn(...args)
}