/**
 * Transaction Wrapper Utility
 * Provides transaction support for database operations
 */

const { supabase } = require('../config/supabase');

/**
 * Execute multiple operations in a transaction-like manner
 * Note: Supabase doesn't support traditional transactions, so we implement
 * a rollback mechanism for failed operations
 */
const executeWithRollback = async (operations) => {
  const completedOperations = [];
  const rollbackOperations = [];
  
  try {
    // Execute operations sequentially
    for (const operation of operations) {
      const result = await operation.execute();
      
      completedOperations.push({
        operation,
        result,
        rollback: operation.rollback
      });
      
      // Store rollback operation if provided
      if (operation.rollback) {
        rollbackOperations.unshift(operation.rollback);
      }
    }
    
    return {
      success: true,
      results: completedOperations.map(op => op.result),
      completedCount: completedOperations.length
    };
    
  } catch (error) {
    console.error('❌ Transaction failed, attempting rollback:', error);
    
    // Attempt to rollback completed operations
    const rollbackResults = [];
    for (const rollbackOp of rollbackOperations) {
      try {
        const rollbackResult = await rollbackOp();
        rollbackResults.push({ success: true, result: rollbackResult });
      } catch (rollbackError) {
        console.error('❌ Rollback operation failed:', rollbackError);
        rollbackResults.push({ success: false, error: rollbackError.message });
      }
    }
    
    return {
      success: false,
      error: error.message,
      completedCount: completedOperations.length,
      rollbackResults
    };
  }
};

/**
 * Create a bulk upsert operation with rollback
 */
const createBulkUpsertOperation = (tableName, data, conflictColumns, rollbackData = null) => {
  return {
    execute: async () => {
      const { data: result, error } = await supabase
        .from(tableName)
        .upsert(data, { onConflict: conflictColumns.join(',') });
      
      if (error) throw error;
      return result;
    },
    
    rollback: rollbackData ? async () => {
      // If rollback data provided, restore previous values
      const { data: result, error } = await supabase
        .from(tableName)
        .upsert(rollbackData, { onConflict: conflictColumns.join(',') });
      
      if (error) throw error;
      return result;
    } : null
  };
};

/**
 * Create a bulk delete operation with rollback
 */
const createBulkDeleteOperation = (tableName, condition, backupData = null) => {
  return {
    execute: async () => {
      const { data: result, error } = await supabase
        .from(tableName)
        .delete()
        .match(condition);
      
      if (error) throw error;
      return result;
    },
    
    rollback: backupData ? async () => {
      // Restore deleted data
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(backupData);
      
      if (error) throw error;
      return result;
    } : null
  };
};

/**
 * Wrapper for weightage update operations with validation
 */
const updateWeightagesWithTransaction = async (updates) => {
  const operations = [];
  
  // Prepare operations
  for (const update of updates) {
    const { tableName, data, conflictColumns, validationFn } = update;
    
    // Add validation operation
    if (validationFn) {
      operations.push({
        execute: async () => {
          const isValid = await validationFn(data);
          if (!isValid) {
            throw new Error(`Validation failed for ${tableName}`);
          }
          return { validated: true };
        },
        rollback: null
      });
    }
    
    // Add upsert operation
    operations.push(createBulkUpsertOperation(tableName, data, conflictColumns));
  }
  
  return await executeWithRollback(operations);
};

/**
 * Wrapper for cascade delete operations
 */
const cascadeDeleteWithTransaction = async (entityType, entityId) => {
  const operations = [];
  
  try {
    switch (entityType) {
      case 'quadrant':
        // Get all dependent subcategories
        const { data: subcategories } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('quadrant_id', entityId);
        
        // Delete components for each subcategory
        for (const subcategory of subcategories || []) {
          const { data: components } = await supabase
            .from('components')
            .select('*')
            .eq('sub_category_id', subcategory.id);
          
          // Delete microcompetencies for each component
          for (const component of components || []) {
            operations.push(createBulkDeleteOperation(
              'microcompetencies',
              { component_id: component.id },
              await supabase.from('microcompetencies').select('*').eq('component_id', component.id).then(r => r.data)
            ));
          }
          
          // Delete components
          operations.push(createBulkDeleteOperation(
            'components',
            { sub_category_id: subcategory.id },
            components
          ));
        }
        
        // Delete subcategories
        operations.push(createBulkDeleteOperation(
          'sub_categories',
          { quadrant_id: entityId },
          subcategories
        ));
        
        // Delete quadrant
        const { data: quadrant } = await supabase
          .from('quadrants')
          .select('*')
          .eq('id', entityId)
          .single();
        
        operations.push(createBulkDeleteOperation(
          'quadrants',
          { id: entityId },
          [quadrant]
        ));
        break;
        
      case 'subcategory':
        // Similar logic for subcategory cascade delete
        const { data: components } = await supabase
          .from('components')
          .select('*')
          .eq('sub_category_id', entityId);
        
        for (const component of components || []) {
          operations.push(createBulkDeleteOperation(
            'microcompetencies',
            { component_id: component.id },
            await supabase.from('microcompetencies').select('*').eq('component_id', component.id).then(r => r.data)
          ));
        }
        
        operations.push(createBulkDeleteOperation(
          'components',
          { sub_category_id: entityId },
          components
        ));
        
        const { data: subcategory } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('id', entityId)
          .single();
        
        operations.push(createBulkDeleteOperation(
          'sub_categories',
          { id: entityId },
          [subcategory]
        ));
        break;
        
      case 'component':
        // Delete microcompetencies
        const { data: microcompetencies } = await supabase
          .from('microcompetencies')
          .select('*')
          .eq('component_id', entityId);
        
        operations.push(createBulkDeleteOperation(
          'microcompetencies',
          { component_id: entityId },
          microcompetencies
        ));
        
        const { data: component } = await supabase
          .from('components')
          .select('*')
          .eq('id', entityId)
          .single();
        
        operations.push(createBulkDeleteOperation(
          'components',
          { id: entityId },
          [component]
        ));
        break;
    }
    
    return await executeWithRollback(operations);
    
  } catch (error) {
    console.error('❌ Cascade delete preparation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Middleware to wrap route handlers with transaction support
 */
const withTransaction = (handler) => {
  return async (req, res, next) => {
    try {
      // Add transaction utilities to request object
      req.transaction = {
        executeWithRollback,
        updateWeightagesWithTransaction,
        cascadeDeleteWithTransaction,
        createBulkUpsertOperation,
        createBulkDeleteOperation
      };
      
      await handler(req, res, next);
    } catch (error) {
      console.error('❌ Transaction wrapper error:', error);
      res.status(500).json({
        success: false,
        error: 'TRANSACTION_ERROR',
        message: 'Transaction failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = {
  executeWithRollback,
  createBulkUpsertOperation,
  createBulkDeleteOperation,
  updateWeightagesWithTransaction,
  cascadeDeleteWithTransaction,
  withTransaction
};
