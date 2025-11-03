import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

export interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: Notification[]
  isOnline: boolean
  installPromptEvent: any
  showInstallPrompt: boolean
  loading: {
    global: boolean
    [key: string]: boolean
  }
  modals: {
    [key: string]: boolean
  }
  dashboardLayout: Array<{
    id: string
    x: number
    y: number
    w: number
    h: number
  }>
  learningPreferences: {
    visualStyle: 'cards' | 'list' | 'grid'
    fontSize: 'small' | 'medium' | 'large'
    reducedMotion: boolean
    highContrast: boolean
    autoplay: boolean
  }
}

const initialState: UIState = {
  sidebarOpen: false,
  theme: 'system',
  notifications: [],
  isOnline: navigator.onLine,
  installPromptEvent: null,
  showInstallPrompt: false,
  loading: {
    global: false,
  },
  modals: {},
  dashboardLayout: [
    { id: 'progress', x: 0, y: 0, w: 6, h: 4 },
    { id: 'upcoming', x: 6, y: 0, w: 6, h: 4 },
    { id: 'achievements', x: 0, y: 4, w: 4, h: 3 },
    { id: 'buddyai', x: 4, y: 4, w: 8, h: 3 },
  ],
  learningPreferences: {
    visualStyle: 'cards',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    autoplay: true,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
      }
      state.notifications.push(notification)
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      )
    },
    clearNotifications: (state) => {
      state.notifications = []
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    setInstallPromptEvent: (state, action: PayloadAction<any>) => {
      state.installPromptEvent = action.payload
      state.showInstallPrompt = !!action.payload
    },
    hideInstallPrompt: (state) => {
      state.showInstallPrompt = false
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false
    },
    updateDashboardLayout: (state, action: PayloadAction<UIState['dashboardLayout']>) => {
      state.dashboardLayout = action.payload
    },
    updateLearningPreferences: (state, action: PayloadAction<Partial<UIState['learningPreferences']>>) => {
      state.learningPreferences = { ...state.learningPreferences, ...action.payload }
    },
  },
})

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setOnlineStatus,
  setInstallPromptEvent,
  hideInstallPrompt,
  setLoading,
  setGlobalLoading,
  openModal,
  closeModal,
  updateDashboardLayout,
  updateLearningPreferences,
} = uiSlice.actions

export default uiSlice.reducer