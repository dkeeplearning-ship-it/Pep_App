#!/usr/bin/env node

/**
 * Simple connection test for Supabase database
 * Use this to verify your credentials before running the full audit
 */

require('dotenv').config();
const { Client } = require('pg');

const DB_CONFIG = {
  host: process.env.SUPABASE_DB_HOST || 'your-project-ref.supabase.co',
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'your-password',
  ssl: {
    rejectUnauthorized: false
  }
};

async function testConnection() {
  console.log('🔍 Testing Supabase Database Connection');
  console.log('=====================================\n');
  
  console.log('📋 Connection Details:');
  console.log(`   Host: ${DB_CONFIG.host}`);
  console.log(`   Port: ${DB_CONFIG.port}`);
  console.log(`   Database: ${DB_CONFIG.database}`);
  console.log(`   User: ${DB_CONFIG.user}`);
  console.log(`   Password: ${'*'.repeat(DB_CONFIG.password.length)}`);
  console.log('');

  const client = new Client(DB_CONFIG);

  try {
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!');

    // Test basic query
    console.log('🔍 Testing basic query...');
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('✅ Query successful!');
    
    console.log('\n📊 Database Information:');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    console.log(`   Current Database: ${result.rows[0].current_database}`);
    console.log(`   Current User: ${result.rows[0].current_user}`);

    // Test table count
    console.log('\n🗄️ Checking tables...');
    const tableResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`   Public Tables: ${tableResult.rows[0].table_count}`);

    // Check for key PEP Score Nexus tables
    console.log('\n🎯 Checking PEP Score Nexus tables...');
    const pepTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('users', 'students', 'teachers', 'interventions', 'tasks', 'task_microcompetencies', 'microcompetency_scores')
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'students', 'teachers', 'interventions', 'tasks', 'task_microcompetencies', 'microcompetency_scores'];
    const foundTables = pepTables.rows.map(row => row.table_name);
    
    expectedTables.forEach(table => {
      const exists = foundTables.includes(table);
      console.log(`   ${table}: ${exists ? '✅' : '❌'}`);
    });

    const readyForAudit = foundTables.length >= 4; // At least basic tables should exist
    
    console.log('\n🎉 Connection Test Results:');
    console.log(`   Database Connection: ✅ SUCCESS`);
    console.log(`   Basic Queries: ✅ SUCCESS`);
    console.log(`   PEP Tables Found: ${foundTables.length}/${expectedTables.length}`);
    console.log(`   Ready for Full Audit: ${readyForAudit ? '✅ YES' : '⚠️  PARTIAL'}`);
    
    if (readyForAudit) {
      console.log('\n🚀 Your database is ready for the full audit!');
      console.log('   Run: npm run audit');
    } else {
      console.log('\n⚠️  Some tables are missing. You may need to:');
      console.log('   1. Run the database setup script');
      console.log('   2. Import your existing schema');
      console.log('   3. Check if you\'re connected to the right database');
    }

  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('\n🔧 Error Details:');
    console.log(`   Error Code: ${error.code || 'Unknown'}`);
    console.log(`   Error Message: ${error.message}`);
    
    console.log('\n💡 Troubleshooting Tips:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   - Check if your Supabase project is active');
      console.log('   - Verify the host URL is correct');
      console.log('   - Check your internet connection');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   - Verify the SUPABASE_DB_HOST is correct');
      console.log('   - Check for typos in the host URL');
    } else if (error.message.includes('authentication')) {
      console.log('   - Check your database password');
      console.log('   - Verify the username is correct');
      console.log('   - Ensure your Supabase project allows connections');
    } else if (error.message.includes('SSL')) {
      console.log('   - SSL connection issue - this is usually handled automatically');
      console.log('   - Check if your Supabase project requires specific SSL settings');
    } else {
      console.log('   - Double-check all your .env variables');
      console.log('   - Ensure your Supabase project is not paused');
      console.log('   - Try connecting from Supabase dashboard first');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify your .env file has correct Supabase credentials');
    console.log('   2. Check your Supabase project status in the dashboard');
    console.log('   3. Test connection from Supabase SQL editor first');
    
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed.');
  }
}

// Run the test
if (require.main === module) {
  testConnection().catch(console.error);
}

module.exports = { testConnection, DB_CONFIG };
