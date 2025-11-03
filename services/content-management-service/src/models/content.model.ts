import mongoose, { Schema } from 'mongoose';
import {
  IContent,
  ContentType,
  ContentStatus,
  DifficultyLevel,
  MediaType,
} from '../types/content.types';

const ContentVersionSchema = new Schema({
  version: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  changelog: { type: String, required: true },
  publishedAt: { type: Date },
  isActive: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MediaFileSchema = new Schema({
  id: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  duration: { type: Number },
  dimensions: {
    width: { type: Number },
    height: { type: Number },
  },
  processedVersions: { type: Map, of: String },
  uploadedAt: { type: Date, default: Date.now },
});

const ContentCollaborationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  role: {
    type: String,
    enum: ['owner', 'editor', 'reviewer', 'viewer'],
    required: true,
  },
  permissions: [{ type: String }],
  invitedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
});

const ContentCommentSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  content: { type: String, required: true },
  position: {
    section: { type: String },
    offset: { type: Number },
  },
  replies: [{ type: Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ContentSuggestionSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  type: {
    type: String,
    enum: ['addition', 'deletion', 'modification'],
    required: true,
  },
  content: { type: String, required: true },
  originalContent: { type: String },
  position: {
    section: { type: String },
    offset: { type: Number },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId },
});

const SCORMItemSchema = new Schema({
  identifier: { type: String, required: true },
  title: { type: String, required: true },
  identifierref: { type: String },
  parameters: { type: String },
  children: [{ type: Schema.Types.Mixed }],
});

const SCORMOrganizationSchema = new Schema({
  identifier: { type: String, required: true },
  title: { type: String, required: true },
  items: [SCORMItemSchema],
});

const SCORMResourceSchema = new Schema({
  identifier: { type: String, required: true },
  type: { type: String, required: true },
  href: { type: String, required: true },
  files: [{ type: String }],
});

const SCORMManifestSchema = new Schema({
  identifier: { type: String, required: true },
  version: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  organizations: [SCORMOrganizationSchema],
  resources: [SCORMResourceSchema],
});

const XAPIStatementSchema = new Schema({
  actor: {
    name: { type: String, required: true },
    mbox: { type: String, required: true },
  },
  verb: {
    id: { type: String, required: true },
    display: { type: Map, of: String, required: true },
  },
  object: {
    id: { type: String, required: true },
    definition: {
      name: { type: Map, of: String },
      description: { type: Map, of: String },
      type: { type: String },
    },
  },
  result: {
    score: {
      scaled: { type: Number },
      raw: { type: Number },
      min: { type: Number },
      max: { type: Number },
    },
    completion: { type: Boolean },
    success: { type: Boolean },
    duration: { type: String },
  },
  context: {
    instructor: {
      name: { type: String },
      mbox: { type: String },
    },
    team: {
      name: { type: String },
      mbox: { type: String },
    },
    contextActivities: {
      parent: [{ type: Schema.Types.Mixed }],
      grouping: [{ type: Schema.Types.Mixed }],
      category: [{ type: Schema.Types.Mixed }],
      other: [{ type: Schema.Types.Mixed }],
    },
  },
  timestamp: { type: Date, default: Date.now },
});

const ContentMetadataSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  keywords: [{ type: String }],
  language: { type: String, required: true, default: 'en' },
  subject: { type: String, required: true },
  gradeLevel: { type: String, required: true },
  duration: { type: Number },
  difficulty: {
    type: String,
    enum: Object.values(DifficultyLevel),
    required: true,
  },
  learningObjectives: [{ type: String }],
  prerequisites: [{ type: String }],
  standards: [{ type: String }],
});

const ContentSchema = new Schema<IContent>(
  {
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: true,
    },
    metadata: { type: ContentMetadataSchema, required: true },
    versions: [ContentVersionSchema],
    currentVersion: { type: String, required: true, default: '1.0.0' },
    status: {
      type: String,
      enum: Object.values(ContentStatus),
      default: ContentStatus.DRAFT,
    },
    tags: [{ type: String }],
    mediaFiles: [MediaFileSchema],
    collaborators: [ContentCollaborationSchema],
    comments: [ContentCommentSchema],
    suggestions: [ContentSuggestionSchema],
    scormManifest: { type: SCORMManifestSchema },
    xapiStatements: [XAPIStatementSchema],
    organizationId: { type: Schema.Types.ObjectId },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
ContentSchema.index({ type: 1, status: 1 });
ContentSchema.index({ 'metadata.subject': 1, 'metadata.gradeLevel': 1 });
ContentSchema.index({ tags: 1 });
ContentSchema.index({ createdBy: 1 });
ContentSchema.index({ organizationId: 1 });
ContentSchema.index({ createdAt: -1 });
ContentSchema.index({ 'metadata.title': 'text', 'metadata.description': 'text' });

// Virtual for current version data
ContentSchema.virtual('currentVersionData').get(function () {
  const currentVersion = this.versions.find(v => v.version === this.currentVersion);
  return currentVersion?.data;
});

// Virtual for active collaborators
ContentSchema.virtual('activeCollaborators').get(function () {
  return this.collaborators.filter(c => c.acceptedAt);
});

export const Content = mongoose.model<IContent>('Content', ContentSchema);