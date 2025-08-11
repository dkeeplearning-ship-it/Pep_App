const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { query } = require('../utils/query');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, role, status')
        .eq('id', decoded.userId)
        .eq('status', 'active')
        .limit(1)
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      userDetails: userResult.rows[0]
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        userRole: req.user.role,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource or has admin role
const requireOwnershipOrAdmin = (resourceUserIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const resourceUserId = req.params[resourceUserIdParam];
    const isOwner = req.user.userId.toString() === resourceUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
        currentUserId: req.user.userId,
        requestedUserId: resourceUserId,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const userResult = await query(
        supabase
          .from('users')
          .select('id, username, email, role, status')
          .eq('id', decoded.userId)
          .eq('status', 'active')
          .limit(1)
      );

      if (userResult.rows && userResult.rows.length > 0) {
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
          userDetails: userResult.rows[0]
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    console.log('Optional auth failed (continuing without auth):', error.message);
    next();
  }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Middleware to require teacher or admin role
const requireTeacher = (req, res, next) => {
  if (!req.user || !['admin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Teacher or admin access required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  requireAdmin,
  requireTeacher
};