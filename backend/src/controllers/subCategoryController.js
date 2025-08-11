const { supabase, query } = require('../config/supabase');

// Get all sub-categories
const getAllSubCategories = async (req, res) => {
  try {
    const { quadrant_id, include_inactive = false } = req.query;
    
    let queryBuilder = supabase
      .from('sub_categories')
      .select(`
        id,
        quadrant_id,
        name,
        description,
        weightage,
        is_active,
        display_order,
        created_at,
        updated_at,
        quadrants:quadrant_id(id, name)
      `)
      .order('display_order', { ascending: true });

    if (quadrant_id) {
      queryBuilder = queryBuilder.eq('quadrant_id', quadrant_id);
    }

    if (include_inactive !== 'true') {
      queryBuilder = queryBuilder.eq('is_active', true);
    }

    const result = await query(queryBuilder);

    res.status(200).json({
      success: true,
      message: 'Sub-categories retrieved successfully',
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sub-categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-categories',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get sub-category by ID
const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      supabase
        .from('sub_categories')
        .select(`
          id,
          quadrant_id,
          name,
          description,
          weightage,
          is_active,
          display_order,
          created_at,
          updated_at,
          quadrants:quadrant_id(id, name),
          components:components!sub_category_id(
            id,
            name,
            description,
            weightage,
            max_score,
            category,
            is_active,
            display_order
          )
        `)
        .eq('id', id)
        .eq('components.is_active', true)
        .order('components.display_order', { ascending: true })
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sub-category retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-category',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create sub-category
const createSubCategory = async (req, res) => {
  try {
    const { quadrant_id, name, description, weightage, display_order } = req.body;

    // Validate required fields
    if (!quadrant_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Quadrant ID and name are required',
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

    // Check if quadrant exists
    const quadrantCheck = await query(
      supabase.from('quadrants').select('id').eq('id', quadrant_id).eq('is_active', true)
    );

    if (!quadrantCheck.rows || quadrantCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quadrant ID',
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicate name within the same quadrant
    const duplicateCheck = await query(
      supabase.from('sub_categories')
        .select('id')
        .eq('quadrant_id', quadrant_id)
        .eq('name', name)
        .eq('is_active', true)
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Sub-category with this name already exists in this quadrant',
        timestamp: new Date().toISOString()
      });
    }

    // Get next display order if not provided
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined) {
      const maxOrderResult = await query(
        supabase.from('sub_categories')
          .select('display_order')
          .eq('quadrant_id', quadrant_id)
          .order('display_order', { ascending: false })
          .limit(1)
      );
      finalDisplayOrder = (maxOrderResult.rows[0]?.display_order || 0) + 1;
    }

    const result = await query(
      supabase.from('sub_categories')
        .insert({
          quadrant_id,
          name,
          description,
          weightage: weightage || 0,
          display_order: finalDisplayOrder,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
    );

    res.status(201).json({
      success: true,
      message: 'Sub-category created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-category',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update sub-category
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, weightage, display_order, is_active } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Sub-category name is required',
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

    // Check if sub-category exists
    const existingSubCategory = await query(
      supabase.from('sub_categories').select('id, quadrant_id').eq('id', id)
    );

    if (!existingSubCategory.rows || existingSubCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check for duplicate name within the same quadrant (excluding current record)
    const duplicateCheck = await query(
      supabase.from('sub_categories')
        .select('id')
        .eq('quadrant_id', existingSubCategory.rows[0].quadrant_id)
        .eq('name', name)
        .neq('id', id)
        .eq('is_active', true)
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Sub-category with this name already exists in this quadrant',
        timestamp: new Date().toISOString()
      });
    }

    // Update sub-category
    const updateData = {
      name,
      description,
      weightage,
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
      supabase.from('sub_categories')
        .update(updateData)
        .eq('id', id)
        .select('*')
    );

    res.status(200).json({
      success: true,
      message: 'Sub-category updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-category',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete sub-category
const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sub-category exists
    const existingSubCategory = await query(
      supabase.from('sub_categories').select('id, name').eq('id', id)
    );

    if (!existingSubCategory.rows || existingSubCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if sub-category has components
    const componentsCheck = await query(
      supabase.from('components').select('id').eq('sub_category_id', id).limit(1)
    );

    if (componentsCheck.rows && componentsCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sub-category with existing components. Please delete components first.',
        timestamp: new Date().toISOString()
      });
    }

    // Soft delete by setting is_active to false
    const result = await query(
      supabase.from('sub_categories')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select('*')
    );

    res.status(200).json({
      success: true,
      message: 'Sub-category deleted successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-category',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getAllSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
};
