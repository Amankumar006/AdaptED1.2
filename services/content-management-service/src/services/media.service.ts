import AWS from 'aws-sdk';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { MediaFile, MediaType } from '../types/content.types';

export class MediaService {
  private s3: AWS.S3;

  constructor() {
    AWS.config.update({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    });

    this.s3 = new AWS.S3();
  }

  async uploadFile(file: Express.Multer.File, contentId: string): Promise<MediaFile> {
    try {
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${contentId}/${fileId}${fileExtension}`;
      
      // Upload original file to S3
      const uploadParams = {
        Bucket: config.aws.s3BucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          contentId: contentId,
        },
      };

      const uploadResult = await this.s3.upload(uploadParams).promise();
      
      const mediaFile: MediaFile = {
        id: fileId,
        filename: fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.Location,
        uploadedAt: new Date(),
      };

      // Process file based on type
      if (file.mimetype.startsWith('image/')) {
        await this.processImage(file, mediaFile, contentId);
      } else if (file.mimetype.startsWith('video/')) {
        await this.processVideo(file, mediaFile, contentId);
      } else if (file.mimetype.startsWith('audio/')) {
        await this.processAudio(file, mediaFile, contentId);
      }

      logger.info(`File uploaded successfully: ${fileId}`);
      return mediaFile;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw error;
    }
  }

  private async processImage(file: Express.Multer.File, mediaFile: MediaFile, contentId: string): Promise<void> {
    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();
      
      mediaFile.dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      // Generate thumbnail
      const thumbnailBuffer = await image
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `${contentId}/thumbnails/${mediaFile.id}_thumb.jpg`;
      
      const thumbnailUpload = await this.s3.upload({
        Bucket: config.aws.s3BucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }).promise();

      mediaFile.thumbnailUrl = thumbnailUpload.Location;

      // Generate different sizes for responsive images
      const sizes = [
        { name: 'small', width: 400 },
        { name: 'medium', width: 800 },
        { name: 'large', width: 1200 },
      ];

      mediaFile.processedVersions = {};

      for (const size of sizes) {
        if (metadata.width && metadata.width > size.width) {
          const resizedBuffer = await image
            .resize(size.width, null, { withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

          const resizedKey = `${contentId}/processed/${mediaFile.id}_${size.name}.jpg`;
          
          const resizedUpload = await this.s3.upload({
            Bucket: config.aws.s3BucketName,
            Key: resizedKey,
            Body: resizedBuffer,
            ContentType: 'image/jpeg',
          }).promise();

          mediaFile.processedVersions[size.name] = resizedUpload.Location;
        }
      }

      logger.info(`Image processed successfully: ${mediaFile.id}`);
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  private async processVideo(file: Express.Multer.File, mediaFile: MediaFile, contentId: string): Promise<void> {
    try {
      // Save file temporarily for ffmpeg processing
      const tempFilePath = `/tmp/${mediaFile.id}${path.extname(file.originalname)}`;
      await fs.writeFile(tempFilePath, file.buffer);

      // Get video metadata
      const metadata = await this.getVideoMetadata(tempFilePath);
      mediaFile.duration = metadata.duration;
      mediaFile.dimensions = {
        width: metadata.width,
        height: metadata.height,
      };

      // Generate thumbnail from video
      const thumbnailPath = `/tmp/${mediaFile.id}_thumb.jpg`;
      await this.generateVideoThumbnail(tempFilePath, thumbnailPath);
      
      const thumbnailBuffer = await fs.readFile(thumbnailPath);
      const thumbnailKey = `${contentId}/thumbnails/${mediaFile.id}_thumb.jpg`;
      
      const thumbnailUpload = await this.s3.upload({
        Bucket: config.aws.s3BucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }).promise();

      mediaFile.thumbnailUrl = thumbnailUpload.Location;

      // Transcode video to different qualities
      mediaFile.processedVersions = {};
      
      const qualitySettings = [
        { name: '240p', height: 240, bitrate: '400k' },
        { name: '360p', height: 360, bitrate: '800k' },
        { name: '480p', height: 480, bitrate: '1200k' },
        { name: '720p', height: 720, bitrate: '2500k' },
        { name: '1080p', height: 1080, bitrate: '5000k' },
      ];

      for (const quality of qualitySettings) {
        if (metadata.height >= quality.height) {
          const outputPath = `/tmp/${mediaFile.id}_${quality.name}.mp4`;
          
          await this.transcodeVideo(tempFilePath, outputPath, quality);
          
          const transcodedBuffer = await fs.readFile(outputPath);
          const transcodedKey = `${contentId}/processed/${mediaFile.id}_${quality.name}.mp4`;
          
          const transcodedUpload = await this.s3.upload({
            Bucket: config.aws.s3BucketName,
            Key: transcodedKey,
            Body: transcodedBuffer,
            ContentType: 'video/mp4',
          }).promise();

          mediaFile.processedVersions[quality.name] = transcodedUpload.Location;
          
          // Clean up temporary file
          await fs.unlink(outputPath).catch(() => {});
        }
      }

      // Clean up temporary files
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});

      logger.info(`Video processed successfully: ${mediaFile.id}`);
    } catch (error) {
      logger.error('Error processing video:', error);
      throw error;
    }
  }

  private async processAudio(file: Express.Multer.File, mediaFile: MediaFile, contentId: string): Promise<void> {
    try {
      // Save file temporarily for ffmpeg processing
      const tempFilePath = `/tmp/${mediaFile.id}${path.extname(file.originalname)}`;
      await fs.writeFile(tempFilePath, file.buffer);

      // Get audio metadata
      const metadata = await this.getAudioMetadata(tempFilePath);
      mediaFile.duration = metadata.duration;

      // Convert to different formats for compatibility
      mediaFile.processedVersions = {};
      
      const formats = [
        { name: 'mp3', codec: 'libmp3lame', bitrate: '128k' },
        { name: 'ogg', codec: 'libvorbis', bitrate: '128k' },
        { name: 'aac', codec: 'aac', bitrate: '128k' },
      ];

      for (const format of formats) {
        const outputPath = `/tmp/${mediaFile.id}.${format.name}`;
        
        await this.transcodeAudio(tempFilePath, outputPath, format);
        
        const transcodedBuffer = await fs.readFile(outputPath);
        const transcodedKey = `${contentId}/processed/${mediaFile.id}.${format.name}`;
        
        const transcodedUpload = await this.s3.upload({
          Bucket: config.aws.s3BucketName,
          Key: transcodedKey,
          Body: transcodedBuffer,
          ContentType: `audio/${format.name}`,
        }).promise();

        mediaFile.processedVersions[format.name] = transcodedUpload.Location;
        
        // Clean up temporary file
        await fs.unlink(outputPath).catch(() => {});
      }

      // Clean up temporary file
      await fs.unlink(tempFilePath).catch(() => {});

      logger.info(`Audio processed successfully: ${mediaFile.id}`);
    } catch (error) {
      logger.error('Error processing audio:', error);
      throw error;
    }
  }

  private async getVideoMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: metadata.format.duration,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          bitrate: metadata.format.bit_rate,
        });
      });
    });
  }

  private async getAudioMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
        });
      });
    });
  }

  private async generateVideoThumbnail(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x240',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  private async transcodeVideo(inputPath: string, outputPath: string, quality: any): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(quality.bitrate)
        .size(`?x${quality.height}`)
        .format('mp4')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  private async transcodeAudio(inputPath: string, outputPath: string, format: any): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec(format.codec)
        .audioBitrate(format.bitrate)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  async deleteFile(mediaFile: MediaFile): Promise<void> {
    try {
      // Delete original file
      await this.s3.deleteObject({
        Bucket: config.aws.s3BucketName,
        Key: mediaFile.filename,
      }).promise();

      // Delete thumbnail if exists
      if (mediaFile.thumbnailUrl) {
        const thumbnailKey = this.extractKeyFromUrl(mediaFile.thumbnailUrl);
        await this.s3.deleteObject({
          Bucket: config.aws.s3BucketName,
          Key: thumbnailKey,
        }).promise();
      }

      // Delete processed versions
      if (mediaFile.processedVersions) {
        for (const url of Object.values(mediaFile.processedVersions)) {
          const key = this.extractKeyFromUrl(url);
          await this.s3.deleteObject({
            Bucket: config.aws.s3BucketName,
            Key: key,
          }).promise();
        }
      }

      logger.info(`Media file deleted successfully: ${mediaFile.id}`);
    } catch (error) {
      logger.error('Error deleting media file:', error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const params = {
        Bucket: config.aws.s3BucketName,
        Key: key,
        Expires: expiresIn,
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  private extractKeyFromUrl(url: string): string {
    // Extract S3 key from URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === config.aws.s3BucketName);
    return urlParts.slice(bucketIndex + 1).join('/');
  }

  async validateFile(file: Express.Multer.File): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    const maxSize = this.parseSize(config.upload.maxFileSize);
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${config.upload.maxFileSize}`,
      };
    }

    // Check file type
    const allowedTypes = config.upload.allowedFileTypes;
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return file.mimetype.startsWith(baseType);
      }
      return file.mimetype === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`,
      };
    }

    return { valid: true };
  }

  private parseSize(sizeStr: string): number {
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
}