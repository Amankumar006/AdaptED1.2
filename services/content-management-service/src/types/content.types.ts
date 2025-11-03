import { Document, Types } from 'mongoose';

export enum ContentType {
  LESSON = 'lesson',
  EXERCISE = 'exercise',
  ASSESSMENT = 'assessment',
  MULTIMEDIA = 'multimedia',
  DOCUMENT = 'document',
  SCORM_PACKAGE = 'scorm_package',
  INTERACTIVE = 'interactive',
}

export enum ContentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
}

export interface ContentMetadata {
  title: string;
  description: string;
  keywords: string[];
  language: string;
  subject: string;
  gradeLevel: string;
  duration?: number;
  difficulty: DifficultyLevel;
  learningObjectives: string[];
  prerequisites: string[];
  standards?: string[];
}

export interface ContentVersion {
  version: string;
  data: any;
  changelog: string;
  publishedAt?: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  processedVersions?: {
    [quality: string]: string;
  };
  uploadedAt: Date;
}

export interface ContentCollaboration {
  userId: Types.ObjectId;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  permissions: string[];
  invitedAt: Date;
  acceptedAt?: Date;
}

export interface ContentComment {
  id: string;
  userId: Types.ObjectId;
  content: string;
  position?: {
    section: string;
    offset: number;
  };
  replies: ContentComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSuggestion {
  id: string;
  userId: Types.ObjectId;
  type: 'addition' | 'deletion' | 'modification';
  content: string;
  originalContent?: string;
  position?: {
    section: string;
    offset: number;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
}

export interface SCORMManifest {
  identifier: string;
  version: string;
  title: string;
  description?: string;
  organizations: SCORMOrganization[];
  resources: SCORMResource[];
}

export interface SCORMOrganization {
  identifier: string;
  title: string;
  items: SCORMItem[];
}

export interface SCORMItem {
  identifier: string;
  title: string;
  identifierref?: string;
  parameters?: string;
  children?: SCORMItem[];
}

export interface SCORMResource {
  identifier: string;
  type: string;
  href: string;
  files: string[];
}

export interface XAPIStatement {
  actor: {
    name: string;
    mbox: string;
  };
  verb: {
    id: string;
    display: { [language: string]: string };
  };
  object: {
    id: string;
    definition?: {
      name: { [language: string]: string };
      description: { [language: string]: string };
      type: string;
    };
  };
  result?: {
    score?: {
      scaled?: number;
      raw?: number;
      min?: number;
      max?: number;
    };
    completion?: boolean;
    success?: boolean;
    duration?: string;
  };
  context?: {
    instructor?: {
      name: string;
      mbox: string;
    };
    team?: {
      name: string;
      mbox: string;
    };
    contextActivities?: {
      parent?: any[];
      grouping?: any[];
      category?: any[];
      other?: any[];
    };
  };
  timestamp?: Date;
}

export interface IContent extends Document {
  _id: Types.ObjectId;
  type: ContentType;
  metadata: ContentMetadata;
  versions: ContentVersion[];
  currentVersion: string;
  status: ContentStatus;
  tags: string[];
  mediaFiles: MediaFile[];
  collaborators: ContentCollaboration[];
  comments: ContentComment[];
  suggestions: ContentSuggestion[];
  scormManifest?: SCORMManifest;
  xapiStatements: XAPIStatement[];
  organizationId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface ContentSearchQuery {
  query?: string;
  type?: ContentType;
  status?: ContentStatus;
  tags?: string[];
  difficulty?: DifficultyLevel;
  subject?: string;
  gradeLevel?: string;
  language?: string;
  organizationId?: string;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContentSearchResult {
  contents: IContent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredRole: string;
  nextSteps: string[];
  actions: string[];
}

export interface ContentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  currentStep: string;
  assignedTo?: Types.ObjectId;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContentRequest {
  type: ContentType;
  metadata: ContentMetadata;
  data: any;
  tags?: string[];
  organizationId?: string;
}

export interface UpdateContentRequest {
  metadata?: Partial<ContentMetadata>;
  data?: any;
  tags?: string[];
  changelog?: string;
}

export interface PublishContentRequest {
  version?: string;
  publishAt?: Date;
  notifyCollaborators?: boolean;
}

export interface ContentAnalytics {
  contentId: Types.ObjectId;
  views: number;
  downloads: number;
  completions: number;
  averageRating: number;
  totalRatings: number;
  engagementMetrics: {
    timeSpent: number;
    interactionCount: number;
    completionRate: number;
  };
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
}