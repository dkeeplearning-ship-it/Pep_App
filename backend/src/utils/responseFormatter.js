/**
 * Standardized API Response Formatter
 * Ensures consistent response formats across all endpoints
 */

/**
 * Standard success response format
 */
const successResponse = (res, data, message = 'Success', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  // Add pagination info if provided
  if (meta.pagination) {
    response.pagination = meta.pagination;
  }
  
  // Add count if data is an array
  if (Array.isArray(data)) {
    response.count = data.length;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Standard error response format
 */
const errorResponse = (res, error, message = 'An error occurred', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: typeof error === 'string' ? error : error.code || 'INTERNAL_ERROR',
    message,
    timestamp: new Date().toISOString()
  };
  
  // Add error details in development
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }
  
  // Add stack trace in development for 500 errors
  if (process.env.NODE_ENV === 'development' && statusCode >= 500 && error.stack) {
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    details: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  });
};

/**
 * Authorization error response
 */
const authorizationErrorResponse = (res, message = 'Access denied') => {
  return res.status(403).json({
    success: false,
    error: 'AUTHORIZATION_ERROR',
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Authentication error response
 */
const authenticationErrorResponse = (res, message = 'Authentication required') => {
  return res.status(401).json({
    success: false,
    error: 'AUTHENTICATION_ERROR',
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Not found error response
 */
const notFoundErrorResponse = (res, resource = 'Resource', message = null) => {
  return res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: message || `${resource} not found`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Business logic error response
 */
const businessLogicErrorResponse = (res, message, details = null) => {
  return res.status(400).json({
    success: false,
    error: 'BUSINESS_LOGIC_ERROR',
    message,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated response format
 */
const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return successResponse(res, data, message, 200, { pagination });
};

/**
 * Create pagination metadata
 */
const createPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: parseInt(page),
    totalPages,
    totalItems: total,
    itemsPerPage: parseInt(limit),
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null
  };
};

/**
 * Handle async route errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return validationErrorResponse(res, err.message);
  }
  
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return authenticationErrorResponse(res, err.message);
  }
  
  if (err.name === 'ForbiddenError' || err.status === 403) {
    return authorizationErrorResponse(res, err.message);
  }
  
  if (err.name === 'NotFoundError' || err.status === 404) {
    return notFoundErrorResponse(res, 'Resource', err.message);
  }
  
  // Handle database errors
  if (err.code === '23505') { // Unique constraint violation
    return businessLogicErrorResponse(res, 'Duplicate entry detected', {
      constraint: err.constraint,
      detail: err.detail
    });
  }
  
  if (err.code === '23503') { // Foreign key constraint violation
    return businessLogicErrorResponse(res, 'Referenced record does not exist', {
      constraint: err.constraint,
      detail: err.detail
    });
  }
  
  if (err.code === '23502') { // Not null constraint violation
    return validationErrorResponse(res, 'Required field is missing', err.column);
  }
  
  // Default server error
  return errorResponse(res, err, 'Internal server error', 500, {
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  return notFoundErrorResponse(res, 'Endpoint', `Route ${req.method} ${req.path} not found`);
};

/**
 * Response time middleware
 */
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📊 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * Request logging middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
  const { method, path, ip, headers } = req;
  const userAgent = headers['user-agent'];
  const userId = req.user?.id || 'anonymous';
  
  console.log(`📝 ${method} ${path} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`);
  
  next();
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  authorizationErrorResponse,
  authenticationErrorResponse,
  notFoundErrorResponse,
  businessLogicErrorResponse,
  paginatedResponse,
  createPaginationMeta,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  responseTimeMiddleware,
  requestLoggingMiddleware
};
