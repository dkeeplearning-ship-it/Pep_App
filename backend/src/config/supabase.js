const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://hxxjdvecnhvqkgkscnmv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4eGpkdmVjbmh2cWtna3Njbm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzM0NzIsImV4cCI6MjA2NTQwOTQ3Mn0.DdzkZs9DdsWYzS-mx7v6cmOtESahiVUXhqY06mARah4';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to execute queries using Supabase REST API
const query = async (queryObject) => {
  try {
    const { data, error, count } = await queryObject;
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    // Mimic pg response format for compatibility
    return {
      rows: data || [],
      rowCount: data ? data.length : 0,
      totalCount: count
    };
  } catch (error) {
    console.error('❌ Supabase query execution error:', error);
    throw error;
  }
};

// Helper function for raw SQL queries (when needed)
const rawQuery = async (sql, params = []) => {
  try {
    // For complex queries, we'll use Supabase RPC functions
    // This is a placeholder - you can implement custom RPC functions in Supabase
    console.warn('⚠️  Raw SQL queries not directly supported via REST API');
    console.log('SQL:', sql, 'Params:', params);
    throw new Error('Raw SQL queries require RPC functions in Supabase');
  } catch (error) {
    console.error('❌ Raw query error:', error);
    throw error;
  }
};

// Test Supabase connection
const testConnection = async () => {
  try {
    const result = await query(
      supabase
        .from('quadrants')
        .select('*')
        .limit(1)
    );
    
    console.log('🎯 Supabase connection test successful:', {
      quadrants: result.rowCount,
      time: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  query,
  rawQuery,
  testConnection
}; 