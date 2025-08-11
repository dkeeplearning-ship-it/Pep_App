# Complete PEP Score Nexus Testing Workflow

## Overview
This document provides a systematic testing workflow for the PEP Score Nexus application, covering all user roles, features, and edge cases. Follow this workflow to ensure comprehensive testing without missing any functionality.

## Pre-Testing Setup

### 1. Environment Verification
- [ ] Backend server running on `http://localhost:3001`
- [ ] Frontend server running on `http://localhost:8080`
- [ ] Database connection active (Supabase)
- [ ] All recent code changes deployed

### 2. Test Data Preparation
- [ ] Admin credentials: `admin1` / `password123`
- [ ] Teacher credentials: `sri@e.com` / `12345678`
- [ ] Student credentials: `student1` / `password123`
- [ ] Verify test users exist in database

## Phase 1: Authentication & Authorization Testing

### 1.1 Login/Logout Testing
- [ ] **Admin Login**: Login with admin credentials
  - Verify dashboard loads correctly
  - Check admin-specific navigation menu
  - Verify role-based access controls
- [ ] **Teacher Login**: Login with teacher credentials
  - Verify teacher dashboard loads
  - Check teacher-specific navigation
  - Verify limited access to admin features
- [ ] **Student Login**: Login with student credentials
  - Verify student dashboard loads
  - Check student-specific navigation
  - Verify no access to admin/teacher features
- [ ] **Invalid Credentials**: Test with wrong username/password
  - Verify error messages display correctly
  - Ensure no unauthorized access
- [ ] **Logout Functionality**: Test logout from each role
  - Verify session termination
  - Verify redirect to login page

### 1.2 Token Management Testing
- [ ] **Token Refresh**: Wait for token to expire or simulate expiration
  - Verify automatic token refresh works
  - Ensure seamless user experience
- [ ] **Session Persistence**: Refresh browser page
  - Verify user remains logged in
  - Check that role and permissions persist

### 1.3 Role-Based Access Control
- [ ] **Admin Access**: Verify admin can access all features
- [ ] **Teacher Access**: Verify teachers cannot access admin-only features
- [ ] **Student Access**: Verify students cannot access teacher/admin features
- [ ] **URL Protection**: Try accessing restricted URLs directly
  - Test admin URLs as teacher/student
  - Verify proper redirects or error messages

## Phase 2: Admin Functionality Testing

### 2.1 User Management
- [ ] **Manage Students**
  - View student list with pagination
  - Search and filter students
  - View student profiles
  - Edit student information
  - Verify term-based filtering works
- [ ] **Manage Teachers**
  - View teacher list
  - Add new teacher
  - Edit teacher information
  - Assign teachers to interventions
- [ ] **Manage Users**
  - View all users
  - Change user roles
  - Activate/deactivate users

### 2.2 Academic Structure Management
- [ ] **Term Management**
  - Create new terms
  - Activate terms (upcoming → active)
  - Complete terms (active → completed)
  - Archive terms (completed → archived)
  - Verify term status transitions work correctly
- [ ] **Batch Progression Management**
  - View all batches with progression status
  - Initialize batch progression
  - Complete batch terms
  - View batch progression analytics
  - Test with real UUIDs (not mock data)
- [ ] **Quadrant Management**
  - View quadrant structure
  - Configure quadrant weightages
  - Manage sub-categories and components
  - Verify weightage calculations

### 2.3 Intervention Management
- [ ] **Create Interventions**
  - Create new intervention
  - Set intervention details
  - Configure microcompetencies
  - Assign teachers
  - Enroll students
- [ ] **Manage Tasks**
  - Create tasks for interventions
  - Assign microcompetencies to tasks
  - Set task deadlines and requirements
  - Verify term-based task filtering
- [ ] **Intervention Analytics**
  - View intervention performance
  - Check student progress reports
  - Verify score calculations

### 2.4 Scoring and Assessment
- [ ] **Input Scores**
  - Manual score entry
  - Bulk score import
  - Verify score validation
- [ ] **Reports Generation**
  - Generate student reports
  - Export data in various formats
  - Verify report accuracy

## Phase 3: Teacher Functionality Testing

### 3.1 Teacher Dashboard
- [ ] **Dashboard Overview**
  - View assigned interventions
  - Check student progress summaries
  - Verify term-based data filtering

### 3.2 Student Management
- [ ] **View Students**
  - See assigned students
  - Filter by intervention/batch
  - Access student profiles

### 3.3 Task Management
- [ ] **Create Tasks**
  - Create tasks for assigned interventions
  - Set task requirements
  - Assign microcompetencies
  - Set deadlines

### 3.4 Assessment and Scoring
- [ ] **Microcompetency Scoring**
  - Score individual microcompetencies
  - Batch scoring functionality
  - Direct assessment without tasks
- [ ] **Task Grading**
  - Review task submissions
  - Provide feedback
  - Grade submissions
  - Verify automatic microcompetency updates

### 3.5 Feedback and Communication
- [ ] **Student Feedback**
  - Provide feedback to students
  - View feedback history
  - Verify feedback delivery

## Phase 4: Student Functionality Testing

### 4.1 Student Dashboard
- [ ] **Dashboard Overview**
  - View current scores and progress
  - Check quadrant breakdowns
  - Verify HPS calculations

### 4.2 Task Management
- [ ] **View Tasks**
  - See assigned tasks
  - Filter by status/deadline
  - Access task details
- [ ] **Submit Tasks**
  - Submit task responses
  - Upload attachments (if applicable)
  - Verify submission confirmation

### 4.3 Progress Tracking
- [ ] **Quadrant Details**
  - View detailed quadrant scores
  - Check component breakdowns
  - Verify score calculations
- [ ] **Intervention Progress**
  - View intervention participation
  - Check microcompetency progress
  - Verify score updates

### 4.4 Feedback and Communication
- [ ] **View Feedback**
  - Access teacher feedback
  - View graded submissions
  - Check improvement suggestions

## Phase 5: Data Flow and Integration Testing

### 5.1 Score Calculation Flow
- [ ] **End-to-End Scoring**
  1. Teacher creates task with microcompetencies
  2. Student submits task
  3. Teacher grades submission
  4. Verify microcompetency scores update
  5. Verify component scores update
  6. Verify sub-category scores update
  7. Verify quadrant scores update
  8. Verify HPS calculation updates

### 5.2 Term Progression Testing
- [ ] **Term Lifecycle**
  1. Create new term
  2. Activate term
  3. Enroll students
  4. Complete academic activities
  5. Complete term
  6. Verify student progression
  7. Archive term

### 5.3 Batch Progression Testing
- [ ] **Batch Lifecycle**
  1. Initialize batch progression
  2. Complete current term
  3. Verify student eligibility calculations
  4. Progress eligible students to next term
  5. Update batch status

## Phase 6: Edge Cases and Error Handling

### 6.1 Data Validation
- [ ] **Invalid Inputs**
  - Test with empty required fields
  - Test with invalid data formats
  - Test with out-of-range values
- [ ] **Boundary Conditions**
  - Test maximum score values
  - Test minimum score requirements
  - Test date boundaries

### 6.2 Error Scenarios
- [ ] **Network Issues**
  - Test with slow network
  - Test with intermittent connectivity
  - Verify error messages and recovery
- [ ] **Database Issues**
  - Test with database constraints
  - Verify transaction rollbacks
  - Check data consistency

### 6.3 Concurrent User Testing
- [ ] **Multiple Users**
  - Multiple teachers scoring simultaneously
  - Students submitting tasks concurrently
  - Admin operations during active usage

## Phase 7: Performance and Usability Testing

### 7.1 Performance Testing
- [ ] **Page Load Times**
  - Dashboard loading performance
  - Large data set handling
  - Report generation speed
- [ ] **Database Performance**
  - Query optimization verification
  - Large dataset operations
  - Concurrent access performance

### 7.2 Usability Testing
- [ ] **Navigation**
  - Intuitive menu structure
  - Breadcrumb navigation
  - Search functionality
- [ ] **User Experience**
  - Form usability
  - Error message clarity
  - Success feedback

## Phase 8: Security Testing

### 8.1 Authentication Security
- [ ] **Password Security**
  - Password strength requirements
  - Secure password storage
  - Session management
- [ ] **Authorization Security**
  - Role-based access enforcement
  - API endpoint protection
  - Data access restrictions

### 8.2 Data Security
- [ ] **Input Validation**
  - SQL injection prevention
  - XSS protection
  - CSRF protection
- [ ] **Data Privacy**
  - Student data protection
  - Score confidentiality
  - Audit trail maintenance

## Testing Checklist Summary

### Critical Path Testing (Must Pass)
- [ ] All user roles can login and access appropriate features
- [ ] Score calculation flow works end-to-end
- [ ] Term and batch progression functions correctly
- [ ] Task creation, submission, and grading workflow
- [ ] Real-time score updates across all levels

### Integration Testing (Should Pass)
- [ ] All APIs return correct data with proper UUIDs
- [ ] Database operations maintain data integrity
- [ ] Token refresh works seamlessly
- [ ] Cross-role functionality works correctly

### Edge Case Testing (Nice to Have)
- [ ] Error handling provides clear feedback
- [ ] Performance remains acceptable under load
- [ ] Security measures prevent unauthorized access
- [ ] Data validation prevents invalid inputs

## Test Execution Notes

### Before Each Test Session
1. Clear browser cache and cookies
2. Verify database is in known state
3. Check server logs for any errors
4. Ensure all services are running

### During Testing
1. Document any issues found
2. Take screenshots of errors
3. Note performance observations
4. Record user experience feedback

### After Testing
1. Review server logs for errors
2. Verify database consistency
3. Document test results
4. Plan fixes for any issues found

## Automated Testing Scripts

### Quick API Health Check Script
```bash
# Save as: test-api-health.sh
#!/bin/bash

echo "=== PEP Score Nexus API Health Check ==="

# Test login
echo "Testing login..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"password123"}' | \
  jq -r '.data.token')

if [ "$TOKEN" != "null" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

# Test batch fetching
echo "Testing batch fetching..."
BATCHES=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/level-progression/batches | \
  jq '.success')

if [ "$BATCHES" = "true" ]; then
  echo "✅ Batch fetching successful"
else
  echo "❌ Batch fetching failed"
fi

# Test student fetching
echo "Testing student fetching..."
STUDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/students | \
  jq '.success')

if [ "$STUDENTS" = "true" ]; then
  echo "✅ Student fetching successful"
else
  echo "❌ Student fetching failed"
fi

echo "=== Health check complete ==="
```

### Database Integrity Check Script
```sql
-- Save as: test-database-integrity.sql
-- Run with: psql -f test-database-integrity.sql

\echo '=== Database Integrity Check ==='

-- Check for orphaned records
\echo 'Checking for orphaned student records...'
SELECT COUNT(*) as orphaned_students
FROM students s
LEFT JOIN batches b ON s.batch_id = b.id
WHERE b.id IS NULL;

-- Check score calculation consistency
\echo 'Checking score calculation consistency...'
SELECT
  s.id,
  s.name,
  COUNT(ms.id) as microcompetency_scores,
  AVG(ms.obtained_score) as avg_micro_score
FROM students s
LEFT JOIN microcompetency_scores ms ON s.id = ms.student_id
GROUP BY s.id, s.name
HAVING COUNT(ms.id) > 0
LIMIT 5;

-- Check term progression data
\echo 'Checking term progression data...'
SELECT
  b.name as batch_name,
  COUNT(stp.student_id) as students_in_progression,
  stp.term_number,
  stp.status
FROM batches b
LEFT JOIN student_term_progression stp ON b.id = stp.batch_id
GROUP BY b.name, stp.term_number, stp.status
ORDER BY b.name, stp.term_number;

\echo '=== Database check complete ==='
```

---

**Note**: This workflow should be executed systematically, with each phase building on the previous one. Any failures in earlier phases should be resolved before proceeding to later phases.

## Quick Start Testing Guide

For immediate testing, follow this condensed workflow:

1. **Login Test** (5 min): Test all three user roles
2. **Core Flow Test** (15 min): Create task → Submit → Grade → Verify scores
3. **Batch Operations** (10 min): Test batch progression with real UUIDs
4. **Data Integrity** (5 min): Run database integrity checks
5. **Error Handling** (10 min): Test with invalid inputs

Total time: ~45 minutes for comprehensive core functionality testing.
