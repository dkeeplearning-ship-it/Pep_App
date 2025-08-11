/**
 * Resource-Level Authorization Middleware
 * Ensures users can only access resources they own or are authorized to access
 */

const { supabase, query } = require('../config/supabase');

/**
 * Check if user owns or has access to a student record
 */
const authorizeStudentAccess = async (req, res, next) => {
  try {
    const { studentId, id } = req.params;
    const targetStudentId = studentId || id;
    const { user } = req;
    
    // Admin can access any student
    if (user.role === 'admin') {
      return next();
    }
    
    // Student can only access their own data
    if (user.role === 'student') {
      const result = await query(
        supabase
          .from('students')
          .select('id, user_id')
          .eq('id', targetStudentId)
          .limit(1)
      );
      
      if (!result.rows.length || result.rows[0].user_id !== user.userId) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access your own student data',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Teacher can access students in their classes/interventions
    if (user.role === 'teacher') {
      const teacherResult = await query(
        supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.userId)
          .limit(1)
      );
      
      if (!teacherResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'Teacher record not found',
          timestamp: new Date().toISOString()
        });
      }
      
      const teacherId = teacherResult.rows[0].id;
      
      // Check if teacher has access to this student through interventions
      const accessResult = await query(
        supabase
          .from('intervention_teachers')
          .select(`
            intervention_id,
            interventions!inner(
              id,
              student_interventions!inner(student_id)
            )
          `)
          .eq('teacher_id', teacherId)
          .eq('interventions.student_interventions.student_id', targetStudentId)
          .limit(1)
      );
      
      if (!accessResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access students assigned to your interventions',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Student authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: 'Failed to verify student access',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Check if user can access teacher data
 */
const authorizeTeacherAccess = async (req, res, next) => {
  try {
    const { teacherId, id } = req.params;
    const targetTeacherId = teacherId || id;
    const { user } = req;
    
    // Admin can access any teacher
    if (user.role === 'admin') {
      return next();
    }
    
    // Teacher can only access their own data
    if (user.role === 'teacher') {
      const result = await query(
        supabase
          .from('teachers')
          .select('id, user_id')
          .eq('id', targetTeacherId)
          .limit(1)
      );
      
      if (!result.rows.length || result.rows[0].user_id !== user.userId) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access your own teacher data',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Students cannot access teacher data
      return res.status(403).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Students cannot access teacher data',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Teacher authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: 'Failed to verify teacher access',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Check if user can access intervention data
 */
const authorizeInterventionAccess = async (req, res, next) => {
  try {
    const { interventionId, id } = req.params;
    const targetInterventionId = interventionId || id;
    const { user } = req;
    
    // Admin can access any intervention
    if (user.role === 'admin') {
      return next();
    }
    
    // Teacher can access interventions they're assigned to
    if (user.role === 'teacher') {
      const teacherResult = await query(
        supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.userId)
          .limit(1)
      );
      
      if (!teacherResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'Teacher record not found',
          timestamp: new Date().toISOString()
        });
      }
      
      const accessResult = await query(
        supabase
          .from('intervention_teachers')
          .select('intervention_id')
          .eq('teacher_id', teacherResult.rows[0].id)
          .eq('intervention_id', targetInterventionId)
          .limit(1)
      );
      
      if (!accessResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access interventions assigned to you',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Student can access interventions they're enrolled in
    if (user.role === 'student') {
      const studentResult = await query(
        supabase
          .from('students')
          .select('id')
          .eq('user_id', user.userId)
          .limit(1)
      );
      
      if (!studentResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'Student record not found',
          timestamp: new Date().toISOString()
        });
      }
      
      const accessResult = await query(
        supabase
          .from('student_interventions')
          .select('intervention_id')
          .eq('student_id', studentResult.rows[0].id)
          .eq('intervention_id', targetInterventionId)
          .eq('status', 'active')
          .limit(1)
      );
      
      if (!accessResult.rows.length) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access interventions you are enrolled in',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Intervention authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: 'Failed to verify intervention access',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Check if user can access score data
 */
const authorizeScoreAccess = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { user } = req;
    
    // Admin can access any scores
    if (user.role === 'admin') {
      return next();
    }
    
    // Use student authorization for score access
    req.params.studentId = studentId;
    return authorizeStudentAccess(req, res, next);
    
  } catch (error) {
    console.error('❌ Score authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: 'Failed to verify score access',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Check if user can modify configuration data
 */
const authorizeConfigurationAccess = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Only admin can modify configurations
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Only administrators can modify configurations',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Configuration authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: 'Failed to verify configuration access',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Generic resource ownership check
 */
const authorizeResourceOwnership = (tableName, userIdColumn = 'user_id') => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const { user } = req;
      
      // Admin can access any resource
      if (user.role === 'admin') {
        return next();
      }
      
      const result = await query(
        supabase
          .from(tableName)
          .select(`id, ${userIdColumn}`)
          .eq('id', id)
          .limit(1)
      );
      
      if (!result.rows.length || result.rows[0][userIdColumn] !== user.userId) {
        return res.status(403).json({
          success: false,
          error: 'AUTHORIZATION_ERROR',
          message: 'You can only access resources you own',
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error(`❌ Resource ownership authorization error for ${tableName}:`, error);
      res.status(500).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Failed to verify resource ownership',
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = {
  authorizeStudentAccess,
  authorizeTeacherAccess,
  authorizeInterventionAccess,
  authorizeScoreAccess,
  authorizeConfigurationAccess,
  authorizeResourceOwnership
};
