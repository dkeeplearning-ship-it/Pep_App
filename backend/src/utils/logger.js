const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: format,
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'all.log'),
    level: 'debug',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for HTTP logs
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Enhanced logging methods
const enhancedLogger = {
  ...logger,
  
  // API request logging
  logRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    };
    
    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  },
  
  // Database operation logging
  logDatabase: (operation, table, data, duration) => {
    logger.info('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      recordCount: Array.isArray(data) ? data.length : 1,
      timestamp: new Date().toISOString(),
    });
  },
  
  // Authentication logging
  logAuth: (action, userId, success, details = {}) => {
    const logData = {
      action,
      userId,
      success,
      ...details,
      timestamp: new Date().toISOString(),
    };
    
    if (success) {
      logger.info('Authentication Success', logData);
    } else {
      logger.warn('Authentication Failed', logData);
    }
  },
  
  // Business logic logging
  logBusiness: (operation, data, success, error = null) => {
    const logData = {
      operation,
      success,
      data: typeof data === 'object' ? JSON.stringify(data) : data,
      timestamp: new Date().toISOString(),
    };
    
    if (error) {
      logData.error = error.message;
      logData.stack = error.stack;
    }
    
    if (success) {
      logger.info('Business Operation', logData);
    } else {
      logger.error('Business Operation Failed', logData);
    }
  },
  
  // Security logging
  logSecurity: (event, severity, details) => {
    const logData = {
      event,
      severity,
      ...details,
      timestamp: new Date().toISOString(),
    };
    
    if (severity === 'high' || severity === 'critical') {
      logger.error('Security Event', logData);
    } else {
      logger.warn('Security Event', logData);
    }
  },
  
  // Performance logging
  logPerformance: (operation, duration, details = {}) => {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString(),
    };
    
    if (duration > 5000) { // Log slow operations (>5s)
      logger.warn('Slow Operation', logData);
    } else {
      logger.debug('Performance', logData);
    }
  },
  
  // External service logging
  logExternalService: (service, operation, success, responseTime, error = null) => {
    const logData = {
      service,
      operation,
      success,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
    
    if (error) {
      logData.error = error.message;
      logger.error('External Service Error', logData);
    } else if (success) {
      logger.info('External Service Success', logData);
    } else {
      logger.warn('External Service Failed', logData);
    }
  },
  
  // System health logging
  logHealth: (component, status, metrics = {}) => {
    const logData = {
      component,
      status,
      ...metrics,
      timestamp: new Date().toISOString(),
    };
    
    if (status === 'healthy') {
      logger.debug('Health Check', logData);
    } else {
      logger.warn('Health Check Failed', logData);
    }
  },
  
  // User activity logging
  logUserActivity: (userId, action, resource, details = {}) => {
    logger.info('User Activity', {
      userId,
      action,
      resource,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },
  
  // Data validation logging
  logValidation: (operation, success, errors = []) => {
    const logData = {
      operation,
      success,
      errorCount: errors.length,
      errors: errors.slice(0, 5), // Log first 5 errors only
      timestamp: new Date().toISOString(),
    };
    
    if (success) {
      logger.debug('Validation Success', logData);
    } else {
      logger.warn('Validation Failed', logData);
    }
  },
};

// Request ID middleware for tracing
const requestIdMiddleware = (req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// HTTP logging middleware
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    enhancedLogger.logRequest(req, res, duration);
  });
  
  next();
};

// Error logging middleware
const errorLoggerMiddleware = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
  
  next(err);
};

// Log rotation cleanup
const cleanupOldLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();
  
  fs.readdir(logsDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlink(filePath, (err) => {
            if (!err) {
              logger.info(`Cleaned up old log file: ${file}`);
            }
          });
        }
      });
    });
  });
};

// Run cleanup daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
  logger: enhancedLogger,
  requestIdMiddleware,
  httpLoggerMiddleware,
  errorLoggerMiddleware,
};
