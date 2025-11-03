import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import uiSlice from './slices/uiSlice'
import learningSlice from './slices/learningSlice'
import offlineSlice from './slices/offlineSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    learning: learningSlice,
    offline: offlineSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch