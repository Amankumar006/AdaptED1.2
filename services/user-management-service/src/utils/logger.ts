import winston from 'winston';
import { config } from '../config/config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'user-management-service' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add structured logging methods
export const structuredLogger = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
  },
  
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...meta
    });
  },
  
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
  },
  
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
  },
  
  audit: (action: string, userId: string, resource: string, meta?: Record<string, any>) => {
    logger.info('Audit Log', {
      type: 'audit',
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }
};