const { supabase, query } = require('../config/supabase');

// Get all components
const getAllComponents = async (req, res) => {
  try {
    const { sub_category_id, quadrant_id, include_inactive = false } = req.query;
    
    let queryBuilder = supabase
      .from('components')
      .select(`
        id,
        sub_category_id,
        name,
        description,
        weightage,
        max_score,
        category,
        is_active,
        display_order,
        created_at,
        updated_at,
        sub_categories:sub_category_id(
          id,
          name,
          quadrants:quadrant_id(id, name)
        )
      `)
      .order('display_order', { ascending: true });

    if (sub_category_id) {
      queryBuilder = queryBuilder.eq('sub_category_id', sub_category_id);
    }

    if (quadrant_id) {
      queryBuilder = queryBuilder.eq('sub_categories.quadrant_id', quadrant_id);
    }

    if (include_inactive !== 'true') {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    const result = await query(queryBuilder);

    res.status(200).json({
      success: true,
      message: 'Components retrieved successfully',
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve components',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get component by ID
const getComponentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      supabase
        .from('components')
        .select(`
          id,
          sub_category_id,
          name,
          description,
          weightage,
          max_score,
          category,
          is_active,
          display_order,
          created_at,
          updated_at,
          sub_categories:sub_category_id(
            id,
            name,
            quadrants:quadrant_id(id, name)
          ),
          microcompetencies:microcompetencies!component_id(
            id,
            name,
            description,
            weightage,
            max_score,
            is_active,
            display_order
          )
        `)
        .eq('id', id)
        .eq('microcompetencies.is_active', true)
        .order('microcompetencies.display_order', { ascending: true })
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Component not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Component retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve component',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create component
const createComponent = async (req, res) => {
  try {
    const { sub_category_id, name, description, weightage, max_score, category, display_order } = req.body;

    // Validate required fields
    if (!sub_category_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Sub-category ID and name are required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate weightage
    if (weightage !== undefined && (weightage < 0 || weightage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Weightage must be between 0 and 100',
        timestamp: new Date().toISOString()
      });
    }

    // Validate max_score
    if (max_score !== undefined && max_score <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Max score must be greater than 0',
        timestamp: new Date().toISOString()
      });
    }

    // Check if sub-category exists
    const subCategoryCheck = await query(
      supabase.from('sub_categories').select('id').eq('id', sub_category_id).eq('is_active', true)
    );

    if (!subCategoryCheck.rows || subCategoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sub-category ID',
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicate name within the same sub-category
    const duplicateCheck = await query(
      supabase.from('components')
        .select('id')
        .eq('sub_category_id', sub_category_id)
        .eq('name', name)
        .eq('is_active', true)
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Component with this name already exists in this sub-category',
        timestamp: new Date().toISOString()
      });
    }

    // Get next display order if not provided
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined) {
      const maxOrderResult = await query(
        supabase.from('components')
          .select('display_order')
          .eq('sub_category_id', sub_category_id)
          .order('display_order', { ascending: false })
          .limit(1)
      );
      finalDisplayOrder = (maxOrderResult.rows[0]?.display_order || 0) + 1;
    }

    const result = await query(
      supabase.from('components')
        .insert({
          sub_category_id,
          name,
          description,
          weightage: weightage || 0,
          max_score: max_score || 10,
          category: category || 'Professional',
          display_order: finalDisplayOrder,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
    );

    res.status(201).json({
      success: true,
      message: 'Component created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating component:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create component',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update component
const updateComponent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, weightage, max_score, category, display_order, is_active } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Component name is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate weightage
    if (weightage !== undefined && (weightage < 0 || weightage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Weightage must be between 0 and 100',
        timestamp: new Date().toISOString()
      });
    }

    // Validate max_score
    if (max_score !== undefined && max_score <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Max score must be greater than 0',
        timestamp: new Date().toISOString()
      });
    }

    // Check if component exists
    const existingComponent = await query(
      supabase.from('components').select('id, sub_category_id').eq('id', id)
    );

    if (!existingComponent.rows || existingComponent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Component not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicate name within the same sub-category (excluding current record)
    const duplicateCheck = await query(
      supabase.from('components')
        .select('id')
        .eq('sub_category_id', existingComponent.rows[0].sub_category_id)
        .eq('name', name)
        .neq('id', id)
        .eq('is_active', true)
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Component with this name already exists in this sub-category',
        timestamp: new Date().toISOString()
      });
    }

    // Update component
    const updateData = {
      name,
      description,
      weightage,
      max_score,
      category,
      display_order,
      is_active,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const result = await query(
      supabase.from('components')
        .update(updateData)
        .eq('id', id)
        .select('*')
    );

    res.status(200).json({
      success: true,
      message: 'Component updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update component',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete component
const deleteComponent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if component exists
    const existingComponent = await query(
      supabase.from('components').select('id, name').eq('id', id)
    );

    if (!existingComponent.rows || existingComponent.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Component not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if component has microcompetencies
    const microcompetenciesCheck = await query(
      supabase.from('microcompetencies').select('id').eq('component_id', id).limit(1)
    );

    if (microcompetenciesCheck.rows && microcompetenciesCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete component with existing microcompetencies. Please delete microcompetencies first.',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete by setting is_active to false
    const result = await query(
      supabase.from('components')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select('*')
    );

    res.status(200).json({
      success: true,
      message: 'Component deleted successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete component',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getAllComponents,
  getComponentById,
  createComponent,
  updateComponent,
  deleteComponent
};
