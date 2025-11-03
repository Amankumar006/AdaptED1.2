import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface OfflineAction {
  id: string
  type: 'UPDATE_PROGRESS' | 'ADD_NOTE' | 'BOOKMARK' | 'SUBMIT_ASSIGNMENT' | 'API_REQUEST'
  data: any
  timestamp: number
  retryCount: number
}

interface OfflineState {
  isOnline: boolean
  pendingActions: OfflineAction[]
  syncInProgress: boolean
  lastSyncTime: number | null
  offlineContent: {
    [lessonId: string]: {
      lesson: any
      downloadedAt: number
      size: number
    }
  }
  storageUsed: number
  storageLimit: number
}

const initialState: OfflineState = {
  isOnline: navigator.onLine,
  pendingActions: JSON.parse(localStorage.getItem('pendingActions') || '[]'),
  syncInProgress: false,
  lastSyncTime: parseInt(localStorage.getItem('lastSyncTime') || '0'),
  offlineContent: JSON.parse(localStorage.getItem('offlineContent') || '{}'),
  storageUsed: 0,
  storageLimit: 50 * 1024 * 1024, // 50MB default limit
}

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const pendingAction: OfflineAction = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        retryCount: 0,
      }
      state.pendingActions.push(pendingAction)
      localStorage.setItem('pendingActions', JSON.stringify(state.pendingActions))
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(pendingAction => pendingAction.id !== action.payload)
      localStorage.setItem('pendingActions', JSON.stringify(state.pendingActions))
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const actionIndex = state.pendingActions.findIndex(a => a.id === action.payload)
      if (actionIndex !== -1) {
        state.pendingActions[actionIndex].retryCount += 1
        localStorage.setItem('pendingActions', JSON.stringify(state.pendingActions))
      }
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload
    },
    updateLastSyncTime: (state) => {
      state.lastSyncTime = Date.now()
      localStorage.setItem('lastSyncTime', state.lastSyncTime.toString())
    },
    addOfflineContent: (state, action: PayloadAction<{
      lessonId: string
      lesson: any
      size: number
    }>) => {
      const { lessonId, lesson, size } = action.payload
      state.offlineContent[lessonId] = {
        lesson,
        downloadedAt: Date.now(),
        size,
      }
      state.storageUsed += size
      localStorage.setItem('offlineContent', JSON.stringify(state.offlineContent))
    },
    removeOfflineContent: (state, action: PayloadAction<string>) => {
      const lessonId = action.payload
      if (state.offlineContent[lessonId]) {
        state.storageUsed -= state.offlineContent[lessonId].size
        delete state.offlineContent[lessonId]
        localStorage.setItem('offlineContent', JSON.stringify(state.offlineContent))
      }
    },
    clearOldOfflineContent: (state, action: PayloadAction<number>) => {
      const cutoffTime = Date.now() - action.payload
      Object.keys(state.offlineContent).forEach(lessonId => {
        if (state.offlineContent[lessonId].downloadedAt < cutoffTime) {
          state.storageUsed -= state.offlineContent[lessonId].size
          delete state.offlineContent[lessonId]
        }
      })
      localStorage.setItem('offlineContent', JSON.stringify(state.offlineContent))
    },
    updateStorageUsed: (state) => {
      state.storageUsed = Object.values(state.offlineContent)
        .reduce((total, content) => total + content.size, 0)
    },
    clearAllPendingActions: (state) => {
      state.pendingActions = []
      localStorage.removeItem('pendingActions')
    },
  },
})

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  setSyncInProgress,
  updateLastSyncTime,
  addOfflineContent,
  removeOfflineContent,
  clearOldOfflineContent,
  updateStorageUsed,
  clearAllPendingActions,
} = offlineSlice.actions

export default offlineSlice.reducer