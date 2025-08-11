-- PEP Score Nexus Database Setup Script
-- PostgreSQL 14+ Compatible

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE grade_type AS ENUM ('A+', 'A', 'B', 'C', 'D', 'E', 'IC');
CREATE TYPE status_type AS ENUM ('Good', 'Progress', 'Deteriorate', 'Cleared', 'Not Cleared', 'Attendance Shortage');
CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Graduated', 'Dropped');
CREATE TYPE access_level AS ENUM ('super', 'standard', 'limited');
CREATE TYPE component_category AS ENUM ('SHL', 'Professional', 'Physical', 'Mental', 'Social', 'Conduct', 'Academic');
CREATE TYPE assessment_type AS ENUM ('Teacher', 'SHL', 'Self', 'Peer', 'System');
CREATE TYPE score_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
CREATE TYPE enrollment_status AS ENUM ('Enrolled', 'Completed', 'Dropped', 'Transferred');
CREATE TYPE intervention_status AS ENUM ('Draft', 'Active', 'Completed', 'Archived', 'Cancelled');
CREATE TYPE teacher_role AS ENUM ('Lead', 'Assistant');
CREATE TYPE intervention_enrollment_status AS ENUM ('Enrolled', 'Pending', 'Dropped', 'Completed');
CREATE TYPE enrollment_type AS ENUM ('Mandatory', 'Optional');
CREATE TYPE submission_type AS ENUM ('Document', 'Presentation', 'Video', 'Link', 'Text', 'Direct_Assessment');
CREATE TYPE task_status AS ENUM ('Draft', 'Active', 'Completed', 'Archived');
CREATE TYPE submission_status AS ENUM ('Submitted', 'Graded', 'Returned', 'Late');
CREATE TYPE feedback_category AS ENUM ('General', 'Academic', 'Technical', 'Wellness', 'Behavior');
CREATE TYPE priority_type AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE feedback_status AS ENUM ('Submitted', 'In Progress', 'Resolved', 'Closed');
CREATE TYPE notification_type AS ENUM ('Info', 'Success', 'Warning', 'Error', 'System');
CREATE TYPE notification_category AS ENUM ('Score', 'Attendance', 'Assignment', 'System', 'Announcement');
CREATE TYPE upload_purpose AS ENUM ('Profile Picture', 'Document', 'Assignment', 'Report', 'System', 'Other');
CREATE TYPE import_type AS ENUM ('Students', 'Scores', 'Attendance', 'Teachers', 'Interventions');
CREATE TYPE import_status AS ENUM ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled');
CREATE TYPE email_type AS ENUM ('Welcome', 'Score Update', 'Notification', 'Report', 'System', 'Intervention', 'Reminder');
CREATE TYPE email_status AS ENUM ('Queued', 'Sent', 'Failed', 'Bounced', 'Delivered');
CREATE TYPE sync_status AS ENUM ('Success', 'Failed', 'Partial', 'Pending');

-- 1. User Management Tables

-- users table
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

-- user_sessions table
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

-- 2. Academic Structure Tables

-- batches table
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

-- sections table
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

-- houses table
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

-- terms table
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

-- 3. Student Management Tables

-- students table
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

-- 4. Teacher Management Tables

-- teachers table
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

-- teacher_assignments table
CREATE TABLE teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL,
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

-- admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    access_level access_level DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Assessment Structure Tables

-- quadrants table
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

-- sub_categories table
CREATE TABLE sub_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_subcategory_weightage CHECK (weightage > 0 AND weightage <= 100)
);

CREATE INDEX idx_subcategories_quadrant ON sub_categories(quadrant_id);
CREATE INDEX idx_subcategories_order ON sub_categories(display_order);

-- components table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_component_scores CHECK (max_score > 0 AND minimum_score >= 0 AND minimum_score <= max_score),
    CONSTRAINT chk_component_weightage CHECK (weightage > 0 AND weightage <= 100)
);

CREATE INDEX idx_components_subcategory ON components(sub_category_id);
CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_order ON components(display_order);

-- microcompetencies table
-- Each component is divided into microcompetencies with specific weightages
CREATE TABLE microcompetencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weightage DECIMAL(5,2) NOT NULL, -- Weightage within the component (should sum to 100)
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_microcompetency_weightage CHECK (weightage > 0 AND weightage <= 100),
    CONSTRAINT chk_microcompetency_max_score CHECK (max_score > 0)
);

CREATE INDEX idx_microcompetencies_component ON microcompetencies(component_id);
CREATE INDEX idx_microcompetencies_active ON microcompetencies(is_active);
CREATE INDEX idx_microcompetencies_order ON microcompetencies(display_order);

-- 6. Scoring and Assessment Tables

-- scores table
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

-- attendance table
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

-- attendance_summary table
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

-- student_terms table
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

-- 7. Intervention System Tables

-- interventions table
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

-- intervention_quadrants table
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

-- intervention_teachers table
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

-- intervention_microcompetencies table
-- Links interventions to specific microcompetencies with their weightages
CREATE TABLE intervention_microcompetencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    weightage DECIMAL(5,2) NOT NULL, -- Weightage of this microcompetency in the intervention
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_intervention_microcompetency UNIQUE (intervention_id, microcompetency_id),
    CONSTRAINT chk_intervention_micro_weightage CHECK (weightage > 0 AND weightage <= 100),
    CONSTRAINT chk_intervention_micro_max_score CHECK (max_score > 0)
);

CREATE INDEX idx_intervention_microcompetencies_intervention ON intervention_microcompetencies(intervention_id);
CREATE INDEX idx_intervention_microcompetencies_microcompetency ON intervention_microcompetencies(microcompetency_id);

-- teacher_microcompetency_assignments table
-- Assigns teachers to specific microcompetencies within interventions
CREATE TABLE teacher_microcompetency_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    can_score BOOLEAN DEFAULT true,
    can_create_tasks BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,

    CONSTRAINT uk_teacher_intervention_microcompetency UNIQUE (intervention_id, teacher_id, microcompetency_id)
);

CREATE INDEX idx_teacher_microcompetency_assignments_intervention ON teacher_microcompetency_assignments(intervention_id);
CREATE INDEX idx_teacher_microcompetency_assignments_teacher ON teacher_microcompetency_assignments(teacher_id);
CREATE INDEX idx_teacher_microcompetency_assignments_microcompetency ON teacher_microcompetency_assignments(microcompetency_id);

-- intervention_enrollments table
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

-- Enhanced tasks table (microcompetency-centric)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    due_date TIMESTAMP NOT NULL,
    instructions TEXT,
    rubric JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    submission_type submission_type DEFAULT 'Document',
    requires_submission BOOLEAN DEFAULT true,
    allow_late_submission BOOLEAN DEFAULT true,
    late_penalty DECIMAL(5,2) DEFAULT 0.00,
    status task_status DEFAULT 'Draft',
    created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_by_teacher_id UUID REFERENCES teachers(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_task_max_score CHECK (max_score > 0),
    CONSTRAINT chk_task_late_penalty CHECK (late_penalty >= 0 AND late_penalty <= 100)
);

-- Task-Microcompetency mapping with weightages
CREATE TABLE task_microcompetencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    weightage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_weightage CHECK (weightage > 0 AND weightage <= 100),
    UNIQUE(task_id, microcompetency_id)
);

CREATE INDEX idx_tasks_intervention ON tasks(intervention_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_created_by_teacher ON tasks(created_by_teacher_id);

-- Task-Microcompetency indexes
CREATE INDEX idx_task_microcompetencies_task ON task_microcompetencies(task_id);
CREATE INDEX idx_task_microcompetencies_microcompetency ON task_microcompetencies(microcompetency_id);
CREATE INDEX idx_task_microcompetencies_weightage ON task_microcompetencies(weightage);

-- task_submissions table
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

-- Direct Assessments Table (for tasks that don't require submissions)
CREATE TABLE direct_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    private_notes TEXT,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_direct_assessment UNIQUE (task_id, student_id),
    CONSTRAINT chk_direct_assessment_score CHECK (score >= 0)
);

CREATE INDEX idx_direct_assessments_task ON direct_assessments(task_id);
CREATE INDEX idx_direct_assessments_student ON direct_assessments(student_id);
CREATE INDEX idx_direct_assessments_assessed_by ON direct_assessments(assessed_by);

-- 8. Communication and System Tables

-- feedback table
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

-- notifications table
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

-- system_settings table
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

-- audit_logs table
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

-- 9. File Management and Data Operations Tables

-- file_uploads table
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

-- data_imports table
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

-- email_logs table
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

-- 10. External Service Integration Tables

-- shl_integrations table
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

-- microcompetency_scores table for tracking individual microcompetency scores
CREATE TABLE microcompetency_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    obtained_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    scored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scored_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    status score_status DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_microcompetency_obtained_score CHECK (obtained_score >= 0),
    CONSTRAINT chk_microcompetency_max_score CHECK (max_score > 0),
    CONSTRAINT chk_microcompetency_percentage CHECK (percentage >= 0 AND percentage <= 100),
    CONSTRAINT chk_microcompetency_obtained_max CHECK (obtained_score <= max_score),
    UNIQUE(student_id, microcompetency_id, intervention_id)
);

CREATE INDEX idx_microcompetency_scores_student ON microcompetency_scores(student_id);
CREATE INDEX idx_microcompetency_scores_microcompetency ON microcompetency_scores(microcompetency_id);
CREATE INDEX idx_microcompetency_scores_intervention ON microcompetency_scores(intervention_id);
CREATE INDEX idx_microcompetency_scores_scored_by ON microcompetency_scores(scored_by);
CREATE INDEX idx_microcompetency_scores_status ON microcompetency_scores(status);
CREATE INDEX idx_microcompetency_scores_scored_at ON microcompetency_scores(scored_at);
CREATE INDEX idx_microcompetency_scores_percentage ON microcompetency_scores(percentage DESC);

-- Database Functions and Triggers

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shl_integrations_updated_at BEFORE UPDATE ON shl_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_microcompetency_scores_updated_at BEFORE UPDATE ON microcompetency_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_categories_updated_at BEFORE UPDATE ON sub_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate grade function
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

-- Function to calculate microcompetency score from task score
CREATE OR REPLACE FUNCTION calculate_microcompetency_score_from_task(
    p_task_score DECIMAL,
    p_task_max_score DECIMAL,
    p_microcompetency_weightage DECIMAL,
    p_microcompetency_max_score DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- Calculate weighted score for microcompetency
    -- Formula: (task_score / task_max_score) * (weightage / 100) * microcompetency_max_score
    RETURN (p_task_score / p_task_max_score) * (p_microcompetency_weightage / 100.0) * p_microcompetency_max_score;
END;
$$ LANGUAGE plpgsql;

-- Function to validate task microcompetency weightages
CREATE OR REPLACE FUNCTION validate_task_weightages(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_weightage DECIMAL;
BEGIN
    SELECT SUM(weightage) INTO total_weightage
    FROM task_microcompetencies
    WHERE task_id = p_task_id;

    RETURN COALESCE(total_weightage, 0) = 100.00;
END;
$$ LANGUAGE plpgsql;

-- Helpful Views for Microcompetency-Centric Task System

-- View: Task summary with microcompetencies
CREATE OR REPLACE VIEW task_microcompetency_summary AS
SELECT
    t.id as task_id,
    t.name as task_name,
    t.max_score,
    t.due_date,
    t.status,
    i.name as intervention_name,
    COUNT(tm.microcompetency_id) as microcompetency_count,
    SUM(tm.weightage) as total_weightage,
    ARRAY_AGG(m.name ORDER BY tm.weightage DESC) as microcompetency_names,
    ARRAY_AGG(tm.weightage ORDER BY tm.weightage DESC) as weightages,
    ARRAY_AGG(
        q.name || ' > ' || sc.name || ' > ' || c.name
        ORDER BY tm.weightage DESC
    ) as competency_paths
FROM tasks t
JOIN interventions i ON t.intervention_id = i.id
LEFT JOIN task_microcompetencies tm ON t.id = tm.task_id
LEFT JOIN microcompetencies m ON tm.microcompetency_id = m.id
LEFT JOIN components c ON m.component_id = c.id
LEFT JOIN sub_categories sc ON c.sub_category_id = sc.id
LEFT JOIN quadrants q ON sc.quadrant_id = q.id
GROUP BY t.id, t.name, t.max_score, t.due_date, t.status, i.name;

-- View: Teacher task permissions
CREATE OR REPLACE VIEW teacher_task_permissions AS
SELECT DISTINCT
    t.id as teacher_id,
    u.name as teacher_name,
    i.id as intervention_id,
    i.name as intervention_name,
    COUNT(tma.microcompetency_id) as assigned_microcompetencies,
    COUNT(CASE WHEN tma.can_create_tasks THEN 1 END) as can_create_tasks_count,
    COUNT(CASE WHEN tma.can_score THEN 1 END) as can_score_count,
    BOOL_OR(tma.can_create_tasks) as can_create_any_tasks,
    BOOL_OR(tma.can_score) as can_score_any_tasks
FROM teachers t
JOIN users u ON t.user_id = u.id
JOIN teacher_microcompetency_assignments tma ON t.id = tma.teacher_id
JOIN interventions i ON tma.intervention_id = i.id
WHERE tma.is_active = true AND t.is_active = true
GROUP BY t.id, u.name, i.id, i.name;

-- View: Student microcompetency progress
CREATE OR REPLACE VIEW student_microcompetency_progress AS
SELECT
    s.id as student_id,
    s.name as student_name,
    s.registration_no,
    i.id as intervention_id,
    i.name as intervention_name,
    m.id as microcompetency_id,
    m.name as microcompetency_name,
    q.name as quadrant_name,
    sc.name as sub_category_name,
    c.name as component_name,
    COALESCE(ms.obtained_score, 0) as current_score,
    m.max_score,
    COALESCE(ms.percentage, 0) as percentage,
    ms.status as score_status,
    ms.scored_at,
    COUNT(DISTINCT tm.task_id) as related_tasks
FROM students s
CROSS JOIN interventions i
CROSS JOIN microcompetencies m
JOIN components c ON m.component_id = c.id
JOIN sub_categories sc ON c.sub_category_id = sc.id
JOIN quadrants q ON sc.quadrant_id = q.id
LEFT JOIN microcompetency_scores ms ON s.id = ms.student_id
    AND m.id = ms.microcompetency_id
    AND i.id = ms.intervention_id
LEFT JOIN task_microcompetencies tm ON m.id = tm.microcompetency_id
LEFT JOIN tasks t ON tm.task_id = t.id AND t.intervention_id = i.id
WHERE s.is_active = true
    AND m.is_active = true
    AND i.status IN ('Active', 'Completed')
GROUP BY s.id, s.name, s.registration_no, i.id, i.name, m.id, m.name,
         q.name, sc.name, c.name, ms.obtained_score, m.max_score,
         ms.percentage, ms.status, ms.scored_at;

-- Initial Data Setup

-- Insert default quadrants
INSERT INTO quadrants (id, name, description, weightage, minimum_attendance, display_order) VALUES
('persona', 'Persona', 'SHL Competencies and Professional Readiness', 50.00, 80.00, 1),
('wellness', 'Wellness', 'Physical, Mental, and Social Wellness', 30.00, 80.00, 2),
('behavior', 'Behavior', 'Professional Conduct, Interpersonal Skills, and Personal Development', 10.00, 0.00, 3),
('discipline', 'Discipline', 'Attendance, Code of Conduct, and Academic Discipline', 10.00, 0.00, 4);

-- Insert default houses
INSERT INTO houses (name, color, description) VALUES
('Daredevils', '#FF6B6B', 'Bold and adventurous house'),
('Coronation', '#4ECDC4', 'Royal and dignified house'),
('Apache', '#45B7D1', 'Strong and resilient house'),
('Bravehearts', '#96CEB4', 'Courageous and determined house');

-- Insert default sub-categories
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

-- Insert sample components for each sub-category
-- Persona Components
INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Critical Thinking',
    'Analytical and problem-solving skills',
    25.00,
    10.00,
    'SHL',
    1
FROM sub_categories sc WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Communication Skills',
    'Verbal and written communication abilities',
    25.00,
    10.00,
    'SHL',
    2
FROM sub_categories sc WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Leadership',
    'Leadership and team management skills',
    25.00,
    10.00,
    'SHL',
    3
FROM sub_categories sc WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Teamwork',
    'Collaboration and team working abilities',
    25.00,
    10.00,
    'SHL',
    4
FROM sub_categories sc WHERE sc.name = 'SHL Competencies';

-- Professional Readiness Components
INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Business Etiquette',
    'Professional behavior and etiquette',
    50.00,
    10.00,
    'Professional',
    1
FROM sub_categories sc WHERE sc.name = 'Professional Readiness';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, category, display_order)
SELECT
    sc.id,
    'Work Ethics',
    'Professional work ethics and values',
    50.00,
    10.00,
    'Professional',
    2
FROM sub_categories sc WHERE sc.name = 'Professional Readiness';

-- Insert sample microcompetencies for Critical Thinking component
INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Problem Analysis',
    'Ability to break down complex problems',
    25.00,
    10.00,
    1
FROM components c WHERE c.name = 'Critical Thinking';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Solution Development',
    'Creating effective solutions to problems',
    25.00,
    10.00,
    2
FROM components c WHERE c.name = 'Critical Thinking';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Decision Making',
    'Making informed and timely decisions',
    25.00,
    10.00,
    3
FROM components c WHERE c.name = 'Critical Thinking';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Logical Reasoning',
    'Using logic and reasoning in analysis',
    25.00,
    10.00,
    4
FROM components c WHERE c.name = 'Critical Thinking';

-- Insert sample microcompetencies for Communication Skills component
INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Verbal Communication',
    'Effective spoken communication skills',
    30.00,
    10.00,
    1
FROM components c WHERE c.name = 'Communication Skills';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Written Communication',
    'Clear and effective writing skills',
    30.00,
    10.00,
    2
FROM components c WHERE c.name = 'Communication Skills';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Presentation Skills',
    'Ability to present ideas effectively',
    25.00,
    10.00,
    3
FROM components c WHERE c.name = 'Communication Skills';

INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order)
SELECT
    c.id,
    'Active Listening',
    'Listening and understanding others',
    15.00,
    10.00,
    4
FROM components c WHERE c.name = 'Communication Skills';

-- Create a default term
INSERT INTO terms (name, description, start_date, end_date, is_active, is_current, academic_year) VALUES
('Term 1 / Level 0', 'First term of the academic year', '2024-01-01', '2024-06-30', true, true, '2024');

-- Create a default batch
INSERT INTO batches (name, year, start_date, end_date, is_active) VALUES
('PGDM 2024', 2024, '2024-01-01', '2024-12-31', true);

-- Performance optimization indexes
CREATE INDEX idx_scores_student_term_component ON scores(student_id, term_id, component_id);
CREATE INDEX idx_attendance_student_term_quadrant ON attendance(student_id, term_id, quadrant_id);
CREATE INDEX idx_scores_term_component_score ON scores(term_id, component_id, obtained_score DESC);
CREATE INDEX idx_student_terms_term_score ON student_terms(term_id, total_score DESC);
CREATE INDEX idx_intervention_enrollments_intervention_status ON intervention_enrollments(intervention_id, enrollment_status);
CREATE INDEX idx_tasks_intervention_status_due ON tasks(intervention_id, status, due_date);

-- Microcompetency-centric task system performance indexes
CREATE INDEX idx_task_microcompetencies_task_weightage ON task_microcompetencies(task_id, weightage DESC);
CREATE INDEX idx_microcompetency_scores_student_intervention ON microcompetency_scores(student_id, intervention_id);
CREATE INDEX idx_microcompetency_scores_microcompetency_percentage ON microcompetency_scores(microcompetency_id, percentage DESC);
CREATE INDEX idx_teacher_microcompetency_assignments_teacher_intervention ON teacher_microcompetency_assignments(teacher_id, intervention_id);
CREATE INDEX idx_teacher_microcompetency_assignments_permissions ON teacher_microcompetency_assignments(teacher_id, can_create_tasks, can_score);
CREATE INDEX idx_tasks_created_by_teacher_status ON tasks(created_by_teacher_id, status);
CREATE INDEX idx_task_submissions_task_status ON task_submissions(task_id, status);
CREATE INDEX idx_microcompetencies_component_active ON microcompetencies(component_id, is_active);

-- Database setup completed successfully!
--
-- MICROCOMPETENCY-CENTRIC TASK SYSTEM FEATURES:
-- ✅ Tasks are created for specific microcompetencies with weightage distribution
-- ✅ Teachers can only create tasks for their assigned microcompetencies
-- ✅ Automatic microcompetency score updates when tasks are graded
-- ✅ Comprehensive views for reporting and progress tracking
-- ✅ Performance-optimized indexes for fast queries
-- ✅ Data integrity constraints and validation functions
--
-- USAGE EXAMPLES:
--
-- 1. Check task weightage validation:
--    SELECT validate_task_weightages('task-uuid-here');
--
-- 2. View task summary with microcompetencies:
--    SELECT * FROM task_microcompetency_summary WHERE task_name LIKE '%Essay%';
--
-- 3. Check teacher permissions:
--    SELECT * FROM teacher_task_permissions WHERE teacher_name = 'John Doe';
--
-- 4. Monitor student progress:
--    SELECT * FROM student_microcompetency_progress
--    WHERE student_name = 'Jane Smith' AND intervention_name = 'Sripathi Intervention';
--
-- 5. Calculate microcompetency score from task:
--    SELECT calculate_microcompetency_score_from_task(18.5, 20.0, 60.0, 10.0);
--    -- Returns: 5.55 (18.5/20 * 60/100 * 10)
--
SELECT 'PEP Score Nexus Database Setup Completed Successfully!' as status,
       'Microcompetency-Centric Task System Ready!' as task_system_status;
