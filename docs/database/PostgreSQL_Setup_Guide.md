# PostgreSQL & pgAdmin Setup Guide

## 🗄️ PostgreSQL Database Setup

### Database Information
- **Database Name**: `pep_score_nexus`
- **Username**: `postgres`
- **Password**: `newpassword`
- **Host**: `localhost`
- **Port**: `5432`

### Connection String
```
postgresql://postgres:newpassword@localhost:5432/pep_score_nexus
```

## 🔧 pgAdmin Setup (Optional GUI Tool)

### Installing pgAdmin
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install pgadmin4

# Or install pgAdmin4 web version
sudo apt install pgadmin4-web
sudo /usr/pgadmin4/bin/setup-web.sh
```

### Connecting to Database via pgAdmin
1. **Open pgAdmin** (usually available at http://localhost/pgadmin4 for web version)
2. **Add New Server**:
   - Right-click "Servers" → "Create" → "Server"
   - **General Tab**:
     - Name: `PEP Score Nexus`
   - **Connection Tab**:
     - Host: `localhost`
     - Port: `5432`
     - Database: `pep_score_nexus`
     - Username: `postgres`
     - Password: `newpassword`
3. **Click Save**

## 📊 Database Schema Overview

### Tables Created (31 total)
```
✅ User Management (4 tables)
├── users
├── user_sessions
├── teachers
└── admins

✅ Academic Structure (4 tables)
├── batches
├── sections
├── houses
└── terms

✅ Student Management (2 tables)
├── students
└── student_terms

✅ Assessment Framework (4 tables)
├── quadrants
├── sub_categories
├── components
└── scores

✅ Attendance System (2 tables)
├── attendance
└── attendance_summary

✅ Teacher Management (1 table)
└── teacher_assignments

✅ Intervention System (6 tables)
├── interventions
├── intervention_quadrants
├── intervention_teachers
├── intervention_enrollments
├── tasks
└── task_submissions

✅ Communication (2 tables)
├── feedback
└── notifications

✅ System Management (2 tables)
├── system_settings
└── audit_logs

✅ File & Data Management (3 tables)
├── file_uploads
├── data_imports
└── email_logs

✅ External Integration (1 table)
└── shl_integrations
```

## 🚀 Quick Database Commands

### Connect to Database
```bash
psql -U postgres -h localhost -d pep_score_nexus
```

### Common Queries
```sql
-- View all tables
\dt

-- View table structure
\d table_name

-- View all quadrants
SELECT * FROM quadrants;

-- View all students with batch info
SELECT s.name, s.registration_no, b.name as batch_name 
FROM students s 
JOIN batches b ON s.batch_id = b.id;

-- View student scores
SELECT s.name, c.name as component, sc.obtained_score, sc.max_score
FROM students s
JOIN scores sc ON s.id = sc.student_id
JOIN components c ON sc.component_id = c.id;

-- View attendance summary
SELECT s.name, q.name as quadrant, a.percentage
FROM students s
JOIN attendance_summary a ON s.id = a.student_id
JOIN quadrants q ON a.quadrant_id = q.id;
```

## 🔍 Useful pgAdmin Features

### 1. Query Tool
- **Location**: Right-click database → "Query Tool"
- **Use**: Run SQL queries directly
- **Shortcut**: F5 to execute

### 2. Table Viewer
- **Location**: Navigate to Tables in tree view
- **Use**: View table data, structure, and relationships
- **Features**: Sort, filter, edit data

### 3. ERD (Entity Relationship Diagram)
- **Location**: Right-click database → "ERD Tool"
- **Use**: Visual representation of table relationships
- **Features**: Drag tables, view foreign keys

### 4. Backup & Restore
- **Backup**: Right-click database → "Backup"
- **Restore**: Right-click database → "Restore"
- **Formats**: Custom, tar, plain SQL

### 5. Performance Monitoring
- **Location**: Dashboard tab
- **Features**: Active sessions, database size, query performance

## 📝 Sample Data Verification

### Check if data was inserted correctly:
```sql
-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'quadrants', COUNT(*) FROM quadrants
UNION ALL
SELECT 'components', COUNT(*) FROM components
UNION ALL
SELECT 'scores', COUNT(*) FROM scores;
```

### View sample student data:
```sql
SELECT 
    s.name,
    s.registration_no,
    s.overall_score,
    s.grade,
    b.name as batch,
    h.name as house
FROM students s
LEFT JOIN batches b ON s.batch_id = b.id
LEFT JOIN houses h ON s.house_id = h.id;
```

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Authentication Failed**
   - Check password: `newpassword`
   - Reset password if needed:
     ```bash
     sudo -u postgres psql
     ALTER USER postgres PASSWORD 'newpassword';
     ```

3. **Database Not Found**
   ```sql
   CREATE DATABASE pep_score_nexus;
   ```

4. **Permission Denied**
   ```bash
   sudo -u postgres psql
   ```

### Logs Location
- **PostgreSQL Logs**: `/var/log/postgresql/`
- **pgAdmin Logs**: `/var/log/pgadmin/`

## 🔗 API Integration

The database is now connected to the Node.js backend API:
- **API Base URL**: `http://localhost:3001/api/v1`
- **Health Check**: `http://localhost:3001/health`
- **Documentation**: `http://localhost:3001/`

### Test API Connection
```bash
# Test if APIs are working with database
curl http://localhost:3001/api/v1/quadrants
curl http://localhost:3001/api/v1/students
```

## 📚 Next Steps

1. **Explore Data**: Use pgAdmin to browse tables and relationships
2. **Run Queries**: Practice SQL queries in Query Tool
3. **Monitor Performance**: Check database performance metrics
4. **Backup Data**: Create regular backups of your database
5. **Scale Up**: Add more sample data for testing

The database is now production-ready with all 31 tables and sample data!
