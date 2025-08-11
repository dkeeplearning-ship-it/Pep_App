# 🤝 PEP Score Nexus - Team Database Sharing Guide

## 🎯 **Quick Start for Team Members**

### **Option 1: Use pgAdmin Web Interface (Recommended)**
1. **Access pgAdmin**: http://127.0.0.1/pgadmin4
2. **Login Credentials**:
   - Email: `admin@pepscorennexus.com`
   - Password: `admin123`
3. **Add Database Server** (see detailed steps below)

### **Option 2: Use Automated Setup Script**
```bash
# Run the team setup script
./team_pgadmin_setup.sh
```

### **Option 3: Import Database Backup**
```bash
# If you have the backup file
psql -U postgres -h localhost -c "CREATE DATABASE pep_score_nexus;"
psql -U postgres -h localhost -d pep_score_nexus < pep_score_nexus_backup.sql
```

## 🔧 **pgAdmin Database Connection Setup**

### **Step-by-Step Instructions**

1. **Open pgAdmin4**
   - URL: http://127.0.0.1/pgadmin4
   - Login with team credentials above

2. **Create New Server Connection**
   - Right-click "Servers" → "Create" → "Server..."

3. **General Tab**
   ```
   Name: PEP Score Nexus Database
   Server Group: Servers
   Comments: Production database for PEP Score Nexus project
   ```

4. **Connection Tab**
   ```
   Host name/address: localhost
   Port: 5432
   Maintenance database: pep_score_nexus
   Username: postgres
   Password: newpassword
   Save password: ✅ (checked)
   ```

5. **Click "Save"**

### **Verification**
After connection, you should see:
- **31 Tables** in the database
- **Sample Data** in students, quadrants, scores tables
- **Working Queries** in the Query Tool

## 📊 **Database Overview for Team**

### **Database Structure (31 Tables)**
```
🏗️ Core Tables:
├── users (6 records) - User accounts
├── students (3 records) - Student information  
├── teachers (2 records) - Teacher information
├── quadrants (4 records) - Assessment quadrants
├── components (4 records) - Assessment components
├── scores (3 records) - Student scores
└── attendance_summary (2 records) - Attendance data

📚 Supporting Tables:
├── batches, sections, houses, terms
├── sub_categories, teacher_assignments
├── interventions, tasks, feedback
├── notifications, audit_logs
└── file_uploads, email_logs, etc.
```

### **Sample Queries for Team Testing**
```sql
-- View all students with scores
SELECT 
    s.name,
    s.registration_no,
    s.overall_score,
    b.name as batch,
    h.name as house
FROM students s
LEFT JOIN batches b ON s.batch_id = b.id
LEFT JOIN houses h ON s.house_id = h.id;

-- View quadrant structure
SELECT 
    q.name as quadrant,
    sc.name as sub_category,
    c.name as component
FROM quadrants q
LEFT JOIN sub_categories sc ON q.id = sc.quadrant_id
LEFT JOIN components c ON sc.id = c.sub_category_id
ORDER BY q.display_order, sc.display_order, c.display_order;

-- View student performance
SELECT 
    s.name as student,
    c.name as component,
    sc.obtained_score,
    sc.max_score,
    sc.percentage
FROM students s
JOIN scores sc ON s.id = sc.student_id
JOIN components c ON sc.component_id = c.id;
```

## 🌐 **Remote Team Access Setup**

### **For Team Lead (Database Host)**

1. **Configure PostgreSQL for Remote Access**
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/14/main/postgresql.conf
   # Change: listen_addresses = 'localhost' to listen_addresses = '*'
   
   # Edit authentication
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   # Add: host all all 0.0.0.0/0 md5
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Get Your IP Address**
   ```bash
   ip addr show | grep inet
   # Share this IP with team members
   ```

3. **Configure Firewall (if needed)**
   ```bash
   sudo ufw allow 5432/tcp
   ```

### **For Team Members (Remote Access)**

Use the same connection details but replace `localhost` with the team lead's IP:
```
Host name/address: [TEAM_LEAD_IP_ADDRESS]
Port: 5432
Database: pep_score_nexus
Username: postgres
Password: newpassword
```

## 📁 **Files to Share with Team**

### **Essential Files**
1. **`team_pgadmin_setup.sh`** - Automated setup script
2. **`pep_score_nexus_backup.sql`** - Complete database backup
3. **`docs/database/pgAdmin_Team_Setup_Guide.md`** - Detailed guide
4. **`TEAM_DATABASE_SHARING_GUIDE.md`** - This file

### **Optional Files**
1. **`database_setup.sql`** - Original schema creation
2. **`sample_data.sql`** - Sample data insertion
3. **`docs/database/PostgreSQL_Setup_Guide.md`** - PostgreSQL guide

## 🔍 **Team Collaboration Features**

### **1. Shared Queries**
Create a shared folder for common queries:
```sql
-- Save as: queries/student_performance.sql
SELECT s.name, AVG(sc.percentage) as avg_score
FROM students s
JOIN scores sc ON s.id = sc.student_id
GROUP BY s.id, s.name
ORDER BY avg_score DESC;
```

### **2. Data Export/Import**
```bash
# Export specific table
pg_dump -U postgres -h localhost -d pep_score_nexus -t students > students_export.sql

# Import to another database
psql -U postgres -h localhost -d target_database < students_export.sql
```

### **3. Backup Strategy**
```bash
# Daily backup (add to cron)
pg_dump -U postgres -h localhost -d pep_score_nexus > backup_$(date +%Y%m%d).sql
```

## 🛠️ **Troubleshooting for Team**

### **Common Issues**

1. **Cannot Access pgAdmin**
   - Check URL: http://127.0.0.1/pgadmin4
   - Restart Apache: `sudo systemctl restart apache2`
   - Clear browser cache

2. **Database Connection Failed**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check connection details
   - Test with: `psql -U postgres -h localhost -d pep_score_nexus`

3. **Permission Denied**
   - Check username/password
   - Verify database exists
   - Check pg_hba.conf settings

4. **Remote Connection Issues**
   - Check firewall settings
   - Verify IP address
   - Test network connectivity: `ping [HOST_IP]`

### **Getting Help**
1. **Check Documentation**: `docs/database/` folder
2. **Test Connection**: Use `psql` command line
3. **Check Logs**: `/var/log/postgresql/`
4. **Team Lead**: Contact for access issues

## 📋 **Team Best Practices**

### **1. Database Safety**
- ✅ Always backup before major changes
- ✅ Test queries on sample data first
- ✅ Use transactions for multiple operations
- ❌ Never run DELETE without WHERE clause

### **2. Query Guidelines**
- Use consistent formatting
- Comment complex queries
- Share useful queries with team
- Use EXPLAIN for performance analysis

### **3. Data Management**
- Document schema changes
- Use meaningful names
- Follow naming conventions
- Report issues promptly

## 📞 **Quick Reference Card**

### **pgAdmin Access**
```
URL: http://127.0.0.1/pgadmin4
Email: admin@pepscorennexus.com
Password: admin123
```

### **Database Connection**
```
Host: localhost (or team IP)
Port: 5432
Database: pep_score_nexus
Username: postgres
Password: newpassword
```

### **Useful Commands**
```bash
# Test connection
psql -U postgres -h localhost -d pep_score_nexus

# Backup database
pg_dump -U postgres -h localhost -d pep_score_nexus > backup.sql

# Restore database
psql -U postgres -h localhost -d pep_score_nexus < backup.sql

# Run setup script
./team_pgadmin_setup.sh
```

---

## 🎉 **Success Checklist**

- ✅ pgAdmin4 installed and accessible
- ✅ Database connection configured
- ✅ All 31 tables visible
- ✅ Sample data accessible
- ✅ Query tool working
- ✅ Team members can connect
- ✅ Backup files available

**Your team now has full access to the PEP Score Nexus database through pgAdmin!**
