import App from './app';
import config from './config/config';
import { logger } from './utils/logger';
import { databaseService } from './services/database.service';

async function startServer(): Promise<void> {
  try {
    const app = new App();
    await app.initialize();

    const server = app.app.listen(config.port, () => {
      logger.info(`Assessment Engine Service started on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await databaseService.close();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();