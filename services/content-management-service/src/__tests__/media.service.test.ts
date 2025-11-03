import { MediaService } from '../services/media.service';
import AWS from 'aws-sdk';
import sharp from 'sharp';

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('sharp');
jest.mock('fluent-ffmpeg');

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockS3: jest.Mocked<AWS.S3>;

  beforeEach(() => {
    mockS3 = {
      upload: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Location: 'https://s3.amazonaws.com/bucket/file.jpg',
        }),
      }),
      deleteObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
      getSignedUrl: jest.fn().mockReturnValue('https://signed-url.com'),
    } as any;

    (AWS.S3 as jest.Mock).mockImplementation(() => mockS3);
    mediaService = new MediaService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload image file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('test image data'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const mockSharp = {
        metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
      };

      (sharp as jest.Mock).mockReturnValue(mockSharp);

      const result = await mediaService.uploadFile(mockFile, 'content-id');

      expect(result).toMatchObject({
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://s3.amazonaws.com/bucket/file.jpg',
        dimensions: { width: 800, height: 600 },
      });

      expect(mockS3.upload).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const mockFile = {
        buffer: Buffer.from('test data'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Upload failed')),
      } as any);

      await expect(mediaService.uploadFile(mockFile, 'content-id')).rejects.toThrow('Upload failed');
    });
  });

  describe('validateFile', () => {
    it('should validate file size and type', async () => {
      const validFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const result = await mediaService.validateFile(validFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', async () => {
      const largeFile = {
        buffer: Buffer.alloc(200 * 1024 * 1024), // 200MB
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 200 * 1024 * 1024,
      } as Express.Multer.File;

      const result = await mediaService.validateFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum');
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024,
      } as Express.Multer.File;

      const result = await mediaService.validateFile(unsupportedFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type');
    });
  });

  describe('deleteFile', () => {
    it('should delete file and its variants', async () => {
      const mediaFile = {
        id: 'file-id',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://s3.amazonaws.com/bucket/test.jpg',
        thumbnailUrl: 'https://s3.amazonaws.com/bucket/thumb.jpg',
        processedVersions: {
          small: 'https://s3.amazonaws.com/bucket/small.jpg',
        },
        uploadedAt: new Date(),
      };

      await mediaService.deleteFile(mediaFile);

      expect(mockS3.deleteObject).toHaveBeenCalledTimes(3); // Original, thumbnail, processed version
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL', async () => {
      const url = await mediaService.getSignedUrl('test-key', 3600);

      expect(mockS3.getSignedUrl).toHaveBeenCalledWith('getObject', {
        Bucket: expect.any(String),
        Key: 'test-key',
        Expires: 3600,
      });
      expect(url).toBe('https://signed-url.com');
    });
  });
});