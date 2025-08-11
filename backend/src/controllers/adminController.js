const { supabase, query } = require('../config/supabase');
const { validateStudentData, validateTeacherData } = require('../utils/validators');
const bcrypt = require('bcrypt');

// Get admin dashboard overview
const getDashboardOverview = async (req, res) => {
  try {
    // Get total counts
    const [
      studentsCount,
      teachersCount,
      activeInterventions,
      recentScores
    ] = await Promise.all([
      query(supabase.from('students').select('*', { count: 'exact' })),
      query(supabase.from('teachers').select('*', { count: 'exact' })),
      query(supabase.from('interventions').select('*', { count: 'exact' }).eq('status', 'Active')),
      query(supabase.from('scores').select('*').order('created_at', { ascending: false }).limit(5))
    ]);

    // Get performance metrics - get quadrants and calculate scores separately
    const performanceMetrics = await query(
      supabase.from('quadrants')
        .select('id, name, weightage, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    );

    res.status(200).json({
      success: true,
      data: {
        counts: {
          totalStudents: studentsCount.totalCount || 0,
          totalTeachers: teachersCount.totalCount || 0,
          activeInterventions: activeInterventions.totalCount || 0
        },
        recentScores: recentScores.rows,
        performanceMetrics: performanceMetrics.rows,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview',
      message: error.message
    });
  }
};

// Get all students with pagination and filters
const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      batch,
      section,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      exclude_enrolled,
      termId,
      // New filter parameters
      batch_ids,
      batch_years,
      courses,
      sections,
      houses
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('students')
      .select(`
        *,
        user:users(email, username),
        batch:batches(name, year),
        section:sections(name),
        house:houses(name, color)
      `, { count: 'exact' });

    // Apply legacy filters (for backward compatibility)
    if (batch) query = query.eq('batch_id', batch);
    if (section) query = query.eq('section_id', section);
    if (status) query = query.eq('status', status);

    // Apply new filters
    if (batch_ids) {
      const batchIdArray = Array.isArray(batch_ids) ? batch_ids : batch_ids.split(',');
      if (batchIdArray.length > 0) {
        query = query.in('batch_id', batchIdArray);
      }
    }

    if (batch_years) {
      const yearArray = Array.isArray(batch_years) ? batch_years : batch_years.split(',').map(y => parseInt(y));
      if (yearArray.length > 0) {
        // Join with batches table to filter by year
        query = query.in('batch.year', yearArray);
      }
    }

    if (courses) {
      const courseArray = Array.isArray(courses) ? courses : courses.split(',');
      if (courseArray.length > 0) {
        query = query.in('course', courseArray);
      }
    }

    if (sections) {
      const sectionArray = Array.isArray(sections) ? sections : sections.split(',');
      if (sectionArray.length > 0) {
        query = query.in('section_id', sectionArray);
      }
    }

    if (houses) {
      const houseArray = Array.isArray(houses) ? houses : houses.split(',');
      if (houseArray.length > 0) {
        query = query.in('house_id', houseArray);
      }
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,registration_no.ilike.%${search}%`);
    }

    // Note: Students persist across terms, so we don't filter by term here
    // Term-specific data (scores, performance) will be handled in the response
    // The termId parameter is used for fetching term-specific performance data

    // Exclude students already enrolled in intervention
    if (exclude_enrolled) {
      const { data: enrolledStudents } = await supabase
        .from('intervention_students')
        .select('student_id')
        .eq('intervention_id', exclude_enrolled);

      if (enrolledStudents && enrolledStudents.length > 0) {
        const enrolledIds = enrolledStudents.map(e => e.student_id);
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // If termId is provided, enrich student data with term-specific information
    let enrichedStudents = data;
    if (termId && data && data.length > 0) {
      const studentIds = data.map(s => s.id);

      // Get term-specific data from student_terms table
      const { data: studentTermsData } = await supabase
        .from('student_terms')
        .select('student_id, total_score, grade, overall_status, enrollment_status')
        .eq('term_id', termId)
        .in('student_id', studentIds);

      // Create a map for quick lookup
      const termDataMap = new Map();
      if (studentTermsData) {
        studentTermsData.forEach(st => {
          termDataMap.set(st.student_id, st);
        });
      }

      // Enrich student data with term-specific information
      enrichedStudents = data.map(student => {
        const termData = termDataMap.get(student.id);
        return {
          ...student,
          // Override with term-specific data if available
          overall_score: termData?.total_score ?? student.overall_score ?? 0,
          grade: termData?.grade ?? student.grade ?? 'IC',
          term_status: termData?.overall_status ?? 'Progress',
          term_enrollment: termData?.enrollment_status ?? 'Not Enrolled'
        };
      });
    }

    // Log student IDs for testing
    console.log('Available student IDs:', data.map(s => s.id).join(', '));

    res.status(200).json({
      success: true,
      data: {
        students: enrichedStudents,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get all students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      message: error.message
    });
  }
};

// Search students
const searchStudents = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // First, let's check if there are any students at all
    const { data: allStudents, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact' });

    if (countError) throw countError;

    console.log('Total students in database:', allStudents?.length || 0);

    // Now proceed with the search
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        user:users(email, username),
        batch:batches(name),
        section:sections(name)
      `)
      .or(`name.ilike.%${query}%,registration_no.ilike.%${query}%,user.email.ilike.%${query}%`.replace(/,/g, '|'))
      .limit(parseInt(limit));

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {
        students: data,
        totalStudents: allStudents?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Search students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search students',
      message: error.message
    });
  }
};

// Get student details
const getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        user:users(*),
        batch:batches(*),
        section:sections(*),
        scores:scores(*),
        attendance:attendance(*)
      `)
      .eq('id', studentId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Get student details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student details',
      message: error.message
    });
  }
};

// Add new student
const addStudent = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      registrationNo,
      course,
      batchId,
      sectionId,
      gender,
      phone
    } = req.body;

    // Validate student data
    const validationError = validateStudentData(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationError
      });
    }

    // Get current term ID
    const { data: currentTerm, error: termError } = await supabase
      .from('terms')
      .select('id')
      .eq('is_current', true)
      .single();

    if (termError || !currentTerm) {
      return res.status(400).json({
        success: false,
        error: 'No current term found',
        message: 'Please ensure there is an active term in the system'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        username: email.split('@')[0],
        email,
        password_hash: hashedPassword,
        role: 'student',
        status: 'active'
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create student record
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: userData.id,
        registration_no: registrationNo,
        name: `${firstName} ${lastName}`,
        course,
        batch_id: batchId,
        section_id: sectionId,
        gender,
        phone: phone || '',
        preferences: {},
        overall_score: 0,
        grade: 'IC',
        status: 'Active',
        current_term_id: currentTerm.id
      })
      .select(`
        *,
        user:users(email, username),
        batch:batches(name),
        section:sections(name)
      `)
      .single();

    if (studentError) throw studentError;

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: studentData
    });
  } catch (error) {
    console.error('❌ Add student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student',
      message: error.message
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const updateData = req.body;

    // Validate update data
    const validationError = validateStudentData(updateData, true);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationError
      });
    }

    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data
    });
  } catch (error) {
    console.error('❌ Update student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      message: error.message
    });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // First check if student exists
    const { data: student, error: checkError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single();

    if (checkError) throw checkError;
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Delete student (this will cascade delete related records)
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      message: error.message
    });
  }
};

// Get all teachers
const getAllTeachers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // First, let's check if there are any teachers at all
    const { count: totalTeachers, error: countError } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting teachers:', countError);
      throw countError;
    }

    console.log('📊 Total teachers in database:', totalTeachers);
    
    let query = supabase
      .from('teachers')
      .select(`
        *,
        user:users(email, username)
      `, { count: 'exact' });

    // Apply filters
    if (status) query = query.eq('status', status);

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Get all teachers error:', error);
      throw error;
    }

    console.log('📝 Retrieved teachers:', data?.length || 0);

    res.status(200).json({
      success: true,
      data: {
        teachers: data,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get all teachers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teachers',
      message: error.message
    });
  }
};

// Add new teacher
const addTeacher = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      qualification,
      specialization,
      department,
      employeeId,
      phone,
      experience,
      assignedQuadrants = []
    } = req.body;

    // Validate teacher data
    const validationError = validateTeacherData(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationError
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        username: email.split('@')[0],
        email,
        password_hash: hashedPassword,
        role: 'teacher',
        status: 'active'
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create teacher record
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        user_id: userData.id,
        employee_id: employeeId,
        name: `${firstName} ${lastName}`,
        specialization,
        department,
        assigned_quadrants: assignedQuadrants,
        is_active: true
      })
      .select(`
        *,
        user:users(email, username)
      `)
      .single();

    if (teacherError) throw teacherError;

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacherData
    });
  } catch (error) {
    console.error('❌ Add teacher error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create teacher',
      message: error.message
    });
  }
};

// Update teacher
const updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const updateData = req.body;

    // Validate update data
    const validationError = validateTeacherData(updateData, true);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationError
      });
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', teacherId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data
    });
  } catch (error) {
    console.error('❌ Update teacher error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update teacher',
      message: error.message
    });
  }
};

// ==========================================
// NEW INTERVENTION-CENTRIC ADMIN FUNCTIONS
// ==========================================

// Get intervention management dashboard
const getInterventionDashboard = async (req, res) => {
  try {
    // Get intervention statistics
    const [
      totalInterventions,
      activeInterventions,
      draftInterventions,
      completedInterventions,
      totalMicrocompetencies,
      recentInterventions
    ] = await Promise.all([
      query(supabase.from('interventions').select('*', { count: 'exact' })),
      query(supabase.from('interventions').select('*', { count: 'exact' }).eq('status', 'Active')),
      query(supabase.from('interventions').select('*', { count: 'exact' }).eq('status', 'Draft')),
      query(supabase.from('interventions').select('*', { count: 'exact' }).eq('status', 'Completed')),
      query(supabase.from('microcompetencies').select('*', { count: 'exact' }).eq('is_active', true)),
      query(
        supabase
          .from('interventions')
          .select(`
            id,
            name,
            status,
            start_date,
            end_date,
            created_at,
            intervention_enrollments(count)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      )
    ]);

    // Get teacher assignment statistics
    const teacherAssignments = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          teacher_id,
          intervention_id,
          teachers:teacher_id(name),
          interventions:intervention_id(name)
        `)
        .eq('is_active', true)
    );

    // Group assignments by teacher
    const teacherStats = teacherAssignments.rows.reduce((acc, assignment) => {
      const teacherId = assignment.teacher_id;
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacher_name: assignment.teachers.name,
          interventions: new Set(),
          microcompetencies: 0
        };
      }
      acc[teacherId].interventions.add(assignment.intervention_id);
      acc[teacherId].microcompetencies++;
      return acc;
    }, {});

    // Convert sets to counts
    const formattedTeacherStats = Object.values(teacherStats).map(stat => ({
      teacher_name: stat.teacher_name,
      intervention_count: stat.interventions.size,
      microcompetency_count: stat.microcompetencies
    }));

    res.status(200).json({
      success: true,
      message: 'Intervention dashboard data retrieved successfully',
      data: {
        statistics: {
          total_interventions: totalInterventions.count || 0,
          active_interventions: activeInterventions.count || 0,
          draft_interventions: draftInterventions.count || 0,
          completed_interventions: completedInterventions.count || 0,
          total_microcompetencies: totalMicrocompetencies.count || 0
        },
        recent_interventions: recentInterventions.rows || [],
        teacher_assignments: formattedTeacherStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get intervention dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve intervention dashboard',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all interventions with microcompetency details
const getAllInterventionsWithDetails = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      termId
    } = req.query;

    // Convert to integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build query with proper enrollment data
    let interventionsQuery = supabase
      .from('interventions')
      .select(`
        id,
        name,
        description,
        start_date,
        end_date,
        status,
        max_students,
        scoring_deadline,
        is_scoring_open,
        created_at,
        intervention_microcompetencies(count),
        teacher_microcompetency_assignments(count)
      `);

    // Apply filters
    if (status) {
      interventionsQuery = interventionsQuery.eq('status', status);
    }

    if (search) {
      interventionsQuery = interventionsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by term if provided
    if (termId) {
      interventionsQuery = interventionsQuery.eq('term_id', termId);
    }

    // Apply sorting
    interventionsQuery = interventionsQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    // Get total count with same filters
    let countQuery = supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true });

    // Apply same filters to count query
    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by term if provided
    if (termId) {
      countQuery = countQuery.eq('term_id', termId);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) throw countError;

    // Apply pagination
    interventionsQuery = interventionsQuery.range(offset, offset + limitNum - 1);

    const { data, error } = await interventionsQuery;

    if (error) throw error;

    // Get enrollment counts for each intervention
    let enrichedInterventions = [];
    if (data && data.length > 0) {
      const interventionIds = data.map(intervention => intervention.id);
      
      // Get enrollment counts for all interventions in one query
      const { data: enrollmentCounts, error: enrollmentError } = await supabase
        .from('intervention_enrollments')
        .select('intervention_id')
        .in('intervention_id', interventionIds)
        .eq('enrollment_status', 'Enrolled');

      if (enrollmentError) {
        console.error('❌ Error fetching enrollment counts:', enrollmentError);
      }

      // Create a map of intervention_id to enrollment count
      const enrollmentCountMap = new Map();
      if (enrollmentCounts) {
        enrollmentCounts.forEach(enrollment => {
          const currentCount = enrollmentCountMap.get(enrollment.intervention_id) || 0;
          enrollmentCountMap.set(enrollment.intervention_id, currentCount + 1);
        });
      }

      // Enrich intervention data with enrollment counts
      enrichedInterventions = data.map(intervention => ({
        ...intervention,
        enrolled_count: enrollmentCountMap.get(intervention.id) || 0
      }));
    } else {
      enrichedInterventions = data || [];
    }

    res.status(200).json({
      success: true,
      message: 'Interventions retrieved successfully',
      data: {
        interventions: enrichedInterventions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limitNum)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get all interventions with details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve interventions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get intervention details with full microcompetency breakdown
const getInterventionDetails = async (req, res) => {
  try {
    const { interventionId } = req.params;

    // Get intervention basic info
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('*')
        .eq('id', interventionId)
        .single()
    );

    if (!interventionResult.rows || (Array.isArray(interventionResult.rows) && interventionResult.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get microcompetencies with teacher assignments
    const microcompetenciesResult = await query(
      supabase
        .from('intervention_microcompetencies')
        .select(`
          id,
          weightage,
          max_score,
          is_active,
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
            weightage,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name)
              )
            )
          )
        `)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    // Get enrolled students
    const enrolledStudentsResult = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          enrollment_date,
          enrollment_status,
          students:student_id(
            id,
            name,
            registration_no
          )
        `)
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
    );

    // Get scoring statistics
    const scoringStatsResult = await query(
      supabase
        .from('microcompetency_scores')
        .select('student_id, microcompetency_id, status')
        .eq('intervention_id', interventionId)
    );

    // Calculate scoring progress
    const totalStudents = enrolledStudentsResult.rows.length;
    const totalMicrocompetencies = microcompetenciesResult.rows.length;
    const totalPossibleScores = totalStudents * totalMicrocompetencies;
    const completedScores = scoringStatsResult.rows.filter(s => s.status === 'Submitted').length;
    const scoringProgress = totalPossibleScores > 0 ? (completedScores / totalPossibleScores) * 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Intervention details retrieved successfully',
      data: {
        intervention: Array.isArray(interventionResult.rows) ? interventionResult.rows[0] : interventionResult.rows,
        microcompetencies: microcompetenciesResult.rows || [],
        enrolled_students: enrolledStudentsResult.rows || [],
        statistics: {
          total_students: totalStudents,
          total_microcompetencies: totalMicrocompetencies,
          total_possible_scores: totalPossibleScores,
          completed_scores: completedScores,
          scoring_progress: scoringProgress
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get intervention details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve intervention details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get comprehensive reports and analytics
 */
const getReportsAnalytics = async (req, res) => {
  try {
    const { reportType, startDate, endDate, interventionId, quadrantId } = req.query;

    // Get intervention overview
    const interventionsResult = await query(
      supabase
        .from('interventions')
        .select(`
          id,
          name,
          status,
          start_date,
          end_date,
          created_at,
          intervention_enrollments(count),
          teacher_microcompetency_assignments(count)
        `)
    );

    // Get student performance data
    const studentsResult = await query(
      supabase
        .from('students')
        .select(`
          id,
          name,
          registration_no,
          overall_score,
          grade,
          status,
          created_at,
          batches:batch_id(name, year),
          sections:section_id(name)
        `)
        .eq('status', 'Active')
    );

    // Get microcompetency scores
    const scoresResult = await query(
      supabase
        .from('microcompetency_scores')
        .select(`
          id,
          obtained_score,
          max_score,
          percentage,
          status,
          scored_at,
          students:student_id(name, registration_no),
          microcompetencies:microcompetency_id(name, max_score),
          interventions:intervention_id(name, status)
        `)
        .eq('status', 'Submitted')
    );

    // Get teacher performance data
    const teachersResult = await query(
      supabase
        .from('teachers')
        .select(`
          id,
          name,
          employee_id,
          specialization,
          is_active
        `)
        .eq('is_active', true)
    );

    // Get teacher assignments separately
    const teacherAssignmentsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          teacher_id,
          intervention_id,
          interventions:intervention_id(name)
        `)
        .eq('is_active', true)
    );

    // Calculate analytics
    const analytics = {
      overview: {
        totalInterventions: interventionsResult.rows.length,
        activeInterventions: interventionsResult.rows.filter(i => i.status === 'Active').length,
        totalStudents: studentsResult.rows.length,
        totalTeachers: teachersResult.rows.length,
        totalScores: scoresResult.rows.length
      },
      interventionStats: interventionsResult.rows.map(intervention => ({
        id: intervention.id,
        name: intervention.name,
        status: intervention.status,
        enrollmentCount: intervention.intervention_enrollments?.[0]?.count || 0,
        teacherCount: intervention.teacher_microcompetency_assignments?.[0]?.count || 0,
        startDate: intervention.start_date,
        endDate: intervention.end_date
      })),
      studentPerformance: {
        gradeDistribution: studentsResult.rows.reduce((acc, student) => {
          acc[student.grade] = (acc[student.grade] || 0) + 1;
          return acc;
        }, {}),
        scoreDistribution: scoresResult.rows.reduce((acc, score) => {
          const percentage = score.percentage;
          let range;
          if (percentage >= 90) range = 'A+ (90-100%)';
          else if (percentage >= 80) range = 'A (80-89%)';
          else if (percentage >= 70) range = 'B (70-79%)';
          else if (percentage >= 60) range = 'C (60-69%)';
          else if (percentage >= 50) range = 'D (50-59%)';
          else range = 'F (<50%)';

          acc[range] = (acc[range] || 0) + 1;
          return acc;
        }, {}),
        averageScore: scoresResult.rows.length > 0
          ? scoresResult.rows.reduce((sum, score) => sum + score.percentage, 0) / scoresResult.rows.length
          : 0
      },
      teacherPerformance: teachersResult.rows.map(teacher => {
        const assignments = teacherAssignmentsResult.rows.filter(a => a.teacher_id === teacher.id);
        return {
          id: teacher.id,
          name: teacher.name,
          employee_id: teacher.employee_id,
          specialization: teacher.specialization,
          assignmentCount: assignments.length,
          interventions: assignments.map(a => a.interventions?.name).filter(Boolean)
        };
      }),
      recentActivity: scoresResult.rows
        .sort((a, b) => new Date(b.scored_at) - new Date(a.scored_at))
        .slice(0, 10)
        .map(score => ({
          id: score.id,
          studentName: score.students?.name,
          registrationNo: score.students?.registration_no,
          microcompetencyName: score.microcompetencies?.name,
          interventionName: score.interventions?.name,
          score: `${score.obtained_score}/${score.max_score}`,
          percentage: score.percentage,
          scoredAt: score.scored_at
        }))
    };

    res.status(200).json({
      success: true,
      message: 'Reports and analytics retrieved successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports and analytics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Export reports data
 */
const exportReports = async (req, res) => {
  try {
    const { format = 'json', reportType, startDate, endDate } = req.query;

    // Generate reports data directly (simplified version)
    const data = {
      studentPerformance: {
        gradeDistribution: {
          'A+': 5,
          'A': 12,
          'B+': 18,
          'B': 15,
          'C+': 8,
          'C': 3,
          'F': 1
        }
      },
      interventionStats: [
        {
          name: 'Sample Intervention',
          status: 'active',
          enrollmentCount: 25,
          teacherCount: 3,
          startDate: '2024-01-15',
          endDate: '2024-06-15'
        }
      ]
    };

    if (format === 'csv') {
      // Convert to CSV format
      let csvContent = '';

      if (reportType === 'students' || !reportType) {
        csvContent += 'Student Performance Report\n';
        csvContent += 'Grade,Count\n';
        Object.entries(data.studentPerformance.gradeDistribution).forEach(([grade, count]) => {
          csvContent += `${grade},${count}\n`;
        });
      }

      if (reportType === 'interventions' || !reportType) {
        csvContent += '\nIntervention Report\n';
        csvContent += 'Name,Status,Enrollments,Teachers,Start Date,End Date\n';
        data.interventionStats.forEach(intervention => {
          csvContent += `${intervention.name},${intervention.status},${intervention.enrollmentCount},${intervention.teacherCount},${intervention.startDate},${intervention.endDate}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="reports_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(data);
    }

  } catch (error) {
    console.error('Error exporting reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export reports',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getDashboardOverview,
  getAllStudents,
  searchStudents,
  getStudentDetails,
  addStudent,
  updateStudent,
  deleteStudent,
  getAllTeachers,
  addTeacher,
  updateTeacher,
  // New intervention-centric functions
  getInterventionDashboard,
  getAllInterventionsWithDetails,
  getInterventionDetails,
  // Reports and analytics functions
  getReportsAnalytics,
  exportReports
};