import mongoose, { Schema } from 'mongoose';
import { ContentAnalytics } from '../types/content.types';

const ContentAnalyticsSchema = new Schema<ContentAnalytics>(
  {
    contentId: { type: Schema.Types.ObjectId, required: true, ref: 'Content' },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    engagementMetrics: {
      timeSpent: { type: Number, default: 0 },
      interactionCount: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
    lastAccessed: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ContentAnalyticsSchema.index({ contentId: 1 }, { unique: true });
ContentAnalyticsSchema.index({ views: -1 });
ContentAnalyticsSchema.index({ averageRating: -1 });
ContentAnalyticsSchema.index({ lastAccessed: -1 });

export const ContentAnalyticsModel = mongoose.model<ContentAnalytics>(
  'ContentAnalytics',
  ContentAnalyticsSchema
);