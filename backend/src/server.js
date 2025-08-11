const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import enhanced error handling and logging
const { logger, requestIdMiddleware, httpLoggerMiddleware, errorLoggerMiddleware } = require('./utils/logger');
const {
  errorHandler,
  notFound,
  gracefulShutdown,
  handleUnhandledRejections,
  handleUncaughtExceptions
} = require('./middleware/errorHandler');

// Import performance optimization middleware
const {
  queryOptimization,
  responseOptimization,
  performanceMonitor
} = require('./middleware/performanceOptimization');

const { testConnection } = require('./config/supabase');
const superAdminService = require('./services/superAdminService');

// Import routes
const authRoutes = require('./routes/auth');
const kosSSORoutes = require('./routes/kosSSOAuth');
const microsoftDirectRoutes = require('./routes/microsoftDirectAuth');
const userRoutes = require('./routes/users');
const quadrantRoutes = require('./routes/quadrants');
const subCategoryRoutes = require('./routes/subCategories');
const componentRoutes = require('./routes/components');
const studentRoutes = require('./routes/students');
const scoreRoutes = require('./routes/scores');
const adminRoutes = require('./routes/admin');
const interventionRoutes = require('./routes/interventions');
const microcompetencyRoutes = require('./routes/microcompetencies');
const teacherMicrocompetencyRoutes = require('./routes/teacherMicrocompetencies');
const teacherRoutes = require('./routes/teachers');
const studentInterventionRoutes = require('./routes/studentInterventions');
const scoreCalculationRoutes = require('./routes/scoreCalculation');
const uploadRoutes = require('./routes/uploads');
const termRoutes = require('./routes/terms');
const userManagementRoutes = require('./routes/userManagement');
const studentProfileRoutes = require('./routes/studentProfile');
const weightageValidationRoutes = require('./routes/weightageValidation');
const unifiedScoreRoutes = require('./routes/unifiedScores');
const shlCompetencyRoutes = require('./routes/shlCompetencies');
const attendanceRoutes = require('./routes/attendance');
const levelProgressionRoutes = require('./routes/levelProgressionRoutes');
const batchTermWeightageRoutes = require('./routes/batchTermWeightages');
const bulkTeacherAssignmentController = require('./controllers/bulkTeacherAssignmentController');
const taskMicrocompetencyController = require('./controllers/taskMicrocompetencyController');
const termTransitionService = require('./services/termTransitionService');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for dev tunnels and load balancers
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow file:// protocol for testing HTML files
    if (origin.startsWith('file://')) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://10.80.60.105:8082',
      'https://8hbdz2rs-3001.inc1.devtunnels.ms',
      'https://8hbdz2rs-8080.inc1.devtunnels.ms',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Request ID middleware for tracing
app.use(requestIdMiddleware);

// Performance optimization middleware
app.use(queryOptimization);
app.use(responseOptimization);

// Enhanced HTTP logging middleware
app.use(httpLoggerMiddleware);

// Compression middleware
app.use(compression());

// Legacy logging middleware (can be removed later)
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus ? 'Connected' : 'Disconnected',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Version endpoint for .well-known requests
app.get('/.well-known/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'PEP Score Nexus API',
    timestamp: new Date().toISOString()
  });
});

// Performance monitoring endpoint
app.get('/performance', (req, res) => {
  const stats = performanceMonitor.getCacheStats();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: stats,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api';
const apiVersion = process.env.API_VERSION || 'v1';
const baseRoute = `${apiPrefix}/${apiVersion}`;

app.use(`${baseRoute}/auth`, authRoutes);
app.use(`${baseRoute}/auth/kos-sso`, kosSSORoutes);
app.use(`${baseRoute}/auth/microsoft-direct`, microsoftDirectRoutes);
app.use(`${baseRoute}/users`, userRoutes);
app.use(`${baseRoute}/quadrants`, quadrantRoutes);
app.use(`${baseRoute}/sub-categories`, subCategoryRoutes);
app.use(`${baseRoute}/components`, componentRoutes);
app.use(`${baseRoute}/students`, studentRoutes);
app.use(`${baseRoute}/scores`, scoreRoutes);
app.use(`${baseRoute}/admin`, adminRoutes);
app.use(`${baseRoute}/interventions`, interventionRoutes);
app.use(`${baseRoute}/microcompetencies`, microcompetencyRoutes);
app.use(`${baseRoute}/teacher-microcompetencies`, teacherMicrocompetencyRoutes);
app.use(`${baseRoute}/teachers`, teacherRoutes);
app.use(`${baseRoute}/student-interventions`, studentInterventionRoutes);
app.use(`${baseRoute}/score-calculation`, scoreCalculationRoutes);
app.use(`${baseRoute}/uploads`, uploadRoutes);
app.use(`${baseRoute}/terms`, termRoutes);
app.use(`${baseRoute}/admin/user-management`, userManagementRoutes);
app.use(`${baseRoute}/student/profile`, studentProfileRoutes);
app.use(`${baseRoute}/admin/weightage-validation`, weightageValidationRoutes);
app.use(`${baseRoute}/unified-scores`, unifiedScoreRoutes);
app.use(`${baseRoute}/shl-competencies`, shlCompetencyRoutes);
app.use(`${baseRoute}/attendance`, attendanceRoutes);
app.use(`${baseRoute}/level-progression`, levelProgressionRoutes);
app.use(`${baseRoute}/admin/batch-term-weightages`, batchTermWeightageRoutes);

// Bulk Teacher Assignment Routes
app.post(`${baseRoute}/admin/bulk-teacher-assignment`, authenticateToken, requireRole('admin'), bulkTeacherAssignmentController.bulkAssignTeachers);
app.post(`${baseRoute}/admin/assign-teachers-by-criteria`, authenticateToken, requireRole('admin'), bulkTeacherAssignmentController.assignTeachersByCriteria);
app.post(`${baseRoute}/admin/bulk-remove-teachers`, authenticateToken, requireRole('admin'), bulkTeacherAssignmentController.bulkRemoveTeachers);
app.get(`${baseRoute}/admin/teacher-assignment-stats`, authenticateToken, requireRole('admin'), bulkTeacherAssignmentController.getAssignmentStatistics);

// Task-Microcompetency Routes
app.post(`${baseRoute}/admin/tasks/:taskId/microcompetencies`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.linkMicrocompetenciesToTask);
app.get(`${baseRoute}/admin/tasks/:taskId/microcompetencies`, authenticateToken, requireRole('admin', 'teacher'), taskMicrocompetencyController.getTaskMicrocompetencies);
app.put(`${baseRoute}/admin/task-microcompetencies/:id`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.updateTaskMicrocompetency);
app.delete(`${baseRoute}/admin/task-microcompetencies/:id`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.removeTaskMicrocompetency);
app.get(`${baseRoute}/admin/microcompetencies/:microcompetencyId/tasks`, authenticateToken, requireRole('admin', 'teacher'), taskMicrocompetencyController.getTasksByMicrocompetency);
app.post(`${baseRoute}/admin/bulk-link-microcompetencies`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.bulkLinkMicrocompetencies);
app.get(`${baseRoute}/admin/task-microcompetency-stats`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.getTaskMicrocompetencyStatistics);
app.get(`${baseRoute}/admin/tasks/invalid-weightages`, authenticateToken, requireRole('admin'), taskMicrocompetencyController.getTasksWithInvalidWeightages);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PEP Score Nexus API Server',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    health: `${req.protocol}://${req.get('host')}/health`,
    endpoints: {
      auth: `${req.protocol}://${req.get('host')}${baseRoute}/auth`,
      quadrants: `${req.protocol}://${req.get('host')}${baseRoute}/quadrants`,
      students: `${req.protocol}://${req.get('host')}${baseRoute}/students`,
      scores: `${req.protocol}://${req.get('host')}${baseRoute}/scores`,
      interventions: `${req.protocol}://${req.get('host')}${baseRoute}/interventions`,
      admin: `${req.protocol}://${req.get('host')}${baseRoute}/admin`,
      users: `${req.protocol}://${req.get('host')}${baseRoute}/users`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`,
    availableEndpoints: [
      `POST ${baseRoute}/auth/register`,
      `POST ${baseRoute}/auth/login`,
      `GET ${baseRoute}/auth/profile`,
      `GET ${baseRoute}/quadrants`,
      `GET ${baseRoute}/students`,
      'GET /health'
    ]
  });
});

// Enhanced error logging middleware
app.use(errorLoggerMiddleware);

// 404 handler for undefined routes
app.use(notFound);

// Enhanced global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize super admin
    console.log('🔧 Initializing super admin system...');
    await superAdminService.initializeSuperAdmin();

    // Initialize Term Transition Service
    console.log('⏰ Initializing term transition scheduler...');
    termTransitionService.initializeScheduler();

    // Start listening and return server instance
    const server = app.listen(PORT, () => {
      console.log(`🚀 PEP Score Nexus API Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔗 Base API URL: http://localhost:${PORT}${baseRoute}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Term transition scheduler active`);
      console.log(`📝 Enhanced logging and error handling active`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Enhanced error and shutdown handling
handleUnhandledRejections();
handleUncaughtExceptions();

// Start the server
startServer().then(server => {
  // Setup graceful shutdown
  gracefulShutdown(server);

  console.log('🚀 Server started successfully with enhanced error handling and logging');
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
