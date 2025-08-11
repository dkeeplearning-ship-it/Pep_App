# 🔧 pgAdmin Team Setup Guide for PEP Score Nexus

## 🎯 **pgAdmin Access Information**

### **Local pgAdmin Access**
- **URL**: http://127.0.0.1/pgadmin4
- **Email**: admin@pepscorennexus.com
- **Password**: admin123

### **Database Connection Details**
- **Host**: localhost (or your machine's IP for team access)
- **Port**: 5432
- **Database**: pep_score_nexus
- **Username**: postgres
- **Password**: newpassword

## 🚀 **Step-by-Step Setup for Team Members**

### **Step 1: Access pgAdmin**
1. Open your web browser
2. Navigate to: `http://127.0.0.1/pgadmin4`
3. Login with:
   - **Email**: admin@pepscorennexus.com
   - **Password**: admin123

### **Step 2: Add Database Server**
1. **Right-click** on "Servers" in the left panel
2. Select **"Create" → "Server..."**
3. **General Tab**:
   - **Name**: `PEP Score Nexus Database`
   - **Server Group**: `Servers` (default)
   - **Comments**: `Production database for PEP Score Nexus project`

4. **Connection Tab**:
   - **Host name/address**: `localhost` (or IP address for remote access)
   - **Port**: `5432`
   - **Maintenance database**: `pep_score_nexus`
   - **Username**: `postgres`
   - **Password**: `newpassword`
   - **Save password**: ✅ (check this box)

5. **Advanced Tab** (optional):
   - **DB restriction**: `pep_score_nexus` (to show only our database)

6. Click **"Save"**

### **Step 3: Verify Connection**
1. You should see "PEP Score Nexus Database" appear under Servers
2. Expand it to see:
   - **Databases** → **pep_score_nexus**
   - **Schemas** → **public**
   - **Tables** → (31 tables should be visible)

## 📊 **Exploring the Database**

### **View All Tables**
1. Navigate to: **Servers** → **PEP Score Nexus Database** → **Databases** → **pep_score_nexus** → **Schemas** → **public** → **Tables**
2. You should see all 31 tables:
   ```
   ✅ admins                    ✅ intervention_teachers
   ✅ attendance               ✅ interventions  
   ✅ attendance_summary       ✅ notifications
   ✅ audit_logs              ✅ quadrants
   ✅ batches                 ✅ scores
   ✅ components              ✅ sections
   ✅ data_imports            ✅ shl_integrations
   ✅ email_logs              ✅ student_terms
   ✅ feedback                ✅ students
   ✅ file_uploads            ✅ sub_categories
   ✅ houses                  ✅ system_settings
   ✅ intervention_enrollments ✅ task_submissions
   ✅ intervention_quadrants   ✅ tasks
   ✅ teacher_assignments     ✅ teachers
   ✅ terms                   ✅ user_sessions
   ✅ users
   ```

### **View Sample Data**
1. **Right-click** on any table (e.g., `students`)
2. Select **"View/Edit Data" → "All Rows"**
3. You'll see the sample data we inserted

### **Run SQL Queries**
1. **Right-click** on the database name
2. Select **"Query Tool"**
3. Try these sample queries:

```sql
-- View all students with their batch and house info
SELECT 
    s.name,
    s.registration_no,
    s.overall_score,
    b.name as batch_name,
    h.name as house_name
FROM students s
LEFT JOIN batches b ON s.batch_id = b.id
LEFT JOIN houses h ON s.house_id = h.id;

-- View quadrants with their weightages
SELECT id, name, weightage, minimum_attendance 
FROM quadrants 
ORDER BY display_order;

-- View student scores
SELECT 
    s.name as student_name,
    c.name as component_name,
    sc.obtained_score,
    sc.max_score,
    sc.percentage
FROM students s
JOIN scores sc ON s.id = sc.student_id
JOIN components c ON sc.component_id = c.id;
```

## 🌐 **Team Access Setup**

### **For Remote Team Access**
If your team needs to access the database remotely:

1. **Find Your IP Address**:
   ```bash
   ip addr show | grep inet
   ```

2. **Configure PostgreSQL for Remote Access**:
   ```bash
   sudo nano /etc/postgresql/14/main/postgresql.conf
   ```
   Change: `listen_addresses = 'localhost'` to `listen_addresses = '*'`

3. **Configure Authentication**:
   ```bash
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   ```
   Add: `host all all 0.0.0.0/0 md5`

4. **Restart PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   ```

5. **Share Connection Details**:
   - **Host**: `YOUR_IP_ADDRESS` (instead of localhost)
   - **Port**: `5432`
   - **Database**: `pep_score_nexus`
   - **Username**: `postgres`
   - **Password**: `newpassword`

### **For Team pgAdmin Access**
Each team member should:
1. Install pgAdmin4 on their machine
2. Use the connection details above
3. Follow the same "Add Database Server" steps

## 🔍 **Useful pgAdmin Features for Team**

### **1. Dashboard**
- **Location**: Click on database name
- **Shows**: Database size, active connections, transactions

### **2. Query Tool**
- **Shortcut**: Right-click database → "Query Tool"
- **Features**: SQL editor, query history, explain plans
- **Tip**: Use Ctrl+Enter to execute queries

### **3. Table Viewer**
- **Access**: Right-click table → "View/Edit Data"
- **Features**: Sort, filter, edit data directly
- **Tip**: Use filters for large datasets

### **4. ERD Tool**
- **Access**: Right-click database → "ERD Tool"
- **Purpose**: Visual database schema
- **Tip**: Drag tables to see relationships

### **5. Backup & Restore**
- **Backup**: Right-click database → "Backup"
- **Restore**: Right-click database → "Restore"
- **Formats**: Custom, tar, plain SQL

### **6. Import/Export**
- **Access**: Right-click table → "Import/Export Data"
- **Formats**: CSV, Excel, JSON
- **Use**: For bulk data operations

## 📋 **Team Collaboration Best Practices**

### **1. Database Naming Conventions**
- **Tables**: lowercase with underscores (e.g., `student_terms`)
- **Columns**: lowercase with underscores (e.g., `created_at`)
- **Indexes**: `idx_tablename_columnname`

### **2. Query Guidelines**
- Always use transactions for data modifications
- Test queries on sample data first
- Use EXPLAIN for performance analysis
- Comment complex queries

### **3. Data Safety**
- **Never** run DELETE without WHERE clause
- **Always** backup before major changes
- Use transactions for multiple operations
- Test on development data first

### **4. Team Communication**
- Document schema changes
- Share query templates
- Use consistent formatting
- Report issues with error messages

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Cannot Connect to Database**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify connection details
   - Check firewall settings

2. **pgAdmin Login Issues**
   - Clear browser cache
   - Check URL: http://127.0.0.1/pgadmin4
   - Restart Apache: `sudo systemctl restart apache2`

3. **Permission Denied**
   - Check user permissions
   - Verify password
   - Check pg_hba.conf settings

4. **Slow Queries**
   - Use EXPLAIN ANALYZE
   - Check indexes
   - Optimize WHERE clauses

### **Getting Help**
- **pgAdmin Docs**: https://www.pgadmin.org/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Team Lead**: Contact for database access issues

## 📞 **Quick Reference**

### **Connection Details**
```
Host: localhost (or team IP)
Port: 5432
Database: pep_score_nexus
Username: postgres
Password: newpassword
```

### **pgAdmin Access**
```
URL: http://127.0.0.1/pgadmin4
Email: admin@pepscorennexus.com
Password: admin123
```

### **Useful Shortcuts**
- **F5**: Execute query
- **Ctrl+Shift+C**: Comment/uncomment
- **Ctrl+Space**: Auto-complete
- **F7**: Copy query to clipboard

---

**🎉 Your team now has full access to the PEP Score Nexus database through pgAdmin!**
