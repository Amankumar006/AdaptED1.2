import App from './app';
import { config } from './config/config';
import { logger } from './utils/logger';
import { initTracing } from './config/tracing';

async function startServer(): Promise<void> {
  try {
    // Initialize OpenTelemetry tracing (can be disabled via ENABLE_TRACING=false)
    if (process.env.ENABLE_TRACING !== 'false') {
      initTracing();
    }

    const app = new App();
    
    // Initialize the application
    await app.initialize();
    
    // Start the server
    const server = app.app.listen(config.port, () => {
      logger.info(`🚀 Authentication Service started successfully`);
      logger.info(`📡 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🔧 Redis: ${config.redis.host}:${config.redis.port}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();