# PEP Score Nexus - Quick Test Reference Card

## 🚀 Quick Start

### **Application URLs**
- **Frontend**: `http://localhost:8080`
- **Backend API**: `http://localhost:3001`
- **Login Page**: `http://localhost:8080/login`

### **Test Credentials**
```
👨‍💼 ADMIN
Username: admin1
Password: password123
Dashboard: /admin

👨‍🏫 TEACHER  
Username: sri@e.com
Password: 12345678
Dashboard: /teacher

👨‍🎓 STUDENT
Username: s@student.com
Password:  12345678
Dashboard: /student

🔗 MICROSOFT SSO
Email: ssotest@vijaybhoomi.edu.in
(Requires Azure AD setup)
```

## 🧪 5-Minute Test Flow

### **1. Basic Login Test (2 minutes)**
```bash
1. Go to http://localhost:8080/login
2. Login as admin1/password123 → Should redirect to /admin
3. Logout and login as sri@e.com/12345678 → Should redirect to /teacher  
4. Logout and login as student1/password123 → Should redirect to /student
```

### **2. Student Dashboard Test (1 minute)**
```bash
1. Login as student1/password123
2. Check dashboard shows:
   ✅ HPS Score: ~83.84
   ✅ Grade: "A" 
   ✅ Quadrant scores displayed
   ✅ Term comparison chart
3. Navigate to /student/interventions
   ✅ Should show 1 active intervention
```

### **3. Teacher Functionality Test (1 minute)**
```bash
1. Login as sri@e.com/12345678
2. Go to /teacher/students
   ✅ Should show assigned students
3. Go to /teacher/interventions  
   ✅ Should show intervention management
4. Test task creation workflow
```

### **4. Admin Panel Test (1 minute)**
```bash
1. Login as admin1/password123
2. Go to /admin/students
   ✅ Should show student list with search
3. Go to /admin/interventions
   ✅ Should show intervention management
4. Check /admin/reports for data export
```

## 🔍 Key Features to Verify

### **Student Dashboard**
- [ ] Performance metrics display correctly
- [ ] Quadrant breakdown shows realistic scores
- [ ] Term comparison chart renders
- [ ] Interventions page shows enrolled interventions
- [ ] Tasks page shows assigned tasks

### **Teacher Dashboard**
- [ ] Student list loads with search functionality
- [ ] Intervention scoring interface works
- [ ] Task creation and management functional
- [ ] Student performance data accessible

### **Admin Dashboard**
- [ ] User management (students/teachers) functional
- [ ] Intervention creation and assignment works
- [ ] Term management operational
- [ ] Reports and data export available

### **Microsoft SSO**
- [ ] SSO button appears on login page
- [ ] Clicking redirects to Microsoft OAuth
- [ ] Backend handles OAuth callback correctly
- [ ] User linking works for existing accounts

## 🐛 Common Test Issues

### **Issue: Login Fails**
```
❌ Problem: Credentials don't work
✅ Solution: 
   1. Check backend is running (port 3001)
   2. Verify database connection
   3. Check browser console for errors
```

### **Issue: Dashboard Empty**
```
❌ Problem: No data displays
✅ Solution:
   1. Check API calls in Network tab
   2. Verify user has correct role
   3. Ensure test data exists in database
```

### **Issue: Microsoft SSO Fails**
```
❌ Problem: SSO redirect doesn't work
✅ Solution:
   1. Verify Azure AD app registration
   2. Check environment variables
   3. Ensure redirect URIs match
```

## 📊 Expected Test Results

### **Student Performance Data**
```
HPS Score: 83.84 (Grade A)
Quadrant Scores:
- Persona: 22.41
- Wellness: 24.65  
- Behavior: 40.56
- Discipline: 15.96

Interventions: 1 active
Progress: 60% completion
```

### **System Performance**
```
Page Load Times: < 3 seconds
API Response Times: < 1 second
Database Queries: < 500ms
Error Rate: 0% for normal operations
```

## 🔧 Troubleshooting Commands

### **Check Backend Status**
```bash
curl http://localhost:3001/health
# Expected: {"status": "OK", "timestamp": "..."}
```

### **Test API Authentication**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"password123"}'
# Expected: {"success": true, "data": {...}}
```

### **Verify Database Connection**
```bash
curl http://localhost:3001/api/v1/terms
# Expected: Array of terms
```

## 📋 Test Completion Checklist

### **Authentication ✅**
- [ ] Admin login works
- [ ] Teacher login works  
- [ ] Student login works
- [ ] Microsoft SSO button visible
- [ ] Logout functionality works

### **Core Functionality ✅**
- [ ] Student dashboard loads with data
- [ ] Teacher can access student management
- [ ] Admin can manage users and system
- [ ] Interventions workflow functional
- [ ] Score calculations accurate

### **Data Integrity ✅**
- [ ] Scores consistent across views
- [ ] User permissions enforced
- [ ] Real-time updates working
- [ ] Data export functional

### **User Experience ✅**
- [ ] Navigation smooth and intuitive
- [ ] Error messages clear and helpful
- [ ] Loading states appropriate
- [ ] Responsive design works

## 🎯 Critical Test Scenarios

### **Scenario 1: New User Journey**
1. Admin creates new student → Teacher assigns intervention → Student completes tasks → Scores update

### **Scenario 2: Performance Tracking**
1. Input scores → Verify calculations → Check dashboard updates → Test report generation

### **Scenario 3: Microsoft SSO Integration**
1. Click SSO button → Microsoft login → Account linking → Dashboard access

## 📞 Quick Support

### **Frontend Issues**
- Check browser console (F12)
- Verify localhost:8080 accessibility
- Clear browser cache if needed

### **Backend Issues**  
- Check localhost:3001 accessibility
- Review server logs for errors
- Verify database connectivity

### **Data Issues**
- Confirm user roles and permissions
- Check term selection
- Verify test data exists

---

**🚀 Ready to Test!**

Use this quick reference for efficient testing of the PEP Score Nexus application. For detailed testing procedures, refer to the comprehensive TESTING_GUIDE.md.
