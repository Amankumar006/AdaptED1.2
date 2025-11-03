import App from './app';
import config from './config/config';
import { logger } from './utils/logger';

async function startServer() {
  try {
    const app = new App();
    await app.initialize();

    const server = app.app.listen(config.port, () => {
      logger.info(`Learning Analytics Service started on port ${config.port}`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof config.port === 'string' 
        ? 'Pipe ' + config.port 
        : 'Port ' + config.port;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

startServer();