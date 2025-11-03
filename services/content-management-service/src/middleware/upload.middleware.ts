import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const mediaService = new MediaService();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: parseSize(config.upload.maxFileSize),
    files: 10, // Maximum 10 files per request
  },
  fileFilter: async (req, file, cb) => {
    try {
      const validation = await mediaService.validateFile(file);
      if (validation.valid) {
        cb(null, true);
      } else {
        cb(new Error(validation.error));
      }
    } catch (error) {
      cb(error as Error);
    }
  },
});

function parseSize(sizeStr: string): number {
  const units: { [key: string]: number } = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{1,2})$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const [, size, unit] = match;
  const multiplier = units[unit.toUpperCase()];
  
  if (!multiplier) {
    throw new Error(`Unknown size unit: ${unit}`);
  }

  return parseFloat(size) * multiplier;
}

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, (error) => {
      if (error) {
        logger.error('File upload error:', error);
        
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `File size exceeds maximum allowed size of ${config.upload.maxFileSize}`,
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                error: 'Too many files',
                message: 'Maximum 10 files allowed per request',
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                error: 'Unexpected file field',
                message: `Expected file field: ${fieldName}`,
              });
            default:
              return res.status(400).json({
                success: false,
                error: 'Upload error',
                message: error.message,
              });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message,
        });
      }
      
      next();
    });
  };
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string, maxCount = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, (error) => {
      if (error) {
        logger.error('Multiple file upload error:', error);
        
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `File size exceeds maximum allowed size of ${config.upload.maxFileSize}`,
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                error: 'Too many files',
                message: `Maximum ${maxCount} files allowed`,
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                error: 'Unexpected file field',
                message: `Expected file field: ${fieldName}`,
              });
            default:
              return res.status(400).json({
                success: false,
                error: 'Upload error',
                message: error.message,
              });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message,
        });
      }
      
      next();
    });
  };
};

// Middleware for mixed file upload (multiple fields)
export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uploadHandler = upload.fields(fields);
    
    uploadHandler(req, res, (error) => {
      if (error) {
        logger.error('Fields upload error:', error);
        
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                error: 'File too large',
                message: `File size exceeds maximum allowed size of ${config.upload.maxFileSize}`,
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                error: 'Too many files',
                message: 'File count limit exceeded for one or more fields',
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                error: 'Unexpected file field',
                message: 'Unexpected file field in request',
              });
            default:
              return res.status(400).json({
                success: false,
                error: 'Upload error',
                message: error.message,
              });
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message,
        });
      }
      
      next();
    });
  };
};