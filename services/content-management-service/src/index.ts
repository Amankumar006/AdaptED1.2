// Initialize tracing before any other imports
const enableTracing = process.env.ENABLE_TRACING !== 'false';
if (enableTracing) {
  require('./config/tracing').initTracing();
}

import { app } from './app';
import { config } from './config/config';
import { databaseService } from './services/database.service';
import { redisService } from './services/redis.service';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // Connect to databases
    await databaseService.connect();
    await redisService.connect();

    // Start the server
    const server = app.listen(config.port, () => {
      logger.info(`Content Management Service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        try {
          await databaseService.disconnect();
          await redisService.disconnect();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();