import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { store } from '../../store'
import { refreshAuthToken, logout } from '../../store/slices/authSlice'
import { addNotification, setOnlineStatus } from '../../store/slices/uiSlice'
import { addPendingAction } from '../../store/slices/offlineSlice'

class APIClient {
  private client: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (error?: any) => void
  }> = []

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
    this.setupOfflineHandling()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const state = store.getState()
        const token = state.auth.token

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId()

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle network errors (offline)
        if (!error.response) {
          this.handleOfflineError(originalRequest)
          return Promise.reject(error)
        }

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            }).then(() => {
              return this.client(originalRequest)
            }).catch(err => {
              return Promise.reject(err)
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            await store.dispatch(refreshAuthToken()).unwrap()
            this.processQueue(null)
            return this.client(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError)
            store.dispatch(logout())
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        // Handle other errors
        this.handleAPIError(error)
        return Promise.reject(error)
      }
    )
  }

  private setupOfflineHandling() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      store.dispatch(setOnlineStatus(true))
      store.dispatch(addNotification({
        type: 'success',
        title: 'Back Online',
        message: 'Connection restored. Syncing data...',
        duration: 3000,
      }))
      this.syncOfflineActions()
    })

    window.addEventListener('offline', () => {
      store.dispatch(setOnlineStatus(false))
      store.dispatch(addNotification({
        type: 'warning',
        title: 'Offline Mode',
        message: 'You are now offline. Changes will be synced when connection is restored.',
        duration: 5000,
      }))
    })
  }

  private processQueue(error: any) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
    
    this.failedQueue = []
  }

  private handleOfflineError(originalRequest: any) {
    const state = store.getState()
    
    if (!state.ui.isOnline) {
      // Queue the request for later if it's a mutation
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(originalRequest.method?.toUpperCase())) {
        store.dispatch(addPendingAction({
          type: 'API_REQUEST',
          data: {
            method: originalRequest.method,
            url: originalRequest.url,
            data: originalRequest.data,
            headers: originalRequest.headers,
          },
        }))
      }
    }
  }

  private handleAPIError(error: any) {
    const message = error.response?.data?.message || error.message || 'An error occurred'
    const status = error.response?.status

    // Don't show notifications for certain status codes
    if ([401, 403].includes(status)) {
      return
    }

    store.dispatch(addNotification({
      type: 'error',
      title: 'Request Failed',
      message,
      duration: 5000,
    }))
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async syncOfflineActions() {
    const state = store.getState()
    const pendingActions = state.offline.pendingActions

    for (const action of pendingActions) {
      if (action.type === 'API_REQUEST') {
        try {
          await this.client({
            method: action.data.method,
            url: action.data.url,
            data: action.data.data,
            headers: action.data.headers,
          })
          // Remove successful action from queue
          // This would be handled by the offline slice
        } catch (error) {
          console.error('Failed to sync offline action:', error)
        }
      }
    }
  }

  // Public methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }

  // File upload with progress
  async uploadFile<T>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response: AxiosResponse<T> = await this.client.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

export const apiClient = new APIClient()
export default apiClient