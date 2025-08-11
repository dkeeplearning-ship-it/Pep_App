# PEP Score Nexus API Documentation

## Overview

The PEP Score Nexus API provides comprehensive endpoints for managing student assessments, teacher assignments, interventions, and administrative functions in an educational assessment system.

**Base URL:** `http://localhost:3001/api/v1`

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

## API Endpoints Summary

### 1. Student APIs

#### Student Performance & Analytics
- `GET /students/{studentId}/performance` - Get student performance overview
- `GET /students/{studentId}/leaderboard` - Get student leaderboard position
- `GET /students/{studentId}/quadrants/{quadrantId}` - Get quadrant-specific performance

#### Student Profile Management
- `GET /students/{studentId}/profile` - Get student profile
- `PUT /students/{studentId}/profile` - Update student profile
- `POST /students/{studentId}/change-password` - Change student password

#### Student Feedback & Improvement
- `GET /students/{studentId}/feedback` - Get student feedback history
- `POST /students/{studentId}/feedback` - Submit feedback for student
- `GET /students/{studentId}/eligibility` - Check student eligibility
- `GET /students/{studentId}/improvement-plan` - Get improvement plan

### 2. Teacher APIs

#### Teacher Dashboard
- `GET /teachers/{teacherId}/dashboard` - Get teacher dashboard overview
- `GET /teachers/{teacherId}/students` - Get assigned students
- `GET /teachers/{teacherId}/reports` - Generate teacher reports

#### Student Assessment
- `GET /teachers/{teacherId}/students/{studentId}/assessment` - Get assessment details
- `POST /teachers/{teacherId}/students/{studentId}/assessment` - Submit assessment
- `POST /teachers/{teacherId}/students/{studentId}/assessment/draft` - Save as draft

#### Teacher Feedback Management
- `GET /teachers/{teacherId}/feedback` - Get teacher feedback list
- `POST /teachers/{teacherId}/feedback` - Send feedback to student

#### Admin Teacher Management
- `GET /teachers` - Get all teachers (Admin only)
- `GET /teachers/{id}` - Get teacher details (Admin only)
- `POST /teachers` - Create new teacher (Admin only)
- `PUT /teachers/{id}` - Update teacher (Admin only)
- `DELETE /teachers/{id}` - Delete teacher (Admin only)
- `POST /teachers/{teacherId}/assign-students` - Assign students to teacher (Admin only)

### 3. Admin APIs

#### Student Management
- `GET /admin/students` - Get all students with filters
- `GET /admin/students/{id}` - Get student details
- `POST /admin/students` - Create new student
- `PUT /admin/students/{id}` - Update student
- `DELETE /admin/students/{id}` - Delete student

#### Teacher Management
- `GET /admin/teachers` - Get all teachers with filters
- `POST /admin/teachers` - Create new teacher
- `PUT /admin/teachers/{id}` - Update teacher
- `DELETE /admin/teachers/{id}` - Delete teacher

#### Intervention Management
- `GET /admin/interventions` - Get all interventions
- `GET /admin/interventions/{id}` - Get intervention details
- `POST /admin/interventions` - Create new intervention
- `PUT /admin/interventions/{id}` - Update intervention
- `DELETE /admin/interventions/{id}` - Delete intervention

#### Dashboard & Analytics
- `GET /admin/dashboard` - Get admin dashboard overview
- `GET /admin/intervention-dashboard` - Get intervention dashboard

### 4. Intervention APIs

#### Intervention Management
- `GET /interventions` - Get all interventions
- `GET /interventions/{id}` - Get intervention details
- `POST /interventions` - Create intervention
- `PUT /interventions/{id}` - Update intervention
- `DELETE /interventions/{id}` - Delete intervention

#### Microcompetency Management
- `GET /interventions/{id}/microcompetencies` - Get intervention microcompetencies
- `POST /interventions/{id}/microcompetencies` - Add microcompetencies to intervention
- `DELETE /interventions/{id}/microcompetencies/{microcompetencyId}` - Remove microcompetency

#### Scoring Deadlines
- `PUT /interventions/{id}/scoring-deadline` - Update scoring deadline

### 5. Microcompetency APIs

#### Microcompetency Management
- `GET /microcompetencies` - Get all microcompetencies
- `GET /microcompetencies/{id}` - Get microcompetency details
- `POST /microcompetencies` - Create microcompetency
- `PUT /microcompetencies/{id}` - Update microcompetency
- `DELETE /microcompetencies/{id}` - Delete microcompetency

#### Filtering & Organization
- `GET /microcompetencies/quadrant/{quadrantId}` - Get by quadrant
- `GET /microcompetencies/component/{componentId}` - Get by component
- `GET /microcompetencies/intervention/{interventionId}` - Get by intervention

### 6. Teacher Microcompetency APIs

#### Teacher Assignments
- `GET /teacher-microcompetencies/{teacherId}/interventions` - Get teacher interventions
- `GET /teacher-microcompetencies/{teacherId}/interventions/{interventionId}/microcompetencies` - Get assigned microcompetencies
- `GET /teacher-microcompetencies/{teacherId}/interventions/{interventionId}/students` - Get students for scoring

#### Scoring
- `POST /teacher-microcompetencies/{teacherId}/interventions/{interventionId}/students/{studentId}/microcompetencies/{microcompetencyId}/score` - Score individual student
- `POST /teacher-microcompetencies/{teacherId}/interventions/{interventionId}/microcompetencies/{microcompetencyId}/batch-score` - Batch score students

### 7. Student Intervention APIs

#### Student Scores & Progress
- `GET /student-interventions/{studentId}/scores` - Get student scores
- `GET /student-interventions/{studentId}/interventions/{interventionId}/breakdown` - Get detailed breakdown

### 8. Score Calculation APIs

#### Score Analytics
- `GET /score-calculation/students/{studentId}/interventions/{interventionId}/competencies` - Get competency scores
- `GET /score-calculation/students/{studentId}/interventions/{interventionId}/quadrants` - Get quadrant scores
- `GET /score-calculation/students/{studentId}/interventions/{interventionId}/overall` - Get overall score
- `GET /score-calculation/interventions/{interventionId}/statistics` - Get intervention statistics

#### Score Recalculation
- `POST /score-calculation/students/{studentId}/interventions/{interventionId}/recalculate` - Recalculate scores

### 9. System APIs

#### Health & Status
- `GET /health` - Health check endpoint
- `GET /` - API documentation

#### Quadrants
- `GET /quadrants` - Get all quadrants

#### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/{id}` - Get user details (Admin only)

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-06-23T19:24:10.389Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2025-06-23T19:24:10.389Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-23T19:24:10.389Z"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting to ensure fair usage. Current limits:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## Error Handling

The API provides detailed error messages to help with debugging:

1. **Validation Errors**: Missing or invalid request parameters
2. **Authentication Errors**: Invalid or expired tokens
3. **Authorization Errors**: Insufficient permissions
4. **Database Errors**: Data integrity or constraint violations
5. **Server Errors**: Internal server issues

## Testing

All endpoints have been tested and are working correctly. The API supports:

- Student performance tracking and analytics
- Teacher dashboard and assessment management
- Administrative functions for user and intervention management
- Comprehensive scoring and calculation systems
- Feedback and improvement tracking

For detailed examples and request/response samples, refer to the individual endpoint documentation or use the interactive API documentation available at the base URL.
