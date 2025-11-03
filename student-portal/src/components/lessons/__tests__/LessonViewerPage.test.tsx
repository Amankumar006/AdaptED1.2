import React from 'react'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { LessonViewerPage } from '../../../pages/lessons/LessonViewerPage'
import authSlice from '../../../store/slices/authSlice'
import learningSlice from '../../../store/slices/learningSlice'
import offlineSlice from '../../../store/slices/offlineSlice'
import uiSlice from '../../../store/slices/uiSlice'

// Mock the lesson viewer components
jest.mock('../InteractiveLessonViewer', () => ({
  InteractiveLessonViewer: () => <div data-testid="interactive-lesson-viewer">Interactive Lesson Viewer</div>
}))

jest.mock('../LessonNavigation', () => ({
  LessonNavigation: () => <div data-testid="lesson-navigation">Lesson Navigation</div>
}))

jest.mock('../NoteTakingPanel', () => ({
  NoteTakingPanel: () => <div data-testid="note-taking-panel">Note Taking Panel</div>
}))

jest.mock('../BookmarkButton', () => ({
  BookmarkButton: ({ isBookmarked }: { isBookmarked: boolean }) => (
    <button data-testid="bookmark-button">
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}))

jest.mock('../AccessibilityControls', () => ({
  AccessibilityControls: () => <div data-testid="accessibility-controls">Accessibility Controls</div>
}))

jest.mock('../../common/OfflineIndicator', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator">Offline</div>
}))

jest.mock('../../common/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}))

jest.mock('../../common/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  )
}))

// Mock react-router-dom hooks
const mockNavigate = jest.fn()
const mockUseParams = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}))

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      learning: learningSlice,
      offline: offlineSlice,
      ui: uiSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          preferences: {
            accessibility: {
              fontSize: 'medium',
              highContrast: false,
              reducedMotion: false,
              screenReader: false,
              keyboardNavigation: false,
            },
          },
        },
        isAuthenticated: true,
        token: 'mock-token',
        isLoading: false,
        error: null,
      },
      learning: {
        currentLesson: {
          id: '1',
          title: 'Test Lesson',
          description: 'A test lesson',
          content: [
            {
              id: '1',
              type: 'text',
              title: 'Introduction',
              content: { text: 'Welcome to the lesson' },
              order: 0,
              duration: 300,
              isRequired: true,
              settings: {
                allowSkip: false,
                showTranscript: false,
                autoplay: false,
                speed: 1,
                captions: false,
              },
            },
          ],
          duration: 300,
          difficulty: 'beginner',
          prerequisites: [],
          learningObjectives: ['Learn basics'],
          tags: ['intro'],
          courseId: 'course1',
          moduleId: 'module1',
          order: 1,
          isPublished: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          metadata: {
            views: 100,
            completions: 80,
            averageRating: 4.5,
            totalRatings: 20,
            estimatedTime: 300,
            lastUpdated: '2024-01-01',
          },
        },
        progress: {
          userId: '1',
          lessonId: '1',
          courseId: 'course1',
          progress: 50,
          timeSpent: 150,
          completed: false,
          startedAt: '2024-01-01',
          lastAccessedAt: '2024-01-01',
          attempts: 1,
          bookmarked: false,
          notes: [],
        },
        bookmarks: [],
        notes: [],
        assignments: [],
        studySessions: [],
        learningPaths: [],
        achievements: [],
        recommendations: [],
        analytics: null,
        personalizationData: null,
        dashboardRecommendations: null,
        isLoading: false,
        error: null,
        offlineContent: [],
        syncPending: false,
      },
      offline: {
        isOnline: true,
        pendingActions: [],
        syncInProgress: false,
        lastSyncTime: null,
        offlineContent: {},
        storageUsed: 0,
        storageLimit: 50 * 1024 * 1024,
      },
      ui: {
        sidebarOpen: false,
        theme: 'light',
        notifications: [],
        isOnline: true,
        installPromptEvent: null,
        showInstallPrompt: false,
        loading: { global: false },
        modals: {},
        dashboardLayout: [],
        learningPreferences: {
          visualStyle: 'cards',
          fontSize: 'medium',
          reducedMotion: false,
          highContrast: false,
          autoplay: true,
        },
      },
      ...initialState,
    },
  })
}

const renderWithProviders = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('LessonViewerPage', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ lessonId: '1' })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders lesson viewer with lesson content', () => {
    renderWithProviders(<LessonViewerPage />)
    
    expect(screen.getByText('Test Lesson')).toBeInTheDocument()
    expect(screen.getByText('1 of 1')).toBeInTheDocument()
    expect(screen.getByTestId('interactive-lesson-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-navigation')).toBeInTheDocument()
  })

  it('shows bookmark button', () => {
    renderWithProviders(<LessonViewerPage />)
    
    expect(screen.getByTestId('bookmark-button')).toBeInTheDocument()
  })

  it('shows accessibility controls', () => {
    renderWithProviders(<LessonViewerPage />)
    
    expect(screen.getByTestId('accessibility-controls')).toBeInTheDocument()
  })

  it('shows loading state when lesson is loading', () => {
    const loadingStore = createMockStore({
      learning: {
        currentLesson: null,
        isLoading: true,
        error: null,
      },
    })

    renderWithProviders(<LessonViewerPage />, loadingStore)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows error state when there is an error', () => {
    const errorStore = createMockStore({
      learning: {
        currentLesson: null,
        isLoading: false,
        error: 'Failed to load lesson',
      },
    })

    renderWithProviders(<LessonViewerPage />, errorStore)
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
    expect(screen.getByText('Failed to load lesson')).toBeInTheDocument()
  })

  it('shows offline indicator when offline', () => {
    const offlineStore = createMockStore({
      offline: {
        isOnline: false,
        offlineContent: {},
      },
    })

    renderWithProviders(<LessonViewerPage />, offlineStore)
    
    expect(screen.getByText('Lesson Not Available Offline')).toBeInTheDocument()
  })

  it('allows offline viewing when lesson is cached', () => {
    const offlineStore = createMockStore({
      offline: {
        isOnline: false,
        offlineContent: {
          '1': {
            lesson: { id: '1', title: 'Cached Lesson' },
            downloadedAt: Date.now(),
            size: 1024,
          },
        },
      },
    })

    renderWithProviders(<LessonViewerPage />, offlineStore)
    
    expect(screen.getByText('Test Lesson')).toBeInTheDocument()
    expect(screen.getByTestId('interactive-lesson-viewer')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', () => {
    renderWithProviders(<LessonViewerPage />)
    
    const backButton = screen.getByText('← Back')
    backButton.click()
    
    expect(mockNavigate).toHaveBeenCalledWith('/lessons')
  })

  it('shows notes panel when notes button is clicked', () => {
    renderWithProviders(<LessonViewerPage />)
    
    const notesButton = screen.getByText(/📝 Notes/)
    notesButton.click()
    
    expect(screen.getByTestId('note-taking-panel')).toBeInTheDocument()
  })

  it('handles missing lesson ID by redirecting', () => {
    mockUseParams.mockReturnValue({})
    
    renderWithProviders(<LessonViewerPage />)
    
    expect(mockNavigate).toHaveBeenCalledWith('/lessons')
  })
})