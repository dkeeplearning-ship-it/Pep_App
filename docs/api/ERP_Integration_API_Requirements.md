# ERP Integration API Requirements for PEP Score Nexus

## Overview

This document outlines the simplified API requirements for integrating the college's ERP system with the PEP Score Nexus application. The PEP Score Nexus is a program-specific assessment application that requires minimal essential data from the ERP system.

## Integration Scope

The PEP Score Nexus application needs the following essential data from the ERP system:
- **Student Basic Details**: Core student information for PEP program participants
- **Teacher Basic Details**: Essential teacher information for PEP assessments
- **Overall Attendance**: Student's overall attendance percentage per term
- **Academic Structure**: Basic batch, section, and term information

**Note**: PEP Score Nexus uses SSO (Single Sign-On) integration with ERP and Microsoft, so no password/credential management is required.

## Base URL and Authentication

**ERP System Base URL**: `https://erp.college.edu/api/v1`

**Authentication**:
- API Key based authentication
- Include API key in header: `X-API-Key: <your-api-key>`
- All requests must be made over HTTPS

## Required API Endpoints

### 1. Student Management APIs

#### 1.1 Get All Students
**Endpoint**: `GET /students`

**Query Parameters**:
- `batch` (optional): Filter by batch year (e.g., "2024")
- `course` (optional): Filter by course (e.g., "PGDM", "MBA")
- `status` (optional): Filter by status ("active", "inactive")
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 100, max: 500)

**Required Response**:
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "string",
        "registration_no": "string",
        "name": "string",
        "email": "string",
        "course": "string",
        "batch": "string",
        "section": "string",
        "gender": "Male|Female|Other",
        "status": "active|inactive",
        "current_term": "string",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 1000,
      "items_per_page": 100
    }
  },
  "timestamp": "ISO 8601 timestamp"
}
```

#### 1.2 Get Student by ID
**Endpoint**: `GET /students/{student_id}`

**Required Response**:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "string",
      "registration_no": "string",
      "name": "string",
      "email": "string",
      "course": "string",
      "batch": "string",
      "section": "string",
      "gender": "Male|Female|Other",
      "status": "active|inactive",
      "current_term": "string",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 2. Teacher Management APIs

#### 2.1 Get All Teachers
**Endpoint**: `GET /teachers`

**Query Parameters**:
- `department` (optional): Filter by department
- `status` (optional): Filter by status ("active", "inactive")
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Required Response**:
```json
{
  "success": true,
  "data": {
    "teachers": [
      {
        "id": "string",
        "employee_id": "string",
        "name": "string",
        "email": "string",
        "department": "string",
        "specialization": "string",
        "status": "active|inactive",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "items_per_page": 10
    }
  },
  "timestamp": "ISO 8601 timestamp"
}
```

#### 2.2 Get Teacher by ID
**Endpoint**: `GET /teachers/{teacher_id}`

**Required Response**:
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": "string",
      "employee_id": "string",
      "name": "string",
      "email": "string",
      "department": "string",
      "specialization": "string",
      "status": "active|inactive",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 3. Attendance Management APIs

#### 3.1 Get Student Overall Attendance
**Endpoint**: `GET /students/{student_id}/attendance/summary`

**Query Parameters**:
- `term` (optional): Filter by specific term (if not provided, returns current term)
- `academic_year` (optional): Filter by academic year

**Required Response**:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "string",
      "registration_no": "string",
      "name": "string",
      "batch": "string",
      "section": "string"
    },
    "current_term": {
      "term": "string",
      "academic_year": "string",
      "overall_attendance_percentage": "number",
      "total_classes_held": "number",
      "total_classes_attended": "number",
      "status": "satisfactory|shortage|critical"
    },
    "previous_terms": [
      {
        "term": "string",
        "academic_year": "string",
        "overall_attendance_percentage": "number"
      }
    ]
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 4. Academic Structure APIs

#### 4.1 Get Academic Terms
**Endpoint**: `GET /academic/terms`

**Query Parameters**:
- `academic_year` (optional): Filter by academic year
- `is_current` (optional): Boolean to get only current term

**Required Response**:
```json
{
  "success": true,
  "data": {
    "terms": [
      {
        "id": "string",
        "name": "string",
        "academic_year": "string",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "is_current": "boolean"
      }
    ]
  },
  "timestamp": "ISO 8601 timestamp"
}
```

#### 4.2 Get Batches and Sections
**Endpoint**: `GET /academic/structure`

**Required Response**:
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "id": "string",
        "name": "string",
        "year": "number",
        "program": "string",
        "is_active": "boolean",
        "sections": [
          {
            "id": "string",
            "name": "string",
            "capacity": "number",
            "current_strength": "number"
          }
        ]
      }
    ]
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 5. Bulk Data APIs

#### 5.1 Bulk Student Data Export
**Endpoint**: `GET /bulk/students`

**Query Parameters**:
- `batch` (optional): Filter by batch
- `include_attendance` (optional): Boolean to include attendance summary

**Required Response**:
```json
{
  "success": true,
  "data": {
    "export_info": {
      "total_records": "number",
      "generated_at": "ISO 8601 timestamp"
    },
    "students": [
      {
        "id": "string",
        "registration_no": "string",
        "name": "string",
        "email": "string",
        "course": "string",
        "batch": "string",
        "section": "string",
        "gender": "string",
        "status": "string",
        "attendance_summary": {
          "current_term_percentage": "number",
          "previous_term_percentage": "number"
        }
      }
    ]
  },
  "timestamp": "ISO 8601 timestamp"
}
```

## Error Handling

### Standard Error Response Format
All API endpoints should follow this error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details if available"
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Invalid or missing API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per API key
- **Burst Limit**: 100 requests per minute
- **Headers**: Include rate limit information in response headers
  - `X-RateLimit-Limit`: Total requests allowed per hour
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

## Data Synchronization Requirements

### Daily Synchronization
The following data should be synchronized daily:
- Student profile updates
- Teacher profile updates
- Overall attendance percentage updates
- Student status changes (active/inactive)

### Weekly Synchronization
The following data can be synchronized weekly:
- Academic structure updates (batches, sections)
- Term information updates

### Initial Setup
- Bulk import of all student and teacher data
- Academic structure setup (batches, sections, terms)

## Security Requirements

1. **HTTPS Only**: All API communications must use HTTPS
2. **API Key Authentication**: Secure API key management
3. **IP Whitelisting**: Restrict API access to specific IP addresses
4. **Data Privacy**: Comply with data protection regulations


## PEP Score Nexus Integration Points

### How These APIs Will Be Used

#### Student Data Integration
- **Initial Setup**: Bulk import of all student data using `/bulk/students`
- **Daily Sync**: Update student profiles and status changes
- **SSO Integration**: Validate student identity through ERP system

#### Teacher Data Integration
- **Initial Setup**: Import all teacher data using `/teachers`
- **Daily Sync**: Update teacher profiles and status
- **SSO Integration**: Validate teacher identity through ERP system

#### Attendance Integration
- **Core Requirement**: Overall attendance percentage for PEP eligibility calculations
- **Data Flow**: ERP attendance → PEP eligibility calculation → Quadrant scoring
- **Frequency**: Daily synchronization of attendance summaries

#### Academic Structure Integration
- **Purpose**: Maintain consistent batch, section, and term information
- **Usage**: Ensure PEP assessments align with academic structure
- **Sync**: Weekly updates of academic structure

### PEP System API Endpoints That Will Consume ERP Data

Based on our existing PEP Score Nexus API structure, the following endpoints will integrate with ERP data:

#### Student Management
- `POST /api/v1/admin/students/sync-from-erp` - Sync student data from ERP
- `PUT /api/v1/students/{studentId}/attendance` - Update attendance from ERP
- `GET /api/v1/students/{studentId}/eligibility` - Calculate eligibility using ERP attendance

#### SSO Authentication Integration
- `POST /api/v1/auth/sso-validate` - Validate SSO token with ERP system
- `GET /api/v1/auth/user-exists` - Check if user exists in PEP system

#### Data Synchronization
- `POST /api/v1/admin/sync/students` - Trigger student data sync
- `POST /api/v1/admin/sync/teachers` - Trigger teacher data sync
- `POST /api/v1/admin/sync/attendance` - Trigger attendance sync
- `GET /api/v1/admin/sync/status` - Check synchronization status

## Sample Integration Workflow

### 1. Initial Data Setup
```
1. Call ERP /bulk/students → Import all student data to PEP system
2. Call ERP /teachers → Import all teacher data to PEP system
3. Call ERP /academic/structure → Setup batches, sections in PEP system
4. Call ERP /academic/terms → Setup terms information
```

### 2. Daily Synchronization
```
1. Call ERP /students → Sync student profile changes
2. Call ERP /students/{id}/attendance/summary → Update attendance for eligibility
3. Call ERP /teachers → Sync teacher profile changes
4. Update PEP system eligibility calculations based on new attendance data
```

### 3. SSO Authentication Flow
```
1. User logs in through ERP/Microsoft SSO
2. PEP system receives SSO token
3. Call ERP API to validate token and get user details
4. Check if user exists in PEP system database
5. Grant access to PEP application
```

## Conclusion

This simplified API specification provides the essential integration requirements between the college ERP system and PEP Score Nexus application. The APIs will enable:

- **Essential student and teacher data** synchronization for PEP program participants
- **Overall attendance tracking** for PEP eligibility calculations
- **SSO integration** eliminating the need for separate password management
- **Streamlined data management** with minimal but sufficient data exchange
- **Academic structure alignment** ensuring consistency between systems

The integration focuses on core requirements for the PEP assessment system while maintaining simplicity and avoiding unnecessary data complexity. This approach ensures efficient data synchronization and seamless user experience through SSO authentication.
