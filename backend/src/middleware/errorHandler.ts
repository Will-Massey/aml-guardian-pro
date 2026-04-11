import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Create operational error (expected errors)
 */
export function createError(message: string, statusCode: number = 500, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log error
  logger.error('Request error', {
    message: err.message,
    statusCode,
    code,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' && !err.isOperational
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
