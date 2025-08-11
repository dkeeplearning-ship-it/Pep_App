#!/usr/bin/env node

/**
 * PEP Score Nexus Database Schema Audit Script
 * 
 * This script connects to Supabase PostgreSQL database and performs a comprehensive
 * audit of the database schema including tables, constraints, indexes, foreign keys,
 * enums, functions, views, and more.
 * 
 * Usage: node audit_schema.js
 * 
 * Make sure to set your Supabase credentials in environment variables or update
 * the connection config below.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase Database Configuration
// Update these with your Supabase credentials
const DB_CONFIG = {
  host: process.env.SUPABASE_DB_HOST || 'db.hxxjdvecnhvqkgkscnmv.supabase.co',
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'Sri*9594',
  ssl: {
    rejectUnauthorized: true
  }
};

class DatabaseAuditor {
  constructor(config) {
    this.client = new Client(config);
    this.auditResults = {
      timestamp: new Date().toISOString(),
      database: config.database,
      host: config.host,
      summary: {},
      details: {}
    };
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to Supabase database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    console.log('🔌 Disconnected from database');
  }

  async executeQuery(query, description) {
    try {
      console.log(`🔍 ${description}...`);
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      console.error(`❌ Error in ${description}:`, error.message);
      return [];
    }
  }

  async auditTables() {
    const query = `
      SELECT 
        t.table_name,
        t.table_type,
        COALESCE(c.column_count, 0) as column_count,
        COALESCE(r.row_count, 0) as estimated_rows,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as table_size
      FROM information_schema.tables t
      LEFT JOIN (
        SELECT table_name, COUNT(*) as column_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        GROUP BY table_name
      ) c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT 
          schemaname, 
          tablename, 
          n_tup_ins + n_tup_upd + n_tup_del as row_count
        FROM pg_stat_user_tables
      ) r ON t.table_name = r.tablename
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const tables = await this.executeQuery(query, 'Auditing tables');
    this.auditResults.details.tables = tables;
    this.auditResults.summary.total_tables = tables.length;
    
    console.log(`📊 Found ${tables.length} tables`);
    return tables;
  }

  async auditViews() {
    const query = `
      SELECT 
        table_name as view_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const views = await this.executeQuery(query, 'Auditing views');
    this.auditResults.details.views = views;
    this.auditResults.summary.total_views = views.length;
    
    console.log(`👁️ Found ${views.length} views`);
    return views;
  }

  async auditColumns() {
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

    const columns = await this.executeQuery(query, 'Auditing columns');
    this.auditResults.details.columns = columns;
    this.auditResults.summary.total_columns = columns.length;
    
    console.log(`📋 Found ${columns.length} columns`);
    return columns;
  }

  async auditConstraints() {
    const query = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        CASE 
          WHEN tc.constraint_type = 'FOREIGN KEY' THEN
            ccu.table_name || '(' || ccu.column_name || ')'
          ELSE NULL
        END as references,
        rc.delete_rule,
        rc.update_rule,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
    `;

    const constraints = await this.executeQuery(query, 'Auditing constraints');
    this.auditResults.details.constraints = constraints;
    
    // Group constraints by type
    const constraintsByType = constraints.reduce((acc, constraint) => {
      acc[constraint.constraint_type] = (acc[constraint.constraint_type] || 0) + 1;
      return acc;
    }, {});
    
    this.auditResults.summary.constraints_by_type = constraintsByType;
    this.auditResults.summary.total_constraints = constraints.length;
    
    console.log(`🔒 Found ${constraints.length} constraints`);
    return constraints;
  }

  async auditIndexes() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef,
        CASE 
          WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
          WHEN indexdef LIKE '%btree%' THEN 'BTREE'
          WHEN indexdef LIKE '%gin%' THEN 'GIN'
          WHEN indexdef LIKE '%gist%' THEN 'GIST'
          ELSE 'OTHER'
        END as index_type
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes
      ORDER BY tablename, indexname;
    `;

    const indexes = await this.executeQuery(query, 'Auditing indexes');
    this.auditResults.details.indexes = indexes;
    this.auditResults.summary.total_indexes = indexes.length;
    
    console.log(`📇 Found ${indexes.length} custom indexes`);
    return indexes;
  }

  async auditEnums() {
    const query = `
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;

    const enums = await this.executeQuery(query, 'Auditing enums');
    this.auditResults.details.enums = enums;
    this.auditResults.summary.total_enums = enums.length;
    
    console.log(`🏷️ Found ${enums.length} enum types`);
    return enums;
  }

  async auditFunctions() {
    const query = `
      SELECT 
        routine_name as function_name,
        routine_type,
        data_type as return_type,
        routine_definition,
        external_language
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `;

    const functions = await this.executeQuery(query, 'Auditing functions');
    this.auditResults.details.functions = functions;
    this.auditResults.summary.total_functions = functions.length;
    
    console.log(`⚙️ Found ${functions.length} functions`);
    return functions;
  }

  async auditTriggers() {
    const query = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table as table_name,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;

    const triggers = await this.executeQuery(query, 'Auditing triggers');
    this.auditResults.details.triggers = triggers;
    this.auditResults.summary.total_triggers = triggers.length;
    
    console.log(`⚡ Found ${triggers.length} triggers`);
    return triggers;
  }

  async auditSequences() {
    const query = `
      SELECT 
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `;

    const sequences = await this.executeQuery(query, 'Auditing sequences');
    this.auditResults.details.sequences = sequences;
    this.auditResults.summary.total_sequences = sequences.length;
    
    console.log(`🔢 Found ${sequences.length} sequences`);
    return sequences;
  }

  async checkMicrocompetencyTaskSystem() {
    console.log('🎯 Checking Microcompetency-Centric Task System...');

    const checks = {
      task_microcompetencies_table: false,
      microcompetency_scores_table: false,
      weightage_constraints: false,
      task_functions: false,
      task_views: false,
      required_indexes: false,
      data_integrity: false
    };

    // Check if task_microcompetencies table exists with proper structure
    const taskMicrocompetenciesCheck = await this.executeQuery(`
      SELECT
        COUNT(*) as table_exists,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'task_microcompetencies' AND column_name = 'weightage') as has_weightage_column
      FROM information_schema.tables
      WHERE table_name = 'task_microcompetencies'
    `, 'Checking task_microcompetencies table structure');

    checks.task_microcompetencies_table = taskMicrocompetenciesCheck[0]?.table_exists > 0 &&
                                         taskMicrocompetenciesCheck[0]?.has_weightage_column > 0;

    // Check if microcompetency_scores table exists with proper structure
    const microcompetencyScoresCheck = await this.executeQuery(`
      SELECT
        COUNT(*) as table_exists,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'microcompetency_scores' AND column_name = 'percentage') as has_percentage_column
      FROM information_schema.tables
      WHERE table_name = 'microcompetency_scores'
    `, 'Checking microcompetency_scores table structure');

    checks.microcompetency_scores_table = microcompetencyScoresCheck[0]?.table_exists > 0 &&
                                         microcompetencyScoresCheck[0]?.has_percentage_column > 0;

    // Check weightage constraints (should be between 0 and 100)
    const weightageConstraintCheck = await this.executeQuery(`
      SELECT COUNT(*) as count
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%weightage%' OR check_clause LIKE '%weightage%'
    `, 'Checking weightage constraints');
    checks.weightage_constraints = weightageConstraintCheck[0]?.count > 0;

    // Check specific task-related functions
    const taskFunctionsCheck = await this.executeQuery(`
      SELECT
        COUNT(*) as total_functions,
        COUNT(CASE WHEN routine_name = 'calculate_microcompetency_score_from_task' THEN 1 END) as has_calc_function,
        COUNT(CASE WHEN routine_name = 'validate_task_weightages' THEN 1 END) as has_validation_function
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND (routine_name LIKE '%microcompetency%' OR routine_name LIKE '%task%')
    `, 'Checking task-related functions');

    checks.task_functions = taskFunctionsCheck[0]?.has_calc_function > 0 &&
                           taskFunctionsCheck[0]?.has_validation_function > 0;

    // Check specific task-related views
    const taskViewsCheck = await this.executeQuery(`
      SELECT
        COUNT(*) as total_views,
        COUNT(CASE WHEN table_name = 'task_microcompetency_summary' THEN 1 END) as has_summary_view,
        COUNT(CASE WHEN table_name = 'teacher_task_permissions' THEN 1 END) as has_permissions_view,
        COUNT(CASE WHEN table_name = 'student_microcompetency_progress' THEN 1 END) as has_progress_view
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND (table_name LIKE '%task%' OR table_name LIKE '%microcompetency%')
    `, 'Checking task-related views');

    checks.task_views = taskViewsCheck[0]?.has_summary_view > 0 &&
                       taskViewsCheck[0]?.has_permissions_view > 0 &&
                       taskViewsCheck[0]?.has_progress_view > 0;

    // Check required indexes for performance
    const requiredIndexesCheck = await this.executeQuery(`
      SELECT
        COUNT(*) as total_task_indexes
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (
          indexname LIKE 'idx_task_microcompetencies_%' OR
          indexname LIKE 'idx_microcompetency_scores_%' OR
          indexname LIKE 'idx_teacher_microcompetency_%'
        )
    `, 'Checking required indexes');
    checks.required_indexes = requiredIndexesCheck[0]?.total_task_indexes >= 5;

    // Check data integrity (foreign key relationships)
    const dataIntegrityCheck = await this.executeQuery(`
      SELECT COUNT(*) as fk_count
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('task_microcompetencies', 'microcompetency_scores')
    `, 'Checking data integrity constraints');
    checks.data_integrity = dataIntegrityCheck[0]?.fk_count >= 4; // Should have at least 4 FK constraints

    this.auditResults.details.microcompetency_task_system = checks;

    const systemReady = Object.values(checks).every(check => check);
    console.log(`🎯 Microcompetency Task System: ${systemReady ? '✅ READY' : '❌ INCOMPLETE'}`);

    // Detailed status for each component
    Object.entries(checks).forEach(([component, status]) => {
      console.log(`   ${component}: ${status ? '✅' : '❌'}`);
    });

    return checks;
  }

  async auditRLSPolicies() {
    console.log('🔐 Checking RLS Policies (should be minimal since using backend APIs)...');

    const query = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    const policies = await this.executeQuery(query, 'Auditing RLS policies');
    this.auditResults.details.rls_policies = policies;
    this.auditResults.summary.total_rls_policies = policies.length;

    // Check if RLS is enabled on tables
    const rlsEnabledQuery = `
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = true
      ORDER BY tablename;
    `;

    const rlsEnabledTables = await this.executeQuery(rlsEnabledQuery, 'Checking RLS enabled tables');
    this.auditResults.details.rls_enabled_tables = rlsEnabledTables;

    console.log(`🔐 Found ${policies.length} RLS policies on ${rlsEnabledTables.length} tables`);

    if (policies.length > 0) {
      console.log('⚠️  Note: RLS policies found. Since you\'re using backend APIs, consider if these are necessary.');
    }

    return { policies, rlsEnabledTables };
  }

  async auditDatabaseSettings() {
    console.log('⚙️ Checking database settings and configuration...');

    const settingsQuery = `
      SELECT
        name,
        setting,
        unit,
        category,
        short_desc
      FROM pg_settings
      WHERE name IN (
        'max_connections',
        'shared_buffers',
        'effective_cache_size',
        'maintenance_work_mem',
        'checkpoint_completion_target',
        'wal_buffers',
        'default_statistics_target',
        'random_page_cost',
        'effective_io_concurrency',
        'work_mem'
      )
      ORDER BY name;
    `;

    const settings = await this.executeQuery(settingsQuery, 'Checking database settings');
    this.auditResults.details.database_settings = settings;

    // Check database size
    const sizeQuery = `
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        current_database() as database_name;
    `;

    const sizeInfo = await this.executeQuery(sizeQuery, 'Checking database size');
    this.auditResults.details.database_size = sizeInfo[0];

    console.log(`💾 Database size: ${sizeInfo[0]?.database_size || 'Unknown'}`);

    return { settings, sizeInfo };
  }

  generateReport() {
    const report = {
      ...this.auditResults,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(__dirname, `schema_audit_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for missing indexes on foreign keys
    const foreignKeys = this.auditResults.details.constraints?.filter(c => c.constraint_type === 'FOREIGN KEY') || [];
    const indexes = this.auditResults.details.indexes || [];
    
    foreignKeys.forEach(fk => {
      const hasIndex = indexes.some(idx => 
        idx.tablename === fk.table_name && 
        idx.indexdef.includes(fk.column_name)
      );
      
      if (!hasIndex) {
        recommendations.push({
          type: 'PERFORMANCE',
          priority: 'HIGH',
          message: `Consider adding index on foreign key ${fk.table_name}.${fk.column_name}`
        });
      }
    });

    // Check for tables without primary keys
    const primaryKeys = this.auditResults.details.constraints?.filter(c => c.constraint_type === 'PRIMARY KEY') || [];
    const tables = this.auditResults.details.tables || [];
    
    tables.forEach(table => {
      const hasPrimaryKey = primaryKeys.some(pk => pk.table_name === table.table_name);
      if (!hasPrimaryKey) {
        recommendations.push({
          type: 'DATA_INTEGRITY',
          priority: 'HIGH',
          message: `Table ${table.table_name} is missing a primary key`
        });
      }
    });

    return recommendations;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE SCHEMA AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    const summary = this.auditResults.summary;
    
    console.log(`🗄️  Database: ${this.auditResults.database}`);
    console.log(`🌐 Host: ${this.auditResults.host}`);
    console.log(`⏰ Audit Time: ${this.auditResults.timestamp}`);
    console.log('');
    
    console.log('📈 SCHEMA STATISTICS:');
    console.log(`   Tables: ${summary.total_tables || 0}`);
    console.log(`   Views: ${summary.total_views || 0}`);
    console.log(`   Columns: ${summary.total_columns || 0}`);
    console.log(`   Constraints: ${summary.total_constraints || 0}`);
    console.log(`   Indexes: ${summary.total_indexes || 0}`);
    console.log(`   Enums: ${summary.total_enums || 0}`);
    console.log(`   Functions: ${summary.total_functions || 0}`);
    console.log(`   Triggers: ${summary.total_triggers || 0}`);
    console.log(`   Sequences: ${summary.total_sequences || 0}`);
    
    if (summary.constraints_by_type) {
      console.log('\n🔒 CONSTRAINTS BY TYPE:');
      Object.entries(summary.constraints_by_type).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async runFullAudit() {
    try {
      await this.connect();

      console.log('🚀 Starting comprehensive database schema audit...\n');

      await this.auditTables();
      await this.auditViews();
      await this.auditColumns();
      await this.auditConstraints();
      await this.auditIndexes();
      await this.auditEnums();
      await this.auditFunctions();
      await this.auditTriggers();
      await this.auditSequences();
      await this.auditRLSPolicies();
      await this.auditDatabaseSettings();
      await this.checkMicrocompetencyTaskSystem();

      this.printSummary();
      const report = this.generateReport();

      console.log('\n✅ Database audit completed successfully!');

      return report;

    } catch (error) {
      console.error('❌ Audit failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 PEP Score Nexus Database Schema Auditor');
  console.log('==========================================\n');
  
  // Check if required dependencies are installed
  try {
    require('pg');
  } catch (error) {
    console.error('❌ Missing dependency: pg');
    console.log('📦 Install with: npm install pg');
    process.exit(1);
  }
  
  const auditor = new DatabaseAuditor(DB_CONFIG);
  
  try {
    await auditor.runFullAudit();
  } catch (error) {
    console.error('💥 Audit failed:', error.message);
    process.exit(1);
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseAuditor, DB_CONFIG };
