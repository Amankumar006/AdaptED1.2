import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { learningAPI } from '../../services/api/learningAPI'
import { analyticsAPI, LearningAnalytics, PersonalizationData, DashboardRecommendations } from '../../services/api/analyticsAPI'
import { 
  LearningProgress, 
  Lesson, 
  Assignment, 
  StudySession,
  LearningPath,
  Achievement 
} from '../../types'

interface LearningState {
  currentLesson: Lesson | null
  progress: LearningProgress | null
  assignments: Assignment[]
  studySessions: StudySession[]
  learningPaths: LearningPath[]
  achievements: Achievement[]
  recommendations: Lesson[]
  bookmarks: string[]
  notes: Array<{
    id: string
    lessonId: string
    content: string
    timestamp: number
    position?: number
  }>
  analytics: LearningAnalytics | null
  personalizationData: PersonalizationData | null
  dashboardRecommendations: DashboardRecommendations | null
  isLoading: boolean
  error: string | null
  offlineContent: string[]
  syncPending: boolean
}

const initialState: LearningState = {
  currentLesson: null,
  progress: null,
  assignments: [],
  studySessions: [],
  learningPaths: [],
  achievements: [],
  recommendations: [],
  bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]'),
  notes: JSON.parse(localStorage.getItem('notes') || '[]'),
  analytics: null,
  personalizationData: null,
  dashboardRecommendations: null,
  isLoading: false,
  error: null,
  offlineContent: JSON.parse(localStorage.getItem('offlineContent') || '[]'),
  syncPending: false,
}

// Async thunks
export const fetchLearningProgress = createAsyncThunk(
  'learning/fetchProgress',
  async (_, { rejectWithValue }) => {
    try {
      const progress = await learningAPI.getProgress()
      return progress
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch progress')
    }
  }
)

export const fetchAssignments = createAsyncThunk(
  'learning/fetchAssignments',
  async (_, { rejectWithValue }) => {
    try {
      const assignments = await learningAPI.getAssignments()
      return assignments
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch assignments')
    }
  }
)

export const fetchRecommendations = createAsyncThunk(
  'learning/fetchRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const recommendations = await learningAPI.getRecommendations()
      return recommendations
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommendations')
    }
  }
)

export const startLesson = createAsyncThunk(
  'learning/startLesson',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const lesson = await learningAPI.getLesson(lessonId)
      const session = await learningAPI.startSession(lessonId)
      return { lesson, session }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start lesson')
    }
  }
)

export const updateProgress = createAsyncThunk(
  'learning/updateProgress',
  async (data: { lessonId: string; progress: number; timeSpent: number }, { rejectWithValue }) => {
    try {
      const updatedProgress = await learningAPI.updateProgress(data)
      return updatedProgress
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update progress')
    }
  }
)

export const downloadForOffline = createAsyncThunk(
  'learning/downloadForOffline',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const lesson = await learningAPI.downloadLesson(lessonId)
      return { lessonId, lesson }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download lesson')
    }
  }
)

export const syncOfflineData = createAsyncThunk(
  'learning/syncOfflineData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { learning: LearningState }
      const pendingData = {
        notes: state.learning.notes,
        bookmarks: state.learning.bookmarks,
        progress: state.learning.progress,
      }
      
      await learningAPI.syncOfflineData(pendingData)
      return true
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync offline data')
    }
  }
)

export const fetchLearningAnalytics = createAsyncThunk(
  'learning/fetchAnalytics',
  async (timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month', { rejectWithValue }) => {
    try {
      const analytics = await analyticsAPI.getLearningAnalytics(timeframe)
      return analytics
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch learning analytics')
    }
  }
)

export const fetchPersonalizationData = createAsyncThunk(
  'learning/fetchPersonalizationData',
  async (_, { rejectWithValue }) => {
    try {
      const personalizationData = await analyticsAPI.getPersonalizationData()
      return personalizationData
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch personalization data')
    }
  }
)

export const fetchDashboardRecommendations = createAsyncThunk(
  'learning/fetchDashboardRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const recommendations = await analyticsAPI.getDashboardRecommendations()
      return recommendations
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard recommendations')
    }
  }
)

export const trackDashboardEvent = createAsyncThunk(
  'learning/trackDashboardEvent',
  async (event: {
    eventType: 'widget_view' | 'widget_interact' | 'layout_change' | 'customization_start' | 'customization_end'
    widgetId?: string
    data?: any
  }, { rejectWithValue }) => {
    try {
      await analyticsAPI.trackDashboardEvent(event)
      return event
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to track dashboard event')
    }
  }
)

const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    addBookmark: (state, action: PayloadAction<string>) => {
      if (!state.bookmarks.includes(action.payload)) {
        state.bookmarks.push(action.payload)
        localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks))
      }
    },
    removeBookmark: (state, action: PayloadAction<string>) => {
      state.bookmarks = state.bookmarks.filter(id => id !== action.payload)
      localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks))
    },
    addNote: (state, action: PayloadAction<{
      lessonId: string
      content: string
      position?: number
    }>) => {
      const note = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...action.payload,
      }
      state.notes.push(note)
      localStorage.setItem('notes', JSON.stringify(state.notes))
    },
    updateNote: (state, action: PayloadAction<{
      id: string
      content: string
    }>) => {
      const noteIndex = state.notes.findIndex(note => note.id === action.payload.id)
      if (noteIndex !== -1) {
        state.notes[noteIndex].content = action.payload.content
        state.notes[noteIndex].timestamp = Date.now()
        localStorage.setItem('notes', JSON.stringify(state.notes))
      }
    },
    deleteNote: (state, action: PayloadAction<string>) => {
      state.notes = state.notes.filter(note => note.id !== action.payload)
      localStorage.setItem('notes', JSON.stringify(state.notes))
    },
    setCurrentLesson: (state, action: PayloadAction<Lesson | null>) => {
      state.currentLesson = action.payload
    },
    setSyncPending: (state, action: PayloadAction<boolean>) => {
      state.syncPending = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch progress
      .addCase(fetchLearningProgress.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchLearningProgress.fulfilled, (state, action) => {
        state.isLoading = false
        state.progress = action.payload
      })
      .addCase(fetchLearningProgress.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Fetch assignments
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.assignments = action.payload.data
      })
      
      // Fetch recommendations
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.recommendations = action.payload
      })
      
      // Start lesson
      .addCase(startLesson.fulfilled, (state, action) => {
        state.currentLesson = action.payload.lesson
        state.studySessions.push(action.payload.session)
      })
      
      // Update progress
      .addCase(updateProgress.fulfilled, (state, action) => {
        state.progress = action.payload
      })
      
      // Download for offline
      .addCase(downloadForOffline.fulfilled, (state, action) => {
        if (!state.offlineContent.includes(action.payload.lessonId)) {
          state.offlineContent.push(action.payload.lessonId)
          localStorage.setItem('offlineContent', JSON.stringify(state.offlineContent))
        }
      })
      
      // Sync offline data
      .addCase(syncOfflineData.pending, (state) => {
        state.syncPending = true
      })
      .addCase(syncOfflineData.fulfilled, (state) => {
        state.syncPending = false
      })
      .addCase(syncOfflineData.rejected, (state, action) => {
        state.syncPending = false
        state.error = action.payload as string
      })
      
      // Fetch learning analytics
      .addCase(fetchLearningAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload
      })
      
      // Fetch personalization data
      .addCase(fetchPersonalizationData.fulfilled, (state, action) => {
        state.personalizationData = action.payload
      })
      
      // Fetch dashboard recommendations
      .addCase(fetchDashboardRecommendations.fulfilled, (state, action) => {
        state.dashboardRecommendations = action.payload
      })
      
      // Track dashboard event
      .addCase(trackDashboardEvent.fulfilled, (state) => {
        // Event tracked successfully, no state change needed
      })
  },
})

export const {
  clearError,
  addBookmark,
  removeBookmark,
  addNote,
  updateNote,
  deleteNote,
  setCurrentLesson,
  setSyncPending,
} = learningSlice.actions

export default learningSlice.reducer