# PEP Score Nexus - Comprehensive Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the PEP Score Nexus application, including all user roles, features, and workflows. The application is designed for Vijaybhoomi College to manage student performance evaluation and interventions.

## 🔐 Test Credentials

### **Admin Access**
- **Username**: `admin1`
- **Password**: `password123`
- **Role**: Administrator
- **Access**: Full system access, user management, reports, system configuration

### **Teacher Access**
- **Username**: `sri@e.com`
- **Password**: `12345678`
- **Role**: Teacher
- **Access**: Student management, intervention scoring, task creation, feedback

### **Student Access**
- **Username**: `s@student.com`
- **Password**: `12345678`
- **Role**: Student
- **Access**: Personal dashboard, interventions, tasks, performance tracking

### **Microsoft SSO Test Account**
- **Email**: `ssotest@vijaybhoomi.edu.in`
- **Status**: Ready for Microsoft SSO linking
- **Role**: Student (will be assigned automatically)

## 🌐 Application URLs

### **Frontend Application**
- **URL**: `http://localhost:8080`
- **Login Page**: `http://localhost:8080/login`
- **Health Check**: Application should load without errors

### **Backend API**
- **URL**: `http://localhost:3001`
- **API Base**: `http://localhost:3001/api/v1`
- **Health Check**: `http://localhost:3001/health`

## 📋 Testing Workflows

### **1. 🔑 Authentication Testing**

#### **A. Regular Login Testing**
1. **Navigate to Login Page**
   - Go to `http://localhost:8080/login`
   - Verify login form displays correctly
   - Check Microsoft SSO button is visible

2. **Test Admin Login**
   - Username: `admin1`
   - Password: `password123`
   - Expected: Redirect to `/admin` dashboard
   - Verify: Admin sidebar with all management options

3. **Test Teacher Login**
   - Username: `sri@e.com`
   - Password: `12345678`
   - Expected: Redirect to `/teacher` dashboard
   - Verify: Teacher sidebar with student management options

4. **Test Student Login**
   - Username: `student1`
   - Password: `password123`
   - Expected: Redirect to `/student` dashboard
   - Verify: Student sidebar with personal options

#### **B. Microsoft SSO Testing**
1. **Prerequisites**
   - Azure AD app registration completed
   - Environment variables configured
   - Real @vijaybhoomi.edu.in account available

2. **SSO Login Flow**
   - Click "Sign in with Microsoft" button
   - Expected: Redirect to Microsoft login
   - Login with @vijaybhoomi.edu.in account
   - Expected: Redirect back to application
   - Verify: User account linked and authenticated

### **2. 👨‍💼 Admin Dashboard Testing**

#### **Login as Admin** (`admin1` / `password123`)

#### **A. Dashboard Overview**
- **URL**: `/admin`
- **Verify**: System statistics, user counts, recent activities
- **Check**: All metrics display correctly

#### **B. User Management**
1. **Manage Students** (`/admin/students`)
   - View student list
   - Test search and filtering
   - Create new student account
   - Edit existing student details
   - Verify student profile data

2. **Manage Teachers** (`/admin/teachers`)
   - View teacher list
   - Create new teacher account
   - Assign teachers to interventions
   - Verify teacher permissions

3. **Manage Users** (`/admin/users`)
   - View all system users
   - Test user role assignments
   - Verify user status management

#### **C. Academic Management**
1. **Term Management** (`/admin/terms`)
   - Create new academic terms
   - Set active term
   - Verify term switching functionality

2. **Intervention Management** (`/admin/interventions`)
   - Create new interventions
   - Assign microcompetencies
   - Set intervention parameters
   - Test intervention enrollment

3. **Quadrant Management** (`/admin/quadrants`)
   - Configure performance quadrants
   - Set scoring criteria
   - Verify quadrant calculations

#### **D. Data Management**
1. **Score Input** (`/admin/scores`)
   - Input student scores manually
   - Test bulk score upload
   - Verify score validation

2. **Reports** (`/admin/reports`)
   - Generate performance reports
   - Test data export functionality
   - Verify report accuracy

### **3. 👨‍🏫 Teacher Dashboard Testing**

#### **Login as Teacher** (`sri@e.com` / `12345678`)

#### **A. Dashboard Overview**
- **URL**: `/teacher`
- **Verify**: Assigned students, interventions, recent activities
- **Check**: Teacher-specific metrics

#### **B. Student Management**
1. **My Students** (`/teacher/students`)
   - View assigned students
   - Access student profiles
   - Review student performance
   - Test student search functionality

2. **Intervention Scoring** (`/teacher/interventions`)
   - View assigned interventions
   - Score student microcompetencies
   - Submit intervention assessments
   - Verify scoring calculations

#### **C. Task Management**
1. **Create Tasks** (`/teacher/tasks`)
   - Create intervention tasks
   - Set task parameters
   - Assign tasks to students
   - Test task submission workflow

2. **Review Submissions**
   - View student task submissions
   - Provide feedback and scores
   - Track completion rates
   - Verify submission timestamps

#### **D. Assessment Tools**
1. **Microcompetency Scoring**
   - Access scoring interfaces
   - Test different scoring methods
   - Verify score calculations
   - Check score history

2. **Direct Assessment**
   - Use direct assessment tools
   - Test real-time scoring
   - Verify immediate feedback

### **4. 👨‍🎓 Student Dashboard Testing**

#### **Login as Student** (`student1` / `password123`)

#### **A. Dashboard Overview**
- **URL**: `/student`
- **Verify**: Personal performance metrics
- **Check**: Current scores, grades, progress indicators

#### **B. Performance Tracking**
1. **Performance Dashboard**
   - View overall HPS score
   - Check quadrant breakdown
   - Verify grade calculations
   - Test term comparison charts

2. **Quadrant Details** (`/student/quadrants`)
   - Access detailed quadrant views
   - Review component scores
   - Check microcompetency details
   - Verify score history

#### **C. Interventions**
1. **My Interventions** (`/student/interventions`)
   - View enrolled interventions
   - Check intervention progress
   - Access intervention details
   - Verify completion status

2. **Intervention Tasks** (`/student/tasks`)
   - View assigned tasks
   - Submit task responses
   - Track task completion
   - Check feedback received

#### **D. Academic Tools**
1. **Improvement Plans** (`/student/improvement`)
   - View personalized improvement suggestions
   - Access learning resources
   - Track improvement progress

2. **Attendance Tracking**
   - View attendance records
   - Check attendance percentages
   - Verify attendance calculations

### **5. 🔄 Cross-Role Testing**

#### **A. Workflow Testing**
1. **Complete Intervention Workflow**
   - Admin creates intervention
   - Teacher assigns to students
   - Students complete tasks
   - Teacher scores submissions
   - Verify score propagation

2. **Score Flow Testing**
   - Admin inputs base scores
   - Teacher adds intervention scores
   - Student views updated performance
   - Verify calculation accuracy

#### **B. Data Consistency**
1. **Cross-Dashboard Verification**
   - Compare data across admin/teacher/student views
   - Verify score consistency
   - Check real-time updates

2. **Permission Testing**
   - Verify role-based access controls
   - Test unauthorized access attempts
   - Check data visibility restrictions

## 🧪 Specific Test Cases

### **Test Case 1: New Student Onboarding**
1. Admin creates new student account
2. Student logs in for first time
3. Verify default dashboard state
4. Check initial score calculations

### **Test Case 2: Intervention Lifecycle**
1. Admin creates intervention with microcompetencies
2. Teacher assigns intervention to students
3. Students receive and complete tasks
4. Teacher scores and provides feedback
5. Verify score updates in student dashboard

### **Test Case 3: Microsoft SSO Integration**
1. New user attempts Microsoft SSO login
2. System validates against ERP
3. User account created/linked automatically
4. Verify role assignment and permissions

### **Test Case 4: Performance Calculation**
1. Input scores across all quadrants
2. Verify HPS calculation accuracy
3. Check grade assignment logic
4. Test term comparison functionality

## 🐛 Common Issues & Troubleshooting

### **Login Issues**
- **Problem**: Cannot login with provided credentials
- **Solution**: Verify backend is running, check network connectivity
- **Check**: Browser console for error messages

### **Dashboard Loading**
- **Problem**: Dashboard shows loading indefinitely
- **Solution**: Check API connectivity, verify user permissions
- **Check**: Network tab for failed API calls

### **Score Discrepancies**
- **Problem**: Scores don't match between views
- **Solution**: Refresh browser, check term selection
- **Check**: Verify calculation logic in backend logs

### **Microsoft SSO Issues**
- **Problem**: SSO redirect fails
- **Solution**: Verify Azure AD configuration, check environment variables
- **Check**: Backend logs for authentication errors

## 📊 Expected Results

### **Performance Metrics**
- **Student Dashboard**: HPS score ~83.84, Grade "A"
- **Quadrant Scores**: Realistic distribution across all quadrants
- **Intervention Progress**: Active interventions with completion percentages

### **System Functionality**
- **Response Times**: Pages load within 2-3 seconds
- **Data Accuracy**: Scores calculate correctly across all views
- **User Experience**: Smooth navigation, clear feedback messages

## 🔍 Testing Checklist

### **Pre-Testing Setup**
- [ ] Backend server running on port 3001
- [ ] Frontend server running on port 8080
- [ ] Database accessible and populated
- [ ] Environment variables configured

### **Authentication Testing**
- [ ] Admin login successful
- [ ] Teacher login successful
- [ ] Student login successful
- [ ] Microsoft SSO button visible
- [ ] Logout functionality works

### **Role-Based Testing**
- [ ] Admin dashboard accessible
- [ ] Teacher dashboard accessible
- [ ] Student dashboard accessible
- [ ] Appropriate permissions enforced
- [ ] Cross-role data consistency

### **Feature Testing**
- [ ] Score calculations accurate
- [ ] Intervention workflows complete
- [ ] Task creation and submission
- [ ] Report generation functional
- [ ] Data export working

### **Integration Testing**
- [ ] API endpoints responding
- [ ] Database operations successful
- [ ] Real-time updates working
- [ ] Error handling appropriate

## 📞 Support Information

### **Technical Issues**
- Check browser console for JavaScript errors
- Verify network connectivity to backend API
- Review backend logs for server errors
- Ensure all required services are running

### **Data Issues**
- Verify user permissions and role assignments
- Check term selection and date ranges
- Confirm data exists for selected parameters
- Review calculation logic for accuracy

### **Access Issues**
- Verify credentials are entered correctly
- Check user account status and permissions
- Ensure appropriate role assignments
- Confirm system access policies

---

**Happy Testing! 🚀**

This comprehensive guide should help you thoroughly test all aspects of the PEP Score Nexus application. If you encounter any issues not covered in this guide, please document them for further investigation.
