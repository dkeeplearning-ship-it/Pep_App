# 🔍 PEP Score Nexus Database Schema Auditor

A comprehensive JavaScript tool to audit your Supabase PostgreSQL database schema, specifically designed for the PEP Score Nexus microcompetency-centric task system.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm
- Access to your Supabase database

### Setup & Run

**Option 1: Automated Setup (Recommended)**

```bash
# Linux/Mac
chmod +x setup_audit.sh
./setup_audit.sh

# Windows
setup_audit.bat
```

**Option 2: Manual Setup**

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Run audit
npm run audit
```

## 🔧 Configuration

Create a `.env` file with your Supabase database credentials:

```env
SUPABASE_DB_HOST=your-project-ref.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
```

### Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection info** section
4. Use the **Direct connection** details

## 📊 What Gets Audited

### 🗄️ Core Database Elements

- **Tables**: Structure, row counts, sizes
- **Views**: Custom views and their definitions
- **Columns**: Data types, constraints, defaults
- **Constraints**: Primary keys, foreign keys, unique, check constraints
- **Indexes**: Performance indexes and their types
- **Enums**: Custom enum types and values
- **Functions**: Stored procedures and functions
- **Triggers**: Database triggers and their actions
- **Sequences**: Auto-increment sequences

### 🎯 Microcompetency Task System Checks

- **task_microcompetencies** table structure
- **microcompetency_scores** table structure
- Weightage validation constraints
- Required functions (calculate_microcompetency_score_from_task, validate_task_weightages)
- Essential views (task_microcompetency_summary, teacher_task_permissions, student_microcompetency_progress)
- Performance indexes for task operations
- Data integrity constraints

### 🔐 Security & Configuration

- **RLS Policies**: Row Level Security policies (should be minimal for backend API approach)
- **Database Settings**: Performance and configuration parameters
- **Database Size**: Storage usage information

## 📈 Output & Reports

### Console Output

The audit provides real-time feedback with:
- ✅ Success indicators
- ❌ Missing components
- 📊 Summary statistics
- 🎯 System readiness status

### JSON Report

A detailed JSON report is generated with:
- Complete schema information
- Audit timestamp and metadata
- Recommendations for improvements
- System health indicators

Example report structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "postgres",
  "host": "your-project.supabase.co",
  "summary": {
    "total_tables": 25,
    "total_views": 3,
    "total_constraints": 45,
    "total_indexes": 30
  },
  "details": {
    "tables": [...],
    "constraints": [...],
    "microcompetency_task_system": {
      "task_microcompetencies_table": true,
      "microcompetency_scores_table": true,
      "weightage_constraints": true,
      "task_functions": true,
      "task_views": true,
      "required_indexes": true,
      "data_integrity": true
    }
  },
  "recommendations": [...]
}
```

## 🔍 Understanding the Results

### ✅ System Ready Indicators

- **Green checkmarks**: Component is properly configured
- **All microcompetency checks pass**: Task system is ready for use
- **Proper constraints**: Data integrity is enforced
- **Required indexes**: Performance is optimized

### ❌ Issues to Address

- **Missing tables/views**: Core components not installed
- **Missing constraints**: Data integrity at risk
- **Missing indexes**: Performance may be poor
- **RLS policies present**: May conflict with backend API approach

### 📊 Performance Insights

- **Table sizes**: Identify large tables that may need optimization
- **Index coverage**: Ensure foreign keys have supporting indexes
- **Constraint distribution**: Verify data integrity measures

## 🛠️ Common Issues & Solutions

### Connection Issues

```bash
# Error: Connection refused
# Solution: Check your Supabase credentials and network access

# Error: Authentication failed
# Solution: Verify your database password and user permissions
```

### Missing Components

```bash
# Error: task_microcompetencies table not found
# Solution: Run the database setup script or migration

# Error: Required functions missing
# Solution: Execute the database_setup.sql script
```

### Performance Warnings

```bash
# Warning: Missing indexes on foreign keys
# Solution: Add indexes for better query performance

# Warning: Large tables without proper indexing
# Solution: Review and add appropriate indexes
```

## 📋 Audit Checklist

Use this checklist to verify your database is ready:

### Core Schema
- [ ] All required tables exist
- [ ] Primary keys are defined
- [ ] Foreign key relationships are correct
- [ ] Check constraints are in place
- [ ] Indexes are optimized

### Microcompetency Task System
- [ ] task_microcompetencies table exists with weightage column
- [ ] microcompetency_scores table exists with percentage column
- [ ] Weightage constraints (0-100%) are enforced
- [ ] Required functions are available
- [ ] Essential views are created
- [ ] Performance indexes are in place
- [ ] Data integrity constraints are active

### Security & Performance
- [ ] RLS policies are minimal (backend API approach)
- [ ] Database settings are optimized
- [ ] No critical performance issues
- [ ] Backup strategy is in place

## 🔄 Regular Auditing

### When to Run Audits

- **After schema changes**: Verify new components are properly installed
- **Before deployments**: Ensure database is ready for new features
- **Performance issues**: Identify missing indexes or constraints
- **Regular maintenance**: Monthly health checks

### Automation

You can integrate this audit into your CI/CD pipeline:

```bash
# In your deployment script
npm run audit
if [ $? -ne 0 ]; then
    echo "Database audit failed - stopping deployment"
    exit 1
fi
```

## 🆘 Troubleshooting

### Debug Mode

Run with verbose logging:
```bash
npm run audit:verbose
```

### Manual Connection Test

Test your connection manually:
```javascript
const { Client } = require('pg');
const client = new Client({
  host: 'your-project.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'your-password',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log('Connected!'))
  .catch(err => console.error('Connection error:', err));
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Network/firewall issue | Check Supabase project status and network |
| `authentication failed` | Wrong credentials | Verify username/password |
| `database does not exist` | Wrong database name | Use 'postgres' for Supabase |
| `SSL required` | SSL configuration | Ensure SSL is enabled in config |

## 📞 Support

For issues with the audit tool:

1. Check the troubleshooting section above
2. Verify your Supabase credentials
3. Ensure your database is accessible
4. Review the generated error logs

For database schema issues:
1. Run the database setup script
2. Check the migration scripts
3. Verify all required components are installed

## 🎯 Next Steps

After a successful audit:

1. **Address any recommendations** in the generated report
2. **Set up regular auditing** in your maintenance schedule
3. **Monitor performance** using the insights provided
4. **Keep the audit tool updated** as your schema evolves

The audit tool ensures your PEP Score Nexus database is optimized, secure, and ready for the microcompetency-centric task system!
