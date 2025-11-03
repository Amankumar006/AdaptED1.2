export interface User {
  id: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
  roles: Role[];
  organizations: OrganizationMembership[];
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  address?: Address;
  timezone: string;
  language: string;
  demographics?: Demographics;
  learningStyle?: LearningStyle;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  learning: LearningPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  types: {
    assignments: boolean;
    grades: boolean;
    announcements: boolean;
    reminders: boolean;
    social: boolean;
  };
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'organization' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  shareProgressData: boolean;
  allowAnalytics: boolean;
}

export interface AccessibilityPreferences {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
  textToSpeech: boolean;
  closedCaptions: boolean;
}

export interface LearningPreferences {
  preferredContentTypes: ContentType[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  pacePreference: 'slow' | 'normal' | 'fast' | 'adaptive';
  studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'flexible';
  collaborationPreference: 'individual' | 'small_group' | 'large_group' | 'mixed';
}

export interface DashboardPreferences {
  layout: 'grid' | 'list' | 'cards';
  widgets: DashboardWidget[];
  defaultView: 'overview' | 'courses' | 'assignments' | 'progress';
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  visible: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Demographics {
  ageGroup?: string;
  educationLevel?: string;
  occupation?: string;
  interests?: string[];
}

export interface LearningStyle {
  visual: number; // 0-100 preference score
  auditory: number;
  kinesthetic: number;
  readingWriting: number;
  multimodal: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  hierarchy: number;
  organizationId?: string;
  isSystemRole: boolean;
  parentRoleId?: string;
  childRoles?: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  scope: 'global' | 'organization' | 'user';
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface Organization {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: OrganizationType;
  settings: OrganizationSettings;
  parentOrganizationId?: string;
  childOrganizations?: Organization[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMembership {
  organizationId: string;
  organization?: Organization;
  roles: string[];
  joinedAt: Date;
  invitedBy?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

export interface OrganizationSettings {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    customCss?: string;
  };
  features: {
    enableGamification: boolean;
    enableAI: boolean;
    enableCollaboration: boolean;
    enableAnalytics: boolean;
  };
  policies: {
    passwordPolicy: PasswordPolicy;
    dataRetention: DataRetentionPolicy;
    privacySettings: OrganizationPrivacySettings;
  };
  integrations: {
    ssoEnabled: boolean;
    lmsIntegrations: string[];
    thirdPartyTools: string[];
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords to check
}

export interface DataRetentionPolicy {
  userDataRetention: number; // days
  logRetention: number; // days
  backupRetention: number; // days
  automaticDeletion: boolean;
}

export interface OrganizationPrivacySettings {
  allowDataSharing: boolean;
  requireConsentForAnalytics: boolean;
  enableRightToErasure: boolean;
  dataProcessingBasis: string;
}

export enum OrganizationType {
  SCHOOL = 'school',
  UNIVERSITY = 'university',
  CORPORATE = 'corporate',
  NONPROFIT = 'nonprofit',
  GOVERNMENT = 'government',
  INDIVIDUAL = 'individual'
}

export enum ContentType {
  TEXT = 'text',
  VIDEO = 'video',
  AUDIO = 'audio',
  INTERACTIVE = 'interactive',
  SIMULATION = 'simulation',
  GAME = 'game',
  ASSESSMENT = 'assessment'
}

// Request/Response DTOs
export interface CreateUserRequest {
  email: string;
  profile: Omit<UserProfile, 'timezone' | 'language'> & {
    timezone?: string;
    language?: string;
  };
  preferences?: Partial<UserPreferences>;
  organizationId?: string;
  roles?: string[];
}

export interface UpdateUserRequest {
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  isActive?: boolean;
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  hierarchy: number;
  organizationId?: string;
  parentRoleId?: string;
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  permissions?: string[];
  hierarchy?: number;
  parentRoleId?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  displayName: string;
  description?: string;
  type: OrganizationType;
  settings?: Partial<OrganizationSettings>;
  parentOrganizationId?: string;
}

export interface UpdateOrganizationRequest {
  displayName?: string;
  description?: string;
  settings?: Partial<OrganizationSettings>;
  isActive?: boolean;
}

export interface BulkRoleAssignmentRequest {
  userIds: string[];
  roleIds: string[];
  organizationId?: string;
  action: 'add' | 'remove' | 'replace';
}

export interface UserSearchQuery {
  query?: string;
  organizationId?: string;
  roles?: string[];
  isActive?: boolean;
  emailVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleHierarchy {
  role: Role;
  children: RoleHierarchy[];
  level: number;
}

export interface OrganizationHierarchy {
  organization: Organization;
  children: OrganizationHierarchy[];
  level: number;
}