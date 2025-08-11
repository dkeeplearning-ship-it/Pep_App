const { supabase, query } = require('../config/supabase');

// Get student's scores by student ID
const getStudentScores = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    // Verify the student exists and user has permission to view
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, user_id, name, registration_no')
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Check authorization - students can only view their own scores
    if (req.user.role === 'student' && student.user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own scores.',
        timestamp: new Date().toISOString()
      });
    }

    // Build the scores query
    let scoresQuery = `
      SELECT 
        s.id,
        s.obtained_score,
        s.max_score,
        s.percentage,
        s.assessment_date,
        s.notes,
        s.assessed_by,
        s.status,
        s.term_id,
        c.id as component_id,
        c.name as component_name,
        c.description as component_description,
        c.category,
        c.max_points,
        sc.id as sub_category_id,
        sc.name as sub_category_name,
        sc.description as sub_category_description,
        sc.weightage as sub_category_weightage,
        q.id as quadrant_id,
        q.name as quadrant_name,
        q.description as quadrant_description,
        q.weightage as quadrant_weightage,
        t.name as term_name,
        u.username as assessed_by_username
      FROM scores s
      JOIN components c ON s.component_id = c.id
      JOIN sub_categories sc ON c.sub_category_id = sc.id
      JOIN quadrants q ON sc.quadrant_id = q.id
      LEFT JOIN terms t ON s.term_id = t.id
      LEFT JOIN users u ON s.assessed_by = u.id
      WHERE s.student_id = $1
    `;

    const queryParams = [studentId];

    // Filter by term if specified
    if (termId) {
      scoresQuery += ` AND s.term_id = $2`;
      queryParams.push(termId);
    }

    scoresQuery += ` ORDER BY q.display_order, sc.display_order, c.display_order, s.assessment_date DESC`;

    const scoresResult = await query(scoresQuery, queryParams);

    // Group scores by quadrant
    const scoresByQuadrant = scoresResult.rows.reduce((acc, score) => {
      const quadrantId = score.quadrant_id;
      
      if (!acc[quadrantId]) {
        acc[quadrantId] = {
          id: quadrantId,
          name: score.quadrant_name,
          description: score.quadrant_description,
          weightage: score.quadrant_weightage,
          sub_categories: {}
        };
      }

      const subCategoryId = score.sub_category_id;
      if (!acc[quadrantId].sub_categories[subCategoryId]) {
        acc[quadrantId].sub_categories[subCategoryId] = {
          id: subCategoryId,
          name: score.sub_category_name,
          description: score.sub_category_description,
          weightage: score.sub_category_weightage,
          components: {}
        };
      }

      const componentId = score.component_id;
      if (!acc[quadrantId].sub_categories[subCategoryId].components[componentId]) {
        acc[quadrantId].sub_categories[subCategoryId].components[componentId] = {
          id: componentId,
          name: score.component_name,
          description: score.component_description,
          category: score.category,
          max_points: score.max_points,
          scores: []
        };
      }

      acc[quadrantId].sub_categories[subCategoryId].components[componentId].scores.push({
        id: score.id,
        obtained_score: score.obtained_score,
        max_score: score.max_score,
        percentage: score.percentage,
        assessment_date: score.assessment_date,
        notes: score.notes,
        status: score.status,
        term_id: score.term_id,
        term_name: score.term_name,
        assessed_by: score.assessed_by,
        assessed_by_username: score.assessed_by_username
      });

      return acc;
    }, {});

    // Convert nested objects to arrays
    const formattedData = Object.values(scoresByQuadrant).map(quadrant => ({
      ...quadrant,
      sub_categories: Object.values(quadrant.sub_categories).map(subCategory => ({
        ...subCategory,
        components: Object.values(subCategory.components)
      }))
    }));

    res.status(200).json({
      success: true,
      message: 'Student scores retrieved successfully',
      data: {
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no
        },
        quadrants: formattedData,
        filters: {
          term_id: termId
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching student scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student scores',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get student's score summary by term
const getStudentScoreSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    // Verify student exists and authorization
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, user_id, name, registration_no, overall_score, grade, status')
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    if (req.user.role === 'student' && student.user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own scores.',
        timestamp: new Date().toISOString()
      });
    }

    // Get quadrant-wise score summary
    let summaryQuery = `
      SELECT 
        q.id as quadrant_id,
        q.name as quadrant_name,
        q.weightage as quadrant_weightage,
        COUNT(s.id) as total_assessments,
        AVG(s.percentage) as average_percentage,
        MAX(s.percentage) as best_percentage,
        MIN(s.percentage) as lowest_percentage,
        COUNT(CASE WHEN s.percentage >= 75 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN s.percentage >= 50 AND s.percentage < 75 THEN 1 END) as good_count,
        COUNT(CASE WHEN s.percentage < 50 THEN 1 END) as needs_improvement_count
      FROM quadrants q
      LEFT JOIN sub_categories sc ON q.id = sc.quadrant_id AND sc.is_active = true
      LEFT JOIN components c ON sc.id = c.sub_category_id AND c.is_active = true
      LEFT JOIN scores s ON c.id = s.component_id AND s.student_id = $1
    `;

    const queryParams = [studentId];

    if (termId) {
      summaryQuery += ` AND s.term_id = $2`;
      queryParams.push(termId);
    }

    summaryQuery += `
      WHERE q.is_active = true
      GROUP BY q.id, q.name, q.weightage, q.display_order
      ORDER BY q.display_order
    `;

    const summaryResult = await query(summaryQuery, queryParams);

    // Calculate overall weighted score
    let totalWeightedScore = 0;
    let totalWeightage = 0;

    const quadrantSummary = summaryResult.rows.map(row => {
      const avgPercentage = parseFloat(row.average_percentage) || 0;
      const weightage = parseFloat(row.quadrant_weightage) || 0;
      
      if (avgPercentage > 0) {
        totalWeightedScore += (avgPercentage * weightage / 100);
        totalWeightage += weightage;
      }

      return {
        quadrant_id: row.quadrant_id,
        quadrant_name: row.quadrant_name,
        weightage: weightage,
        total_assessments: parseInt(row.total_assessments) || 0,
        average_percentage: Math.round(avgPercentage * 100) / 100,
        best_percentage: Math.round((parseFloat(row.best_percentage) || 0) * 100) / 100,
        lowest_percentage: Math.round((parseFloat(row.lowest_percentage) || 0) * 100) / 100,
        excellent_count: parseInt(row.excellent_count) || 0,
        good_count: parseInt(row.good_count) || 0,
        needs_improvement_count: parseInt(row.needs_improvement_count) || 0
      };
    });

    const overallPercentage = totalWeightage > 0 ? Math.round((totalWeightedScore / totalWeightage * 100) * 100) / 100 : 0;

    // Determine grade based on overall percentage
    let grade = 'IC';
    if (overallPercentage >= 90) grade = 'A+';
    else if (overallPercentage >= 80) grade = 'A';
    else if (overallPercentage >= 70) grade = 'B';
    else if (overallPercentage >= 60) grade = 'C';
    else if (overallPercentage >= 50) grade = 'D';
    else if (overallPercentage >= 40) grade = 'E';

    res.status(200).json({
      success: true,
      message: 'Student score summary retrieved successfully',
      data: {
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          current_overall_score: student.overall_score,
          current_grade: student.grade,
          status: student.status
        },
        summary: {
          overall_percentage: overallPercentage,
          calculated_grade: grade,
          total_weightage: totalWeightage,
          quadrants: quadrantSummary
        },
        filters: {
          term_id: termId
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching student score summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student score summary',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Add a new score (Teachers/Admins only)
const addScore = async (req, res) => {
  try {
    const { 
      student_id, 
      component_id, 
      obtained_score, 
      max_score, 
      term_id, 
      notes 
    } = req.body;

    // Validation
    if (!student_id || !component_id || obtained_score === undefined || !max_score) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: student_id, component_id, obtained_score, max_score',
        timestamp: new Date().toISOString()
      });
    }

    if (obtained_score < 0 || obtained_score > max_score) {
      return res.status(400).json({
        success: false,
        message: 'Obtained score must be between 0 and max_score',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate percentage
    const percentage = (obtained_score / max_score) * 100;

    // Insert the score
    const result = await query(`
      INSERT INTO scores (
        student_id, 
        component_id, 
        obtained_score, 
        max_score, 
        percentage, 
        term_id, 
        notes, 
        assessed_by, 
        assessment_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      student_id, 
      component_id, 
      obtained_score, 
      max_score, 
      percentage, 
      term_id, 
      notes, 
      req.user.userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Score added successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add score',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update a score (Teachers/Admins only)
const updateScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { obtained_score, max_score, notes } = req.body;

    // Validation
    if (obtained_score !== undefined && max_score !== undefined) {
      if (obtained_score < 0 || obtained_score > max_score) {
        return res.status(400).json({
          success: false,
          message: 'Obtained score must be between 0 and max_score',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (obtained_score !== undefined) {
      updates.push(`obtained_score = $${paramCount}`);
      values.push(obtained_score);
      paramCount++;
    }

    if (max_score !== undefined) {
      updates.push(`max_score = $${paramCount}`);
      values.push(max_score);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    // Always update percentage if scores change
    if (obtained_score !== undefined || max_score !== undefined) {
      updates.push(`percentage = (obtained_score::decimal / max_score::decimal) * 100`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
        timestamp: new Date().toISOString()
      });
    }

    values.push(id);
    const updateQuery = `
      UPDATE scores 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Score not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Score updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update score',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getStudentScores,
  getStudentScoreSummary,
  addScore,
  updateScore
}; 