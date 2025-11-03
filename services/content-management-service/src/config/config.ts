import dotenv from 'dotenv';

dotenv.config();

// Build MongoDB URI from individual parts if MONGODB_URI isn't provided
function buildMongoUri() {
  const directUri = process.env.MONGODB_URI;
  if (directUri && directUri.trim().length > 0) return directUri;

  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const dbName = process.env.MONGODB_DB_NAME || process.env.MONGODB_DATABASE || 'content_management';
  const username = process.env.MONGODB_USERNAME || 'admin';
  const password = process.env.MONGODB_PASSWORD || '';
  const replicaSet = process.env.MONGODB_REPLICA_SET || 'rs0';
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';
  const extra = process.env.MONGODB_OPTIONS || '';

  const auth = password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const query = [`replicaSet=${replicaSet}`, `authSource=${authSource}`, 'directConnection=false']
    .concat(extra ? [extra.replace(/^\?/, '')] : [])
    .join('&');

  return `mongodb://${auth}${host}:${port}/${dbName}?${query}`;
}

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodb: {
    uri: buildMongoUri(),
    dbName: process.env.MONGODB_DB_NAME || process.env.MONGODB_DATABASE || 'content_management',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3BucketName: process.env.S3_BUCKET_NAME || 'educational-platform-content',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  },
  
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '100MB',
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/*', 'video/*', 'audio/*', 'application/pdf', 'application/zip'
    ],
  },
  
  video: {
    ffmpegPath: process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg',
    qualityLevels: process.env.VIDEO_QUALITY_LEVELS?.split(',') || [
      '240p', '360p', '480p', '720p', '1080p'
    ],
  },
  
  content: {
    cacheTTL: parseInt(process.env.CONTENT_CACHE_TTL || '3600', 10),
    maxContentSize: process.env.MAX_CONTENT_SIZE || '500MB',
  },
  
  api: {
    rateLimit: parseInt(process.env.API_RATE_LIMIT || '1000', 10),
    windowMs: parseInt(process.env.API_WINDOW_MS || '900000', 10),
  },
};