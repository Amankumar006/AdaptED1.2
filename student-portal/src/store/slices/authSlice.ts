import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authAPI } from '../../services/api/authAPI'
import { User, LoginCredentials } from '../../types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  biometricEnabled: boolean
  mfaRequired: boolean
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
  mfaRequired: false,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      localStorage.setItem('token', response.token)
      localStorage.setItem('refreshToken', response.refreshToken)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      if (state.auth.token) {
        await authAPI.logout(state.auth.token)
      }
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return null
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed')
    }
  }
)

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      if (!state.auth.refreshToken) {
        throw new Error('No refresh token available')
      }
      const response = await authAPI.refreshToken(state.auth.refreshToken)
      localStorage.setItem('token', response.token)
      localStorage.setItem('refreshToken', response.refreshToken)
      return response
    } catch (error: any) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed')
    }
  }
)

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { getState, dispatch }) => {
    try {
      const state = getState() as { auth: AuthState }
      if (state.auth.token) {
        const user = await authAPI.getCurrentUser(state.auth.token)
        return { user, token: state.auth.token, refreshToken: state.auth.refreshToken }
      }
      return null
    } catch (error: any) {
      // Try to refresh token if current token is invalid
      if (error.response?.status === 401) {
        try {
          await dispatch(refreshAuthToken()).unwrap()
          const newState = getState() as { auth: AuthState }
          if (newState.auth.token) {
            const user = await authAPI.getCurrentUser(newState.auth.token)
            return { user, token: newState.auth.token, refreshToken: newState.auth.refreshToken }
          }
        } catch (refreshError) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      }
      return null
    }
  }
)

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async (_, { rejectWithValue }) => {
    try {
      // Check if biometric authentication is available
      if (!window.PublicKeyCredential) {
        throw new Error('Biometric authentication not supported')
      }
      
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      if (!available) {
        throw new Error('Biometric authenticator not available')
      }
      
      return true
    } catch (error: any) {
      return rejectWithValue(error.message || 'Biometric setup failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setMfaRequired: (state, action: PayloadAction<boolean>) => {
      state.mfaRequired = action.payload
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
        state.mfaRequired = action.payload.mfaRequired || false
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.mfaRequired = false
        state.biometricEnabled = false
      })
      
      // Refresh token
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
      
      // Initialize auth
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user
          state.token = action.payload.token
          state.refreshToken = action.payload.refreshToken
          state.isAuthenticated = true
        }
      })
      
      // Enable biometric
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometricEnabled = true
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { clearError, setMfaRequired, updateUser } = authSlice.actions
export default authSlice.reducer