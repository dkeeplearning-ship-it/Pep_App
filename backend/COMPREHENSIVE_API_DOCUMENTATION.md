# PEP Score Nexus - Comprehensive API Documentation

## 📋 **Table of Contents**
1. [Authentication & Authorization](#authentication--authorization)
2. [Admin APIs](#admin-apis)
3. [Teacher APIs](#teacher-apis)
4. [Student APIs](#student-apis)
5. [Intervention Management](#intervention-management)
6. [Assessment & Scoring](#assessment--scoring)
7. [System Management](#system-management)
8. [File Management](#file-management)
9. [Response Formats](#response-formats)
10. [Error Codes](#error-codes)

---

## 🔐 **Authentication & Authorization**

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

### **POST /auth/login**
**Description**: Authenticate user and get JWT token  
**Access**: Public  
**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```
**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "admin|teacher|student",
      "status": "active|inactive",
      "last_login": "ISO_DATE"
    },
    "profile": {
      "id": "uuid",
      "name": "string",
      "access_level": "string",
      "permissions": ["array"]
    },
    "token": "JWT_TOKEN",
    "refreshToken": "REFRESH_TOKEN"
  },
  "timestamp": "ISO_DATE"
}
```

### **POST /auth/register**
**Description**: Register new user  
**Access**: Public  
**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "student|teacher",
  "name": "string",
  "additionalData": {}
}
```

### **GET /auth/profile**
**Description**: Get current user profile  
**Access**: Authenticated users  
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": "USER_OBJECT",
    "profile": "PROFILE_OBJECT"
  }
}
```

### **POST /auth/refresh**
**Description**: Refresh JWT token  
**Access**: Public  
**Request Body**:
```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

### **GET /auth/validate**
**Description**: Validate current JWT token  
**Access**: Authenticated users  

### **POST /auth/logout**
**Description**: Logout and invalidate token  
**Access**: Authenticated users  

---

## 👨‍💼 **Admin APIs**

### **GET /admin/dashboard**
**Description**: Get admin dashboard overview  
**Access**: Admin only  
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "totalStudents": "number",
    "totalTeachers": "number",
    "totalInterventions": "number",
    "activeInterventions": "number",
    "recentActivity": ["array"]
  }
}
```

### **GET /admin/intervention-dashboard**
**Description**: Get intervention management dashboard  
**Access**: Admin only  
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "totalInterventions": "number",
    "activeInterventions": "number",
    "completedInterventions": "number",
    "totalEnrollments": "number",
    "averageCompletion": "number"
  }
}
```

### **GET /admin/students**
**Description**: Get all students with pagination  
**Access**: Admin only  
**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `search`: string
- `batch`: string
- `status`: string
- `course`: string

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "registration_no": "string",
      "name": "string",
      "course": "string",
      "overall_score": "number",
      "status": "Active|Inactive",
      "batch_name": "string",
      "section_name": "string"
    }
  ],
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalStudents": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

### **GET /admin/interventions**
**Description**: Get all interventions with details  
**Access**: Admin only  
**Query Parameters**:
- `page`: number
- `limit`: number
- `status`: string
- `search`: string
- `sortBy`: string
- `sortOrder`: asc|desc

### **GET /admin/interventions/:interventionId**
**Description**: Get detailed intervention information  
**Access**: Admin only  
**Parameters**:
- `interventionId`: UUID

### **GET /admin/teachers**
**Description**: Get all teachers  
**Access**: Admin only  

### **POST /admin/teachers**
**Description**: Create new teacher  
**Access**: Admin only  
**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "employeeId": "string",
  "name": "string",
  "specialization": "string",
  "department": "string"
}
```

### **GET /admin/reports**
**Description**: Get comprehensive reports  
**Access**: Admin only  
**Query Parameters**:
- `reportType`: string
- `startDate`: string
- `endDate`: string
- `interventionId`: UUID
- `quadrantId`: string

### **GET /admin/reports/export**
**Description**: Export reports in various formats  
**Access**: Admin only  
**Query Parameters**:
- `format`: json|csv
- `reportType`: string

---

## 🎯 **Intervention Management**

### **GET /interventions**
**Description**: Get all interventions  
**Access**: Admin only  
**Query Parameters**:
- `status`: string
- `page`: number
- `limit`: number
- `search`: string
- `sortBy`: string
- `sortOrder`: asc|desc

### **POST /interventions**
**Description**: Create new intervention  
**Access**: Admin only  
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "quadrantWeightages": {},
  "prerequisites": ["array"],
  "maxStudents": "number",
  "objectives": ["array"]
}
```

### **GET /interventions/:id**
**Description**: Get intervention details  
**Access**: Admin only  
**Parameters**:
- `id`: UUID

### **PUT /interventions/:id**
**Description**: Update intervention  
**Access**: Admin only  
**Parameters**:
- `id`: UUID

### **DELETE /interventions/:id**
**Description**: Delete intervention  
**Access**: Admin only  
**Parameters**:
- `id`: UUID

### **POST /interventions/:id/assign-teachers**
**Description**: Assign teachers to intervention  
**Access**: Admin only  
**Request Body**:
```json
{
  "teachers": [
    {
      "teacherId": "uuid",
      "assignedQuadrants": ["array"],
      "role": "Lead|Assistant",
      "permissions": ["array"]
    }
  ]
}
```

### **POST /interventions/:id/enroll-students**
**Description**: Enroll students in intervention  
**Access**: Admin only  
**Request Body**:
```json
{
  "students": ["uuid_array"],
  "enrollmentType": "Mandatory|Optional"
}
```

### **POST /interventions/:id/enroll-batch**
**Description**: Enroll students by batch  
**Access**: Admin only  
**Request Body**:
```json
{
  "batch_ids": ["uuid_array"],
  "section_ids": ["uuid_array"],
  "enrollmentType": "Mandatory|Optional"
}
```

### **GET /interventions/:interventionId/microcompetencies**
**Description**: Get microcompetencies for intervention  
**Access**: Teacher, Admin  
**Parameters**:
- `interventionId`: UUID
**Query Parameters**:
- `quadrantId`: string
- `includeInactive`: boolean

### **POST /interventions/:interventionId/microcompetencies**
**Description**: Add microcompetencies to intervention  
**Access**: Admin only  
**Request Body**:
```json
{
  "microcompetencies": [
    {
      "microcompetency_id": "uuid",
      "weightage": "number (0-100)",
      "max_score": "number"
    }
  ]
}
```

### **POST /interventions/:interventionId/assign-teachers-microcompetencies**
**Description**: Assign teachers to microcompetencies  
**Access**: Admin only  
**Request Body**:
```json
{
  "assignments": [
    {
      "teacher_id": "uuid",
      "microcompetency_id": "uuid",
      "can_score": "boolean",
      "can_create_tasks": "boolean"
    }
  ]
}
```

### **PUT /interventions/:interventionId/scoring-deadline**
**Description**: Set scoring deadline  
**Access**: Admin only  
**Request Body**:
```json
{
  "scoring_deadline": "ISO_DATE",
  "is_scoring_open": "boolean"
}
```

---

## 📝 **Task Management APIs**

### **POST /interventions/:interventionId/tasks**
**Description**: Create microcompetency-centric task (Teachers only)
**Access**: Teachers only
**Parameters**:
- `interventionId`: UUID
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "microcompetencies": [
    {
      "microcompetencyId": "uuid",
      "weightage": "number"
    }
  ],
  "maxScore": "number",
  "dueDate": "string",
  "instructions": "string",
  "rubric": ["array"],
  "submissionType": "string",
  "allowLateSubmission": "boolean",
  "latePenalty": "number"
}
```

### **PUT /interventions/tasks/:taskId**
**Description**: Update task
**Access**: Admin or Task Creator
**Parameters**:
- `taskId`: UUID

### **DELETE /interventions/tasks/:taskId**
**Description**: Delete task
**Access**: Admin or Task Creator
**Parameters**:
- `taskId`: UUID

### **GET /interventions/admin/tasks**
**Description**: Get all tasks for admin management
**Access**: Admins only
**Query Parameters**:
- `status`: string
- `interventionId`: UUID
- `teacherId`: UUID

### **GET /interventions/teacher/tasks**
**Description**: Get teacher's tasks across all interventions
**Access**: Teachers only
**Query Parameters**:
- `status`: string
- `interventionId`: UUID

### **GET /interventions/student/:interventionId/tasks**
**Description**: Get student's available tasks for intervention
**Access**: Students only
**Parameters**:
- `interventionId`: UUID
**Query Parameters**:
- `status`: string

### **POST /interventions/tasks/:taskId/submit**
**Description**: Submit task (Student)
**Access**: Students only
**Parameters**:
- `taskId`: UUID
**Request Body**:
```json
{
  "submissionText": "string",
  "attachments": ["array"]
}
```

### **POST /interventions/tasks/:taskId/draft**
**Description**: Save task draft (Student)
**Access**: Students only
**Parameters**:
- `taskId`: UUID
**Request Body**:
```json
{
  "submissionText": "string",
  "attachments": ["array"]
}
```

### **GET /interventions/teacher/:interventionId/submissions**
**Description**: Get task submissions for teacher review
**Access**: Teachers only
**Parameters**:
- `interventionId`: UUID
**Query Parameters**:
- `taskId`: UUID
- `status`: string

### **POST /interventions/submissions/:submissionId/grade**
**Description**: Grade task submission with automatic microcompetency score updates
**Access**: Teachers only
**Parameters**:
- `submissionId`: UUID
**Request Body**:
```json
{
  "score": "number",
  "feedback": "string",
  "privateNotes": "string"
}
```

### **POST /interventions/tasks/:taskId/direct-assessment**
**Description**: Create direct assessment (no submission required)
**Access**: Teachers only
**Parameters**:
- `taskId`: UUID
**Request Body**:
```json
{
  "studentId": "uuid",
  "score": "number",
  "feedback": "string",
  "privateNotes": "string"
}
```

### **PUT /interventions/direct-assessments/:assessmentId**
**Description**: Update direct assessment
**Access**: Teachers only
**Parameters**:
- `assessmentId`: UUID

### **GET /interventions/tasks/:taskId/direct-assessments**
**Description**: Get all direct assessments for task
**Access**: Teachers only
**Parameters**:
- `taskId`: UUID

### **GET /interventions/:interventionId/students**
**Description**: Get enrolled students for intervention
**Access**: Teachers, Admins
**Parameters**:
- `interventionId`: UUID

---

## 🧩 **Microcompetency & Assessment Structure**

### **GET /quadrants**
**Description**: Get all quadrants  
**Access**: Public  
**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "weightage": "number",
      "display_order": "number",
      "is_active": "boolean"
    }
  ]
}
```

### **GET /quadrants/:id/hierarchy**
**Description**: Get quadrant with full hierarchy  
**Access**: Admin, Teacher  
**Parameters**:
- `id`: quadrant ID
**Query Parameters**:
- `includeInactive`: boolean

### **GET /microcompetencies/quadrant/:quadrantId**
**Description**: Get microcompetencies by quadrant  
**Access**: Teacher, Admin  
**Parameters**:
- `quadrantId`: string (persona|wellness|behavior|discipline)

### **GET /microcompetencies/component/:componentId**
**Description**: Get microcompetencies by component  
**Access**: Teacher, Admin  
**Parameters**:
- `componentId`: UUID

### **GET /microcompetencies/:microcompetencyId**
**Description**: Get microcompetency details  
**Access**: Teacher, Admin  
**Parameters**:
- `microcompetencyId`: UUID

### **POST /microcompetencies**
**Description**: Create new microcompetency  
**Access**: Admin only  
**Request Body**:
```json
{
  "component_id": "uuid",
  "name": "string",
  "description": "string",
  "weightage": "number (0-100)",
  "max_score": "number",
  "display_order": "number"
}
```

---

## 👩‍🏫 **Teacher APIs**

### **GET /teachers/:teacherId/dashboard**
**Description**: Get teacher dashboard  
**Access**: Teacher (own), Admin  
**Parameters**:
- `teacherId`: UUID
**Query Parameters**:
- `termId`: UUID

### **GET /teachers/:teacherId/students**
**Description**: Get assigned students  
**Access**: Teacher (own), Admin  
**Parameters**:
- `teacherId`: UUID
**Query Parameters**:
- `page`: number
- `limit`: number
- `search`: string
- `status`: string

### **GET /teachers/:teacherId/students/:studentId/assessment**
**Description**: Get student assessment details  
**Access**: Teacher (own), Admin  
**Parameters**:
- `teacherId`: UUID
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID
- `quadrantId`: string

### **POST /teachers/:teacherId/students/:studentId/assessment**
**Description**: Submit student assessment  
**Access**: Teacher (own), Admin  
**Request Body**:
```json
{
  "termId": "uuid",
  "quadrantId": "string",
  "scores": [
    {
      "componentId": "uuid",
      "obtainedScore": "number",
      "maxScore": "number",
      "notes": "string"
    }
  ],
  "overallNotes": "string",
  "status": "Draft|Submitted|Reviewed"
}
```

### **GET /teacher-microcompetencies/:teacherId/interventions**
**Description**: Get teacher's assigned interventions  
**Access**: Teacher, Admin  
**Parameters**:
- `teacherId`: UUID

### **GET /teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies**
**Description**: Get teacher's microcompetencies for intervention  
**Access**: Teacher, Admin  
**Parameters**:
- `teacherId`: UUID
- `interventionId`: UUID

### **GET /teacher-microcompetencies/:teacherId/interventions/:interventionId/students**
**Description**: Get students for scoring  
**Access**: Teacher, Admin  
**Parameters**:
- `teacherId`: UUID
- `interventionId`: UUID

### **POST /teacher-microcompetencies/:teacherId/interventions/:interventionId/students/:studentId/microcompetencies/:microcompetencyId/score**
**Description**: Score student on microcompetency  
**Access**: Teacher, Admin  
**Request Body**:
```json
{
  "obtained_score": "number",
  "feedback": "string",
  "status": "Draft|Submitted|Reviewed"
}
```

### **POST /teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies/:microcompetencyId/batch-score**
**Description**: Batch score multiple students  
**Access**: Teacher, Admin  
**Request Body**:
```json
{
  "scores": [
    {
      "student_id": "uuid",
      "obtained_score": "number",
      "feedback": "string",
      "status": "Draft|Submitted|Reviewed"
    }
  ]
}
```

---

## 👨‍🎓 **Student APIs**

### **GET /students/me**
**Description**: Get current student profile  
**Access**: Students only  

### **GET /students/:studentId/performance**
**Description**: Get student performance dashboard  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID
- `includeHistory`: boolean

### **GET /students/:studentId/leaderboard**
**Description**: Get student rankings  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID
- `quadrantId`: string

### **GET /students/:studentId/quadrants/:quadrantId**
**Description**: Get detailed quadrant information  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `quadrantId`: string
**Query Parameters**:
- `termId`: UUID

### **GET /students/:studentId/interventions**
**Description**: Get student's interventions  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `status`: string
- `quadrant`: string

### **GET /students/:studentId/interventions/:interventionId**
**Description**: Get intervention details for student  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID

### **GET /students/:studentId/interventions/:interventionId/tasks**
**Description**: Get intervention tasks  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID
**Query Parameters**:
- `status`: string

### **POST /students/:studentId/interventions/:interventionId/tasks/:taskId/submit**
**Description**: Submit intervention task  
**Access**: Student (own), Teacher, Admin  
**Request Body**:
```json
{
  "submissionText": "string",
  "attachments": ["array"]
}
```

### **GET /students/:studentId/scores/breakdown**
**Description**: Get detailed score breakdown  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID
- `quadrantId`: string
- `includeHistory`: boolean

### **POST /students/:studentId/feedback**
**Description**: Submit feedback  
**Access**: Student (own), Teacher, Admin  
**Request Body**:
```json
{
  "subject": "string",
  "message": "string",
  "category": "Academic|Behavioral|General"
}
```

### **GET /students/:studentId/feedback**
**Description**: Get feedback history
**Access**: Student (own), Teacher, Admin
**Query Parameters**:
- `page`: number
- `limit`: number
- `status`: string

### **GET /student-interventions/:studentId/scores**
**Description**: Get student's intervention-based scores with hierarchical breakdown
**Access**: Student (own), Teacher, Admin
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `interventionId`: UUID (optional, to filter specific intervention)
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "studentName": "string",
    "overallHPS": "number",
    "interventions": [
      {
        "interventionId": "uuid",
        "interventionName": "string",
        "totalScore": "number",
        "percentage": "number",
        "quadrants": [
          {
            "quadrantId": "string",
            "quadrantName": "string",
            "score": "number",
            "maxScore": "number",
            "percentage": "number",
            "weightage": "number"
          }
        ]
      }
    ]
  }
}
```

### **GET /student-interventions/:studentId/interventions/:interventionId/breakdown**
**Description**: Get detailed hierarchical score breakdown for a specific intervention
**Access**: Student (own), Teacher, Admin
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID
**Response (200)**:
```json
{
  "success": true,
  "data": {
    "intervention": {
      "id": "uuid",
      "name": "string",
      "totalScore": "number",
      "percentage": "number"
    },
    "quadrants": [
      {
        "quadrantId": "string",
        "quadrantName": "string",
        "score": "number",
        "maxScore": "number",
        "percentage": "number",
        "components": [
          {
            "componentId": "uuid",
            "componentName": "string",
            "score": "number",
            "maxScore": "number",
            "microcompetencies": [
              {
                "microcompetencyId": "uuid",
                "microcompetencyName": "string",
                "obtainedScore": "number",
                "maxScore": "number",
                "percentage": "number",
                "feedback": "string"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 🧮 **Score Calculation APIs**

### **GET /score-calculation/students/:studentId/interventions/:interventionId/competencies**
**Description**: Calculate competency scores  
**Access**: Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID

### **GET /score-calculation/students/:studentId/interventions/:interventionId/quadrants**
**Description**: Calculate quadrant scores  
**Access**: Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID

### **GET /score-calculation/students/:studentId/interventions/:interventionId/overall**
**Description**: Calculate overall intervention score  
**Access**: Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID

### **POST /score-calculation/students/:studentId/interventions/:interventionId/recalculate**
**Description**: Recalculate all scores for student  
**Access**: Teacher, Admin  
**Parameters**:
- `studentId`: UUID
- `interventionId`: UUID

### **GET /score-calculation/interventions/:interventionId/statistics**
**Description**: Get intervention score statistics  
**Access**: Teacher, Admin  
**Parameters**:
- `interventionId`: UUID

### **POST /score-calculation/interventions/:interventionId/recalculate-all**
**Description**: Recalculate scores for all students  
**Access**: Admin only  
**Parameters**:
- `interventionId`: UUID

---

## 📊 **Scoring APIs**

### **GET /scores/student/:studentId**
**Description**: Get detailed scores for student  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID

### **GET /scores/student/:studentId/summary**
**Description**: Get score summary for student  
**Access**: Student (own), Teacher, Admin  
**Parameters**:
- `studentId`: UUID
**Query Parameters**:
- `termId`: UUID

### **POST /scores**
**Description**: Add new score  
**Access**: Teacher, Admin  
**Request Body**:
```json
{
  "studentId": "uuid",
  "interventionId": "uuid",
  "microcompetencyId": "uuid",
  "obtainedScore": "number",
  "maxScore": "number",
  "feedback": "string"
}
```

### **PUT /scores/:id**
**Description**: Update score  
**Access**: Teacher, Admin  
**Parameters**:
- `id`: UUID

---

## 📅 **Term Management**

### **GET /terms**
**Description**: Get all terms  
**Access**: Public  
**Query Parameters**:
- `includeInactive`: boolean

### **GET /terms/current**
**Description**: Get current active term  
**Access**: Public  

### **POST /terms**
**Description**: Create new term  
**Access**: Admin only  
**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "academic_year": "string",
  "is_active": "boolean",
  "is_current": "boolean"
}
```

### **PUT /terms/:id**
**Description**: Update term  
**Access**: Admin only  
**Parameters**:
- `id`: UUID

### **POST /terms/:id/activate**
**Description**: Set term as current  
**Access**: Admin only  
**Parameters**:
- `id`: UUID

### **POST /terms/:id/transition**
**Description**: Transition students to term  
**Access**: Admin only  
**Request Body**:
```json
{
  "studentIds": ["uuid_array"],
  "resetScores": "boolean"
}
```

---

## 📁 **File Management**

### **POST /uploads/single**
**Description**: Upload single file  
**Access**: Authenticated users  
**Request**: FormData with 'file' field  

### **POST /uploads/multiple**
**Description**: Upload multiple files  
**Access**: Authenticated users  
**Request**: FormData with 'files' field (max 5)  

### **GET /uploads/files/:filename**
**Description**: Serve/download file  
**Access**: Public  
**Parameters**:
- `filename`: string

### **DELETE /uploads/files/:filename**
**Description**: Delete file  
**Access**: Authenticated users  
**Parameters**:
- `filename`: string

---

## 📋 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "message": "Descriptive message",
  "data": {},
  "timestamp": "ISO_DATE"
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details",
  "timestamp": "ISO_DATE"
}
```

### **Pagination Response**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalItems": "number",
    "itemsPerPage": "number",
    "hasNextPage": "boolean",
    "hasPrevPage": "boolean"
  }
}
```

---

## ⚠️ **HTTP Status Codes**

- **200**: Success
- **201**: Created
- **400**: Bad Request / Validation Error
- **401**: Unauthorized / Invalid Token
- **403**: Forbidden / Insufficient Permissions
- **404**: Not Found
- **409**: Conflict / Duplicate Resource
- **422**: Unprocessable Entity / Business Logic Error
- **500**: Internal Server Error

---

## 🔒 **Role-Based Access Control**

### **Admin**
- Full system access
- User management
- Intervention creation/management
- Teacher assignments
- Student enrollment
- System configuration
- Reports and analytics

### **Teacher**
- View assigned interventions
- Access assigned microcompetencies
- Score students
- Create tasks
- View student progress
- Generate reports for assigned students

### **Student**
- View own profile and scores
- Access assigned interventions
- Submit tasks
- View performance analytics
- Provide feedback

---

## 📝 **Common Query Parameters**

- `page`: Page number for pagination (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Text search across relevant fields
- `status`: Filter by status (Active, Inactive, Draft, etc.)
- `termId`: Filter by specific term
- `quadrantId`: Filter by quadrant (persona, wellness, behavior, discipline)
- `includeInactive`: Include inactive records (default: false)
- `sortBy`: Field to sort by
- `sortOrder`: Sort direction (asc, desc)

---

## 🔧 **Rate Limiting**

- **Window**: 15 minutes
- **Max Requests**: 1000 per IP
- **Headers**: 
  - `RateLimit-Limit`: Request limit
  - `RateLimit-Remaining`: Remaining requests
  - `RateLimit-Reset`: Reset time

---

## 🌐 **CORS Configuration**

**Allowed Origins**:
- http://localhost:8080
- http://localhost:8081
- http://localhost:8082
- http://localhost:5173
- http://localhost:3000

**Allowed Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS  
**Allowed Headers**: Content-Type, Authorization, X-Requested-With
