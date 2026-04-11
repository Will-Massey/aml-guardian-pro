import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Console format for development
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
  }),
];

// Add file transport in production
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: config.logFile,
      format: combine(timestamp(), json()),
    })
  );
}

// Create logger
export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'aml-guardian' },
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports,
});

// Export simplified logging functions
export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown): void => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack });
  } else {
    logger.error(message, { error });
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug(message, meta);
};
