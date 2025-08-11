# PEP Score Nexus - PostgreSQL Database Architecture

## Overview
This document provides the complete PostgreSQL database schema for the PEP Score Nexus educational management system, accurately reflecting the current application structure and API requirements.

## Database Technology Stack
- **Database**: PostgreSQL 15+
- **Character Set**: UTF8
- **Extensions**: uuid-ossp, pgcrypto

## Core Database Schema

### 1. User Management

#### users
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
```

### 2. Academic Structure

#### batches
```sql
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_batch_name_year UNIQUE (name, year)
);

CREATE INDEX idx_batches_year ON batches(year);
CREATE INDEX idx_batches_active ON batches(is_active);
```

#### sections
```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name VARCHAR(10) NOT NULL,
    capacity INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_section_batch_name UNIQUE (batch_id, name)
);

CREATE INDEX idx_sections_batch ON sections(batch_id);
```

#### houses
```sql
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color code
    description TEXT,
    total_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_houses_active ON houses(is_active);
```

#### terms
```sql
CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_current BOOLEAN DEFAULT false,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_term_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_terms_active ON terms(is_active);
CREATE INDEX idx_terms_current ON terms(is_current);
CREATE INDEX idx_terms_year ON terms(academic_year);
```

### 3. Student Management

#### students
```sql
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE grade_type AS ENUM ('A+', 'A', 'B', 'C', 'D', 'E', 'IC');
CREATE TYPE status_type AS ENUM ('Good', 'Progress', 'Deteriorate', 'Cleared', 'Not Cleared', 'Attendance Shortage');
CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Graduated', 'Dropped');

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_no VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    course VARCHAR(100) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
    gender gender_type NOT NULL,
    phone VARCHAR(20),
    preferences JSONB DEFAULT '{}',
    overall_score DECIMAL(5,2) DEFAULT 0.00,
    grade grade_type DEFAULT 'IC',
    status student_status DEFAULT 'Active',
    current_term VARCHAR(20) DEFAULT 'Term1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_registration ON students(registration_no);
CREATE INDEX idx_students_batch_section ON students(batch_id, section_id);
CREATE INDEX idx_students_house ON students(house_id);
CREATE INDEX idx_students_status ON students(status);
```

### 4. Teacher Management

#### teachers
```sql
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100),
    department VARCHAR(100),
    assigned_quadrants JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_specialization ON teachers(specialization);
```

#### teacher_assignments
```sql
CREATE TABLE teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,

    CONSTRAINT uk_teacher_student_term_quadrant UNIQUE (teacher_id, student_id, term_id, quadrant_id)
);

CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_student ON teacher_assignments(student_id);
CREATE INDEX idx_teacher_assignments_term ON teacher_assignments(term_id);
CREATE INDEX idx_teacher_assignments_quadrant ON teacher_assignments(quadrant_id);
CREATE INDEX idx_teacher_assignments_active ON teacher_assignments(is_active);
```

#### admins
```sql
CREATE TYPE access_level AS ENUM ('super', 'standard', 'limited');

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    access_level access_level DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Assessment Structure

#### quadrants
```sql
CREATE TABLE quadrants (
    id VARCHAR(50) PRIMARY KEY, -- persona, wellness, behavior, discipline
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    minimum_attendance DECIMAL(5,2) DEFAULT 0.00,
    business_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_quadrant_weightage CHECK (weightage > 0 AND weightage <= 100),
    CONSTRAINT chk_quadrant_attendance CHECK (minimum_attendance >= 0 AND minimum_attendance <= 100)
);

CREATE INDEX idx_quadrants_active ON quadrants(is_active);
CREATE INDEX idx_quadrants_order ON quadrants(display_order);
```

#### sub_categories
```sql
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_subcategory_weightage CHECK (weightage > 0 AND weightage <= 100)
);

CREATE INDEX idx_subcategories_quadrant ON sub_categories(quadrant_id);
CREATE INDEX idx_subcategories_order ON sub_categories(display_order);
```

#### components
```sql
CREATE TYPE component_category AS ENUM ('SHL', 'Professional', 'Physical', 'Mental', 'Social', 'Conduct', 'Academic');

CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    minimum_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    category component_category NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_component_scores CHECK (max_score > 0 AND minimum_score >= 0 AND minimum_score <= max_score),
    CONSTRAINT chk_component_weightage CHECK (weightage > 0 AND weightage <= 100)
);

CREATE INDEX idx_components_subcategory ON components(sub_category_id);
CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_order ON components(display_order);
```

### 6. Scoring and Assessment

#### scores
```sql
CREATE TYPE assessment_type AS ENUM ('Teacher', 'SHL', 'Self', 'Peer', 'System');
CREATE TYPE score_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');

CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    obtained_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((obtained_score / max_score) * 100) STORED,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assessed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assessment_type assessment_type DEFAULT 'Teacher',
    notes TEXT,
    status score_status DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_score_student_component_term UNIQUE (student_id, component_id, term_id),
    CONSTRAINT chk_score_range CHECK (obtained_score >= 0 AND obtained_score <= max_score)
);

CREATE INDEX idx_scores_student_term ON scores(student_id, term_id);
CREATE INDEX idx_scores_component ON scores(component_id);
CREATE INDEX idx_scores_assessor ON scores(assessed_by);
CREATE INDEX idx_scores_date ON scores(assessment_date);
```

#### attendance
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    is_present BOOLEAN NOT NULL,
    reason VARCHAR(255),
    marked_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_attendance_unique UNIQUE (student_id, term_id, quadrant_id, attendance_date)
);

CREATE INDEX idx_attendance_student_term ON attendance(student_id, term_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_quadrant ON attendance(quadrant_id);
```

#### attendance_summary
```sql
CREATE TABLE attendance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    attended_sessions INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_sessions > 0 THEN (attended_sessions::DECIMAL / total_sessions) * 100
            ELSE 0
        END
    ) STORED,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_attendance_summary UNIQUE (student_id, term_id, quadrant_id),
    CONSTRAINT chk_attendance_sessions CHECK (attended_sessions >= 0 AND attended_sessions <= total_sessions)
);

CREATE INDEX idx_attendance_summary_student ON attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_term ON attendance_summary(term_id);
CREATE INDEX idx_attendance_summary_quadrant ON attendance_summary(quadrant_id);
CREATE INDEX idx_attendance_summary_percentage ON attendance_summary(percentage);
```

#### student_terms
```sql
CREATE TYPE enrollment_status AS ENUM ('Enrolled', 'Completed', 'Dropped', 'Transferred');

CREATE TABLE student_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    enrollment_status enrollment_status DEFAULT 'Enrolled',
    total_score DECIMAL(5,2) DEFAULT 0.00,
    grade grade_type DEFAULT 'IC',
    overall_status status_type DEFAULT 'Progress',
    rank INTEGER,
    is_eligible BOOLEAN DEFAULT true,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT uk_student_term UNIQUE (student_id, term_id)
);

CREATE INDEX idx_student_terms_term ON student_terms(term_id);
CREATE INDEX idx_student_terms_status ON student_terms(enrollment_status);
```

### 7. Intervention System

#### interventions
```sql
CREATE TYPE intervention_status AS ENUM ('Draft', 'Active', 'Completed', 'Archived', 'Cancelled');

CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status intervention_status DEFAULT 'Draft',
    quadrant_weightages JSONB NOT NULL DEFAULT '{}',
    prerequisites JSONB DEFAULT '[]',
    max_students INTEGER DEFAULT 50,
    objectives JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_intervention_dates CHECK (end_date > start_date),
    CONSTRAINT chk_intervention_max_students CHECK (max_students > 0)
);

CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_dates ON interventions(start_date, end_date);
CREATE INDEX idx_interventions_creator ON interventions(created_by);
```

#### intervention_quadrants
```sql
CREATE TABLE intervention_quadrants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    weightage DECIMAL(5,2) NOT NULL,
    components JSONB DEFAULT '[]', -- Array of component IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_intervention_quadrant UNIQUE (intervention_id, quadrant_id),
    CONSTRAINT chk_intervention_quadrant_weightage CHECK (weightage > 0 AND weightage <= 100)
);

CREATE INDEX idx_intervention_quadrants_intervention ON intervention_quadrants(intervention_id);
CREATE INDEX idx_intervention_quadrants_quadrant ON intervention_quadrants(quadrant_id);
```

#### intervention_teachers
```sql
CREATE TYPE teacher_role AS ENUM ('Lead', 'Assistant');

CREATE TABLE intervention_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    assigned_quadrants JSONB NOT NULL DEFAULT '[]',
    role teacher_role DEFAULT 'Assistant',
    permissions JSONB DEFAULT '[]',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,

    CONSTRAINT uk_intervention_teacher UNIQUE (intervention_id, teacher_id)
);

CREATE INDEX idx_intervention_teachers_intervention ON intervention_teachers(intervention_id);
CREATE INDEX idx_intervention_teachers_teacher ON intervention_teachers(teacher_id);
```

#### intervention_enrollments
```sql
CREATE TYPE intervention_enrollment_status AS ENUM ('Enrolled', 'Pending', 'Dropped', 'Completed');
CREATE TYPE enrollment_type AS ENUM ('Mandatory', 'Optional');

CREATE TABLE intervention_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    enrollment_status intervention_enrollment_status DEFAULT 'Enrolled',
    enrollment_type enrollment_type DEFAULT 'Optional',
    progress_data JSONB DEFAULT '{}',
    current_score DECIMAL(5,2) DEFAULT 0.00,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    enrolled_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT uk_intervention_enrollment UNIQUE (intervention_id, student_id)
);

CREATE INDEX idx_intervention_enrollments_intervention ON intervention_enrollments(intervention_id);
CREATE INDEX idx_intervention_enrollments_student ON intervention_enrollments(student_id);
```

#### tasks
```sql
CREATE TYPE submission_type AS ENUM ('Document', 'Presentation', 'Video', 'Link', 'Text');
CREATE TYPE task_status AS ENUM ('Draft', 'Active', 'Completed', 'Archived');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE RESTRICT,
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    due_date TIMESTAMP NOT NULL,
    instructions TEXT,
    rubric JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    submission_type submission_type DEFAULT 'Document',
    allow_late_submission BOOLEAN DEFAULT true,
    late_penalty DECIMAL(5,2) DEFAULT 0.00,
    status task_status DEFAULT 'Draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_task_max_score CHECK (max_score > 0),
    CONSTRAINT chk_task_late_penalty CHECK (late_penalty >= 0 AND late_penalty <= 100)
);

CREATE INDEX idx_tasks_intervention ON tasks(intervention_id);
CREATE INDEX idx_tasks_quadrant ON tasks(quadrant_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### task_submissions
```sql
CREATE TYPE submission_status AS ENUM ('Submitted', 'Graded', 'Returned', 'Late');

CREATE TABLE task_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status submission_status DEFAULT 'Submitted',
    is_late BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    submission_text TEXT,
    score DECIMAL(5,2),
    rubric_scores JSONB DEFAULT '[]',
    feedback TEXT,
    private_notes TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP,

    CONSTRAINT uk_task_submission UNIQUE (task_id, student_id)
);

CREATE INDEX idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_student ON task_submissions(student_id);
CREATE INDEX idx_task_submissions_status ON task_submissions(status);
```

### 8. Communication and System

#### feedback
```sql
CREATE TYPE feedback_category AS ENUM ('General', 'Academic', 'Technical', 'Wellness', 'Behavior');
CREATE TYPE priority_type AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE feedback_status AS ENUM ('Submitted', 'In Progress', 'Resolved', 'Closed');

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    category feedback_category NOT NULL,
    message TEXT NOT NULL,
    priority priority_type DEFAULT 'Medium',
    status feedback_status DEFAULT 'Submitted',
    response TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_student ON feedback(student_id);
CREATE INDEX idx_feedback_teacher ON feedback(teacher_id);
CREATE INDEX idx_feedback_status ON feedback(status);
```

#### notifications
```sql
CREATE TYPE notification_type AS ENUM ('Info', 'Success', 'Warning', 'Error', 'System');
CREATE TYPE notification_category AS ENUM ('Score', 'Attendance', 'Assignment', 'System', 'Announcement');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'Info',
    category notification_category NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

#### system_settings
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_public ON system_settings(is_public);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### 9. File Management and Data Operations

#### file_uploads
```sql
CREATE TYPE upload_purpose AS ENUM ('Profile Picture', 'Document', 'Assignment', 'Report', 'System', 'Other');

CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50), -- students, tasks, feedback, etc.
    entity_id UUID,
    is_public BOOLEAN DEFAULT false,
    upload_purpose upload_purpose DEFAULT 'Other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_file_size CHECK (file_size > 0)
);

CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_uploader ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_hash ON file_uploads(file_hash);
CREATE INDEX idx_file_uploads_created ON file_uploads(created_at);
CREATE INDEX idx_file_uploads_purpose ON file_uploads(upload_purpose);
```

#### data_imports
```sql
CREATE TYPE import_type AS ENUM ('Students', 'Scores', 'Attendance', 'Teachers', 'Interventions');
CREATE TYPE import_status AS ENUM ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled');

CREATE TABLE data_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type import_type NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status import_status DEFAULT 'Pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]',
    processing_log JSONB DEFAULT '[]',
    term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
    imported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_import_records CHECK (
        processed_records >= 0 AND
        successful_records >= 0 AND
        failed_records >= 0 AND
        processed_records = successful_records + failed_records
    )
);

CREATE INDEX idx_data_imports_type ON data_imports(import_type);
CREATE INDEX idx_data_imports_status ON data_imports(status);
CREATE INDEX idx_data_imports_importer ON data_imports(imported_by);
CREATE INDEX idx_data_imports_created ON data_imports(created_at);
CREATE INDEX idx_data_imports_term ON data_imports(term_id);
```

#### email_logs
```sql
CREATE TYPE email_type AS ENUM ('Welcome', 'Score Update', 'Notification', 'Report', 'System', 'Intervention', 'Reminder');
CREATE TYPE email_status AS ENUM ('Queued', 'Sent', 'Failed', 'Bounced', 'Delivered');

CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    email_type email_type NOT NULL,
    template_name VARCHAR(100),
    status email_status DEFAULT 'Queued',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_user ON email_logs(recipient_user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);
CREATE INDEX idx_email_logs_sent ON email_logs(sent_at);
```

### 10. External Service Integration

#### shl_integrations
```sql
CREATE TYPE sync_status AS ENUM ('Success', 'Failed', 'Partial', 'Pending');

CREATE TABLE shl_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    shl_user_id VARCHAR(100) NOT NULL,
    competency_data JSONB NOT NULL DEFAULT '{}',
    last_sync_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_status sync_status DEFAULT 'Success',
    error_message TEXT,
    sync_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_shl_student UNIQUE (student_id),
    CONSTRAINT uk_shl_user_id UNIQUE (shl_user_id)
);

CREATE INDEX idx_shl_integrations_shl_user ON shl_integrations(shl_user_id);
CREATE INDEX idx_shl_integrations_sync ON shl_integrations(last_sync_at);
CREATE INDEX idx_shl_integrations_status ON shl_integrations(sync_status);
```

## Initial Data Setup

### Default Quadrants
```sql
INSERT INTO quadrants (id, name, description, weightage, minimum_attendance, display_order) VALUES
('persona', 'Persona', 'SHL Competencies and Professional Readiness', 50.00, 80.00, 1),
('wellness', 'Wellness', 'Physical, Mental, and Social Wellness', 30.00, 80.00, 2),
('behavior', 'Behavior', 'Professional Conduct, Interpersonal Skills, and Personal Development', 10.00, 0.00, 3),
('discipline', 'Discipline', 'Attendance, Code of Conduct, and Academic Discipline', 10.00, 0.00, 4);
```

### Default Sub-Categories
```sql
-- Persona Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('persona', 'SHL Competencies', 'Critical thinking, communication, leadership, teamwork, negotiation', 80.00, 1),
('persona', 'Professional Readiness', 'Business etiquette, appearance, time management, work ethics', 20.00, 2);

-- Wellness Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('wellness', 'Physical Fitness', 'Endurance, strength, flexibility, overall health', 40.00, 1),
('wellness', 'Mental Wellness', 'Stress management, emotional intelligence, work-life balance', 40.00, 2),
('wellness', 'Social Wellness', 'Team activities, community engagement, peer support', 20.00, 3);

-- Behavior Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('behavior', 'Professional Conduct', 'Punctuality, responsibility, initiative, adaptability', 40.00, 1),
('behavior', 'Interpersonal Skills', 'Communication, conflict resolution, collaboration', 40.00, 2),
('behavior', 'Personal Development', 'Self-awareness, growth mindset, learning attitude', 20.00, 3);

-- Discipline Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('discipline', 'Attendance', 'Regularity, punctuality, preparedness', 40.00, 1),
('discipline', 'Code of Conduct', 'Policy compliance, ethical behavior, professional standards', 40.00, 2),
('discipline', 'Academic Discipline', 'Assignment completion, deadlines, quality of work', 20.00, 3);
```

### Default Houses
```sql
INSERT INTO houses (name, color, description) VALUES
('Daredevils', '#FF6B6B', 'Bold and adventurous house'),
('Coronation', '#4ECDC4', 'Royal and dignified house'),
('Apache', '#45B7D1', 'Strong and resilient house'),
('Bravehearts', '#96CEB4', 'Courageous and determined house');
```

### Default System Settings
```sql
INSERT INTO system_settings (setting_key, setting_value, description, category, is_public, updated_by) VALUES
('grading_scale', '{"A+": {"min": 90, "max": 100}, "A": {"min": 80, "max": 89}, "B": {"min": 70, "max": 79}, "C": {"min": 60, "max": 69}, "D": {"min": 50, "max": 59}, "E": {"min": 40, "max": 49}, "IC": {"min": 0, "max": 39}}', 'System grading scale configuration', 'Assessment', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('attendance_rules', '{"persona": {"minimum": 80}, "wellness": {"minimum": 80}, "behavior": {"minimum": 0}, "discipline": {"minimum": 0}}', 'Attendance requirements by quadrant', 'Assessment', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
('behavior_minimum_scores', '{"minimum_score": 2.0, "applies_to": "all_components"}', 'Minimum score requirements for behavior components', 'Assessment', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1));
```

## Database Functions and Triggers

### Update Timestamp Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Calculate Student Grade Function
```sql
CREATE OR REPLACE FUNCTION calculate_grade(score DECIMAL)
RETURNS grade_type AS $$
BEGIN
    CASE
        WHEN score >= 90 THEN RETURN 'A+';
        WHEN score >= 80 THEN RETURN 'A';
        WHEN score >= 70 THEN RETURN 'B';
        WHEN score >= 60 THEN RETURN 'C';
        WHEN score >= 50 THEN RETURN 'D';
        WHEN score >= 40 THEN RETURN 'E';
        ELSE RETURN 'IC';
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

## Performance Optimization

### Composite Indexes
```sql
-- Student performance queries
CREATE INDEX idx_scores_student_term_component ON scores(student_id, term_id, component_id);
CREATE INDEX idx_attendance_student_term_quadrant ON attendance(student_id, term_id, quadrant_id);

-- Leaderboard queries
CREATE INDEX idx_scores_term_component_score ON scores(term_id, component_id, obtained_score DESC);
CREATE INDEX idx_student_terms_term_score ON student_terms(term_id, total_score DESC);

-- Intervention queries
CREATE INDEX idx_intervention_enrollments_intervention_status ON intervention_enrollments(intervention_id, enrollment_status);
CREATE INDEX idx_tasks_intervention_status_due ON tasks(intervention_id, status, due_date);
```

### Database Views
```sql
-- Student Performance Summary View
CREATE VIEW student_performance_summary AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.registration_no,
    s.batch_id,
    s.section_id,
    st.term_id,
    st.total_score,
    st.grade,
    st.rank,
    COUNT(DISTINCT sc.component_id) as components_assessed,
    AVG(sc.percentage) as average_percentage
FROM students s
JOIN student_terms st ON s.id = st.student_id
LEFT JOIN scores sc ON s.id = sc.student_id AND st.term_id = sc.term_id
GROUP BY s.id, s.name, s.registration_no, s.batch_id, s.section_id, st.term_id, st.total_score, st.grade, st.rank;

-- Attendance Overview View
CREATE VIEW attendance_overview AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.registration_no,
    a.term_id,
    a.quadrant_id,
    q.name as quadrant_name,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE a.is_present = true) as attended_sessions,
    ROUND((COUNT(*) FILTER (WHERE a.is_present = true)::DECIMAL / COUNT(*)) * 100, 2) as attendance_percentage,
    CASE
        WHEN ROUND((COUNT(*) FILTER (WHERE a.is_present = true)::DECIMAL / COUNT(*)) * 100, 2) >= q.minimum_attendance
        THEN 'Eligible'
        ELSE 'Not Eligible'
    END as eligibility_status
FROM students s
JOIN attendance a ON s.id = a.student_id
JOIN quadrants q ON a.quadrant_id = q.id
GROUP BY s.id, s.name, s.registration_no, a.term_id, a.quadrant_id, q.name, q.minimum_attendance;
```

This PostgreSQL database schema is now accurately aligned with the current application structure and provides a solid foundation for the PEP Score Nexus system.

## Cloud Deployment Compatibility

### ✅ **Supabase Compatibility**

This PostgreSQL schema is **100% compatible** with Supabase and can be deployed seamlessly:

#### **Supabase Features Supported:**
- ✅ **PostgreSQL 15+**: Supabase runs on PostgreSQL 15
- ✅ **UUID Extensions**: `uuid-ossp` extension is available
- ✅ **JSONB Support**: Full JSONB support with indexing
- ✅ **Custom Types**: ENUMs and custom types supported
- ✅ **Triggers & Functions**: PL/pgSQL functions supported
- ✅ **Row Level Security**: Can be added for enhanced security
- ✅ **Real-time**: Supabase real-time can be enabled on tables
- ✅ **Auto-generated APIs**: Supabase will auto-generate REST APIs

#### **Supabase Deployment Steps:**
```sql
-- 1. Create database in Supabase dashboard
-- 2. Run schema creation scripts in SQL editor
-- 3. Enable Row Level Security (optional)
-- 4. Configure API settings
-- 5. Set up authentication policies
```

#### **Supabase-Specific Enhancements:**
```sql
-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for student data access
CREATE POLICY "Students can view own data" ON students
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view assigned students" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teacher_assignments ta
            JOIN teachers t ON ta.teacher_id = t.id
            WHERE ta.student_id = students.id
            AND t.user_id = auth.uid()
        )
    );
```

### ✅ **Other Cloud Services Compatibility**

#### **AWS RDS PostgreSQL:**
- ✅ **Fully Compatible**: All features supported
- ✅ **Managed Service**: Automatic backups, scaling, monitoring
- ✅ **Performance Insights**: Query performance monitoring
- ✅ **Multi-AZ**: High availability deployment

#### **Google Cloud SQL PostgreSQL:**
- ✅ **Fully Compatible**: All features supported
- ✅ **Cloud SQL Proxy**: Secure connections
- ✅ **Automatic Backups**: Point-in-time recovery
- ✅ **Read Replicas**: Horizontal scaling

#### **Azure Database for PostgreSQL:**
- ✅ **Fully Compatible**: All features supported
- ✅ **Flexible Server**: Latest PostgreSQL versions
- ✅ **Built-in Security**: Advanced threat protection
- ✅ **Intelligent Performance**: Query performance insights

#### **Railway PostgreSQL:**
- ✅ **Fully Compatible**: All features supported
- ✅ **Simple Deployment**: Git-based deployments
- ✅ **Automatic Scaling**: Resource scaling
- ✅ **Built-in Monitoring**: Database metrics

#### **PlanetScale (MySQL Alternative):**
- ❌ **Not Compatible**: Requires MySQL conversion
- ⚠️ **Would Need**: Schema conversion and feature adjustments

### 🚀 **Recommended Cloud Deployment Options**

#### **1. Supabase (Recommended for MVP/Startup)**
```yaml
Pros:
  - Auto-generated APIs
  - Built-in authentication
  - Real-time subscriptions
  - Free tier available
  - Easy setup and deployment

Cons:
  - Less control over infrastructure
  - Vendor lock-in
  - Limited customization options
```

#### **2. AWS RDS (Recommended for Enterprise)**
```yaml
Pros:
  - Full PostgreSQL control
  - Enterprise-grade security
  - Extensive monitoring and logging
  - Integration with AWS ecosystem
  - High availability options

Cons:
  - More complex setup
  - Higher costs
  - Requires DevOps knowledge
```

#### **3. Railway (Recommended for Development)**
```yaml
Pros:
  - Simple deployment
  - Git integration
  - Affordable pricing
  - Good for prototyping

Cons:
  - Newer platform
  - Limited enterprise features
  - Smaller ecosystem
```

### 📋 **Migration Checklist for Cloud Deployment**

#### **Pre-Migration:**
- [ ] Choose cloud provider
- [ ] Set up cloud account and billing
- [ ] Plan database sizing and performance requirements
- [ ] Review security and compliance requirements

#### **Migration Steps:**
- [ ] Create database instance
- [ ] Run schema creation scripts
- [ ] Import initial data (quadrants, houses, system settings)
- [ ] Set up connection pooling
- [ ] Configure backup and monitoring
- [ ] Test all API endpoints
- [ ] Set up SSL/TLS encryption
- [ ] Configure environment variables

#### **Post-Migration:**
- [ ] Monitor performance metrics
- [ ] Set up alerting
- [ ] Test disaster recovery procedures
- [ ] Document connection strings and credentials
- [ ] Train team on cloud management

### 🔒 **Security Considerations for Cloud Deployment**

#### **Database Security:**
- ✅ **SSL/TLS Encryption**: All connections encrypted
- ✅ **VPC/Private Networks**: Database in private subnet
- ✅ **IAM Authentication**: Role-based access control
- ✅ **Audit Logging**: All database activities logged
- ✅ **Regular Backups**: Automated backup strategies

#### **Application Security:**
- ✅ **Connection Pooling**: PgBouncer or similar
- ✅ **Environment Variables**: Secure credential storage
- ✅ **API Rate Limiting**: Prevent abuse
- ✅ **Input Validation**: SQL injection prevention
- ✅ **GDPR Compliance**: Data privacy features

This PostgreSQL schema is **cloud-ready** and can be deployed on any major cloud platform with minimal modifications.

#### sub_categories
```sql
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quadrant_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (quadrant_id) REFERENCES quadrants(id) ON DELETE CASCADE,
    INDEX idx_subcategories_quadrant (quadrant_id),
    INDEX idx_subcategories_active (is_active),
    INDEX idx_subcategories_order (display_order)
);
```

#### components
```sql
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_category_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    minimum_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    category ENUM('SHL', 'Professional', 'Physical', 'Mental', 'Social', 'Conduct', 'Academic') NOT NULL,
    assessment_type ENUM('Continuous', 'Periodic', 'Final') DEFAULT 'Continuous',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE CASCADE,
    INDEX idx_components_subcategory (sub_category_id),
    INDEX idx_components_category (category),
    INDEX idx_components_active (is_active),
    INDEX idx_components_order (display_order),

    CONSTRAINT chk_component_scores CHECK (max_score > 0 AND minimum_score >= 0 AND minimum_score <= max_score),
    CONSTRAINT chk_component_weightage CHECK (weightage > 0 AND weightage <= 100)
);
```

### 6. Scoring and Assessment Tables

#### scores
```sql
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    component_id UUID NOT NULL,
    term_id UUID NOT NULL,
    obtained_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((obtained_score / max_score) * 100) STORED,
    assessment_date DATE NOT NULL,
    assessed_by UUID NOT NULL,
    assessment_type ENUM('Teacher', 'SHL', 'Self', 'Peer', 'System') DEFAULT 'Teacher',
    notes TEXT,
    status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (assessed_by) REFERENCES users(id) ON DELETE RESTRICT,

    UNIQUE KEY uk_score_student_component_term (student_id, component_id, term_id),
    INDEX idx_scores_student_term (student_id, term_id),
    INDEX idx_scores_component (component_id),
    INDEX idx_scores_assessor (assessed_by),
    INDEX idx_scores_date (assessment_date),
    INDEX idx_scores_status (status),

    CONSTRAINT chk_score_range CHECK (obtained_score >= 0 AND obtained_score <= max_score)
);
```

#### attendance
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    term_id UUID NOT NULL,
    quadrant_id VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    is_present BOOLEAN NOT NULL,
    reason VARCHAR(255),
    marked_by UUID NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (quadrant_id) REFERENCES quadrants(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT,

    UNIQUE KEY uk_attendance_student_date_quadrant (student_id, attendance_date, quadrant_id),
    INDEX idx_attendance_student_term (student_id, term_id),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_quadrant (quadrant_id)
);
```

#### attendance_summary
```sql
CREATE TABLE attendance_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    term_id UUID NOT NULL,
    quadrant_id VARCHAR(50) NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    attended_sessions INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((attended_sessions / NULLIF(total_sessions, 0)) * 100) STORED,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (quadrant_id) REFERENCES quadrants(id) ON DELETE CASCADE,

    UNIQUE KEY uk_attendance_summary (student_id, term_id, quadrant_id),
    INDEX idx_attendance_summary_student (student_id),
    INDEX idx_attendance_summary_term (term_id)
);
```

### 7. Intervention System Tables

#### interventions
```sql
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('Draft', 'Active', 'Completed', 'Archived', 'Cancelled') DEFAULT 'Draft',
    quadrant_weightages JSON NOT NULL, -- {quadrant_id: weightage}
    prerequisites JSON, -- Array of intervention IDs
    max_students INTEGER DEFAULT 50,
    objectives JSON, -- Array of objectives
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_interventions_status (status),
    INDEX idx_interventions_dates (start_date, end_date),
    INDEX idx_interventions_creator (created_by),

    CONSTRAINT chk_intervention_dates CHECK (end_date > start_date)
);
```

#### intervention_quadrants
```sql
CREATE TABLE intervention_quadrants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL,
    quadrant_id VARCHAR(50) NOT NULL,
    weightage DECIMAL(5,2) NOT NULL,
    components JSON, -- Array of component IDs

    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (quadrant_id) REFERENCES quadrants(id) ON DELETE CASCADE,

    UNIQUE KEY uk_intervention_quadrant (intervention_id, quadrant_id),
    INDEX idx_intervention_quadrants_intervention (intervention_id),

    CONSTRAINT chk_intervention_quadrant_weightage CHECK (weightage > 0 AND weightage <= 100)
);
```

#### intervention_teachers
```sql
CREATE TABLE intervention_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    assigned_quadrants JSON NOT NULL, -- Array of quadrant IDs
    role ENUM('Lead', 'Assistant') DEFAULT 'Assistant',
    permissions JSON, -- Array of permissions
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,

    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,

    UNIQUE KEY uk_intervention_teacher (intervention_id, teacher_id),
    INDEX idx_intervention_teachers_intervention (intervention_id),
    INDEX idx_intervention_teachers_teacher (teacher_id)
);
```

#### intervention_enrollments
```sql
CREATE TABLE intervention_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL,
    student_id UUID NOT NULL,
    enrollment_date DATE NOT NULL,
    enrollment_status ENUM('Enrolled', 'Pending', 'Dropped', 'Completed') DEFAULT 'Enrolled',
    enrollment_type ENUM('Mandatory', 'Optional') DEFAULT 'Optional',
    progress_data JSON, -- Progress tracking data
    current_score DECIMAL(5,2) DEFAULT 0.00,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    enrolled_by UUID NOT NULL,

    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE RESTRICT,

    UNIQUE KEY uk_intervention_enrollment (intervention_id, student_id),
    INDEX idx_intervention_enrollments_intervention (intervention_id),
    INDEX idx_intervention_enrollments_student (student_id),
    INDEX idx_intervention_enrollments_status (enrollment_status)
);
```

#### tasks
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quadrant_id VARCHAR(50) NOT NULL,
    component_id UUID NOT NULL,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    due_date DATETIME NOT NULL,
    instructions TEXT,
    rubric JSON, -- Rubric criteria and scoring
    attachments JSON, -- Array of file URLs
    submission_type ENUM('Document', 'Presentation', 'Video', 'Link', 'Text') DEFAULT 'Document',
    allow_late_submission BOOLEAN DEFAULT true,
    late_penalty DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('Draft', 'Active', 'Completed', 'Archived') DEFAULT 'Draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (quadrant_id) REFERENCES quadrants(id) ON DELETE RESTRICT,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_tasks_intervention (intervention_id),
    INDEX idx_tasks_quadrant (quadrant_id),
    INDEX idx_tasks_component (component_id),
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_status (status),

    CONSTRAINT chk_task_max_score CHECK (max_score > 0)
);
```

#### task_submissions
```sql
CREATE TABLE task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    student_id UUID NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    status ENUM('Submitted', 'Graded', 'Returned', 'Late') DEFAULT 'Submitted',
    is_late BOOLEAN DEFAULT false,
    attachments JSON, -- Array of submitted files
    submission_text TEXT,
    score DECIMAL(5,2) NULL,
    rubric_scores JSON, -- Detailed rubric scoring
    feedback TEXT,
    private_notes TEXT,
    graded_by UUID NULL,
    graded_at TIMESTAMP NULL,

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY uk_task_submission (task_id, student_id),
    INDEX idx_task_submissions_task (task_id),
    INDEX idx_task_submissions_student (student_id),
    INDEX idx_task_submissions_status (status),
    INDEX idx_task_submissions_graded (graded_by)
);
```

### 8. Communication and Feedback Tables

#### feedback
```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    teacher_id UUID NULL,
    subject VARCHAR(255) NOT NULL,
    category ENUM('General', 'Academic', 'Technical', 'Wellness', 'Behavior') NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    status ENUM('Submitted', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Submitted',
    response TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by UUID NULL,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_feedback_student (student_id),
    INDEX idx_feedback_teacher (teacher_id),
    INDEX idx_feedback_status (status),
    INDEX idx_feedback_category (category),
    INDEX idx_feedback_priority (priority)
);
```

#### notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('Info', 'Success', 'Warning', 'Error', 'System') DEFAULT 'Info',
    category ENUM('Score', 'Attendance', 'Assignment', 'System', 'Announcement') NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500) NULL,
    metadata JSON,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_unread (user_id, is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_category (category),
    INDEX idx_notifications_created (created_at)
);
```

### 9. System and Configuration Tables

#### system_settings
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_settings_category (category),
    INDEX idx_settings_public (is_public)
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id UUID NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created (created_at),
    INDEX idx_audit_logs_session (session_id)
);
```

#### file_uploads
```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    uploaded_by UUID NOT NULL,
    entity_type VARCHAR(50), -- students, tasks, feedback, etc.
    entity_id UUID,
    is_public BOOLEAN DEFAULT false,
    upload_purpose ENUM('Profile Picture', 'Document', 'Assignment', 'Report', 'Other') DEFAULT 'Other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_file_uploads_entity (entity_type, entity_id),
    INDEX idx_file_uploads_uploader (uploaded_by),
    INDEX idx_file_uploads_hash (file_hash),
    INDEX idx_file_uploads_created (created_at)
);
```

#### data_imports
```sql
CREATE TABLE data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type ENUM('Students', 'Scores', 'Attendance', 'Teachers') NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled') DEFAULT 'Pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSON,
    processing_log JSON,
    term_id UUID NULL,
    imported_by UUID NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL,
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_data_imports_type (import_type),
    INDEX idx_data_imports_status (status),
    INDEX idx_data_imports_importer (imported_by),
    INDEX idx_data_imports_created (created_at)
);
```

### 10. Integration and External Service Tables

#### shl_integrations
```sql
CREATE TABLE shl_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    shl_user_id VARCHAR(100) NOT NULL,
    competency_data JSON NOT NULL,
    last_sync_at TIMESTAMP NOT NULL,
    sync_status ENUM('Success', 'Failed', 'Partial') DEFAULT 'Success',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_shl_student (student_id),
    INDEX idx_shl_integrations_shl_user (shl_user_id),
    INDEX idx_shl_integrations_sync (last_sync_at),
    INDEX idx_shl_integrations_status (sync_status)
);
```

#### email_logs
```sql
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id UUID NULL,
    subject VARCHAR(255) NOT NULL,
    email_type ENUM('Welcome', 'Score Update', 'Notification', 'Report', 'System') NOT NULL,
    template_name VARCHAR(100),
    status ENUM('Queued', 'Sent', 'Failed', 'Bounced') DEFAULT 'Queued',
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email_logs_recipient (recipient_email),
    INDEX idx_email_logs_user (recipient_user_id),
    INDEX idx_email_logs_status (status),
    INDEX idx_email_logs_type (email_type),
    INDEX idx_email_logs_created (created_at)
);
```

## Database Initialization Data

### Default Quadrants
```sql
INSERT INTO quadrants (id, name, description, weightage, minimum_attendance, display_order) VALUES
('persona', 'Persona', 'SHL Competencies and Professional Readiness', 50.00, 80.00, 1),
('wellness', 'Wellness', 'Physical, Mental, and Social Wellness', 30.00, 80.00, 2),
('behavior', 'Behavior', 'Professional Conduct, Interpersonal Skills, and Personal Development', 10.00, 0.00, 3),
('discipline', 'Discipline', 'Attendance, Code of Conduct, and Academic Discipline', 10.00, 0.00, 4);
```

### Default Sub-Categories
```sql
-- Persona Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('persona', 'SHL Competencies', 'Critical thinking, communication, leadership, teamwork, negotiation', 80.00, 1),
('persona', 'Professional Readiness', 'Business etiquette, appearance, time management, work ethics', 20.00, 2);

-- Wellness Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('wellness', 'Physical Fitness', 'Endurance, strength, flexibility, overall health', 40.00, 1),
('wellness', 'Mental Wellness', 'Stress management, emotional intelligence, work-life balance', 40.00, 2),
('wellness', 'Social Wellness', 'Team activities, community engagement, peer support', 20.00, 3);

-- Behavior Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('behavior', 'Professional Conduct', 'Punctuality, responsibility, initiative, adaptability', 40.00, 1),
('behavior', 'Interpersonal Skills', 'Communication, conflict resolution, collaboration', 40.00, 2),
('behavior', 'Personal Development', 'Self-awareness, growth mindset, learning attitude', 20.00, 3);

-- Discipline Sub-Categories
INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order) VALUES
('discipline', 'Attendance', 'Regularity, punctuality, preparedness', 40.00, 1),
('discipline', 'Code of Conduct', 'Policy compliance, ethical behavior, professional standards', 40.00, 2),
('discipline', 'Academic Discipline', 'Assignment completion, deadlines, quality of work', 20.00, 3);
```

### Default System Settings
```sql
INSERT INTO system_settings (setting_key, setting_value, description, category, is_public) VALUES
('grading_scale', '{"A+": {"min": 90, "max": 100}, "A": {"min": 80, "max": 89}, "B": {"min": 70, "max": 79}, "C": {"min": 60, "max": 69}, "D": {"min": 50, "max": 59}, "E": {"min": 40, "max": 49}, "IC": {"min": 0, "max": 39}}', 'System grading scale configuration', 'Assessment', true),
('attendance_rules', '{"persona": {"minimum": 80}, "wellness": {"minimum": 80}, "behavior": {"minimum": 0}, "discipline": {"minimum": 0}}', 'Attendance requirements by quadrant', 'Assessment', true),
('behavior_minimum_scores', '{"minimum_score": 2.0, "applies_to": "all_components"}', 'Minimum score requirements for behavior components', 'Assessment', true),
('academic_year', '{"current": "2024-25", "start_month": 7}', 'Current academic year configuration', 'System', true),
('email_settings', '{"smtp_host": "", "smtp_port": 587, "from_email": "noreply@pep-score-nexus.com"}', 'Email service configuration', 'Integration', false);
```

## Database Constraints and Business Rules

### Foreign Key Constraints
```sql
-- Ensure referential integrity
ALTER TABLE students ADD CONSTRAINT fk_students_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE students ADD CONSTRAINT fk_students_batch_id
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT;
ALTER TABLE students ADD CONSTRAINT fk_students_section_id
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
ALTER TABLE students ADD CONSTRAINT fk_students_house_id
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL;

-- Score constraints
ALTER TABLE scores ADD CONSTRAINT fk_scores_student_id
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE scores ADD CONSTRAINT fk_scores_component_id
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE;
ALTER TABLE scores ADD CONSTRAINT fk_scores_term_id
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE;
ALTER TABLE scores ADD CONSTRAINT fk_scores_assessed_by
    FOREIGN KEY (assessed_by) REFERENCES users(id) ON DELETE RESTRICT;
```

### Check Constraints
```sql
-- Score validation
ALTER TABLE scores ADD CONSTRAINT chk_scores_valid_range
    CHECK (obtained_score >= 0 AND obtained_score <= max_score);
ALTER TABLE scores ADD CONSTRAINT chk_scores_percentage
    CHECK (percentage >= 0 AND percentage <= 100);

-- Attendance validation
ALTER TABLE attendance_summary ADD CONSTRAINT chk_attendance_sessions
    CHECK (attended_sessions >= 0 AND attended_sessions <= total_sessions);
ALTER TABLE attendance_summary ADD CONSTRAINT chk_attendance_percentage
    CHECK (percentage >= 0 AND percentage <= 100);

-- Quadrant weightage validation
ALTER TABLE quadrants ADD CONSTRAINT chk_quadrant_weightage
    CHECK (weightage > 0 AND weightage <= 100);
ALTER TABLE quadrants ADD CONSTRAINT chk_quadrant_attendance
    CHECK (minimum_attendance >= 0 AND minimum_attendance <= 100);

-- Component validation
ALTER TABLE components ADD CONSTRAINT chk_component_scores
    CHECK (max_score > 0 AND minimum_score >= 0 AND minimum_score <= max_score);
ALTER TABLE components ADD CONSTRAINT chk_component_weightage
    CHECK (weightage > 0 AND weightage <= 100);

-- Intervention validation
ALTER TABLE interventions ADD CONSTRAINT chk_intervention_dates
    CHECK (end_date > start_date);
ALTER TABLE interventions ADD CONSTRAINT chk_intervention_max_students
    CHECK (max_students > 0);

-- Task validation
ALTER TABLE tasks ADD CONSTRAINT chk_task_max_score
    CHECK (max_score > 0);
ALTER TABLE tasks ADD CONSTRAINT chk_task_late_penalty
    CHECK (late_penalty >= 0 AND late_penalty <= 100);

-- File upload validation
ALTER TABLE file_uploads ADD CONSTRAINT chk_file_size
    CHECK (file_size > 0);
```

### Unique Constraints
```sql
-- Prevent duplicate enrollments
ALTER TABLE student_terms ADD CONSTRAINT uk_student_term
    UNIQUE (student_id, term_id);

-- Prevent duplicate attendance records
ALTER TABLE attendance ADD CONSTRAINT uk_attendance_unique
    UNIQUE (student_id, term_id, quadrant_id, attendance_date);

-- Prevent duplicate scores
ALTER TABLE scores ADD CONSTRAINT uk_score_student_component_term
    UNIQUE (student_id, component_id, term_id);

-- Prevent duplicate intervention enrollments
ALTER TABLE intervention_enrollments ADD CONSTRAINT uk_intervention_enrollment
    UNIQUE (intervention_id, student_id);

-- Prevent duplicate task submissions
ALTER TABLE task_submissions ADD CONSTRAINT uk_task_submission
    UNIQUE (task_id, student_id);
```

## Performance Optimization

### Composite Indexes
```sql
-- Student performance queries
CREATE INDEX idx_scores_student_term_component ON scores(student_id, term_id, component_id);
CREATE INDEX idx_attendance_student_term_quadrant ON attendance(student_id, term_id, quadrant_id);

-- Leaderboard queries
CREATE INDEX idx_scores_term_component_score ON scores(term_id, component_id, obtained_score DESC);
CREATE INDEX idx_student_terms_term_score ON student_terms(term_id, total_score DESC);

-- Teacher assignment queries
CREATE INDEX idx_teacher_assignments_teacher_term ON teacher_assignments(teacher_id, term_id);
CREATE INDEX idx_teacher_assignments_student_quadrant ON teacher_assignments(student_id, quadrant_id);

-- Intervention queries
CREATE INDEX idx_intervention_enrollments_intervention_status ON intervention_enrollments(intervention_id, enrollment_status);
CREATE INDEX idx_tasks_intervention_status_due ON tasks(intervention_id, status, due_date);
CREATE INDEX idx_task_submissions_task_status ON task_submissions(task_id, status);

-- Audit and logging
CREATE INDEX idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at);
CREATE INDEX idx_notifications_user_unread_created ON notifications(user_id, is_read, created_at);
```

### Partitioning Strategy (for large datasets)
```sql
-- Partition audit_logs by month
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Continue for each month...

-- Partition attendance by academic year
CREATE TABLE attendance_2024 PARTITION OF attendance
    FOR VALUES FROM ('2024-07-01') TO ('2025-07-01');
CREATE TABLE attendance_2025 PARTITION OF attendance
    FOR VALUES FROM ('2025-07-01') TO ('2026-07-01');
```

## Database Views for Common Queries

### Student Performance View
```sql
CREATE VIEW student_performance_summary AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.registration_no,
    s.batch_id,
    s.section_id,
    st.term_id,
    st.total_score,
    st.grade,
    st.rank,
    COUNT(DISTINCT sc.component_id) as components_assessed,
    AVG(sc.percentage) as average_percentage,
    MIN(sc.percentage) as lowest_score,
    MAX(sc.percentage) as highest_score
FROM students s
JOIN student_terms st ON s.id = st.student_id
LEFT JOIN scores sc ON s.id = sc.student_id AND st.term_id = sc.term_id
GROUP BY s.id, s.name, s.registration_no, s.batch_id, s.section_id, st.term_id, st.total_score, st.grade, st.rank;
```

### Attendance Summary View
```sql
CREATE VIEW attendance_overview AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.registration_no,
    ats.term_id,
    ats.quadrant_id,
    q.name as quadrant_name,
    ats.total_sessions,
    ats.attended_sessions,
    ats.percentage,
    CASE
        WHEN ats.percentage >= q.minimum_attendance THEN 'Eligible'
        ELSE 'Not Eligible'
    END as eligibility_status
FROM students s
JOIN attendance_summary ats ON s.id = ats.student_id
JOIN quadrants q ON ats.quadrant_id = q.id;
```

### Intervention Progress View
```sql
CREATE VIEW intervention_progress AS
SELECT
    i.id as intervention_id,
    i.name as intervention_name,
    i.status as intervention_status,
    COUNT(DISTINCT ie.student_id) as enrolled_students,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT ts.id) as submitted_tasks,
    COUNT(DISTINCT CASE WHEN ts.status = 'Graded' THEN ts.id END) as graded_tasks,
    AVG(CASE WHEN ts.score IS NOT NULL THEN ts.score END) as average_score
FROM interventions i
LEFT JOIN intervention_enrollments ie ON i.id = ie.intervention_id
LEFT JOIN tasks t ON i.id = t.intervention_id
LEFT JOIN task_submissions ts ON t.id = ts.task_id
GROUP BY i.id, i.name, i.status;
```

## Database Backup and Maintenance

### Backup Strategy
```sql
-- Daily incremental backup
pg_dump --host=localhost --port=5432 --username=postgres --format=custom --compress=9 --file=pep_score_nexus_backup_$(date +%Y%m%d).backup pep_score_nexus

-- Weekly full backup with schema
pg_dump --host=localhost --port=5432 --username=postgres --format=custom --compress=9 --schema-only --file=pep_score_nexus_schema_$(date +%Y%m%d).backup pep_score_nexus
```

### Maintenance Tasks
```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE pep_score_nexus;

-- Clean up old audit logs (older than 2 years)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

-- Clean up old notifications (older than 6 months)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '6 months' AND is_read = true;

-- Update attendance summaries
CALL update_attendance_summaries();
```

This comprehensive database architecture provides a solid foundation for the PEP Score Nexus system with proper normalization, constraints, indexes, and scalability considerations.
