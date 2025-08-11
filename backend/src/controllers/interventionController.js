const { supabase, query } = require('../config/supabase');

// ==========================================
// ADMIN INTERVENTION MANAGEMENT ENDPOINTS
// ==========================================

// Create new intervention
const createIntervention = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      quadrantWeightages,
      prerequisites = [],
      maxStudents = 50,
      objectives = []
    } = req.body;

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, startDate, endDate',
        timestamp: new Date().toISOString()
      });
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
        timestamp: new Date().toISOString()
      });
    }

    // Find appropriate term for this intervention based on start and end dates
    console.log(`🔍 Finding term for intervention: start=${startDate}, end=${endDate}`);

    // First try to find a term that contains the entire intervention period
    let termResult = await query(
      supabase
        .from('terms')
        .select('id, name, start_date, end_date')
        .lte('start_date', startDate)
        .gte('end_date', endDate)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
    );

    // If no term contains the entire intervention, find term where intervention starts
    if (!termResult.rows || termResult.rows.length === 0) {
      console.log('📅 No term contains entire intervention period, finding term for start date');
      termResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date, end_date')
          .lte('start_date', startDate)
          .gte('end_date', startDate)
          .eq('is_active', true)
          .order('start_date', { ascending: false })
          .limit(1)
      );
    }

    // If still no term found, use current term as fallback
    let termId = null;
    if (termResult.rows && termResult.rows.length > 0) {
      termId = termResult.rows[0].id;
      console.log(`✅ Mapped intervention to term: ${termResult.rows[0].name} (${termResult.rows[0].start_date} to ${termResult.rows[0].end_date})`);
    } else {
      console.log('⚠️ No suitable term found, using current term as fallback');
      const currentTermResult = await query(
        supabase
          .from('terms')
          .select('id, name')
          .eq('is_current', true)
          .limit(1)
      );
      if (currentTermResult.rows && currentTermResult.rows.length > 0) {
        termId = currentTermResult.rows[0].id;
        console.log(`📌 Using current term: ${currentTermResult.rows[0].name}`);
      }
    }

    // Create intervention
    const interventionResult = await query(
      supabase
        .from('interventions')
        .insert({
          name,
          description,
          start_date: startDate,
          end_date: endDate,
          status: 'Draft',
          term_id: termId,
          quadrant_weightages: quadrantWeightages,
          prerequisites,
          max_students: maxStudents,
          objectives,
          created_by: req.user.userId
        })
        .select('*')
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      throw new Error('Failed to create intervention');
    }

    const intervention = interventionResult.rows[0];

    // Create intervention_quadrants entries if quadrantWeightages provided
    if (quadrantWeightages && typeof quadrantWeightages === 'object') {
      const quadrantEntries = Object.entries(quadrantWeightages).map(([quadrantId, weightage]) => ({
        intervention_id: intervention.id,
        quadrant_id: quadrantId,
        weightage: weightage,
        components: [] // Will be populated later when tasks are created
      }));

      if (quadrantEntries.length > 0) {
        await query(
          supabase
            .from('intervention_quadrants')
            .insert(quadrantEntries)
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Intervention created successfully',
      data: intervention,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create intervention',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all interventions with filtering and pagination
const getAllInterventions = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      termId
    } = req.query;

    let query_builder = supabase
      .from('interventions')
      .select(`
        *,
        created_by_user:users!interventions_created_by_fkey(username, email),
        terms:term_id(id, name),
        intervention_quadrants(
          quadrant_id,
          weightage,
          quadrants(name)
        ),
        intervention_enrollments(
          id,
          student_id,
          enrollment_date,
          enrollment_status,
          enrollment_type,
          current_score,
          completion_percentage,
          students(name, registration_no)
        ),
        intervention_microcompetencies(count),
        teacher_microcompetency_assignments(count)
      `);

    // Apply filters
    if (status) {
      query_builder = query_builder.eq('status', status);
    }

    if (search) {
      query_builder = query_builder.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by term if specified
    if (termId) {
      query_builder = query_builder.eq('term_id', termId);
    }

    // Apply sorting
    query_builder = query_builder.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query_builder = query_builder.range(offset, offset + limit - 1);

    const result = await query(query_builder);

    // Get total count for pagination
    const countResult = await query(
      supabase
        .from('interventions')
        .select('*', { count: 'exact', head: true })
    );

    // Transform interventions to include enrollment count and full enrollment data
    const transformedInterventions = (result.rows || []).map(intervention => ({
      ...intervention,
      enrolled_count: intervention.intervention_enrollments?.length || 0,
      teacher_count: intervention.intervention_teachers?.length || 0,
      // Keep the full intervention_enrollments array for frontend compatibility
      intervention_enrollments: intervention.intervention_enrollments || []
    }));

    res.status(200).json({
      success: true,
      message: 'Interventions retrieved successfully',
      data: {
        interventions: transformedInterventions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.count || 0,
          totalPages: Math.ceil((countResult.count || 0) / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve interventions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get intervention details by ID
const getInterventionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      supabase
        .from('interventions')
        .select(`
          *,
          created_by_user:users!interventions_created_by_fkey(username, email),
          intervention_quadrants(
            id,
            quadrant_id,
            weightage,
            components,
            quadrants(name, description)
          ),
          intervention_teachers(
            id,
            teacher_id,
            assigned_quadrants,
            role,
            permissions,
            assigned_at,
            is_active,
            teachers(name, employee_id)
          ),
          intervention_enrollments(
            id,
            student_id,
            enrollment_date,
            enrollment_status,
            enrollment_type,
            current_score,
            completion_percentage,
            students(name, registration_no)
          )
        `)
        .eq('id', id)
        .single()
    );

    if (!result.rows || (Array.isArray(result.rows) && result.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get additional counts separately to avoid SQL aggregate errors
    const [teacherCountResult, microcompetencyCountResult, assignmentCountResult] = await Promise.all([
      query(
        supabase
          .from('intervention_teachers')
          .select('id', { count: 'exact' })
          .eq('intervention_id', id)
          .eq('is_active', true)
      ),
      query(
        supabase
          .from('intervention_microcompetencies')
          .select('id', { count: 'exact' })
          .eq('intervention_id', id)
          .eq('is_active', true)
      ),
      query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('id', { count: 'exact' })
          .eq('intervention_id', id)
          .eq('is_active', true)
      )
    ]);

    // Add count data to response
    const interventionData = Array.isArray(result.rows) ? result.rows[0] : result.rows;
    interventionData.teacher_count = teacherCountResult.count || 0;
    interventionData.microcompetency_count = microcompetencyCountResult.count || 0;
    interventionData.assignment_count = assignmentCountResult.count || 0;

    res.status(200).json({
      success: true,
      message: 'Intervention details retrieved successfully',
      data: interventionData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching intervention details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve intervention details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update intervention
const updateIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      quadrantWeightages,
      prerequisites,
      maxStudents,
      objectives,
      // Scoring and settings fields
      scoring_deadline,
      is_scoring_open,
      late_submission_allowed,
      late_penalty_percentage,
      auto_grade_enabled,
      notification_settings,
      access_settings,
      assessment_rules
    } = req.body;

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (quadrantWeightages !== undefined) updateData.quadrant_weightages = quadrantWeightages;
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites;
    if (maxStudents !== undefined) updateData.max_students = maxStudents;
    if (objectives !== undefined) updateData.objectives = objectives;

    // Add scoring and settings fields (only those that exist in the database)
    if (scoring_deadline !== undefined) updateData.scoring_deadline = scoring_deadline;
    if (is_scoring_open !== undefined) updateData.is_scoring_open = is_scoring_open;

    // Note: The following fields don't exist in the database yet:
    // late_submission_allowed, late_penalty_percentage, auto_grade_enabled,
    // notification_settings, access_settings, assessment_rules
    // These would need to be added to the database schema if needed

    // Validate dates if both are provided
    if (updateData.start_date && updateData.end_date) {
      if (new Date(updateData.end_date) <= new Date(updateData.start_date)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
          timestamp: new Date().toISOString()
        });
      }
    }

    const result = await query(
      supabase
        .from('interventions')
        .update(updateData)
        .eq('id', id)
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update quadrant weightages if provided
    if (quadrantWeightages) {
      // Delete existing quadrant entries
      await query(
        supabase
          .from('intervention_quadrants')
          .delete()
          .eq('intervention_id', id)
      );

      // Insert new quadrant entries
      const quadrantEntries = Object.entries(quadrantWeightages).map(([quadrantId, weightage]) => ({
        intervention_id: id,
        quadrant_id: quadrantId,
        weightage: weightage,
        components: []
      }));

      if (quadrantEntries.length > 0) {
        await query(
          supabase
            .from('intervention_quadrants')
            .insert(quadrantEntries)
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Intervention updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update intervention',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Assign teachers to intervention
const assignTeachers = async (req, res) => {
  try {
    const { id } = req.params;
    const { teachers } = req.body;

    // Validate input
    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teachers array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists and get its quadrants
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select(`
          id, 
          name,
          intervention_quadrants(
            quadrant_id,
            quadrants(id, name)
          )
        `)
        .eq('id', id)
        .single()
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows;
    const validQuadrantIds = intervention.intervention_quadrants?.map(iq => iq.quadrant_id) || [];

    // Validate teachers exist and have proper quadrant assignments
    const teacherIds = teachers.map(t => t.teacherId);
    const teachersValidationResult = await query(
      supabase
        .from('teachers')
        .select('id, name, specialization, status')
        .in('id', teacherIds)
    );

    const validTeachers = teachersValidationResult.rows || [];
    const validTeacherIds = new Set(validTeachers.map(t => t.id));

    // Check for invalid teacher IDs
    const invalidTeacherIds = teacherIds.filter(id => !validTeacherIds.has(id));
    if (invalidTeacherIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid teacher IDs: ${invalidTeacherIds.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for inactive teachers
    const inactiveTeachers = validTeachers.filter(t => t.status !== 'Active');
    if (inactiveTeachers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign inactive teachers: ${inactiveTeachers.map(t => t.name).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate quadrant assignments
    for (const teacher of teachers) {
      if (teacher.assignedQuadrants && teacher.assignedQuadrants.length > 0) {
        const invalidQuadrants = teacher.assignedQuadrants.filter(qId => !validQuadrantIds.includes(qId));
        if (invalidQuadrants.length > 0) {
          const teacherName = validTeachers.find(t => t.id === teacher.teacherId)?.name || teacher.teacherId;
          return res.status(400).json({
            success: false,
            message: `Teacher ${teacherName} cannot be assigned to invalid quadrants: ${invalidQuadrants.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Prepare teacher assignments
    const teacherAssignments = teachers.map(teacher => ({
      intervention_id: id,
      teacher_id: teacher.teacherId,
      assigned_quadrants: teacher.assignedQuadrants || [],
      role: teacher.role || 'Assistant',
      permissions: teacher.permissions || [],
      assigned_by: req.user.userId,
      is_active: true
    }));

    // Remove existing assignments for this intervention
    await query(
      supabase
        .from('intervention_teachers')
        .delete()
        .eq('intervention_id', id)
    );

    // Insert new assignments
    const result = await query(
      supabase
        .from('intervention_teachers')
        .insert(teacherAssignments)
        .select(`
          *,
          teachers(name, employee_id)
        `)
    );

    res.status(200).json({
      success: true,
      message: 'Teachers assigned successfully',
      data: {
        intervention_id: id,
        assigned_teachers: result.rows || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error assigning teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teachers',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Enroll students in intervention
const enrollStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { students, enrollmentType = 'Optional' } = req.body;

    // Validate input
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Students array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists and get max students
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, max_students, status')
        .eq('id', id)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows[0];

    // Check if intervention is in valid status for enrollment
    if (intervention.status === 'Completed' || intervention.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll students in completed or archived intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Get current enrollment count
    const currentEnrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id', { count: 'exact' })
        .eq('intervention_id', id)
        .eq('enrollment_status', 'Enrolled')
    );

    const currentCount = currentEnrollmentResult.count || 0;

    // Check capacity
    if (currentCount + students.length > intervention.max_students) {
      return res.status(400).json({
        success: false,
        message: `Enrollment would exceed maximum capacity. Current: ${currentCount}, Max: ${intervention.max_students}`,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare student enrollments
    const studentEnrollments = students.map(studentId => ({
      intervention_id: id,
      student_id: studentId,
      enrollment_date: new Date().toISOString().split('T')[0],
      enrollment_status: 'Enrolled',
      enrollment_type: enrollmentType,
      progress_data: {},
      current_score: 0.00,
      completion_percentage: 0.00,
      enrolled_by: req.user.userId
    }));

    // Insert enrollments (ignore conflicts for already enrolled students)
    const result = await query(
      supabase
        .from('intervention_enrollments')
        .upsert(studentEnrollments, {
          onConflict: 'intervention_id,student_id',
          ignoreDuplicates: false
        })
        .select(`
          *,
          students(name, registration_no)
        `)
    );

    res.status(200).json({
      success: true,
      message: 'Students enrolled successfully',
      data: {
        intervention_id: id,
        enrolled_students: result.rows || [],
        total_enrolled: (currentCount + (result.rows?.length || 0))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enrolling students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll students',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Enroll students by batch
const enrollStudentsByBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batch_ids = [],
      section_ids = [],
      course_filters = [],
      enrollmentType = 'Optional'
    } = req.body;

    // Validate input
    if (!batch_ids || !Array.isArray(batch_ids) || batch_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'batch_ids array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, max_students, status')
        .eq('id', id)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows[0];

    // Check intervention status
    if (intervention.status === 'Completed' || intervention.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll students in completed or archived intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Build query to get students from specified batches
    let studentsQuery = supabase
      .from('students')
      .select('id, name, registration_no, course, batch_id, section_id')
      .in('batch_id', batch_ids)
      .eq('status', 'Active');

    // Apply section filter if provided
    if (section_ids.length > 0) {
      studentsQuery = studentsQuery.in('section_id', section_ids);
    }

    // Apply course filter if provided
    if (course_filters.length > 0) {
      studentsQuery = studentsQuery.in('course', course_filters);
    }

    // Get students
    const studentsResult = await query(studentsQuery);
    const students = studentsResult.rows || [];

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students found matching the specified criteria',
        timestamp: new Date().toISOString()
      });
    }

    // Get current enrollment count
    const currentEnrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id', { count: 'exact' })
        .eq('intervention_id', id)
        .eq('enrollment_status', 'Enrolled')
    );

    const currentCount = currentEnrollmentResult.count || 0;

    // Check capacity
    if (currentCount + students.length > intervention.max_students) {
      return res.status(400).json({
        success: false,
        message: `Enrollment would exceed maximum capacity. Current: ${currentCount}, Students to enroll: ${students.length}, Max: ${intervention.max_students}`,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare student enrollments
    const studentEnrollments = students.map(student => ({
      intervention_id: id,
      student_id: student.id,
      enrollment_date: new Date().toISOString().split('T')[0],
      enrollment_status: 'Enrolled',
      enrollment_type: enrollmentType,
      progress_data: {},
      current_score: 0.00,
      completion_percentage: 0.00,
      enrolled_by: req.user.userId
    }));

    // Insert enrollments (ignore conflicts for already enrolled students)
    const result = await query(
      supabase
        .from('intervention_enrollments')
        .upsert(studentEnrollments, {
          onConflict: 'intervention_id,student_id',
          ignoreDuplicates: true
        })
        .select(`
          *,
          students(name, registration_no, course)
        `)
    );

    res.status(200).json({
      success: true,
      message: `${result.rows?.length || 0} students enrolled successfully from ${batch_ids.length} batch(es)`,
      data: {
        intervention_id: id,
        enrolled_students: result.rows || [],
        total_enrolled: (currentCount + (result.rows?.length || 0)),
        criteria: {
          batch_ids,
          section_ids,
          course_filters,
          enrollmentType
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enrolling students by batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll students by batch',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Enroll students by criteria
const enrollStudentsByCriteria = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      criteria = {},
      enrollmentType = 'Optional'
    } = req.body;

    const {
      batch_years = [],
      courses = [],
      sections = [],
      houses = []
    } = criteria;

    // Validate input - at least one criteria must be provided
    if (batch_years.length === 0 && courses.length === 0 && sections.length === 0 && houses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one criteria must be provided (batch_years, courses, sections, or houses)',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, max_students, status')
        .eq('id', id)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows[0];

    // Check intervention status
    if (intervention.status === 'Completed' || intervention.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll students in completed or archived intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Build complex query to get students matching criteria
    let studentsQuery = supabase
      .from('students')
      .select(`
        id,
        name,
        registration_no,
        course,
        batch_id,
        section_id,
        house_id,
        batches:batch_id(name, year),
        sections:section_id(name),
        houses:house_id(name)
      `)
      .eq('status', 'Active');

    // Apply batch year filter
    if (batch_years.length > 0) {
      studentsQuery = studentsQuery.in('batches.year', batch_years);
    }

    // Apply course filter
    if (courses.length > 0) {
      studentsQuery = studentsQuery.in('course', courses);
    }

    // Apply section filter
    if (sections.length > 0) {
      studentsQuery = studentsQuery.in('section_id', sections);
    }

    // Apply house filter
    if (houses.length > 0) {
      studentsQuery = studentsQuery.in('house_id', houses);
    }

    // Get students
    const studentsResult = await query(studentsQuery);
    const students = studentsResult.rows || [];

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students found matching the specified criteria',
        timestamp: new Date().toISOString()
      });
    }

    // Get current enrollment count
    const currentEnrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id', { count: 'exact' })
        .eq('intervention_id', id)
        .eq('enrollment_status', 'Enrolled')
    );

    const currentCount = currentEnrollmentResult.count || 0;

    // Check capacity
    if (currentCount + students.length > intervention.max_students) {
      return res.status(400).json({
        success: false,
        message: `Enrollment would exceed maximum capacity. Current: ${currentCount}, Students to enroll: ${students.length}, Max: ${intervention.max_students}`,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare student enrollments
    const studentEnrollments = students.map(student => ({
      intervention_id: id,
      student_id: student.id,
      enrollment_date: new Date().toISOString().split('T')[0],
      enrollment_status: 'Enrolled',
      enrollment_type: enrollmentType,
      progress_data: {},
      current_score: 0.00,
      completion_percentage: 0.00,
      enrolled_by: req.user.userId
    }));

    // Insert enrollments (ignore conflicts for already enrolled students)
    const result = await query(
      supabase
        .from('intervention_enrollments')
        .upsert(studentEnrollments, {
          onConflict: 'intervention_id,student_id',
          ignoreDuplicates: true
        })
        .select(`
          *,
          students(name, registration_no, course)
        `)
    );

    res.status(200).json({
      success: true,
      message: `${result.rows?.length || 0} students enrolled successfully based on criteria`,
      data: {
        intervention_id: id,
        enrolled_students: result.rows || [],
        total_enrolled: (currentCount + (result.rows?.length || 0)),
        criteria: {
          batch_years,
          courses,
          sections,
          houses,
          enrollmentType
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enrolling students by criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll students by criteria',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get intervention analytics
const getInterventionAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify intervention exists
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, status, start_date, end_date, max_students')
        .eq('id', id)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows[0];

    // Get enrollment statistics
    const enrollmentStats = await query(
      supabase
        .from('intervention_enrollments')
        .select('enrollment_status, current_score, completion_percentage')
        .eq('intervention_id', id)
    );

    // Get task statistics
    const taskStats = await query(
      supabase
        .from('tasks')
        .select('status, quadrant_id')
        .eq('intervention_id', id)
    );

    // Get submission statistics
    const submissionStats = await query(
      supabase
        .from('task_submissions')
        .select(`
          status,
          score,
          is_late,
          tasks!inner(intervention_id)
        `)
        .eq('tasks.intervention_id', id)
    );

    // Calculate analytics
    const enrollments = enrollmentStats.rows || [];
    const tasks = taskStats.rows || [];
    const submissions = submissionStats.rows || [];

    const analytics = {
      intervention: {
        id: intervention.id,
        name: intervention.name,
        status: intervention.status,
        duration_days: Math.ceil((new Date(intervention.end_date) - new Date(intervention.start_date)) / (1000 * 60 * 60 * 24))
      },
      enrollment: {
        total_enrolled: enrollments.length,
        max_capacity: intervention.max_students,
        capacity_utilization: ((enrollments.length / intervention.max_students) * 100).toFixed(2),
        by_status: enrollments.reduce((acc, enrollment) => {
          acc[enrollment.enrollment_status] = (acc[enrollment.enrollment_status] || 0) + 1;
          return acc;
        }, {}),
        average_completion: enrollments.length > 0
          ? (enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length).toFixed(2)
          : 0,
        average_score: enrollments.length > 0
          ? (enrollments.reduce((sum, e) => sum + (e.current_score || 0), 0) / enrollments.length).toFixed(2)
          : 0
      },
      tasks: {
        total_tasks: tasks.length,
        by_status: tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {}),
        by_quadrant: tasks.reduce((acc, task) => {
          acc[task.quadrant_id] = (acc[task.quadrant_id] || 0) + 1;
          return acc;
        }, {})
      },
      submissions: {
        total_submissions: submissions.length,
        by_status: submissions.reduce((acc, submission) => {
          acc[submission.status] = (acc[submission.status] || 0) + 1;
          return acc;
        }, {}),
        late_submissions: submissions.filter(s => s.is_late).length,
        average_score: submissions.filter(s => s.score !== null).length > 0
          ? (submissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / submissions.filter(s => s.score !== null).length).toFixed(2)
          : 0
      }
    };

    res.status(200).json({
      success: true,
      message: 'Intervention analytics retrieved successfully',
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching intervention analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve intervention analytics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update intervention status
const updateInterventionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Draft', 'Active', 'Completed', 'Archived', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Update intervention status
    const result = await query(
      supabase
        .from('interventions')
        .update({ status })
        .eq('id', id)
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // If status is being set to 'Completed', update enrollment statuses
    if (status === 'Completed') {
      await query(
        supabase
          .from('intervention_enrollments')
          .update({ enrollment_status: 'Completed' })
          .eq('intervention_id', id)
          .eq('enrollment_status', 'Enrolled')
      );
    }

    res.status(200).json({
      success: true,
      message: 'Intervention status updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating intervention status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update intervention status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete intervention
const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', id)
        .single()
    );

    if (!interventionCheck.rows || (Array.isArray(interventionCheck.rows) && interventionCheck.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = Array.isArray(interventionCheck.rows) ? interventionCheck.rows[0] : interventionCheck.rows;

    // Check if intervention can be deleted
    // Admin users can delete interventions in any status except 'Active' (for safety)
    // Non-admin users can only delete Draft interventions
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin && intervention.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only interventions in Draft status can be deleted',
        timestamp: new Date().toISOString()
      });
    }

    if (isAdmin && intervention.status === 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Active interventions. Please change status to Archived or Cancelled first.',
        timestamp: new Date().toISOString()
      });
    }

    // Delete intervention (cascade will handle related records)
    const result = await query(
      supabase
        .from('interventions')
        .delete()
        .eq('id', id)
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Intervention deleted successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting intervention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete intervention',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create microcompetency-centric task (Teachers only)
const createTask = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const {
      name,
      description,
      microcompetencies, // Array of {microcompetencyId, weightage}
      maxScore = 10,
      dueDate,
      instructions,
      rubric = [],
      submissionType = 'Document',
      requiresSubmission: providedRequiresSubmission = true,
      allowLateSubmission = true,
      latePenalty = 0
    } = req.body;

    // Validate required fields
    if (!name || !microcompetencies || !Array.isArray(microcompetencies) || microcompetencies.length === 0 || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, microcompetencies (array), dueDate',
        timestamp: new Date().toISOString()
      });
    }

    // Set requires_submission based on submission type
    const requiresSubmission = submissionType === 'Direct_Assessment' ? false : providedRequiresSubmission;

    // Validate microcompetencies array
    for (const mc of microcompetencies) {
      if (!mc.microcompetencyId || !mc.weightage || mc.weightage <= 0 || mc.weightage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Each microcompetency must have microcompetencyId and weightage (1-100)',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Validate total weightage equals 100
    const totalWeightage = microcompetencies.reduce((sum, mc) => sum + mc.weightage, 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Total weightage must equal 100%. Current total: ${totalWeightage}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Verify teacher is assigned to all specified microcompetencies
    const teacherId = req.user.userId; // Assuming this is the teacher's user ID

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to all microcompetencies
    const microcompetencyIds = microcompetencies.map(mc => mc.microcompetencyId);
    const assignmentCheck = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('microcompetency_id, can_create_tasks')
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .in('microcompetency_id', microcompetencyIds)
        .eq('is_active', true)
    );

    // Check if teacher is assigned to all microcompetencies and has task creation permission
    const assignedMicrocompetencies = assignmentCheck.rows.map(row => row.microcompetency_id);
    const missingAssignments = microcompetencyIds.filter(id => !assignedMicrocompetencies.includes(id));

    if (missingAssignments.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Teacher not assigned to microcompetencies: ${missingAssignments.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if teacher has task creation permission for all microcompetencies
    const cannotCreateTasks = assignmentCheck.rows.filter(row => !row.can_create_tasks);
    if (cannotCreateTasks.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher does not have task creation permission for some microcompetencies',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists and is active
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Verify all microcompetencies exist and belong to this intervention
    console.log('🔍 Checking microcompetencies for intervention:', interventionId);
    console.log('🔍 Microcompetency IDs to check:', microcompetencyIds);

    const microcompetencyCheck = await query(
      supabase
        .from('intervention_microcompetencies')
        .select(`
          microcompetency_id,
          microcompetencies:microcompetency_id(
            id,
            name,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                quadrants:quadrant_id(id, name)
              )
            )
          )
        `)
        .eq('intervention_id', interventionId)
        .in('microcompetency_id', microcompetencyIds)
        .eq('is_active', true)
    );

    if (microcompetencyCheck.rows.length !== microcompetencyIds.length) {
      const foundMicrocompetencyIds = microcompetencyCheck.rows.map(row => row.microcompetency_id);
      const missingMicrocompetencyIds = microcompetencyIds.filter(id => !foundMicrocompetencyIds.includes(id));
      return res.status(400).json({
        success: false,
        message: `Some microcompetencies not found or not part of this intervention: ${missingMicrocompetencyIds.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Create task
    const taskResult = await query(
      supabase
        .from('tasks')
        .insert({
          intervention_id: interventionId,
          name,
          description,
          max_score: maxScore,
          due_date: dueDate,
          instructions,
          rubric,
          submission_type: submissionType,
          requires_submission: requiresSubmission,
          allow_late_submission: allowLateSubmission,
          late_penalty: latePenalty,
          status: 'Active',
          created_by: teacherId, // This is the user ID from req.user.userId
          created_by_teacher_id: teacher.id // This is the teacher ID
        })
        .select('*')
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      throw new Error('Failed to create task');
    }

    const task = taskResult.rows[0];

    // Create task-microcompetency mappings with weightages
    const taskMicrocompetencyMappings = microcompetencies.map(mc => ({
      task_id: task.id,
      microcompetency_id: mc.microcompetencyId,
      weightage: mc.weightage
    }));

    const mappingResult = await query(
      supabase
        .from('task_microcompetencies')
        .insert(taskMicrocompetencyMappings)
        .select(`
          *,
          microcompetencies:microcompetency_id(
            id,
            name,
            components:component_id(
              name,
              sub_categories:sub_category_id(
                quadrants:quadrant_id(name)
              )
            )
          )
        `)
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully with microcompetency mappings',
      data: {
        task: task,
        microcompetencies: mappingResult.rows,
        totalMicrocompetencies: mappingResult.rows.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update task (Admin or Task Creator)
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      name,
      description,
      maxScore,
      dueDate,
      instructions,
      status,
      submissionType,
      allowLateSubmission,
      latePenalty
    } = req.body;
    const currentUserId = req.user.userId;

    // Get task details to verify permissions
    const taskResult = await query(
      supabase
        .from('tasks')
        .select(`
          id,
          name,
          created_by_teacher_id,
          intervention_id,
          teachers:created_by_teacher_id(user_id)
        `)
        .eq('id', taskId)
        .limit(1)
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }

    const task = taskResult.rows[0];

    // Check permissions (admin or task creator)
    const isAdmin = req.user.role === 'admin';
    const isTaskCreator = task.teachers?.user_id === currentUserId;

    if (!isAdmin && !isTaskCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task',
        timestamp: new Date().toISOString()
      });
    }

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (maxScore !== undefined) updateData.max_score = maxScore;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (status !== undefined) updateData.status = status;
    if (submissionType !== undefined) updateData.submission_type = submissionType;
    if (allowLateSubmission !== undefined) updateData.allow_late_submission = allowLateSubmission;
    if (latePenalty !== undefined) updateData.late_penalty = latePenalty;

    updateData.updated_at = new Date().toISOString();

    // Update task
    const updateResult = await query(
      supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select(`
          *,
          interventions:intervention_id(name),
          task_microcompetencies(
            microcompetency_id,
            weightage,
            microcompetencies:microcompetency_id(name)
          )
        `)
    );

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updateResult.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete task (Admin or Task Creator)
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const currentUserId = req.user.userId;

    // Get task details to verify permissions
    const taskResult = await query(
      supabase
        .from('tasks')
        .select(`
          id,
          name,
          created_by_teacher_id,
          intervention_id,
          teachers:created_by_teacher_id(user_id)
        `)
        .eq('id', taskId)
        .limit(1)
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }

    const task = taskResult.rows[0];

    // Check permissions (admin or task creator)
    const isAdmin = req.user.role === 'admin';
    const isTaskCreator = task.teachers?.user_id === currentUserId;

    if (!isAdmin && !isTaskCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task',
        timestamp: new Date().toISOString()
      });
    }

    // Check if task has submissions
    const submissionsResult = await query(
      supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', taskId)
        .limit(1)
    );

    if (submissionsResult.rows && submissionsResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete task with existing submissions. Archive it instead.',
        timestamp: new Date().toISOString()
      });
    }

    // Delete task (this will cascade to task_microcompetencies due to foreign key)
    await query(
      supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
    );

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: { taskId, taskName: task.name },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// TEACHER INTERVENTION ENDPOINTS
// ==========================================

// Get teacher's assigned microcompetencies for task creation
const getTeacherMicrocompetencies = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const teacherId = req.user.userId;

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Get teacher's assigned microcompetencies for this intervention
    const assignmentsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          can_score,
          can_create_tasks,
          assigned_at,
          microcompetencies:microcompetency_id(
            id,
            name,
            max_score,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
        .eq('can_create_tasks', true)
    );

    const microcompetencies = assignmentsResult.rows.map(assignment => ({
      id: assignment.microcompetencies.id,
      name: assignment.microcompetencies.name,
      maxScore: assignment.microcompetencies.max_score,
      component: assignment.microcompetencies.components?.name,
      subCategory: assignment.microcompetencies.components?.sub_categories?.name,
      quadrant: assignment.microcompetencies.components?.sub_categories?.quadrants?.name,
      canScore: assignment.can_score,
      canCreateTasks: assignment.can_create_tasks,
      assignedAt: assignment.assigned_at
    }));

    res.status(200).json({
      success: true,
      message: 'Teacher microcompetencies retrieved successfully',
      data: {
        interventionId,
        teacherId: teacher.id,
        microcompetencies,
        totalCount: microcompetencies.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching teacher microcompetencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher microcompetencies',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get student's available tasks
const getStudentTasks = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { status } = req.query;
    const currentUserId = req.user.userId;

    // Get student record
    const studentResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Check if student is enrolled in this intervention
    const enrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id')
        .eq('student_id', student.id)
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
        .limit(1)
    );

    if (!enrollmentResult.rows || enrollmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not enrolled in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Get tasks for this intervention
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        max_score,
        due_date,
        instructions,
        submission_type,
        allow_late_submission,
        late_penalty,
        status,
        created_at,
        interventions:intervention_id(name),
        task_microcompetencies(
          microcompetency_id,
          weightage,
          microcompetencies:microcompetency_id(
            id,
            name,
            max_score,
            components:component_id(
              id,
              name,
              max_score,
              weightage,
              sub_categories:sub_category_id(
                id,
                name,
                weightage,
                quadrants:quadrant_id(
                  id,
                  name,
                  weightage
                )
              )
            )
          )
        )
      `)
      .eq('intervention_id', interventionId)
      .eq('status', 'Active')
      .order('due_date', { ascending: true });

    const tasksResult = await query(tasksQuery);

    // Get student's submissions for these tasks
    const taskIds = tasksResult.rows.map(task => task.id);
    let submissions = {};

    if (taskIds.length > 0) {
      const submissionsResult = await query(
        supabase
          .from('task_submissions')
          .select('task_id, id, status, score, submitted_at, feedback')
          .eq('student_id', student.id)
          .in('task_id', taskIds)
      );

      submissionsResult.rows.forEach(submission => {
        submissions[submission.task_id] = submission;
      });
    }

    // Calculate intervention progress  
    const totalTasks = tasksResult.rows.length;
    const completedTasks = Object.values(submissions).filter(s => s.status === 'Graded' || s.status === 'Submitted').length;
    const averageScore = Object.values(submissions).reduce((sum, s) => sum + (s.score || 0), 0) / Object.values(submissions).length || 0;
    const interventionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const interventionProgress = {
      totalTasks,
      completedTasks,
      averageScore: Math.round(averageScore * 100) / 100,
      interventionPercentage: Math.round(interventionPercentage)
    };

    // Transform tasks data with submission status
    const transformedTasks = tasksResult.rows.map(task => {
      const submission = submissions[task.id];
      const isOverdue = new Date() > new Date(task.due_date);

      return {
        id: task.id,
        name: task.name,
        description: task.description,
        maxScore: task.max_score,
        dueDate: task.due_date,
        instructions: task.instructions,
        submissionType: task.submission_type,
        allowLateSubmission: task.allow_late_submission,
        latePenalty: task.late_penalty,
        status: task.status,
        createdAt: task.created_at,
        interventionName: task.interventions?.name,
        interventionProgress,
        microcompetencies: task.task_microcompetencies.map(tm => ({
          id: tm.microcompetencies.id,
          name: tm.microcompetencies.name,
          weightage: tm.weightage,
          component: {
            id: tm.microcompetencies.components?.id || '',
            name: tm.microcompetencies.components?.name || 'Unknown Component',
            max_score: tm.microcompetencies.components?.max_score || 100,
            weightage: tm.microcompetencies.components?.weightage || 25,
            sub_category: {
              name: tm.microcompetencies.components?.sub_categories?.name || 'Unknown Sub-category',
              weightage: tm.microcompetencies.components?.sub_categories?.weightage || 25,
              quadrant: {
                name: tm.microcompetencies.components?.sub_categories?.quadrants?.name || 'Unknown Quadrant',
                weightage: tm.microcompetencies.components?.sub_categories?.quadrants?.weightage || 25,
                color: tm.microcompetencies.components?.sub_categories?.quadrants?.id === 'persona' ? '#3B82F6' :
                       tm.microcompetencies.components?.sub_categories?.quadrants?.id === 'wellness' ? '#10B981' :
                       tm.microcompetencies.components?.sub_categories?.quadrants?.id === 'behavior' ? '#F59E0B' :
                       tm.microcompetencies.components?.sub_categories?.quadrants?.id === 'discipline' ? '#EF4444' : '#6B7280'
              }
            }
          }
        })),
        submission: submission ? {
          id: submission.id,
          status: submission.status,
          score: submission.score,
          submittedAt: submission.submitted_at,
          feedback: submission.feedback,
          isLate: submission.submitted_at && new Date(submission.submitted_at) > new Date(task.due_date)
        } : null,
        canSubmit: !submission || (submission.status === 'Draft'),
        isOverdue
      };
    });

    res.status(200).json({
      success: true,
      message: 'Student tasks retrieved successfully',
      data: {
        tasks: transformedTasks,
        totalCount: transformedTasks.length,
        summary: {
          totalTasks: transformedTasks.length,
          submittedTasks: transformedTasks.filter(t => t.submission?.status === 'Submitted' || t.submission?.status === 'Graded').length,
          draftTasks: transformedTasks.filter(t => t.submission?.status === 'Draft').length,
          pendingTasks: transformedTasks.filter(t => !t.submission).length,
          overdueTasks: transformedTasks.filter(t => t.isOverdue && !t.submission).length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student tasks',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Submit task (Student)
const submitTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submissionText, attachments = [] } = req.body;
    const currentUserId = req.user.userId;

    // Get student record
    const studentResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Get task details
    const taskResult = await query(
      supabase
        .from('tasks')
        .select(`
          id,
          name,
          intervention_id,
          due_date,
          allow_late_submission,
          status
        `)
        .eq('id', taskId)
        .limit(1)
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }

    const task = taskResult.rows[0];

    if (task.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Task is not active for submissions',
        timestamp: new Date().toISOString()
      });
    }

    // Check if student is enrolled in the intervention
    const enrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id')
        .eq('student_id', student.id)
        .eq('intervention_id', task.intervention_id)
        .eq('enrollment_status', 'Enrolled')
        .limit(1)
    );

    if (!enrollmentResult.rows || enrollmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not enrolled in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Check if submission already exists
    const existingSubmissionResult = await query(
      supabase
        .from('task_submissions')
        .select('id, status')
        .eq('student_id', student.id)
        .eq('task_id', taskId)
        .limit(1)
    );

    const now = new Date();
    const dueDate = new Date(task.due_date);
    const isLate = now > dueDate;

    if (!task.allow_late_submission && isLate) {
      return res.status(400).json({
        success: false,
        message: 'Late submissions are not allowed for this task',
        timestamp: new Date().toISOString()
      });
    }

    if (existingSubmissionResult.rows && existingSubmissionResult.rows.length > 0) {
      const existingSubmission = existingSubmissionResult.rows[0];

      if (existingSubmission.status === 'Submitted' || existingSubmission.status === 'Graded') {
        return res.status(400).json({
          success: false,
          message: 'Task has already been submitted',
          timestamp: new Date().toISOString()
        });
      }

      // Update existing draft submission
      const updateResult = await query(
        supabase
          .from('task_submissions')
          .update({
            submission_text: submissionText,
            attachments,
            status: 'Submitted',
            submitted_at: now.toISOString(),
            is_late: isLate
          })
          .eq('id', existingSubmission.id)
          .select(`
            *,
            tasks!inner(name, max_score),
            students!inner(name, registration_no)
          `)
      );

      res.status(200).json({
        success: true,
        message: 'Task submission updated successfully',
        data: updateResult.rows[0],
        timestamp: new Date().toISOString()
      });

      // Trigger automatic score recalculation for the student
      try {
        console.log(`🔄 Triggering score recalculation for student ${student.id} in intervention ${task.intervention_id}`);
        
        // Import the score calculation service dynamically to avoid circular dependencies
        const scoreCalculationService = require('../services/scoreCalculationService');
        
        // Perform score recalculation synchronously to maintain data consistency
        await scoreCalculationService.recalculateStudentScores(student.id, task.intervention_id);
        console.log(`✅ Score recalculation completed for student ${student.id}`);
      } catch (scoreCalcError) {
        console.error('⚠️ Score recalculation failed:', scoreCalcError);
        // Don't fail the submission if score calculation has issues
      }
    } else {
      // Create new submission
      const submissionResult = await query(
        supabase
          .from('task_submissions')
          .insert({
            student_id: student.id,
            task_id: taskId,
            submission_text: submissionText,
            attachments,
            status: 'Submitted',
            submitted_at: now.toISOString(),
            is_late: isLate
          })
          .select(`
            *,
            tasks!inner(name, max_score),
            students!inner(name, registration_no)
          `)
      );

      res.status(201).json({
        success: true,
        message: 'Task submitted successfully',
        data: submissionResult.rows[0],
        timestamp: new Date().toISOString()
      });
    }

    // Trigger automatic score recalculation for the student
    try {
      console.log(`🔄 Triggering score recalculation for student ${student.id} in intervention ${task.intervention_id}`);
      
      // Import the score calculation service dynamically to avoid circular dependencies
      const scoreCalculationService = require('../services/scoreCalculationService');
      
      // Perform score recalculation synchronously to maintain data consistency
      await scoreCalculationService.recalculateStudentScores(student.id, task.intervention_id);
      console.log(`✅ Score recalculation completed for student ${student.id}`);
    } catch (scoreCalcError) {
      console.error('⚠️ Score recalculation failed:', scoreCalcError);
      // Don't fail the submission if score calculation has issues
    }

  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit task',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Save task draft (Student)
const saveTaskDraft = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submissionText, attachments = [] } = req.body;
    const currentUserId = req.user.userId;

    // Get student record
    const studentResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Check if draft already exists
    const existingDraftResult = await query(
      supabase
        .from('task_submissions')
        .select('id')
        .eq('student_id', student.id)
        .eq('task_id', taskId)
        .limit(1)
    );

    if (existingDraftResult.rows && existingDraftResult.rows.length > 0) {
      // Update existing draft
      const updateResult = await query(
        supabase
          .from('task_submissions')
          .update({
            submission_text: submissionText,
            attachments,
            status: 'Draft'
          })
          .eq('id', existingDraftResult.rows[0].id)
          .select('*')
      );

      res.status(200).json({
        success: true,
        message: 'Draft saved successfully',
        data: updateResult.rows[0],
        timestamp: new Date().toISOString()
      });
    } else {
      // Create new draft
      const draftResult = await query(
        supabase
          .from('task_submissions')
          .insert({
            student_id: student.id,
            task_id: taskId,
            submission_text: submissionText,
            attachments,
            status: 'Draft'
          })
          .select('*')
      );

      res.status(201).json({
        success: true,
        message: 'Draft created successfully',
        data: draftResult.rows[0],
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error saving task draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get student's enrolled interventions
const getStudentInterventions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query; // Add term filtering support
    const currentUserId = req.user.userId;

    console.log('🎯 getStudentInterventions called with:', { studentId, termId });

    // Get student record and verify access
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, user_id, name, registration_no')
        .eq('id', studentId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Check if current user is the student or an admin/teacher
    const isOwnProfile = student.user_id === currentUserId;
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';

    if (!isOwnProfile && !isAdmin && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student\'s interventions',
        timestamp: new Date().toISOString()
      });
    }

    // Get current term if not specified
    let currentTermId = termId;
    if (!currentTermId) {
      const termResult = await query(
        supabase
          .from('terms')
          .select('id')
          .eq('is_current', true)
          .limit(1)
      );
      if (termResult.rows && termResult.rows.length > 0) {
        currentTermId = termResult.rows[0].id;
      }
    }

    console.log('📋 Using term ID for filtering:', currentTermId);

    // Build intervention query with term filtering
    let interventionQuery = supabase
      .from('intervention_enrollments')
      .select(`
        enrollment_status,
        enrollment_date,
        completion_percentage,
        current_score,
        interventions!inner(
          id,
          name,
          description,
          status,
          start_date,
          end_date,
          term_id,
          is_scoring_open,
          scoring_deadline,
          max_students,
          objectives
        )
      `)
      .eq('student_id', studentId)
      .in('enrollment_status', ['Enrolled', 'Completed']);

    // Apply term filtering if termId is provided
    if (currentTermId) {
      interventionQuery = interventionQuery.eq('interventions.term_id', currentTermId);
    }

    const enrollmentsResult = await query(
      interventionQuery.order('enrollment_date', { ascending: false })
    );

    // Transform data
    const interventions = enrollmentsResult.rows.map(enrollment => ({
      id: enrollment.interventions.id,
      name: enrollment.interventions.name,
      description: enrollment.interventions.description,
      status: enrollment.interventions.status,
      start_date: enrollment.interventions.start_date,
      end_date: enrollment.interventions.end_date,
      term_id: enrollment.interventions.term_id,
      is_scoring_open: enrollment.interventions.is_scoring_open,
      scoring_deadline: enrollment.interventions.scoring_deadline,
      max_students: enrollment.interventions.max_students,
      objectives: enrollment.interventions.objectives || [],
      enrollment_status: enrollment.enrollment_status,
      enrolled_at: enrollment.enrollment_date,
      completion_percentage: enrollment.completion_percentage || 0,
      current_score: enrollment.current_score || 0,
      enrolled_count: 0 // Will be populated separately if needed
    }));

    // Get term information for response
    let termInfo = null;
    if (currentTermId) {
      const termResult = await query(
        supabase
          .from('terms')
          .select('id, name, academic_year, is_current')
          .eq('id', currentTermId)
          .limit(1)
      );
      if (termResult.rows && termResult.rows.length > 0) {
        termInfo = termResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      message: 'Student interventions retrieved successfully',
      data: {
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no
        },
        interventions,
        totalCount: interventions.length,
        term: termInfo,
        filters: {
          termId: currentTermId
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching student interventions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student interventions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all tasks for admin management
const getAllTasks = async (req, res) => {
  try {
    const { status, interventionId, teacherId, termId } = req.query;

    // Build query for all tasks
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        max_score,
        due_date,
        instructions,
        submission_type,
        allow_late_submission,
        late_penalty,
        status,
        created_at,
        created_by_teacher_id,
        interventions:intervention_id(
          id,
          name,
          status,
          term_id,
          terms:term_id(id, name)
        ),
        teachers:created_by_teacher_id(
          id,
          name,
          employee_id
        ),
        task_microcompetencies(
          id,
          weightage,
          microcompetencies:microcompetency_id(
            id,
            name,
            max_score,
            components:component_id(
              name,
              sub_categories:sub_category_id(
                quadrants:quadrant_id(name)
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      tasksQuery = tasksQuery.eq('status', status);
    }
    if (interventionId) {
      tasksQuery = tasksQuery.eq('intervention_id', interventionId);
    }
    if (teacherId) {
      tasksQuery = tasksQuery.eq('created_by_teacher_id', teacherId);
    }

    // Filter by term through intervention
    if (termId) {
      // First get intervention IDs for the specified term
      const interventionResult = await query(
        supabase
          .from('interventions')
          .select('id')
          .eq('term_id', termId)
      );

      if (interventionResult.rows && interventionResult.rows.length > 0) {
        const interventionIds = interventionResult.rows.map(i => i.id);
        tasksQuery = tasksQuery.in('intervention_id', interventionIds);
      } else {
        // No interventions found for this term, return empty result
        tasksQuery = tasksQuery.eq('intervention_id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      }
    }

    const tasksResult = await query(tasksQuery);

    // Get submission counts and direct assessment counts for each task
    const taskIds = tasksResult.rows.map(task => task.id);
    let submissionCounts = {};
    let gradedCounts = {};
    let enrolledCounts = {};
    let directAssessmentCounts = {};

    if (taskIds.length > 0) {
      // Get regular task submissions
      const submissionsResult = await query(
        supabase
          .from('task_submissions')
          .select('task_id, status')
          .in('task_id', taskIds)
      );

      // Count submissions and graded submissions per task
      submissionsResult.rows.forEach(submission => {
        submissionCounts[submission.task_id] = (submissionCounts[submission.task_id] || 0) + 1;
        if (submission.status === 'Graded') {
          gradedCounts[submission.task_id] = (gradedCounts[submission.task_id] || 0) + 1;
        }
      });

      // For each task, get enrolled student count and direct assessment count
      for (const task of tasksResult.rows) {
        const interventionId = task.interventions?.id;
        
        if (interventionId) {
          // Get enrolled student count for this intervention
          const enrolledResult = await query(
            supabase
              .from('intervention_enrollments')
              .select('student_id')
              .eq('intervention_id', interventionId)
              .eq('enrollment_status', 'Enrolled')
          );
          
          enrolledCounts[task.id] = enrolledResult.rows?.length || 0;

          // Get direct assessment count for this task
          const directAssessmentResult = await query(
            supabase
              .from('direct_assessments')
              .select('id')
              .eq('task_id', task.id)
          );
          
          directAssessmentCounts[task.id] = directAssessmentResult.rows?.length || 0;
        }
      }
    }

    // Transform tasks data with improved progress calculation
    const transformedTasks = tasksResult.rows.map(task => {
      let submissionCount, gradedCount;
      
      // Use different progress metrics based on task type
      if (task.submission_type === 'Direct_Assessment') {
        // For direct assessments, count enrolled students vs assessed students
        submissionCount = enrolledCounts[task.id] || 0;
        gradedCount = directAssessmentCounts[task.id] || 0;
      } else {
        // For other task types, use regular submission counts
        submissionCount = submissionCounts[task.id] || 0;
        gradedCount = gradedCounts[task.id] || 0;
      }

      return {
      id: task.id,
      name: task.name,
      description: task.description,
      maxScore: task.max_score,
      dueDate: task.due_date,
      instructions: task.instructions,
      submissionType: task.submission_type,
      allowLateSubmission: task.allow_late_submission,
      latePenalty: task.late_penalty,
      status: task.status,
      createdAt: task.created_at,
      interventionId: task.interventions?.id,
      interventionName: task.interventions?.name,
      interventionStatus: task.interventions?.status,
      createdBy: task.teachers?.name || 'Unknown',
      createdByTeacherId: task.created_by_teacher_id,
      microcompetencies: task.task_microcompetencies.map(tm => ({
        id: tm.microcompetencies.id,
        name: tm.microcompetencies.name,
        maxScore: tm.microcompetencies.max_score,
        weightage: tm.weightage,
        component: tm.microcompetencies.components?.name,
        quadrant: tm.microcompetencies.components?.sub_categories?.quadrants?.name
      })),
        submissionCount: submissionCount,
        gradedCount: gradedCount,
        enrolledStudents: enrolledCounts[task.id] || 0,
        taskType: task.submission_type // Add task type for frontend reference
      };
    });

    res.status(200).json({
      success: true,
      message: 'All tasks retrieved successfully',
      data: {
        tasks: transformedTasks,
        totalCount: transformedTasks.length,
        summary: {
          totalTasks: transformedTasks.length,
          activeTasks: transformedTasks.filter(t => t.status === 'Active').length,
          draftTasks: transformedTasks.filter(t => t.status === 'Draft').length,
          completedTasks: transformedTasks.filter(t => t.status === 'Completed').length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all tasks',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get teacher's tasks across all interventions
const getTeacherTasks = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const { status, interventionId, termId } = req.query;

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Build query for tasks created by this teacher
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        name,
        description,
        max_score,
        due_date,
        instructions,
        submission_type,
        allow_late_submission,
        late_penalty,
        status,
        created_at,
        interventions:intervention_id(
          id,
          name,
          status,
          term_id,
          terms:term_id(id, name)
        ),
        task_microcompetencies(
          id,
          weightage,
          microcompetencies:microcompetency_id(
            id,
            name,
            max_score,
            components:component_id(
              name,
              sub_categories:sub_category_id(
                quadrants:quadrant_id(name)
              )
            )
          )
        )
      `)
      .eq('created_by_teacher_id', teacher.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      tasksQuery = tasksQuery.eq('status', status);
    }
    if (interventionId) {
      tasksQuery = tasksQuery.eq('intervention_id', interventionId);
    }

    // Filter by term through intervention
    if (termId) {
      // First get intervention IDs for the specified term
      const interventionResult = await query(
        supabase
          .from('interventions')
          .select('id')
          .eq('term_id', termId)
      );

      if (interventionResult.rows && interventionResult.rows.length > 0) {
        const interventionIds = interventionResult.rows.map(i => i.id);
        tasksQuery = tasksQuery.in('intervention_id', interventionIds);
      } else {
        // No interventions found for this term, return empty result
        tasksQuery = tasksQuery.eq('intervention_id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      }
    }

    const tasksResult = await query(tasksQuery);

    // Get submission counts for each task
    const taskIds = tasksResult.rows.map(task => task.id);
    let submissionCounts = {};
    let gradedCounts = {};

    if (taskIds.length > 0) {
      const submissionsResult = await query(
        supabase
          .from('task_submissions')
          .select('task_id, status')
          .in('task_id', taskIds)
      );

      // Count submissions and graded submissions per task
      submissionsResult.rows.forEach(submission => {
        submissionCounts[submission.task_id] = (submissionCounts[submission.task_id] || 0) + 1;
        if (submission.status === 'Graded') {
          gradedCounts[submission.task_id] = (gradedCounts[submission.task_id] || 0) + 1;
        }
      });
    }

    // Transform tasks data
    const transformedTasks = tasksResult.rows.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      maxScore: task.max_score,
      dueDate: task.due_date,
      instructions: task.instructions,
      submissionType: task.submission_type,
      allowLateSubmission: task.allow_late_submission,
      latePenalty: task.late_penalty,
      status: task.status,
      createdAt: task.created_at,
      interventionId: task.interventions?.id,
      interventionName: task.interventions?.name,
      interventionStatus: task.interventions?.status,
      microcompetencies: task.task_microcompetencies.map(tm => ({
        id: tm.microcompetencies.id,
        name: tm.microcompetencies.name,
        maxScore: tm.microcompetencies.max_score,
        weightage: tm.weightage,
        component: tm.microcompetencies.components?.name,
        quadrant: tm.microcompetencies.components?.sub_categories?.quadrants?.name
      })),
      submissionCount: submissionCounts[task.id] || 0,
      gradedCount: gradedCounts[task.id] || 0
    }));

    res.status(200).json({
      success: true,
      message: 'Teacher tasks retrieved successfully',
      data: {
        tasks: transformedTasks,
        totalCount: transformedTasks.length,
        summary: {
          totalTasks: transformedTasks.length,
          activeTasks: transformedTasks.filter(t => t.status === 'Active').length,
          draftTasks: transformedTasks.filter(t => t.status === 'Draft').length,
          completedTasks: transformedTasks.filter(t => t.status === 'Completed').length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching teacher tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher tasks',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get teacher's assigned interventions
const getTeacherInterventions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify teacher exists
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id')
        .eq('id', teacherId)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get teacher's intervention assignments through microcompetencies
    const interventionsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          intervention_id,
          can_score,
          can_create_tasks,
          assigned_at,
          is_active,
          interventions!inner(
            id,
            name,
            description,
            start_date,
            end_date,
            status,
            max_students
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .in('interventions.status', ['Active', 'Draft'])
    );

    // Group by intervention and aggregate permissions
    const interventionMap = new Map();
    interventionsResult.rows.forEach(assignment => {
      const intervention = assignment.interventions;
      const interventionId = intervention.id;

      if (!interventionMap.has(interventionId)) {
        interventionMap.set(interventionId, {
          ...intervention,
          can_score: assignment.can_score,
          can_create_tasks: assignment.can_create_tasks,
          assigned_at: assignment.assigned_at,
          microcompetency_count: 1
        });
      } else {
        const existing = interventionMap.get(interventionId);
        existing.can_score = existing.can_score || assignment.can_score;
        existing.can_create_tasks = existing.can_create_tasks || assignment.can_create_tasks;
        existing.microcompetency_count += 1;
      }
    });

    const interventions = Array.from(interventionMap.values());

    res.status(200).json({
      success: true,
      message: 'Teacher interventions retrieved successfully',
      data: {
        teacher: teacherResult.rows[0],
        interventions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher interventions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teacher interventions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get specific intervention details for teacher
const getTeacherInterventionDetails = async (req, res) => {
  try {
    const { teacherId, interventionId } = req.params;

    // Verify teacher is assigned to this intervention
    const assignmentResult = await query(
      supabase
        .from('intervention_teachers')
        .select(`
          id,
          assigned_quadrants,
          role,
          permissions,
          interventions!inner(
            id,
            name,
            description,
            start_date,
            end_date,
            status,
            max_students,
            objectives
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!assignmentResult.rows || assignmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not assigned to this intervention',
        timestamp: new Date().toISOString()
      });
    }

    const assignment = assignmentResult.rows[0];

    // Get tasks for teacher's assigned quadrants
    const tasksResult = await query(
      supabase
        .from('tasks')
        .select(`
          id,
          name,
          description,
          quadrant_id,
          max_score,
          due_date,
          instructions,
          submission_type,
          status,
          created_at,
          components!inner(name)
        `)
        .eq('intervention_id', interventionId)
        .in('quadrant_id', assignment.assigned_quadrants)
        .order('due_date', { ascending: true })
    );

    // Get enrollment count
    const enrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('id', { count: 'exact' })
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
    );

    res.status(200).json({
      success: true,
      message: 'Intervention details retrieved successfully',
      data: {
        intervention: assignment.interventions,
        assignment: {
          role: assignment.role,
          assigned_quadrants: assignment.assigned_quadrants,
          permissions: assignment.permissions
        },
        tasks: tasksResult.rows || [],
        enrolled_students: enrollmentResult.count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher intervention details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve intervention details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get task submissions for teacher review (microcompetency-based)
const getTeacherSubmissions = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { taskId, status } = req.query;
    const currentUserId = req.user.userId;

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Verify teacher is assigned to microcompetencies in this intervention
    const assignmentResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('microcompetency_id, can_score')
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    if (!assignmentResult.rows || assignmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not assigned to any microcompetencies in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    const assignedMicrocompetencies = assignmentResult.rows.map(row => row.microcompetency_id);
    const canScore = assignmentResult.rows.some(row => row.can_score);

    if (!canScore) {
      return res.status(403).json({
        success: false,
        message: 'Teacher does not have scoring permission for this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Get tasks that have microcompetencies assigned to this teacher
    const teacherTasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        name,
        max_score,
        due_date,
        intervention_id,
        task_microcompetencies!inner(
          microcompetency_id
        )
      `)
      .eq('intervention_id', interventionId)
      .in('task_microcompetencies.microcompetency_id', assignedMicrocompetencies);

    const teacherTasksResult = await query(teacherTasksQuery);
    const teacherTaskIds = teacherTasksResult.rows.map(task => task.id);

    if (teacherTaskIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No tasks found for teacher\'s assigned microcompetencies',
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    // Build query for submissions from teacher's tasks
    let submissionsQuery = supabase
      .from('task_submissions')
      .select(`
        id,
        task_id,
        submitted_at,
        status,
        is_late,
        submission_text,
        score,
        feedback,
        graded_at,
        tasks!inner(
          id,
          name,
          max_score,
          due_date,
          task_microcompetencies(
            microcompetency_id,
            weightage,
            microcompetencies:microcompetency_id(
              name,
              components:component_id(
                sub_categories:sub_category_id(
                  quadrants:quadrant_id(name)
                )
              )
            )
          )
        ),
        students!inner(
          id,
          name,
          registration_no
        )
      `)
      .in('task_id', teacherTaskIds);

    // Apply filters
    if (taskId) {
      submissionsQuery = submissionsQuery.eq('task_id', taskId);
    }
    if (status) {
      submissionsQuery = submissionsQuery.eq('status', status);
    }

    submissionsQuery = submissionsQuery.order('submitted_at', { ascending: false });

    const submissionsResult = await query(submissionsQuery);

    res.status(200).json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: submissionsResult.rows || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submissions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Grade a task submission with automatic microcompetency score updates
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback, privateNotes } = req.body;
    const teacherId = req.user.userId;

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Get submission details with task and microcompetency information
    const submissionResult = await query(
      supabase
        .from('task_submissions')
        .select(`
          id,
          task_id,
          student_id,
          status,
          tasks!inner(
            id,
            name,
            max_score,
            intervention_id,
            task_microcompetencies(
              microcompetency_id,
              weightage,
              microcompetencies:microcompetency_id(
                id,
                name,
                max_score
              )
            )
          )
        `)
        .eq('id', submissionId)
        .limit(1)
    );

    if (!submissionResult.rows || submissionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
        timestamp: new Date().toISOString()
      });
    }

    const submission = submissionResult.rows[0];
    const task = submission.tasks;

    // Get intervention details to get term_id
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('term_id')
        .eq('id', task.intervention_id)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionResult.rows[0];

    // Verify teacher is assigned to all microcompetencies of this task
    const microcompetencyIds = task.task_microcompetencies.map(tm => tm.microcompetency_id);
    const teacherAssignmentCheck = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('microcompetency_id, can_score')
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', task.intervention_id)
        .in('microcompetency_id', microcompetencyIds)
        .eq('is_active', true)
    );

    // Check if teacher is assigned to all microcompetencies and has scoring permission
    const assignedMicrocompetencies = teacherAssignmentCheck.rows.map(row => row.microcompetency_id);
    const missingAssignments = microcompetencyIds.filter(id => !assignedMicrocompetencies.includes(id));

    if (missingAssignments.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Teacher not assigned to microcompetencies: ${missingAssignments.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if teacher has scoring permission for all microcompetencies
    const cannotScore = teacherAssignmentCheck.rows.filter(row => !row.can_score);
    if (cannotScore.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher does not have scoring permission for some microcompetencies',
        timestamp: new Date().toISOString()
      });
    }

    // Validate score
    if (score !== undefined && (score < 0 || score > task.max_score)) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${task.max_score}`,
        timestamp: new Date().toISOString()
      });
    }

    // Update submission with grade
    const updateData = {
      status: 'Graded',
      graded_by: teacher.id,
      graded_at: new Date().toISOString()
    };

    if (score !== undefined) updateData.score = score;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (privateNotes !== undefined) updateData.private_notes = privateNotes;

    const submissionUpdateResult = await query(
      supabase
        .from('task_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select(`
          *,
          tasks!inner(name, max_score),
          students!inner(name, registration_no)
        `)
    );

    if (!submissionUpdateResult.rows || submissionUpdateResult.rows.length === 0) {
      throw new Error('Failed to update submission');
    }

    // Calculate and update microcompetency scores based on task weightages
    if (score !== undefined) {
      const scorePercentage = (score / task.max_score) * 100;
      const microcompetencyUpdates = [];

      for (const taskMicrocompetency of task.task_microcompetencies) {
        const microcompetency = taskMicrocompetency.microcompetencies;
        const weightage = taskMicrocompetency.weightage;

        // Calculate weighted score for this microcompetency
        const weightedScore = (scorePercentage * weightage) / 100;
        const obtainedScore = (weightedScore * microcompetency.max_score) / 100;

        // Check if microcompetency score already exists for this student
        const existingScoreResult = await query(
          supabase
            .from('microcompetency_scores')
            .select('id, obtained_score, max_score')
            .eq('student_id', submission.student_id)
            .eq('microcompetency_id', microcompetency.id)
            .eq('intervention_id', task.intervention_id)
            .limit(1)
        );

        if (existingScoreResult.rows && existingScoreResult.rows.length > 0) {
          // Update existing score (add to existing score for cumulative assessment)
          const existingScore = existingScoreResult.rows[0];
          const newObtainedScore = existingScore.obtained_score + obtainedScore;
          const newPercentage = (newObtainedScore / existingScore.max_score) * 100;

          await query(
            supabase
              .from('microcompetency_scores')
              .update({
                obtained_score: newObtainedScore,
                percentage: newPercentage,
                scored_at: new Date().toISOString(),
                scored_by: teacher.id,
                status: 'Submitted'
              })
              .eq('id', existingScore.id)
          );

          microcompetencyUpdates.push({
            microcompetencyId: microcompetency.id,
            microcompetencyName: microcompetency.name,
            previousScore: existingScore.obtained_score,
            addedScore: obtainedScore,
            newScore: newObtainedScore,
            percentage: newPercentage,
            action: 'updated'
          });
        } else {
          // Create new microcompetency score
          const newScoreResult = await query(
            supabase
              .from('microcompetency_scores')
              .insert({
                student_id: submission.student_id,
                microcompetency_id: microcompetency.id,
                intervention_id: task.intervention_id,
                obtained_score: obtainedScore,
                max_score: microcompetency.max_score,
                percentage: (obtainedScore / microcompetency.max_score) * 100,
                scored_at: new Date().toISOString(),
                scored_by: teacher.id,
                status: 'Submitted',
                term_id: intervention.term_id
              })
              .select('id, obtained_score, percentage')
          );

          microcompetencyUpdates.push({
            microcompetencyId: microcompetency.id,
            microcompetencyName: microcompetency.name,
            score: obtainedScore,
            percentage: newScoreResult.rows[0].percentage,
            action: 'created'
          });
        }
      }

      // Trigger automatic score aggregation rollup
      try {
        console.log(`🔄 Triggering score aggregation rollup for student ${submission.student_id} in intervention ${task.intervention_id}`);
        
        // Import the score calculation service dynamically to avoid circular dependencies
        const scoreCalculationService = require('../services/scoreCalculationService');
        
        // Perform score aggregation synchronously to maintain data consistency
        await scoreCalculationService.recalculateStudentScores(submission.student_id, task.intervention_id);
        console.log(`✅ Score aggregation completed for student ${submission.student_id}`);
      } catch (aggregationCalcError) {
        console.error('⚠️ Score aggregation failed:', aggregationCalcError);
        // Don't fail the grading if aggregation has issues
      }

      // Return comprehensive response
      res.status(200).json({
        success: true,
        message: 'Submission graded successfully with microcompetency score updates',
        data: {
          submission: submissionUpdateResult.rows[0],
          microcompetencyUpdates,
          taskScore: {
            obtained: score,
            maximum: task.max_score,
            percentage: scorePercentage
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Just feedback without score
      res.status(200).json({
        success: true,
        message: 'Submission updated with feedback',
        data: submissionUpdateResult.rows[0],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// DIRECT ASSESSMENT FUNCTIONS
// ==========================================

// Create direct assessment for a student (Teacher only)
const createDirectAssessment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { studentId, score, feedback, privateNotes } = req.body;
    const teacherId = req.user.userId;

    // Validate required fields
    if (!studentId || score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, score',
        timestamp: new Date().toISOString()
      });
    }

    // Get teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Get task details and verify it's a direct assessment task
    const taskResult = await query(
      supabase
        .from('tasks')
        .select(`
          *,
          interventions!inner(id, name, status)
        `)
        .eq('id', taskId)
        .eq('requires_submission', false)
        .limit(1)
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Direct assessment task not found',
        timestamp: new Date().toISOString()
      });
    }

    const task = taskResult.rows[0];

    // Get intervention details to get term_id
    const interventionDetailsResult = await query(
      supabase
        .from('interventions')
        .select('term_id')
        .eq('id', task.interventions.id)
        .limit(1)
    );

    if (!interventionDetailsResult.rows || interventionDetailsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const interventionDetails = interventionDetailsResult.rows[0];

    // Validate score range
    if (score < 0 || score > task.max_score) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${task.max_score}`,
        timestamp: new Date().toISOString()
      });
    }

    // Verify student exists and is enrolled in the intervention
    const studentResult = await query(
      supabase
        .from('students')
        .select(`
          id, name, registration_no,
          intervention_enrollments!inner(id)
        `)
        .eq('id', studentId)
        .eq('status', 'Active')
        .eq('intervention_enrollments.intervention_id', task.interventions.id)
        .eq('intervention_enrollments.enrollment_status', 'Enrolled')
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or not enrolled in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Check if assessment already exists
    const existingAssessmentResult = await query(
      supabase
        .from('direct_assessments')
        .select('id')
        .eq('task_id', taskId)
        .eq('student_id', studentId)
        .limit(1)
    );

    if (existingAssessmentResult.rows && existingAssessmentResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Direct assessment already exists for this student and task',
        timestamp: new Date().toISOString()
      });
    }

    // Create direct assessment
    const assessmentResult = await query(
      supabase
        .from('direct_assessments')
        .insert({
          task_id: taskId,
          student_id: studentId,
          score,
          feedback,
          private_notes: privateNotes,
          assessed_by: teacherId,
          assessed_at: new Date().toISOString()
        })
        .select(`
          *,
          tasks!inner(name, max_score),
          students!inner(name, registration_no)
        `)
    );

    if (!assessmentResult.rows || assessmentResult.rows.length === 0) {
      throw new Error('Failed to create direct assessment');
    }

    // Update microcompetency scores (same logic as gradeSubmission)
    const scorePercentage = (score / task.max_score) * 100;

    // Get task microcompetencies
    const microcompetenciesResult = await query(
      supabase
        .from('task_microcompetencies')
        .select(`
          microcompetency_id,
          weightage,
          microcompetencies!inner(id, name, max_score)
        `)
        .eq('task_id', taskId)
    );

    const microcompetencyUpdates = [];

    for (const taskMc of microcompetenciesResult.rows) {
      const microcompetency = taskMc.microcompetencies;
      // Calculate the weighted score relative to the microcompetency's max_score
      const obtainedScore = Math.min(
        (score / task.max_score) * (taskMc.weightage / 100) * microcompetency.max_score,
        microcompetency.max_score
      );

      // Check if score already exists
      const existingScoreResult = await query(
        supabase
          .from('microcompetency_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('microcompetency_id', microcompetency.id)
          .limit(1)
      );

      if (existingScoreResult.rows && existingScoreResult.rows.length > 0) {
        // Update existing score
        const existingScore = existingScoreResult.rows[0];
        const newObtainedScore = existingScore.obtained_score + obtainedScore;

        const updateResult = await query(
          supabase
            .from('microcompetency_scores')
            .update({
              obtained_score: newObtainedScore,
              scored_at: new Date().toISOString(),
              scored_by: teacher.id,
              status: 'Submitted'
            })
            .eq('id', existingScore.id)
            .select('*')
        );

        const updatedScore = updateResult.rows[0];

        microcompetencyUpdates.push({
          microcompetencyId: microcompetency.id,
          microcompetencyName: microcompetency.name,
          score: obtainedScore,
          percentage: updatedScore.percentage,
          action: 'updated'
        });
      } else {
        // Create new score
        const newScoreResult = await query(
          supabase
            .from('microcompetency_scores')
            .insert({
              student_id: studentId,
              microcompetency_id: microcompetency.id,
              intervention_id: task.interventions.id,
              max_score: microcompetency.max_score,
              obtained_score: obtainedScore,
              scored_at: new Date().toISOString(),
              scored_by: teacher.id,
              status: 'Submitted',
              term_id: interventionDetails.term_id
            })
            .select('*')
        );

        microcompetencyUpdates.push({
          microcompetencyId: microcompetency.id,
          microcompetencyName: microcompetency.name,
          score: obtainedScore,
          percentage: newScoreResult.rows[0].percentage,
          action: 'created'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Direct assessment created successfully with microcompetency score updates',
      data: {
        assessment: assessmentResult.rows[0],
        microcompetencyUpdates,
        taskScore: {
          obtained: score,
          maximum: task.max_score,
          percentage: scorePercentage
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating direct assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create direct assessment',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update direct assessment (Teacher only)
const updateDirectAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { score, feedback, privateNotes } = req.body;
    const teacherId = req.user.userId;

    // Get existing assessment with task details
    const assessmentResult = await query(
      supabase
        .from('direct_assessments')
        .select(`
          *,
          tasks!inner(id, name, max_score, intervention_id),
          students!inner(id, name, registration_no)
        `)
        .eq('id', assessmentId)
        .limit(1)
    );

    if (!assessmentResult.rows || assessmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Direct assessment not found',
        timestamp: new Date().toISOString()
      });
    }

    const assessment = assessmentResult.rows[0];
    const task = assessment.tasks;

    // Validate score if provided
    if (score !== undefined && (score < 0 || score > task.max_score)) {
      return res.status(400).json({
        success: false,
        message: `Score must be between 0 and ${task.max_score}`,
        timestamp: new Date().toISOString()
      });
    }

    // Update assessment
    const updateData = {
      assessed_by: teacherId,
      assessed_at: new Date().toISOString()
    };

    if (score !== undefined) updateData.score = score;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (privateNotes !== undefined) updateData.private_notes = privateNotes;

    const updateResult = await query(
      supabase
        .from('direct_assessments')
        .update(updateData)
        .eq('id', assessmentId)
        .select(`
          *,
          tasks!inner(name, max_score),
          students!inner(name, registration_no)
        `)
    );

    // If score was updated, recalculate microcompetency scores
    let microcompetencyUpdates = [];
    if (score !== undefined) {
      // This would require more complex logic to handle score changes
      // For now, we'll just return the updated assessment
      // TODO: Implement microcompetency score recalculation for score updates
    }

    res.status(200).json({
      success: true,
      message: 'Direct assessment updated successfully',
      data: {
        assessment: updateResult.rows[0],
        microcompetencyUpdates
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating direct assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update direct assessment',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get direct assessments for a task (Teacher only)
const getTaskDirectAssessments = async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task details to verify it's a direct assessment task
    const taskResult = await query(
      supabase
        .from('tasks')
        .select('id, name, requires_submission, max_score')
        .eq('id', taskId)
        .eq('requires_submission', false)
        .limit(1)
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Direct assessment task not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get all assessments for this task
    const assessmentsResult = await query(
      supabase
        .from('direct_assessments')
        .select(`
          *,
          students!inner(id, name, registration_no)
        `)
        .eq('task_id', taskId)
        .order('assessed_at', { ascending: false })
    );

    res.status(200).json({
      success: true,
      data: {
        task: taskResult.rows[0],
        assessments: assessmentsResult.rows || [],
        totalAssessments: assessmentsResult.rows?.length || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching direct assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch direct assessments',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get enrolled students for an intervention
const getInterventionStudents = async (req, res) => {
  try {
    const { interventionId } = req.params;

    // Verify intervention exists
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionResult.rows || interventionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get enrolled students
    const studentsResult = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          id,
          enrollment_status,
          enrollment_date,
          students!inner(
            id,
            name,
            registration_no,
            course,
            status
          )
        `)
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
        .eq('students.status', 'Active')
        .order('enrollment_date', { ascending: false })
    );

    const students = studentsResult.rows?.map(enrollment => ({
      id: enrollment.students.id,
      name: enrollment.students.name,
      registration_no: enrollment.students.registration_no,
      course: enrollment.students.course,
      enrollment_status: enrollment.enrollment_status,
      enrolled_at: enrollment.enrollment_date
    })) || [];

    res.status(200).json({
      success: true,
      data: {
        intervention: interventionResult.rows[0],
        students,
        totalStudents: students.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching intervention students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch intervention students',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// NEW INTERVENTION-CENTRIC FUNCTIONS
// ==========================================

// Get microcompetencies for intervention
const getInterventionMicrocompetencies = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { quadrantId, includeInactive } = req.query;

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionCheck.rows[0];

    // Build query for intervention microcompetencies
    let microcompetenciesQuery = supabase
      .from('intervention_microcompetencies')
      .select(`
        id,
        weightage,
        max_score,
        is_active,
        created_at,
        microcompetencies:microcompetency_id(
          id,
          name,
          description,
          display_order,
          components:component_id(
            id,
            name,
            category,
            sub_categories:sub_category_id(
              id,
              name,
              quadrants:quadrant_id(
                id,
                name
              )
            )
          )
        )
      `)
      .eq('intervention_id', interventionId);

    // Apply filters
    if (quadrantId) {
      microcompetenciesQuery = microcompetenciesQuery.eq('microcompetencies.components.sub_categories.quadrants.id', quadrantId);
    }

    if (!includeInactive) {
      microcompetenciesQuery = microcompetenciesQuery.eq('is_active', true);
    }

    const result = await query(microcompetenciesQuery);

    // Transform data
    const transformedData = result.rows.map(item => ({
      id: item.id,
      weightage: item.weightage,
      maxScore: item.max_score,
      isActive: item.is_active,
      createdAt: item.created_at,
      microcompetency: item.microcompetencies,
      quadrant: item.microcompetencies?.components?.sub_categories?.quadrants
    }));

    res.status(200).json({
      success: true,
      message: 'Intervention microcompetencies retrieved successfully',
      data: {
        intervention,
        microcompetencies: transformedData,
        totalCount: transformedData.length
      },
      filters: {
        quadrantId,
        includeInactive: includeInactive || false
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get intervention microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve intervention microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Add microcompetencies to intervention
const addMicrocompetenciesToIntervention = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { microcompetencies } = req.body;

    console.log('🎯 addMicrocompetenciesToIntervention called:', {
      interventionId,
      microcompetenciesCount: microcompetencies?.length,
      microcompetencies: microcompetencies
    });

    // Validate input
    if (!microcompetencies || !Array.isArray(microcompetencies) || microcompetencies.length === 0) {
      console.error('❌ Invalid microcompetencies input:', { microcompetencies });
      return res.status(400).json({
        success: false,
        error: 'Microcompetencies array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
        .single()
    );

    if (!interventionCheck.rows || (Array.isArray(interventionCheck.rows) && interventionCheck.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = Array.isArray(interventionCheck.rows) ? interventionCheck.rows[0] : interventionCheck.rows;

    // Check if intervention is in draft status
    if (intervention.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only modify microcompetencies for interventions in Draft status',
        timestamp: new Date().toISOString()
      });
    }

    // Validate microcompetencies exist
    const microcompetencyIds = microcompetencies.map(m => m.microcompetency_id);
    const microcompetencyCheck = await query(
      supabase
        .from('microcompetencies')
        .select('id, name, component_id')
        .in('id', microcompetencyIds)
        .eq('is_active', true)
    );

    if (microcompetencyCheck.rows.length !== microcompetencyIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more microcompetencies not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Validate total weightage doesn't exceed 100%
    const totalWeightage = microcompetencies.reduce((sum, m) => sum + parseFloat(m.weightage), 0);
    if (totalWeightage > 100) {
      return res.status(400).json({
        success: false,
        error: `Total weightage (${totalWeightage}%) exceeds 100%`,
        timestamp: new Date().toISOString()
      });
    }

    // Remove existing microcompetencies for this intervention
    await query(
      supabase
        .from('intervention_microcompetencies')
        .delete()
        .eq('intervention_id', interventionId)
    );

    // Prepare intervention microcompetencies data
    const interventionMicrocompetencies = microcompetencies.map(m => ({
      intervention_id: interventionId,
      microcompetency_id: m.microcompetency_id,
      weightage: parseFloat(m.weightage),
      max_score: parseFloat(m.max_score || 10.0),
      is_active: true
    }));

    console.log('📝 Inserting intervention microcompetencies:', interventionMicrocompetencies);

    // Insert new microcompetencies
    const result = await query(
      supabase
        .from('intervention_microcompetencies')
        .insert(interventionMicrocompetencies)
        .select(`
          id,
          weightage,
          max_score,
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
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
    );

    console.log('✅ Microcompetencies inserted successfully:', {
      insertedCount: result.rows.length,
      insertedData: result.rows
    });

    res.status(200).json({
      success: true,
      message: 'Microcompetencies added to intervention successfully',
      data: {
        intervention_id: interventionId,
        microcompetencies: result.rows,
        total_weightage: totalWeightage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Add microcompetencies to intervention error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add microcompetencies to intervention',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Assign teachers to microcompetencies within intervention
const assignTeachersToMicrocompetencies = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { assignments } = req.body;

    console.log('🎯 assignTeachersToMicrocompetencies called:', {
      interventionId,
      assignmentsCount: assignments?.length,
      assignments: assignments
    });

    // Validate input
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      console.error('❌ Invalid assignments input:', { assignments });
      return res.status(400).json({
        success: false,
        error: 'Assignments array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify intervention exists
    console.log('🔍 Checking if intervention exists:', interventionId);
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      console.error('❌ Intervention not found:', interventionId);
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Intervention found:', interventionCheck.rows[0]);

    // Verify all microcompetencies belong to this intervention
    const microcompetencyIds = assignments.map(a => a.microcompetency_id);
    console.log('🔍 Checking microcompetencies for intervention:', {
      interventionId,
      microcompetencyIds
    });

    const interventionMicrocompetencies = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('microcompetency_id, id, weightage, max_score, is_active')
        .eq('intervention_id', interventionId)
        .in('microcompetency_id', microcompetencyIds)
    );

    console.log('🔍 Found intervention microcompetencies:', {
      requested: microcompetencyIds,
      found: interventionMicrocompetencies.rows,
      requestedCount: microcompetencyIds.length,
      foundCount: interventionMicrocompetencies.rows.length
    });

    if (interventionMicrocompetencies.rows.length !== microcompetencyIds.length) {
      console.error('❌ Microcompetency validation failed:', {
        interventionId,
        requestedMicrocompetencies: microcompetencyIds,
        foundMicrocompetencies: interventionMicrocompetencies.rows.map(r => r.microcompetency_id),
        requestedCount: microcompetencyIds.length,
        foundCount: interventionMicrocompetencies.rows.length
      });

      // Let's also check what microcompetencies ARE in this intervention
      const allInterventionMicrocompetencies = await query(
        supabase
          .from('intervention_microcompetencies')
          .select('microcompetency_id, id, weightage, max_score, is_active')
          .eq('intervention_id', interventionId)
      );

      console.error('❌ All microcompetencies in intervention:', allInterventionMicrocompetencies.rows);

      return res.status(400).json({
        success: false,
        error: 'One or more microcompetencies do not belong to this intervention',
        details: {
          interventionId,
          interventionName: interventionCheck.rows[0].name,
          interventionStatus: interventionCheck.rows[0].status,
          requested: microcompetencyIds,
          found: interventionMicrocompetencies.rows.map(r => r.microcompetency_id),
          allInIntervention: allInterventionMicrocompetencies.rows.map(r => r.microcompetency_id),
          missing: microcompetencyIds.filter(id =>
            !interventionMicrocompetencies.rows.some(r => r.microcompetency_id === id)
          )
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify all teachers exist
    const teacherIds = assignments.map(a => a.teacher_id);
    const uniqueTeacherIds = [...new Set(teacherIds)]; // Remove duplicates for validation
    console.log('🔍 Checking teachers:', {
      teacherIds,
      uniqueTeacherIds,
      totalAssignments: teacherIds.length,
      uniqueTeachers: uniqueTeacherIds.length
    });

    const teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, is_active')
        .in('id', uniqueTeacherIds)
        .eq('is_active', true)
    );

    console.log('🔍 Found teachers:', {
      requested: uniqueTeacherIds,
      found: teacherCheck.rows,
      requestedCount: uniqueTeacherIds.length,
      foundCount: teacherCheck.rows.length
    });

    if (teacherCheck.rows.length !== uniqueTeacherIds.length) {
      const foundTeacherIds = teacherCheck.rows.map(r => r.id);
      const missingTeacherIds = uniqueTeacherIds.filter(id => !foundTeacherIds.includes(id));

      console.error('❌ Teacher validation failed:', {
        requestedTeachers: uniqueTeacherIds,
        foundTeachers: foundTeacherIds,
        missingTeachers: missingTeacherIds,
        requestedCount: uniqueTeacherIds.length,
        foundCount: teacherCheck.rows.length
      });

      return res.status(400).json({
        success: false,
        error: 'One or more teachers not found or inactive',
        details: {
          requested: uniqueTeacherIds,
          found: foundTeacherIds,
          missing: missingTeacherIds
        },
        timestamp: new Date().toISOString()
      });
    }

    // Remove existing assignments for this intervention
    await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .delete()
        .eq('intervention_id', interventionId)
    );

    // Prepare teacher assignments
    const teacherAssignments = assignments.map(a => ({
      intervention_id: interventionId,
      teacher_id: a.teacher_id,
      microcompetency_id: a.microcompetency_id,
      can_score: a.can_score !== undefined ? a.can_score : true,
      can_create_tasks: a.can_create_tasks !== undefined ? a.can_create_tasks : true,
      assigned_by: req.user.userId,
      is_active: true
    }));

    // Insert new assignments
    const result = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .insert(teacherAssignments)
        .select(`
          id,
          can_score,
          can_create_tasks,
          assigned_at,
          teachers:teacher_id(
            id,
            name,
            employee_id
          ),
          microcompetencies:microcompetency_id(
            id,
            name,
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
    );

    res.status(200).json({
      success: true,
      message: 'Teachers assigned to microcompetencies successfully',
      data: {
        intervention_id: interventionId,
        assignments: result.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Assign teachers to microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign teachers to microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Set scoring deadline for intervention
const setScoringDeadline = async (req, res) => {
  try {
    const { interventionId } = req.params;
    const { scoring_deadline, is_scoring_open = true } = req.body;

    // Validate input
    if (!scoring_deadline) {
      return res.status(400).json({
        success: false,
        error: 'Scoring deadline is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate deadline is in the future
    if (new Date(scoring_deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scoring deadline must be in the future',
        timestamp: new Date().toISOString()
      });
    }

    // Update intervention
    const result = await query(
      supabase
        .from('interventions')
        .update({
          scoring_deadline,
          is_scoring_open
        })
        .eq('id', interventionId)
        .select('id, name, scoring_deadline, is_scoring_open')
        .single()
    );

    if (!result.rows || (Array.isArray(result.rows) && result.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scoring deadline set successfully',
      data: Array.isArray(result.rows) ? result.rows[0] : result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Set scoring deadline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set scoring deadline',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get teacher assignments for intervention
const getInterventionTeacherAssignments = async (req, res) => {
  try {
    const { interventionId } = req.params;

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get teacher microcompetency assignments for this intervention
    const result = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          teacher_id,
          microcompetency_id,
          can_score,
          can_create_tasks,
          assigned_at,
          teachers:teacher_id(
            id,
            name,
            employee_id
          ),
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
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
        .order('assigned_at', { ascending: false })
    );

    // Group assignments by teacher
    const teacherAssignments = result.rows.reduce((acc, assignment) => {
      const teacherId = assignment.teacher_id;

      if (!acc[teacherId]) {
        acc[teacherId] = {
          id: `teacher_assignment_${teacherId}_${interventionId}`,
          teacher: assignment.teachers,
          assigned_at: assignment.assigned_at,
          microcompetency_assignments: []
        };
      }

      acc[teacherId].microcompetency_assignments.push({
        id: assignment.id,
        microcompetency_id: assignment.microcompetency_id,
        can_score: assignment.can_score,
        can_view: assignment.can_create_tasks, // Using can_create_tasks as can_view
        microcompetencies: assignment.microcompetencies
      });

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Teacher assignments retrieved successfully',
      data: {
        assignments: Object.values(teacherAssignments)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teacher assignments',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Remove teacher assignment
const removeTeacherAssignment = async (req, res) => {
  try {
    const { interventionId, assignmentId } = req.params;

    // Extract teacher ID from assignment ID (format: teacher_assignment_{teacherId}_{interventionId})
    const teacherIdMatch = assignmentId.match(/teacher_assignment_(.+)_/);
    if (!teacherIdMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment ID format',
        timestamp: new Date().toISOString()
      });
    }

    const teacherId = teacherIdMatch[1];

    // Remove all microcompetency assignments for this teacher in this intervention
    const result = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .delete()
        .eq('intervention_id', interventionId)
        .eq('teacher_id', teacherId)
    );

    res.status(200).json({
      success: true,
      message: 'Teacher assignment removed successfully',
      data: {
        removed_assignments: result.count || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error removing teacher assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove teacher assignment',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  createIntervention,
  getAllInterventions,
  getInterventionById,
  updateIntervention,
  deleteIntervention,
  assignTeachers,
  enrollStudents,
  enrollStudentsByBatch,
  enrollStudentsByCriteria,
  getInterventionAnalytics,
  updateInterventionStatus,
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  getTeacherTasks,
  getStudentTasks,
  getStudentInterventions,
  submitTask,
  saveTaskDraft,
  getTeacherMicrocompetencies,
  getTeacherInterventions,
  getTeacherInterventionDetails,
  getTeacherSubmissions,
  gradeSubmission,
  // Direct assessment functions
  createDirectAssessment,
  updateDirectAssessment,
  getTaskDirectAssessments,
  getInterventionStudents,
  // New intervention-centric functions
  getInterventionMicrocompetencies,
  addMicrocompetenciesToIntervention,
  assignTeachersToMicrocompetencies,
  setScoringDeadline,
  getInterventionTeacherAssignments,
  removeTeacherAssignment
};
