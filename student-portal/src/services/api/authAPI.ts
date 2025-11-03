import { apiClient } from './client'
import { User, LoginCredentials, AuthToken, ApiResponse } from '../../types'

export interface BiometricCredentials {
  credentialId: string
  signature: string
  authenticatorData: string
  clientDataJSON: string
}

export interface MFASetupResponse {
  qrCode: string
  secret: string
  backupCodes: string[]
}

export interface MFAVerificationRequest {
  token: string
  code: string
}

class AuthAPI {
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await apiClient.post<any>('/auth/login', credentials)
    // Backend returns: { message, user: { id, email, profile: {...}, roles, organizations }, tokens: {...} }
    // Frontend expects: { token, refreshToken, user: { id, email, firstName, lastName, role, ... }, expiresAt }
    
    const backendUser = response.user
    const mappedUser: User = {
      id: backendUser.id,
      email: backendUser.email,
      firstName: backendUser.profile?.firstName || '',
      lastName: backendUser.profile?.lastName || '',
      avatar: backendUser.profile?.avatar,
      role: (backendUser.roles?.[0] || 'student') as 'student' | 'teacher' | 'admin',
      preferences: {
        theme: backendUser.profile?.preferences?.theme || 'system',
        language: backendUser.profile?.language || 'en',
        timezone: backendUser.profile?.timezone || 'UTC',
        notifications: backendUser.profile?.preferences?.notifications || {
          email: true,
          push: true,
          inApp: true,
          assignments: true,
          grades: true,
          announcements: true,
        },
        accessibility: backendUser.profile?.preferences?.accessibility || {
          fontSize: 'medium',
          highContrast: false,
          reducedMotion: false,
          screenReader: false,
          keyboardNavigation: false,
        },
      },
      learningProfile: backendUser.profile?.learningProfile || {
        learningStyle: 'mixed',
        difficultyPreference: 'adaptive',
        pacePreference: 'adaptive',
        subjects: [],
        goals: [],
        strengths: [],
        challenges: [],
      },
      createdAt: backendUser.createdAt || new Date().toISOString(),
      updatedAt: backendUser.updatedAt || new Date().toISOString(),
    }
    
    return {
      token: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      user: mappedUser,
      expiresAt: new Date(Date.now() + response.tokens.expiresIn * 1000).toISOString(),
    }
  }

  async logout(token: string): Promise<void> {
    await apiClient.post('/auth/logout', { token })
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const response = await apiClient.post<ApiResponse<AuthToken>>('/auth/refresh', {
      refreshToken,
    })
    return response.data
  }

  async getCurrentUser(token: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }

  async register(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    role?: string
  }): Promise<AuthToken> {
    const response = await apiClient.post<ApiResponse<AuthToken>>('/auth/register', userData)
    return response.data
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
    })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
  }

  // Biometric authentication
  async setupBiometric(): Promise<{
    challenge: string
    options: PublicKeyCredentialCreationOptions
  }> {
    const response = await apiClient.post<ApiResponse<{
      challenge: string
      options: PublicKeyCredentialCreationOptions
    }>>('/auth/biometric/setup')
    return response.data
  }

  async completeBiometricSetup(credential: PublicKeyCredential): Promise<void> {
    const credentialData = {
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      response: {
        attestationObject: Array.from(new Uint8Array(
          (credential.response as AuthenticatorAttestationResponse).attestationObject
        )),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
      },
      type: credential.type,
    }

    await apiClient.post('/auth/biometric/complete', credentialData)
  }

  async loginWithBiometric(): Promise<{
    challenge: string
    options: PublicKeyCredentialRequestOptions
  }> {
    const response = await apiClient.post<ApiResponse<{
      challenge: string
      options: PublicKeyCredentialRequestOptions
    }>>('/auth/biometric/challenge')
    return response.data
  }

  async completeBiometricLogin(credential: PublicKeyCredential): Promise<AuthToken> {
    const credentialData = {
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      response: {
        authenticatorData: Array.from(new Uint8Array(
          (credential.response as AuthenticatorAssertionResponse).authenticatorData
        )),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
        signature: Array.from(new Uint8Array(
          (credential.response as AuthenticatorAssertionResponse).signature
        )),
        userHandle: (credential.response as AuthenticatorAssertionResponse).userHandle
          ? Array.from(new Uint8Array(
              (credential.response as AuthenticatorAssertionResponse).userHandle!
            ))
          : null,
      },
      type: credential.type,
    }

    const response = await apiClient.post<ApiResponse<AuthToken>>('/auth/biometric/verify', credentialData)
    return response.data
  }

  // Multi-factor authentication
  async setupMFA(): Promise<MFASetupResponse> {
    const response = await apiClient.post<ApiResponse<MFASetupResponse>>('/auth/mfa/setup')
    return response.data
  }

  async verifyMFASetup(code: string): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post<ApiResponse<{ backupCodes: string[] }>>('/auth/mfa/verify-setup', {
      code,
    })
    return response.data
  }

  async verifyMFA(request: MFAVerificationRequest): Promise<AuthToken> {
    const response = await apiClient.post<ApiResponse<AuthToken>>('/auth/mfa/verify', request)
    return response.data
  }

  async disableMFA(code: string): Promise<void> {
    await apiClient.post('/auth/mfa/disable', { code })
  }

  async generateBackupCodes(): Promise<string[]> {
    const response = await apiClient.post<ApiResponse<string[]>>('/auth/mfa/backup-codes')
    return response.data
  }

  // OAuth/SSO
  async getOAuthURL(provider: 'google' | 'microsoft' | 'github'): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ url: string }>>(`/auth/oauth/${provider}`)
    return response.data.url
  }

  async handleOAuthCallback(provider: string, code: string, state: string): Promise<AuthToken> {
    const response = await apiClient.post<ApiResponse<AuthToken>>(`/auth/oauth/${provider}/callback`, {
      code,
      state,
    })
    return response.data
  }

  // User profile management
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/profile', updates)
    return response.data
  }

  async updatePreferences(preferences: Partial<User['preferences']>): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/preferences', preferences)
    return response.data
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const response = await apiClient.uploadFile<ApiResponse<{ avatarUrl: string }>>(
      '/auth/avatar',
      file
    )
    return response.data
  }

  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete('/auth/account', {
      data: { password },
    })
  }

  // Session management
  async getSessions(): Promise<Array<{
    id: string
    device: string
    location: string
    lastActive: string
    current: boolean
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      id: string
      device: string
      location: string
      lastActive: string
      current: boolean
    }>>>('/auth/sessions')
    return response.data
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/auth/sessions/${sessionId}`)
  }

  async revokeAllSessions(): Promise<void> {
    await apiClient.delete('/auth/sessions')
  }
}

export const authAPI = new AuthAPI()
export default authAPI