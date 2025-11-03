import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import authSlice from '../store/slices/authSlice'
import uiSlice from '../store/slices/uiSlice'
import learningSlice from '../store/slices/learningSlice'
import offlineSlice from '../store/slices/offlineSlice'

// Create a test store
export const createTestStore = (preloadedState = {}) => {
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

interface AllTheProvidersProps {
  children: React.ReactNode
  store?: ReturnType<typeof createTestStore>
}

const AllTheProviders = ({ children, store = createTestStore() }: AllTheProvidersProps) => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    store?: ReturnType<typeof createTestStore>
    preloadedState?: any
  }
) => {
  const { store = createTestStore(options?.preloadedState), ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders store={store}>{children}</AllTheProviders>,
    ...renderOptions,
  })
}

// Mock user data for tests
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'student' as const,
  preferences: {
    theme: 'light' as const,
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      inApp: true,
      assignments: true,
      grades: true,
      announcements: true,
    },
    accessibility: {
      fontSize: 'medium' as const,
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false,
    },
  },
  learningProfile: {
    learningStyle: 'visual' as const,
    difficultyPreference: 'medium' as const,
    pacePreference: 'medium' as const,
    subjects: ['math', 'science'],
    goals: ['improve grades'],
    strengths: ['problem solving'],
    challenges: ['time management'],
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Mock lesson data
export const mockLesson = {
  id: '1',
  title: 'Introduction to React',
  description: 'Learn the basics of React',
  content: [],
  duration: 60,
  difficulty: 'beginner' as const,
  prerequisites: [],
  learningObjectives: ['Understand React basics'],
  tags: ['react', 'javascript'],
  courseId: '1',
  moduleId: '1',
  order: 1,
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: {
    views: 100,
    completions: 80,
    averageRating: 4.5,
    totalRatings: 20,
    estimatedTime: 60,
    lastUpdated: '2024-01-01T00:00:00Z',
  },
}

// Mock assignment data
export const mockAssignment = {
  id: '1',
  title: 'React Basics Quiz',
  description: 'Test your knowledge of React basics',
  type: 'quiz' as const,
  dueDate: '2024-12-31T23:59:59Z',
  points: 100,
  status: 'not_started' as const,
  courseId: '1',
}

// Mock authenticated state
export const mockAuthenticatedState = {
  auth: {
    user: mockUser,
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    biometricEnabled: false,
    mfaRequired: false,
  },
  ui: {
    theme: 'light' as const,
    sidebarCollapsed: false,
    dashboardLayout: [],
    learningPreferences: {
      fontSize: 'medium' as const,
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false,
    },
    notifications: [],
  },
  learning: {
    currentLesson: null,
    lessons: [],
    assignments: [],
    progress: {},
    recommendations: [],
    analytics: {
      overallProgress: 75,
      completedLessons: 8,
      totalLessons: 12,
      currentStreak: 5,
      weeklyGoal: 10,
      weeklyProgress: 7,
      recentAchievements: [],
    },
    personalizationData: {
      learningStyle: 'visual' as const,
      preferredDifficulty: 'medium' as const,
      studyTimePreference: 'morning' as const,
      topicInterests: ['math', 'science'],
    },
    isLoading: false,
    error: null,
  },
  offline: {
    isOnline: true,
    syncQueue: [],
    lastSync: null,
    pendingChanges: 0,
  },
}

// Mock unauthenticated state
export const mockUnauthenticatedState = {
  auth: {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    biometricEnabled: false,
    mfaRequired: false,
  },
  ui: {
    theme: 'light' as const,
    sidebarCollapsed: false,
    dashboardLayout: [],
    learningPreferences: {
      fontSize: 'medium' as const,
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false,
    },
    notifications: [],
  },
  learning: {
    currentLesson: null,
    lessons: [],
    assignments: [],
    progress: {},
    recommendations: [],
    analytics: null,
    personalizationData: null,
    isLoading: false,
    error: null,
  },
  offline: {
    isOnline: true,
    syncQueue: [],
    lastSync: null,
    pendingChanges: 0,
  },
}

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }