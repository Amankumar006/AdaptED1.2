// Initialize tracing before any other imports
const enableTracing = process.env.ENABLE_TRACING !== 'false';
if (enableTracing) {
  require('./config/tracing').initTracing();
}

import App from './app';
import { config } from './config/config';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    const app = new App();
    
    // Initialize the application
    await app.initialize();
    
    // Start the server
    const server = app.app.listen(config.port, () => {
      logger.info(`User Management Service started successfully`, {
        port: config.port,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString()
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

    // Handle process termination
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();