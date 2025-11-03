export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  roles: Role[];
  organizations: OrganizationMembership[];
  profile: UserProfile;
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  hierarchy: number;
  organizationId?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface OrganizationMembership {
  organizationId: string;
  roles: string[];
  joinedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  language: string;
  preferences: Record<string, any>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  organizations: string[];
  iat: number;
  exp: number;
  jti: string; // token id
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TokenValidation {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

export interface AuthContext {
  user: User;
  permissions: Permission[];
  organizationId?: string;
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SAML = 'saml'
}

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: AuthProvider;
}

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
}