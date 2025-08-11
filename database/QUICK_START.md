# 🚀 Quick Start: Database Schema Auditor

## 📋 Prerequisites

- Node.js (v14+)
- npm
- Supabase database access

## ⚡ Super Quick Setup

### 1. Automated Setup (Recommended)

```bash
# Linux/Mac
cd database/
./setup_audit.sh

# Windows
cd database\
setup_audit.bat
```

### 2. Manual Setup

```bash
# Navigate to database directory
cd database/

# Install dependencies
npm install

# Configure credentials
cp .env.example .env
# Edit .env with your Supabase credentials

# Test connection
npm run test-connection

# Run full audit
npm run audit
```

## 🔧 Configuration

Edit `.env` file with your Supabase credentials:

```env
SUPABASE_DB_HOST=your-project-ref.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
```

### 🔍 Finding Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Connection info** section
5. Use **Direct connection** details

## 🎯 What You'll Get

### Console Output
- ✅ Real-time audit progress
- 📊 Summary statistics
- 🎯 Microcompetency system status
- ❌ Issues and recommendations

### JSON Report
- Complete schema details
- Performance recommendations
- System readiness assessment
- Detailed audit results

## 🔍 Available Commands

```bash
# Test database connection
npm run test-connection

# Run full audit
npm run audit

# Run with verbose logging
npm run audit:verbose

# Install dependencies only
npm run setup
```

## 🎯 Microcompetency System Checks

The auditor specifically checks for:

- ✅ **task_microcompetencies** table with weightage support
- ✅ **microcompetency_scores** table for automatic updates
- ✅ Weightage validation constraints (0-100%)
- ✅ Required functions for score calculations
- ✅ Essential views for reporting
- ✅ Performance indexes
- ✅ Data integrity constraints

## 🚨 Common Issues

### Connection Problems
```bash
# Error: ECONNREFUSED
# Solution: Check Supabase project status and credentials

# Error: Authentication failed
# Solution: Verify database password in .env file
```

### Missing Dependencies
```bash
# Error: Cannot find module 'pg'
# Solution: Run npm install
```

### Schema Issues
```bash
# Error: Tables not found
# Solution: Run database_setup.sql script first
```

## 📊 Success Indicators

After a successful audit, you should see:

- ✅ **Database Connection**: Successful
- ✅ **Tables Found**: 20+ tables
- ✅ **Microcompetency System**: Ready
- ✅ **Constraints**: Properly configured
- ✅ **Indexes**: Performance optimized

## 🔄 Next Steps

1. **Address any issues** found in the audit
2. **Run database setup** if tables are missing
3. **Review recommendations** in the JSON report
4. **Set up regular auditing** for maintenance

## 📞 Quick Help

### Test Connection First
```bash
npm run test-connection
```
This will verify your credentials and basic database access.

### Full Audit
```bash
npm run audit
```
This runs the comprehensive schema audit.

### Check Results
- Console output shows immediate results
- JSON file contains detailed report
- Look for ✅ green checkmarks for success

## 🎉 You're Ready!

Once the audit shows all green checkmarks, your database is ready for the PEP Score Nexus microcompetency-centric task system!

The audit ensures:
- All required tables exist
- Constraints are properly configured
- Performance is optimized
- Data integrity is maintained
- Microcompetency system is functional
