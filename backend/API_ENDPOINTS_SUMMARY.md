# Student API Endpoints - Quick Reference

## Base URL: `/api/v1/students`

### Dashboard & Performance (3 endpoints)
```
GET  /:studentId/performance              # Complete dashboard data
GET  /:studentId/leaderboard              # Rankings and comparisons  
GET  /:studentId/quadrants/:quadrantId    # Detailed quadrant view
```

### Feedback Management (2 endpoints)
```
POST /:studentId/feedback                 # Submit feedback
GET  /:studentId/feedback                 # Get feedback history
```

### Profile Management (3 endpoints)
```
GET  /:studentId/profile                  # Get student profile
PUT  /:studentId/profile                  # Update profile
POST /:studentId/change-password          # Change password
```

### Eligibility & Assessment (4 endpoints)
```
GET  /eligibility-rules                   # Business rules
GET  /:studentId/eligibility              # Eligibility check
GET  /:studentId/improvement-plan         # AI-generated plans
POST /:studentId/improvement-goals        # Set goals
```

### Attendance & Analytics (3 endpoints)
```
GET  /:studentId/attendance               # Attendance records
GET  /:studentId/scores/breakdown         # Detailed score breakdown
GET  /:studentId/behavior-rating-scale    # Behavior ratings
```

### Intervention Management (5 endpoints)
```
GET  /:studentId/interventions                                          # All interventions
GET  /:studentId/interventions/:interventionId                          # Intervention details
GET  /:studentId/interventions/:interventionId/tasks                    # Task management
POST /:studentId/interventions/:interventionId/tasks/:taskId/submit     # Task submission
GET  /:studentId/interventions/quadrant-impact                          # Impact analysis
```

### Administrative (2 endpoints)
```
GET  /                                    # All students (admin/teacher)
POST /                                    # Create student (admin)
```

### Development/Testing (1 endpoint)
```
POST /init-sample-data                    # Initialize sample data (admin)
```

## Total: **22 Student API Endpoints** ✅

### Authentication Required
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Common Query Parameters
- `termId` - Filter by specific term
- `page`, `limit` - Pagination
- `search` - Text search
- `status` - Status filtering
- `quadrant`/`quadrantId` - Quadrant filtering
- `includeHistory` - Include historical data

### Response Format
```json
{
  "success": true/false,
  "data": { ... },
  "message": "descriptive message", 
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request/Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error 