const { supabase, query } = require('../config/supabase');

// Get all microcompetencies with pagination and filters
const getAllMicrocompetencies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const quadrantId = req.query.quadrantId || '';
    const componentId = req.query.componentId || '';
    const includeInactive = req.query.includeInactive === 'true';

    // Build microcompetencies query
    let microcompetenciesQuery = supabase
      .from('microcompetencies')
      .select(`
        id,
        name,
        description,
        weightage,
        max_score,
        display_order,
        is_active,
        created_at,
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
      `);

    // Apply filters
    if (search) {
      microcompetenciesQuery = microcompetenciesQuery.ilike('name', `%${search}%`);
    }

    if (componentId) {
      microcompetenciesQuery = microcompetenciesQuery.eq('component_id', componentId);
    }

    if (quadrantId) {
      microcompetenciesQuery = microcompetenciesQuery.eq('components.sub_categories.quadrants.id', quadrantId);
    }

    if (!includeInactive) {
      microcompetenciesQuery = microcompetenciesQuery.eq('is_active', true);
    }

    // Get total count
    const countResult = await query(
      supabase
        .from('microcompetencies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', includeInactive ? undefined : true)
    );

    const totalMicrocompetencies = countResult.count || 0;

    // Execute main query with pagination
    const result = await query(
      microcompetenciesQuery
        .order('display_order', { ascending: true })
        .range(offset, offset + limit - 1)
    );

    const totalPages = Math.ceil(totalMicrocompetencies / limit);

    res.status(200).json({
      success: true,
      message: 'Microcompetencies retrieved successfully',
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalMicrocompetencies,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        quadrantId,
        componentId,
        includeInactive
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get all microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all microcompetencies for a component
const getMicrocompetenciesByComponent = async (req, res) => {
  try {
    const { componentId } = req.params;
    const { includeInactive = false } = req.query;

    let microcompetenciesQuery = supabase
      .from('microcompetencies')
      .select(`
        id,
        name,
        description,
        weightage,
        max_score,
        display_order,
        is_active,
        created_at,
        components:component_id(
          id,
          name,
          sub_categories:sub_category_id(
            id,
            name,
            quadrants:quadrant_id(id, name)
          )
        )
      `)
      .eq('component_id', componentId)
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      microcompetenciesQuery = microcompetenciesQuery.eq('is_active', true);
    }

    const result = await query(microcompetenciesQuery);

    res.status(200).json({
      success: true,
      message: 'Microcompetencies retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all microcompetencies for a quadrant
const getMicrocompetenciesByQuadrant = async (req, res) => {
  try {
    const { quadrantId } = req.params;
    const { includeInactive = false } = req.query;

    // First get all components for this quadrant
    const componentsResult = await query(
      supabase
        .from('components')
        .select(`
          id,
          name,
          sub_categories:sub_category_id(
            id,
            name,
            quadrant_id
          )
        `)
        .eq('sub_categories.quadrant_id', quadrantId)
        .order('display_order', { ascending: true })
    );

    const componentIds = componentsResult.rows.map(comp => comp.id);

    if (componentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No components found for this quadrant',
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get microcompetencies for these components
    let microcompetenciesQuery = supabase
      .from('microcompetencies')
      .select(`
        id,
        name,
        description,
        weightage,
        max_score,
        display_order,
        is_active,
        component_id,
        components:component_id(
          id,
          name,
          display_order
        )
      `)
      .in('component_id', componentIds)
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      microcompetenciesQuery = microcompetenciesQuery.eq('is_active', true);
    }

    const result = await query(microcompetenciesQuery);

    // Group by component for better organization
    const groupedData = result.rows.reduce((acc, micro) => {
      const componentId = micro.component_id;
      if (!acc[componentId]) {
        acc[componentId] = {
          component: micro.components,
          microcompetencies: []
        };
      }
      acc[componentId].microcompetencies.push({
        id: micro.id,
        name: micro.name,
        description: micro.description,
        weightage: micro.weightage,
        max_score: micro.max_score,
        display_order: micro.display_order,
        is_active: micro.is_active
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Microcompetencies by quadrant retrieved successfully',
      data: Object.values(groupedData),
      count: result.rowCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get microcompetencies by quadrant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve microcompetencies by quadrant',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create new microcompetency
const createMicrocompetency = async (req, res) => {
  try {
    const {
      component_id,
      name,
      description,
      weightage,
      max_score = 10.0,
      display_order = 0
    } = req.body;

    // Validate required fields
    if (!component_id || !name || !weightage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'component_id, name, and weightage are required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate weightage
    if (weightage <= 0 || weightage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid weightage',
        message: 'Weightage must be between 0 and 100',
        timestamp: new Date().toISOString()
      });
    }

    // Check if component exists
    const componentCheck = await query(
      supabase
        .from('components')
        .select('id, name')
        .eq('id', component_id)
        .single()
    );

    if (!componentCheck.rows || (Array.isArray(componentCheck.rows) && componentCheck.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        message: 'The specified component does not exist',
        timestamp: new Date().toISOString()
      });
    }

    // Check total weightage for this component
    const existingWeightages = await query(
      supabase
        .from('microcompetencies')
        .select('weightage')
        .eq('component_id', component_id)
        .eq('is_active', true)
    );

    const totalExistingWeightage = existingWeightages.rows.reduce(
      (sum, item) => sum + parseFloat(item.weightage), 0
    );

    if (totalExistingWeightage + parseFloat(weightage) > 100) {
      return res.status(400).json({
        success: false,
        error: 'Weightage exceeds limit',
        message: `Total weightage would be ${(totalExistingWeightage + parseFloat(weightage)).toFixed(2)}%. Current usage: ${totalExistingWeightage.toFixed(2)}%, Available: ${(100 - totalExistingWeightage).toFixed(2)}%, Requested: ${parseFloat(weightage).toFixed(2)}%`,
        details: {
          currentWeightage: totalExistingWeightage,
          requestedWeightage: parseFloat(weightage),
          availableWeightage: 100 - totalExistingWeightage,
          totalAfterAddition: totalExistingWeightage + parseFloat(weightage)
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create microcompetency
    const result = await query(
      supabase
        .from('microcompetencies')
        .insert({
          component_id,
          name,
          description,
          weightage: parseFloat(weightage),
          max_score: parseFloat(max_score),
          display_order: parseInt(display_order),
          is_active: true
        })
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create microcompetency',
        message: 'No data returned after creation',
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Microcompetency created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Create microcompetency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create microcompetency',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update microcompetency
const updateMicrocompetency = async (req, res) => {
  try {
    const { microcompetencyId } = req.params;
    const {
      name,
      description,
      weightage,
      max_score,
      display_order,
      is_active
    } = req.body;

    // Get current microcompetency
    const currentMicro = await query(
      supabase
        .from('microcompetencies')
        .select('*')
        .eq('id', microcompetencyId)
        .single()
    );

    if (!currentMicro.rows || (Array.isArray(currentMicro.rows) && currentMicro.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Microcompetency not found',
        timestamp: new Date().toISOString()
      });
    }

    const current = Array.isArray(currentMicro.rows) ? currentMicro.rows[0] : currentMicro.rows;
    const updateData = {};

    // Build update object
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (max_score !== undefined) updateData.max_score = parseFloat(max_score);
    if (display_order !== undefined) updateData.display_order = parseInt(display_order);
    if (is_active !== undefined) updateData.is_active = is_active;

    // Handle weightage update with validation
    if (weightage !== undefined) {
      if (weightage <= 0 || weightage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid weightage',
          message: 'Weightage must be between 0 and 100',
          timestamp: new Date().toISOString()
        });
      }

      // Check total weightage for this component (excluding current microcompetency)
      const existingWeightages = await query(
        supabase
          .from('microcompetencies')
          .select('weightage')
          .eq('component_id', current.component_id)
          .eq('is_active', true)
          .neq('id', microcompetencyId)
      );

      const totalExistingWeightage = existingWeightages.rows.reduce(
        (sum, item) => sum + parseFloat(item.weightage), 0
      );

      if (totalExistingWeightage + parseFloat(weightage) > 100) {
        return res.status(400).json({
          success: false,
          error: 'Weightage exceeds limit',
          message: `Total weightage would be ${totalExistingWeightage + parseFloat(weightage)}%. Maximum allowed is 100%`,
          timestamp: new Date().toISOString()
        });
      }

      updateData.weightage = parseFloat(weightage);
    }

    // Update microcompetency
    const result = await query(
      supabase
        .from('microcompetencies')
        .update(updateData)
        .eq('id', microcompetencyId)
        .select(`
          id,
          name,
          description,
          weightage,
          max_score,
          display_order,
          is_active,
          updated_at,
          components:component_id(id, name)
        `)
        .single()
    );

    res.status(200).json({
      success: true,
      message: 'Microcompetency updated successfully',
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Update microcompetency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update microcompetency',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete microcompetency (soft delete)
const deleteMicrocompetency = async (req, res) => {
  try {
    const { microcompetencyId } = req.params;

    // Check if microcompetency exists
    const microcompetencyCheck = await query(
      supabase
        .from('microcompetencies')
        .select('id, name, component_id')
        .eq('id', microcompetencyId)
        .single()
    );

    if (!microcompetencyCheck.rows || (Array.isArray(microcompetencyCheck.rows) && microcompetencyCheck.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Microcompetency not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if microcompetency is used in any interventions
    const interventionCheck = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('id')
        .eq('microcompetency_id', microcompetencyId)
        .limit(1)
    );

    if (interventionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete microcompetency',
        message: 'This microcompetency is used in one or more interventions',
        timestamp: new Date().toISOString()
      });
    }

    // Check if there are any scores for this microcompetency
    const scoresCheck = await query(
      supabase
        .from('microcompetency_scores')
        .select('id')
        .eq('microcompetency_id', microcompetencyId)
        .limit(1)
    );

    if (scoresCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete microcompetency',
        message: 'This microcompetency has existing scores',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete by setting is_active to false
    const result = await query(
      supabase
        .from('microcompetencies')
        .update({ is_active: false })
        .eq('id', microcompetencyId)
        .select('id, name')
        .single()
    );

    res.status(200).json({
      success: true,
      message: 'Microcompetency deleted successfully',
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Delete microcompetency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete microcompetency',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get microcompetency by ID
const getMicrocompetencyById = async (req, res) => {
  try {
    const { microcompetencyId } = req.params;
    const result = await query(
      supabase
        .from('microcompetencies')
        .select(`
          id,
          name,
          description,
          weightage,
          max_score,
          display_order,
          is_active,
          created_at,
          updated_at,
          components:component_id(
            id,
            name
          )
        `)
        .eq('id', microcompetencyId)
        .single()
    );

    if (!result.rows || (Array.isArray(result.rows) && result.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Microcompetency not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Microcompetency retrieved successfully',
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get microcompetency by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve microcompetency',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get weightage usage for a component
const getComponentWeightageUsage = async (req, res) => {
  try {
    const { componentId } = req.params;

    // Check if component exists
    const componentCheck = await query(
      supabase
        .from('components')
        .select('id, name')
        .eq('id', componentId)
        .single()
    );

    if (!componentCheck.rows || (Array.isArray(componentCheck.rows) && componentCheck.rows.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        message: 'The specified component does not exist',
        timestamp: new Date().toISOString()
      });
    }

    // Get all active microcompetencies for this component
    const microcompetenciesResult = await query(
      supabase
        .from('microcompetencies')
        .select('id, name, weightage')
        .eq('component_id', componentId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    );

    const microcompetencies = microcompetenciesResult.rows || [];
    const totalUsedWeightage = microcompetencies.reduce(
      (sum, item) => sum + parseFloat(item.weightage), 0
    );
    const availableWeightage = 100 - totalUsedWeightage;

    res.status(200).json({
      success: true,
      message: 'Component weightage usage retrieved successfully',
      data: {
        component: Array.isArray(componentCheck.rows) ? componentCheck.rows[0] : componentCheck.rows,
        microcompetencies: microcompetencies,
        weightageUsage: {
          totalUsed: totalUsedWeightage,
          available: availableWeightage,
          percentage: totalUsedWeightage
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get component weightage usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve component weightage usage',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get microcompetencies for an intervention
const getMicrocompetenciesForIntervention = async (req, res) => {
  try {
    const { interventionId } = req.params;

    const result = await query(
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
            max_score,
            display_order,
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

    // Get teacher assignments separately to avoid complex join issues
    const teacherAssignmentsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          microcompetency_id,
          teacher_id,
          can_score,
          can_create_tasks,
          assigned_at,
          teachers:teacher_id(
            id,
            name,
            employee_id
          )
        `)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    // Group by quadrant and component for better organization
    const groupedData = result.rows.reduce((acc, item) => {
      const micro = item.microcompetencies;
      const quadrant = micro.components.sub_categories.quadrants;
      const component = micro.components;

      if (!acc[quadrant.id]) {
        acc[quadrant.id] = {
          quadrant: quadrant,
          components: {}
        };
      }

      if (!acc[quadrant.id].components[component.id]) {
        acc[quadrant.id].components[component.id] = {
          component: component,
          microcompetencies: []
        };
      }

      acc[quadrant.id].components[component.id].microcompetencies.push({
        id: micro.id,
        name: micro.name,
        description: micro.description,
        component_weightage: micro.weightage,
        intervention_weightage: item.weightage,
        max_score: item.max_score,
        display_order: micro.display_order,
        assigned_teachers: teacherAssignmentsResult.rows.filter(
          assignment => assignment.microcompetency_id === micro.id
        )
      });

      return acc;
    }, {});

    // Convert to array format
    const formattedData = Object.values(groupedData).map(quadrantData => ({
      quadrant: quadrantData.quadrant,
      components: Object.values(quadrantData.components)
    }));

    res.status(200).json({
      success: true,
      message: 'Intervention microcompetencies retrieved successfully',
      data: formattedData,
      count: result.rowCount,
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

module.exports = {
  getAllMicrocompetencies,
  getMicrocompetenciesByComponent,
  getMicrocompetenciesByQuadrant,
  createMicrocompetency,
  updateMicrocompetency,
  deleteMicrocompetency,
  getMicrocompetencyById,
  getComponentWeightageUsage,
  getMicrocompetenciesForIntervention
};
