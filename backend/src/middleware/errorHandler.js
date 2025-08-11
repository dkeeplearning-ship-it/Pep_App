// Import logger - handle circular dependency
let logger;
try {
  const loggerModule = require('../utils/logger');
  logger = loggerModule.logger;
} catch (error) {
  // Fallback to console if logger is not available
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };
}

/**
 * Global error handling middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  if (logger && typeof logger.error === 'function') {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  } else {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    const message = 'Database operation failed';
    error = { message, statusCode: 500 };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
};

/**
 * Handle async errors in route handlers
 * Usage: asyncHandler(async (req, res, next) => { ... })
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Validation error handler
 */
const validationError = (errors) => {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.details = errors;
  return error;
};

/**
 * Database error handler
 */
const databaseError = (operation, originalError) => {
  logger.error('Database operation failed:', {
    operation,
    error: originalError.message,
    stack: originalError.stack,
    timestamp: new Date().toISOString()
  });

  const error = new Error(`Database ${operation} failed`);
  error.statusCode = 500;
  error.originalError = originalError;
  return error;
};

/**
 * Authentication error handler
 */
const authError = (message = 'Authentication failed') => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

/**
 * Authorization error handler
 */
const authorizationError = (message = 'Access denied') => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

/**
 * Business logic error handler
 */
const businessError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * External service error handler
 */
const externalServiceError = (service, originalError) => {
  logger.error('External service error:', {
    service,
    error: originalError.message,
    stack: originalError.stack,
    timestamp: new Date().toISOString()
  });

  const error = new Error(`${service} service unavailable`);
  error.statusCode = 503;
  error.originalError = originalError;
  return error;
};

/**
 * Request timeout error handler
 */
const timeoutError = (operation) => {
  const error = new Error(`${operation} timed out`);
  error.statusCode = 408;
  return error;
};

/**
 * Rate limit error handler
 */
const rateLimitError = (message = 'Too many requests') => {
  const error = new Error(message);
  error.statusCode = 429;
  return error;
};

/**
 * File operation error handler
 */
const fileError = (operation, originalError) => {
  logger.error('File operation failed:', {
    operation,
    error: originalError.message,
    stack: originalError.stack,
    timestamp: new Date().toISOString()
  });

  const error = new Error(`File ${operation} failed`);
  error.statusCode = 500;
  error.originalError = originalError;
  return error;
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
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

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Unhandled promise rejection handler
 */
const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Close server & exit process
    process.exit(1);
  });
};

/**
 * Uncaught exception handler
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Close server & exit process
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  validationError,
  databaseError,
  authError,
  authorizationError,
  businessError,
  externalServiceError,
  timeoutError,
  rateLimitError,
  fileError,
  gracefulShutdown,
  handleUnhandledRejections,
  handleUncaughtExceptions
};
