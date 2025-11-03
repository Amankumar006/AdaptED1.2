import { apiRequest } from './client';
import { User } from '../../store/slices/authSlice';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface TokenValidationResponse {
  user: User;
  valid: boolean;
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response: any = await apiRequest.post('/auth/login', credentials);
    // Backend returns: { message, user: { profile: {...}, roles, organizations }, tokens: {...} }
    // Frontend expects: { user, token, refreshToken }
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.profile?.firstName || '',
        lastName: response.user.profile?.lastName || '',
        roles: response.user.roles || [],
        organizationId: response.user.organizations?.[0],
      },
      token: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
    };
  },

  logout: (): Promise<void> =>
    apiRequest.post('/auth/logout'),

  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response: any = await apiRequest.post('/auth/refresh', { refreshToken });
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.profile?.firstName || '',
        lastName: response.user.profile?.lastName || '',
        roles: response.user.roles || [],
        organizationId: response.user.organizations?.[0],
      },
      token: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
    };
  },

  validateToken: (token: string): Promise<TokenValidationResponse> =>
    apiRequest.post('/auth/validate', { token }),

  forgotPassword: (email: string): Promise<{ message: string }> =>
    apiRequest.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<{ message: string }> =>
    apiRequest.post('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string): Promise<{ message: string }> =>
    apiRequest.post('/auth/change-password', { currentPassword, newPassword }),
};