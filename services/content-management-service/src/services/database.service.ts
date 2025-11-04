import mongoose from 'mongoose';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(config.mongodb.uri, options);
      
      logger.info('Connected to MongoDB successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const state = mongoose.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public getConnection() {
    return mongoose.connection;
  }
}

export const databaseService = DatabaseService.getInstance();