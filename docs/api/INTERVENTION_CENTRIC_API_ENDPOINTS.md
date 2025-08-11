# Intervention-Centric API Endpoints

## 🎯 **New API Endpoints for Intervention-Centric System**

### **1. Microcompetency Management APIs**

#### **GET** `/api/v1/microcompetencies/component/:componentId`
- **Description**: Get all microcompetencies for a specific component
- **Access**: Teachers, Admins
- **Query Parameters**: `includeInactive` (boolean)

#### **GET** `/api/v1/microcompetencies/quadrant/:quadrantId`
- **Description**: Get all microcompetencies for a specific quadrant (grouped by component)
- **Access**: Teachers, Admins

#### **GET** `/api/v1/microcompetencies/intervention/:interventionId`
- **Description**: Get all microcompetencies for a specific intervention with teacher assignments
- **Access**: Teachers, Admins

#### **POST** `/api/v1/microcompetencies`
- **Description**: Create new microcompetency
- **Access**: Admin only
- **Body**:
```json
{
  "component_id": "uuid",
  "name": "string",
  "description": "string",
  "weightage": "number (0-100)",
  "max_score": "number (default: 10)",
  "display_order": "number (default: 0)"
}
```

### **2. Enhanced Intervention APIs**

#### **POST** `/api/v1/interventions/:interventionId/microcompetencies`
- **Description**: Add microcompetencies to intervention
- **Access**: Admin only
- **Body**:
```json
{
  "microcompetencies": [
    {
      "microcompetency_id": "uuid",
      "weightage": "number (0-100)",
      "max_score": "number (optional)"
    }
  ]
}
```

#### **POST** `/api/v1/interventions/:interventionId/assign-teachers-microcompetencies`
- **Description**: Assign teachers to specific microcompetencies within intervention
- **Access**: Admin only
- **Body**:
```json
{
  "assignments": [
    {
      "teacher_id": "uuid",
      "microcompetency_id": "uuid",
      "can_score": "boolean (default: true)",
      "can_create_tasks": "boolean (default: true)"
    }
  ]
}
```

#### **PUT** `/api/v1/interventions/:interventionId/scoring-deadline`
- **Description**: Set scoring deadline for intervention
- **Access**: Admin only
- **Body**:
```json
{
  "scoring_deadline": "ISO date string",
  "is_scoring_open": "boolean (default: true)"
}
```

### **3. Teacher Microcompetency APIs**

#### **GET** `/api/v1/teacher-microcompetencies/:teacherId/interventions`
- **Description**: Get teacher's assigned interventions with microcompetency counts
- **Access**: Teacher, Admin
- **Query Parameters**: `status`, `includeCompleted`

#### **GET** `/api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies`
- **Description**: Get teacher's assigned microcompetencies for a specific intervention
- **Access**: Teacher, Admin

#### **GET** `/api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/students`
- **Description**: Get students assigned to teacher for scoring in a specific intervention
- **Access**: Teacher, Admin
- **Query Parameters**: `microcompetencyId` (to get existing scores)

#### **POST** `/api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/students/:studentId/microcompetencies/:microcompetencyId/score`
- **Description**: Score a student on a specific microcompetency
- **Access**: Teacher, Admin
- **Body**:
```json
{
  "obtained_score": "number",
  "feedback": "string (optional)",
  "status": "Draft | Submitted | Reviewed (default: Submitted)"
}
```

#### **POST** `/api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies/:microcompetencyId/batch-score`
- **Description**: Batch score multiple students on a specific microcompetency
- **Access**: Teacher, Admin
- **Body**:
```json
{
  "scores": [
    {
      "student_id": "uuid",
      "obtained_score": "number",
      "feedback": "string (optional)",
      "status": "string (optional)"
    }
  ]
}
```

### **4. Student Intervention Score APIs**

#### **GET** `/api/v1/student-interventions/:studentId/scores`
- **Description**: Get student's intervention-based scores with hierarchical breakdown
- **Access**: Student (own data), Teacher, Admin
- **Query Parameters**: `interventionId` (optional filter)

#### **GET** `/api/v1/student-interventions/:studentId/interventions/:interventionId/breakdown`
- **Description**: Get detailed hierarchical score breakdown for a specific intervention
- **Access**: Student (own data), Teacher, Admin

### **5. Score Calculation APIs**

#### **GET** `/api/v1/score-calculation/students/:studentId/interventions/:interventionId/competencies`
- **Description**: Calculate and return competency scores for a student in an intervention
- **Access**: Teacher, Admin

#### **GET** `/api/v1/score-calculation/students/:studentId/interventions/:interventionId/quadrants`
- **Description**: Calculate and return quadrant scores for a student in an intervention
- **Access**: Teacher, Admin

#### **GET** `/api/v1/score-calculation/students/:studentId/interventions/:interventionId/overall`
- **Description**: Calculate and return overall intervention score for a student
- **Access**: Teacher, Admin

#### **POST** `/api/v1/score-calculation/students/:studentId/interventions/:interventionId/recalculate`
- **Description**: Recalculate all scores for a student in an intervention
- **Access**: Teacher, Admin

#### **GET** `/api/v1/score-calculation/interventions/:interventionId/statistics`
- **Description**: Get score statistics for an intervention
- **Access**: Teacher, Admin

#### **POST** `/api/v1/score-calculation/interventions/:interventionId/recalculate-all`
- **Description**: Recalculate scores for all students in an intervention
- **Access**: Admin only

### **6. Enhanced Admin APIs**

#### **GET** `/api/v1/admin/intervention-dashboard`
- **Description**: Get intervention management dashboard with statistics
- **Access**: Admin only

#### **GET** `/api/v1/admin/interventions`
- **Description**: Get all interventions with microcompetency details and pagination
- **Access**: Admin only
- **Query Parameters**: `page`, `limit`, `status`, `search`, `sortBy`, `sortOrder`

#### **GET** `/api/v1/admin/interventions/:interventionId`
- **Description**: Get detailed intervention information with microcompetencies and assignments
- **Access**: Admin only

## 🔄 **Typical API Usage Flow**

### **Admin Creating an Intervention:**
1. `POST /interventions` - Create basic intervention
2. `POST /interventions/:id/microcompetencies` - Add microcompetencies with weightages
3. `POST /interventions/:id/assign-teachers-microcompetencies` - Assign teachers
4. `POST /interventions/:id/enroll-students` - Enroll students
5. `PUT /interventions/:id/scoring-deadline` - Set deadlines

### **Teacher Scoring Students:**
1. `GET /teacher-microcompetencies/:teacherId/interventions` - Get assigned interventions
2. `GET /teacher-microcompetencies/:teacherId/interventions/:id/microcompetencies` - Get microcompetencies
3. `GET /teacher-microcompetencies/:teacherId/interventions/:id/students` - Get students to score
4. `POST /teacher-microcompetencies/.../score` - Score individual students
5. `POST /teacher-microcompetencies/.../batch-score` - Batch score multiple students

### **Student Viewing Scores:**
1. `GET /student-interventions/:studentId/scores` - Get all intervention scores
2. `GET /student-interventions/:studentId/interventions/:id/breakdown` - Get detailed breakdown

### **Score Calculation & Analytics:**
1. `GET /score-calculation/students/:id/interventions/:id/overall` - Get calculated scores
2. `GET /score-calculation/interventions/:id/statistics` - Get intervention statistics
3. `POST /score-calculation/interventions/:id/recalculate-all` - Recalculate if needed

## 🔐 **Authentication & Authorization**

All endpoints require:
- **Bearer Token**: Include `Authorization: Bearer <token>` header
- **Role-based Access**: Endpoints are restricted based on user roles (student/teacher/admin)
- **Data Ownership**: Students can only access their own data

## 📊 **Response Format**

All APIs return consistent response format:
```json
{
  "success": true,
  "message": "Description of the operation",
  "data": { /* Response data */ },
  "count": "number (for list endpoints)",
  "timestamp": "ISO date string"
}
```

## ⚠️ **Error Handling**

Error responses include:
```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message",
  "timestamp": "ISO date string"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
