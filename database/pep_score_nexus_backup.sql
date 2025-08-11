--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: access_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.access_level AS ENUM (
    'super',
    'standard',
    'limited'
);


ALTER TYPE public.access_level OWNER TO postgres;

--
-- Name: assessment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assessment_type AS ENUM (
    'Teacher',
    'SHL',
    'Self',
    'Peer',
    'System'
);


ALTER TYPE public.assessment_type OWNER TO postgres;

--
-- Name: component_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.component_category AS ENUM (
    'SHL',
    'Professional',
    'Physical',
    'Mental',
    'Social',
    'Conduct',
    'Academic'
);


ALTER TYPE public.component_category OWNER TO postgres;

--
-- Name: email_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_status AS ENUM (
    'Queued',
    'Sent',
    'Failed',
    'Bounced',
    'Delivered'
);


ALTER TYPE public.email_status OWNER TO postgres;

--
-- Name: email_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_type AS ENUM (
    'Welcome',
    'Score Update',
    'Notification',
    'Report',
    'System',
    'Intervention',
    'Reminder'
);


ALTER TYPE public.email_type OWNER TO postgres;

--
-- Name: enrollment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enrollment_status AS ENUM (
    'Enrolled',
    'Completed',
    'Dropped',
    'Transferred'
);


ALTER TYPE public.enrollment_status OWNER TO postgres;

--
-- Name: enrollment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enrollment_type AS ENUM (
    'Mandatory',
    'Optional'
);


ALTER TYPE public.enrollment_type OWNER TO postgres;

--
-- Name: feedback_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.feedback_category AS ENUM (
    'General',
    'Academic',
    'Technical',
    'Wellness',
    'Behavior'
);


ALTER TYPE public.feedback_category OWNER TO postgres;

--
-- Name: feedback_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.feedback_status AS ENUM (
    'Submitted',
    'In Progress',
    'Resolved',
    'Closed'
);


ALTER TYPE public.feedback_status OWNER TO postgres;

--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_type AS ENUM (
    'Male',
    'Female',
    'Other'
);


ALTER TYPE public.gender_type OWNER TO postgres;

--
-- Name: grade_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.grade_type AS ENUM (
    'A+',
    'A',
    'B',
    'C',
    'D',
    'E',
    'IC'
);


ALTER TYPE public.grade_type OWNER TO postgres;

--
-- Name: import_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.import_status AS ENUM (
    'Pending',
    'Processing',
    'Completed',
    'Failed',
    'Cancelled'
);


ALTER TYPE public.import_status OWNER TO postgres;

--
-- Name: import_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.import_type AS ENUM (
    'Students',
    'Scores',
    'Attendance',
    'Teachers',
    'Interventions'
);


ALTER TYPE public.import_type OWNER TO postgres;

--
-- Name: intervention_enrollment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.intervention_enrollment_status AS ENUM (
    'Enrolled',
    'Pending',
    'Dropped',
    'Completed'
);


ALTER TYPE public.intervention_enrollment_status OWNER TO postgres;

--
-- Name: intervention_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.intervention_status AS ENUM (
    'Draft',
    'Active',
    'Completed',
    'Archived',
    'Cancelled'
);


ALTER TYPE public.intervention_status OWNER TO postgres;

--
-- Name: notification_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_category AS ENUM (
    'Score',
    'Attendance',
    'Assignment',
    'System',
    'Announcement'
);


ALTER TYPE public.notification_category OWNER TO postgres;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'Info',
    'Success',
    'Warning',
    'Error',
    'System'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: priority_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.priority_type AS ENUM (
    'Low',
    'Medium',
    'High'
);


ALTER TYPE public.priority_type OWNER TO postgres;

--
-- Name: score_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.score_status AS ENUM (
    'Draft',
    'Submitted',
    'Approved',
    'Rejected'
);


ALTER TYPE public.score_status OWNER TO postgres;

--
-- Name: status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_type AS ENUM (
    'Good',
    'Progress',
    'Deteriorate',
    'Cleared',
    'Not Cleared',
    'Attendance Shortage'
);


ALTER TYPE public.status_type OWNER TO postgres;

--
-- Name: student_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.student_status AS ENUM (
    'Active',
    'Inactive',
    'Graduated',
    'Dropped'
);


ALTER TYPE public.student_status OWNER TO postgres;

--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.submission_status AS ENUM (
    'Submitted',
    'Graded',
    'Returned',
    'Late'
);


ALTER TYPE public.submission_status OWNER TO postgres;

--
-- Name: submission_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.submission_type AS ENUM (
    'Document',
    'Presentation',
    'Video',
    'Link',
    'Text'
);


ALTER TYPE public.submission_type OWNER TO postgres;

--
-- Name: sync_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_status AS ENUM (
    'Success',
    'Failed',
    'Partial',
    'Pending'
);


ALTER TYPE public.sync_status OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status AS ENUM (
    'Draft',
    'Active',
    'Completed',
    'Archived'
);


ALTER TYPE public.task_status OWNER TO postgres;

--
-- Name: teacher_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.teacher_role AS ENUM (
    'Lead',
    'Assistant'
);


ALTER TYPE public.teacher_role OWNER TO postgres;

--
-- Name: upload_purpose; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.upload_purpose AS ENUM (
    'Profile Picture',
    'Document',
    'Assignment',
    'Report',
    'System',
    'Other'
);


ALTER TYPE public.upload_purpose OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'teacher',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);


ALTER TYPE public.user_status OWNER TO postgres;

--
-- Name: calculate_grade(numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_grade(score numeric) RETURNS public.grade_type
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_grade(score numeric) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    access_level public.access_level DEFAULT 'standard'::public.access_level,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    term_id uuid NOT NULL,
    quadrant_id character varying(50) NOT NULL,
    attendance_date date NOT NULL,
    is_present boolean NOT NULL,
    reason character varying(255),
    marked_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_summary (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    term_id uuid NOT NULL,
    quadrant_id character varying(50) NOT NULL,
    total_sessions integer DEFAULT 0 NOT NULL,
    attended_sessions integer DEFAULT 0 NOT NULL,
    percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (total_sessions > 0) THEN (((attended_sessions)::numeric / (total_sessions)::numeric) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_attendance_sessions CHECK (((attended_sessions >= 0) AND (attended_sessions <= total_sessions)))
);


ALTER TABLE public.attendance_summary OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.components (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sub_category_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    weightage numeric(5,2) NOT NULL,
    max_score numeric(5,2) DEFAULT 5.00 NOT NULL,
    minimum_score numeric(5,2) DEFAULT 0.00 NOT NULL,
    category public.component_category NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_component_scores CHECK (((max_score > (0)::numeric) AND (minimum_score >= (0)::numeric) AND (minimum_score <= max_score))),
    CONSTRAINT chk_component_weightage CHECK (((weightage > (0)::numeric) AND (weightage <= (100)::numeric)))
);


ALTER TABLE public.components OWNER TO postgres;

--
-- Name: data_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_imports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    import_type public.import_type NOT NULL,
    filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    status public.import_status DEFAULT 'Pending'::public.import_status,
    total_records integer DEFAULT 0,
    processed_records integer DEFAULT 0,
    successful_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    error_log jsonb DEFAULT '[]'::jsonb,
    processing_log jsonb DEFAULT '[]'::jsonb,
    term_id uuid,
    imported_by uuid NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_import_records CHECK (((processed_records >= 0) AND (successful_records >= 0) AND (failed_records >= 0) AND (processed_records = (successful_records + failed_records))))
);


ALTER TABLE public.data_imports OWNER TO postgres;

--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_user_id uuid,
    subject character varying(255) NOT NULL,
    email_type public.email_type NOT NULL,
    template_name character varying(100),
    status public.email_status DEFAULT 'Queued'::public.email_status,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid,
    subject character varying(255) NOT NULL,
    category public.feedback_category NOT NULL,
    message text NOT NULL,
    priority public.priority_type DEFAULT 'Medium'::public.priority_type,
    status public.feedback_status DEFAULT 'Submitted'::public.feedback_status,
    response text,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    resolved_by uuid
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: file_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_uploads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_hash character varying(64) NOT NULL,
    uploaded_by uuid NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    is_public boolean DEFAULT false,
    upload_purpose public.upload_purpose DEFAULT 'Other'::public.upload_purpose,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_file_size CHECK ((file_size > 0))
);


ALTER TABLE public.file_uploads OWNER TO postgres;

--
-- Name: houses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.houses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(7) NOT NULL,
    description text,
    total_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.houses OWNER TO postgres;

--
-- Name: intervention_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intervention_enrollments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intervention_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_date date DEFAULT CURRENT_DATE NOT NULL,
    enrollment_status public.intervention_enrollment_status DEFAULT 'Enrolled'::public.intervention_enrollment_status,
    enrollment_type public.enrollment_type DEFAULT 'Optional'::public.enrollment_type,
    progress_data jsonb DEFAULT '{}'::jsonb,
    current_score numeric(5,2) DEFAULT 0.00,
    completion_percentage numeric(5,2) DEFAULT 0.00,
    enrolled_by uuid NOT NULL
);


ALTER TABLE public.intervention_enrollments OWNER TO postgres;

--
-- Name: intervention_quadrants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intervention_quadrants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intervention_id uuid NOT NULL,
    quadrant_id character varying(50) NOT NULL,
    weightage numeric(5,2) NOT NULL,
    components jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_intervention_quadrant_weightage CHECK (((weightage > (0)::numeric) AND (weightage <= (100)::numeric)))
);


ALTER TABLE public.intervention_quadrants OWNER TO postgres;

--
-- Name: intervention_teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.intervention_teachers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intervention_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    assigned_quadrants jsonb DEFAULT '[]'::jsonb NOT NULL,
    role public.teacher_role DEFAULT 'Assistant'::public.teacher_role,
    permissions jsonb DEFAULT '[]'::jsonb,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by uuid NOT NULL,
    is_active boolean DEFAULT true
);


ALTER TABLE public.intervention_teachers OWNER TO postgres;

--
-- Name: interventions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interventions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.intervention_status DEFAULT 'Draft'::public.intervention_status,
    quadrant_weightages jsonb DEFAULT '{}'::jsonb NOT NULL,
    prerequisites jsonb DEFAULT '[]'::jsonb,
    max_students integer DEFAULT 50,
    objectives jsonb DEFAULT '[]'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_intervention_dates CHECK ((end_date > start_date)),
    CONSTRAINT chk_intervention_max_students CHECK ((max_students > 0))
);


ALTER TABLE public.interventions OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type public.notification_type DEFAULT 'Info'::public.notification_type,
    category public.notification_category NOT NULL,
    is_read boolean DEFAULT false,
    action_url character varying(500),
    metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: quadrants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quadrants (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    weightage numeric(5,2) NOT NULL,
    minimum_attendance numeric(5,2) DEFAULT 0.00,
    business_rules jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quadrant_attendance CHECK (((minimum_attendance >= (0)::numeric) AND (minimum_attendance <= (100)::numeric))),
    CONSTRAINT chk_quadrant_weightage CHECK (((weightage > (0)::numeric) AND (weightage <= (100)::numeric)))
);


ALTER TABLE public.quadrants OWNER TO postgres;

--
-- Name: scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    component_id uuid NOT NULL,
    term_id uuid NOT NULL,
    obtained_score numeric(5,2) NOT NULL,
    max_score numeric(5,2) NOT NULL,
    percentage numeric(5,2) GENERATED ALWAYS AS (((obtained_score / max_score) * (100)::numeric)) STORED,
    assessment_date date DEFAULT CURRENT_DATE NOT NULL,
    assessed_by uuid NOT NULL,
    assessment_type public.assessment_type DEFAULT 'Teacher'::public.assessment_type,
    notes text,
    status public.score_status DEFAULT 'Submitted'::public.score_status,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_score_range CHECK (((obtained_score >= (0)::numeric) AND (obtained_score <= max_score)))
);


ALTER TABLE public.scores OWNER TO postgres;

--
-- Name: sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_id uuid NOT NULL,
    name character varying(10) NOT NULL,
    capacity integer DEFAULT 60,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sections OWNER TO postgres;

--
-- Name: shl_integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shl_integrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    shl_user_id character varying(100) NOT NULL,
    competency_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_sync_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_status public.sync_status DEFAULT 'Success'::public.sync_status,
    error_message text,
    sync_attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shl_integrations OWNER TO postgres;

--
-- Name: student_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_terms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    term_id uuid NOT NULL,
    enrollment_status public.enrollment_status DEFAULT 'Enrolled'::public.enrollment_status,
    total_score numeric(5,2) DEFAULT 0.00,
    grade public.grade_type DEFAULT 'IC'::public.grade_type,
    overall_status public.status_type DEFAULT 'Progress'::public.status_type,
    rank integer,
    is_eligible boolean DEFAULT true,
    enrolled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


ALTER TABLE public.student_terms OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    registration_no character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    course character varying(100) NOT NULL,
    batch_id uuid NOT NULL,
    section_id uuid NOT NULL,
    house_id uuid,
    gender public.gender_type NOT NULL,
    phone character varying(20),
    preferences jsonb DEFAULT '{}'::jsonb,
    overall_score numeric(5,2) DEFAULT 0.00,
    grade public.grade_type DEFAULT 'IC'::public.grade_type,
    status public.student_status DEFAULT 'Active'::public.student_status,
    current_term character varying(20) DEFAULT 'Term1'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: sub_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    quadrant_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    weightage numeric(5,2) NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_subcategory_weightage CHECK (((weightage > (0)::numeric) AND (weightage <= (100)::numeric)))
);


ALTER TABLE public.sub_categories OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    is_public boolean DEFAULT false,
    updated_by uuid NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: task_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_submissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    student_id uuid NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public.submission_status DEFAULT 'Submitted'::public.submission_status,
    is_late boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    submission_text text,
    score numeric(5,2),
    rubric_scores jsonb DEFAULT '[]'::jsonb,
    feedback text,
    private_notes text,
    graded_by uuid,
    graded_at timestamp without time zone
);


ALTER TABLE public.task_submissions OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intervention_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    quadrant_id character varying(50) NOT NULL,
    component_id uuid NOT NULL,
    max_score numeric(5,2) DEFAULT 10.00 NOT NULL,
    due_date timestamp without time zone NOT NULL,
    instructions text,
    rubric jsonb DEFAULT '[]'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    submission_type public.submission_type DEFAULT 'Document'::public.submission_type,
    allow_late_submission boolean DEFAULT true,
    late_penalty numeric(5,2) DEFAULT 0.00,
    status public.task_status DEFAULT 'Draft'::public.task_status,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_late_penalty CHECK (((late_penalty >= (0)::numeric) AND (late_penalty <= (100)::numeric))),
    CONSTRAINT chk_task_max_score CHECK ((max_score > (0)::numeric))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: teacher_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    teacher_id uuid NOT NULL,
    student_id uuid NOT NULL,
    term_id uuid NOT NULL,
    quadrant_id character varying(50) NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by uuid NOT NULL,
    is_active boolean DEFAULT true,
    notes text
);


ALTER TABLE public.teacher_assignments OWNER TO postgres;

--
-- Name: teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teachers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    employee_id character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    specialization character varying(100),
    department character varying(100),
    assigned_quadrants jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.teachers OWNER TO postgres;

--
-- Name: terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.terms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false,
    is_current boolean DEFAULT false,
    academic_year character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_term_dates CHECK ((end_date > start_date))
);


ALTER TABLE public.terms OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    refresh_token character varying(255) NOT NULL,
    ip_address inet,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_accessed timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, user_id, name, permissions, access_level, created_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, student_id, term_id, quadrant_id, attendance_date, is_present, reason, marked_by, created_at) FROM stdin;
33e8b841-2826-427f-826d-8400be45746d	ab96bb2d-17f6-4839-932a-42be1738aaea	3c94aaf3-851e-410e-8f90-2fc7c89949a3	persona	2025-06-11	t	\N	a6a1b023-cff1-4de5-90cf-535a759a73fe	2025-06-12 12:41:36.164943
f6ff3af9-77ba-42a4-b745-94e8dbd70a01	ab96bb2d-17f6-4839-932a-42be1738aaea	3c94aaf3-851e-410e-8f90-2fc7c89949a3	wellness	2025-06-11	t	\N	a6a1b023-cff1-4de5-90cf-535a759a73fe	2025-06-12 12:41:36.174828
\.


--
-- Data for Name: attendance_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_summary (id, student_id, term_id, quadrant_id, total_sessions, attended_sessions, last_updated) FROM stdin;
3676bd77-c995-4052-9550-df3933b8a53f	ab96bb2d-17f6-4839-932a-42be1738aaea	3c94aaf3-851e-410e-8f90-2fc7c89949a3	persona	20	18	2025-06-12 12:41:36.176776
9ad85ae5-fea3-4549-a38a-ac90daa95658	ab96bb2d-17f6-4839-932a-42be1738aaea	3c94aaf3-851e-410e-8f90-2fc7c89949a3	wellness	15	13	2025-06-12 12:41:36.179129
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batches (id, name, year, start_date, end_date, is_active, created_at) FROM stdin;
da931880-8469-4c3e-b85e-19bcb135bbb9	PGDM 2024	2024	2024-01-01	2024-12-31	t	2025-06-12 12:27:12.82644
\.


--
-- Data for Name: components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.components (id, sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active, created_at) FROM stdin;
e9da8d06-fe39-476f-9092-8c1b025cb0a8	d8bf2b2a-0e77-4947-b2ef-8ebaa5d9d0f0	Analysis & Critical Thinking (A&C)	Ability to analyze complex problems and think critically	14.29	5.00	0.00	SHL	1	t	2025-06-12 12:41:36.091988
c67e6828-2f78-4449-b80e-ef8d051484dd	d8bf2b2a-0e77-4947-b2ef-8ebaa5d9d0f0	Communication (C)	Effective verbal and written communication skills	14.29	5.00	0.00	SHL	2	t	2025-06-12 12:41:36.101374
c878b4e9-92f5-43bd-b16b-c38d6aa58113	d8bf2b2a-0e77-4947-b2ef-8ebaa5d9d0f0	Leadership (L)	Ability to lead and inspire others	14.29	5.00	0.00	SHL	3	t	2025-06-12 12:41:36.110079
cb73a7aa-5476-406d-8a16-0e63bf11af8f	0e5dcfc6-ec09-4433-820a-4b53ae8b6c4b	ESPA	English Speaking and Presentation Assessment	10.00	10.00	0.00	Professional	1	t	2025-06-12 12:41:36.118664
44b766ea-28d9-4745-8af1-c646a593ee54	5d23bff8-ffff-4136-8594-689806295eb1	Push Ups	Physical strength assessment through push-ups	10.00	5.00	0.00	Physical	1	t	2025-06-12 12:41:36.127523
\.


--
-- Data for Name: data_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_imports (id, import_type, filename, file_path, status, total_records, processed_records, successful_records, failed_records, error_log, processing_log, term_id, imported_by, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_logs (id, recipient_email, recipient_user_id, subject, email_type, template_name, status, sent_at, delivered_at, error_message, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (id, student_id, teacher_id, subject, category, message, priority, status, response, submitted_at, resolved_at, resolved_by) FROM stdin;
\.


--
-- Data for Name: file_uploads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.file_uploads (id, original_filename, stored_filename, file_path, file_size, mime_type, file_hash, uploaded_by, entity_type, entity_id, is_public, upload_purpose, created_at) FROM stdin;
\.


--
-- Data for Name: houses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.houses (id, name, color, description, total_points, is_active, created_at) FROM stdin;
ab5f42ba-f316-436a-ac9a-e9d7b74b2046	Daredevils	#FF6B6B	Bold and adventurous house	0	t	2025-06-12 12:27:12.810524
70abe807-c4d8-48e0-bd58-1da2cce7f5b9	Coronation	#4ECDC4	Royal and dignified house	0	t	2025-06-12 12:27:12.810524
6b29319b-066d-4837-99c0-fae4580c135b	Apache	#45B7D1	Strong and resilient house	0	t	2025-06-12 12:27:12.810524
4d2c4bd4-2171-4599-a757-4deda4f826ea	Bravehearts	#96CEB4	Courageous and determined house	0	t	2025-06-12 12:27:12.810524
\.


--
-- Data for Name: intervention_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.intervention_enrollments (id, intervention_id, student_id, enrollment_date, enrollment_status, enrollment_type, progress_data, current_score, completion_percentage, enrolled_by) FROM stdin;
\.


--
-- Data for Name: intervention_quadrants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.intervention_quadrants (id, intervention_id, quadrant_id, weightage, components, created_at) FROM stdin;
\.


--
-- Data for Name: intervention_teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.intervention_teachers (id, intervention_id, teacher_id, assigned_quadrants, role, permissions, assigned_at, assigned_by, is_active) FROM stdin;
\.


--
-- Data for Name: interventions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interventions (id, name, description, start_date, end_date, status, quadrant_weightages, prerequisites, max_students, objectives, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, category, is_read, action_url, metadata, expires_at, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: quadrants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quadrants (id, name, description, weightage, minimum_attendance, business_rules, is_active, display_order, created_at) FROM stdin;
persona	Persona	SHL Competencies and Professional Readiness	50.00	80.00	{}	t	1	2025-06-12 12:27:12.807862
wellness	Wellness	Physical, Mental, and Social Wellness	30.00	80.00	{}	t	2	2025-06-12 12:27:12.807862
behavior	Behavior	Professional Conduct, Interpersonal Skills, and Personal Development	10.00	0.00	{}	t	3	2025-06-12 12:27:12.807862
discipline	Discipline	Attendance, Code of Conduct, and Academic Discipline	10.00	0.00	{}	t	4	2025-06-12 12:27:12.807862
\.


--
-- Data for Name: scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scores (id, student_id, component_id, term_id, obtained_score, max_score, assessment_date, assessed_by, assessment_type, notes, status, created_at, updated_at) FROM stdin;
35dbf82f-99d8-4454-be93-deaf38a6786c	ab96bb2d-17f6-4839-932a-42be1738aaea	e9da8d06-fe39-476f-9092-8c1b025cb0a8	3c94aaf3-851e-410e-8f90-2fc7c89949a3	4.00	5.00	2025-06-12	a6a1b023-cff1-4de5-90cf-535a759a73fe	Teacher	Good performance in critical thinking	Approved	2025-06-12 12:41:36.136616	2025-06-12 12:41:36.136616
2e95e780-2c61-4550-9780-be9f8339e255	ab96bb2d-17f6-4839-932a-42be1738aaea	c67e6828-2f78-4449-b80e-ef8d051484dd	3c94aaf3-851e-410e-8f90-2fc7c89949a3	4.50	5.00	2025-06-12	a6a1b023-cff1-4de5-90cf-535a759a73fe	Teacher	Excellent communication skills	Approved	2025-06-12 12:41:36.146797	2025-06-12 12:41:36.146797
3643d2be-ad0a-4e15-b1fc-b90966b8e93a	ab96bb2d-17f6-4839-932a-42be1738aaea	cb73a7aa-5476-406d-8a16-0e63bf11af8f	3c94aaf3-851e-410e-8f90-2fc7c89949a3	8.00	10.00	2025-06-12	a6a1b023-cff1-4de5-90cf-535a759a73fe	Teacher	Strong presentation skills	Approved	2025-06-12 12:41:36.15568	2025-06-12 12:41:36.15568
\.


--
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sections (id, batch_id, name, capacity, is_active, created_at) FROM stdin;
40fb2f20-eedc-421f-981f-99e8f9b44a03	da931880-8469-4c3e-b85e-19bcb135bbb9	A	60	t	2025-06-12 12:37:48.472659
b58449a3-ea15-4691-86ec-93c427eaf41e	da931880-8469-4c3e-b85e-19bcb135bbb9	B	60	t	2025-06-12 12:37:48.472659
3d119fdb-568e-4545-b328-7e7105d5c932	da931880-8469-4c3e-b85e-19bcb135bbb9	C	60	t	2025-06-12 12:37:48.472659
\.


--
-- Data for Name: shl_integrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shl_integrations (id, student_id, shl_user_id, competency_data, last_sync_at, sync_status, error_message, sync_attempts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: student_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_terms (id, student_id, term_id, enrollment_status, total_score, grade, overall_status, rank, is_eligible, enrolled_at, completed_at) FROM stdin;
958ac91c-6898-4b39-8c8a-dfcdd2911bfc	ab96bb2d-17f6-4839-932a-42be1738aaea	3c94aaf3-851e-410e-8f90-2fc7c89949a3	Enrolled	95.00	A+	Good	1	t	2025-06-12 12:41:36.180973	\N
4e51297f-a9c8-44d5-a412-aff5aeec984e	bc0a5b3f-afdc-4e77-86b1-33a66df74f93	3c94aaf3-851e-410e-8f90-2fc7c89949a3	Enrolled	97.00	A+	Good	1	t	2025-06-12 12:41:36.18324	\N
912e2d65-5461-484a-9bc3-cffe4119b76e	beffbd32-6d98-46d0-b4cf-047613af0750	3c94aaf3-851e-410e-8f90-2fc7c89949a3	Enrolled	96.00	A+	Good	2	t	2025-06-12 12:41:36.184881	\N
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, user_id, registration_no, name, course, batch_id, section_id, house_id, gender, phone, preferences, overall_score, grade, status, current_term, created_at, updated_at) FROM stdin;
ab96bb2d-17f6-4839-932a-42be1738aaea	db7c97a4-b344-4b83-8008-7b60c0ebc811	2334	Ajith Kumar	PGDM	da931880-8469-4c3e-b85e-19bcb135bbb9	40fb2f20-eedc-421f-981f-99e8f9b44a03	ab5f42ba-f316-436a-ac9a-e9d7b74b2046	Male	+91-9876543210	{}	95.00	A+	Active	Term1	2025-06-12 12:41:36.064824	2025-06-12 12:41:36.064824
bc0a5b3f-afdc-4e77-86b1-33a66df74f93	e1127431-0615-464c-a6fa-dfdd84ebec6a	2335	Rohan Sharma	PGDM	da931880-8469-4c3e-b85e-19bcb135bbb9	40fb2f20-eedc-421f-981f-99e8f9b44a03	70abe807-c4d8-48e0-bd58-1da2cce7f5b9	Male	+91-9876543211	{}	97.00	A+	Active	Term1	2025-06-12 12:41:36.074269	2025-06-12 12:41:36.074269
beffbd32-6d98-46d0-b4cf-047613af0750	87815124-b030-4a7d-9047-8fd4fd61692a	2336	Priya Mehta	PGDM	da931880-8469-4c3e-b85e-19bcb135bbb9	b58449a3-ea15-4691-86ec-93c427eaf41e	6b29319b-066d-4837-99c0-fae4580c135b	Female	+91-9876543212	{}	96.00	A+	Active	Term1	2025-06-12 12:41:36.08295	2025-06-12 12:41:36.08295
\.


--
-- Data for Name: sub_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sub_categories (id, quadrant_id, name, description, weightage, display_order, is_active, created_at) FROM stdin;
d8bf2b2a-0e77-4947-b2ef-8ebaa5d9d0f0	persona	SHL Competencies	Critical thinking, communication, leadership, teamwork, negotiation	80.00	1	t	2025-06-12 12:27:12.813296
0e5dcfc6-ec09-4433-820a-4b53ae8b6c4b	persona	Professional Readiness	Business etiquette, appearance, time management, work ethics	20.00	2	t	2025-06-12 12:27:12.813296
5d23bff8-ffff-4136-8594-689806295eb1	wellness	Physical Fitness	Endurance, strength, flexibility, overall health	40.00	1	t	2025-06-12 12:27:12.816887
83f49a89-2328-429c-8758-1ef29772e446	wellness	Mental Wellness	Stress management, emotional intelligence, work-life balance	40.00	2	t	2025-06-12 12:27:12.816887
18cc5a80-9797-4707-916a-88ca1b69642b	wellness	Social Wellness	Team activities, community engagement, peer support	20.00	3	t	2025-06-12 12:27:12.816887
5107df4a-a1bd-4873-a63e-d96efc4bb643	behavior	Professional Conduct	Punctuality, responsibility, initiative, adaptability	40.00	1	t	2025-06-12 12:27:12.819445
47f716e8-4867-4d06-8107-303fb0c0c47c	behavior	Interpersonal Skills	Communication, conflict resolution, collaboration	40.00	2	t	2025-06-12 12:27:12.819445
25512947-f5df-4f33-8a12-204070bd7396	behavior	Personal Development	Self-awareness, growth mindset, learning attitude	20.00	3	t	2025-06-12 12:27:12.819445
3eb3b06e-8ba7-4d5f-8f33-accc4cde832c	discipline	Attendance	Regularity, punctuality, preparedness	40.00	1	t	2025-06-12 12:27:12.822375
9c6474c5-7d77-49f5-b073-c40367077c3f	discipline	Code of Conduct	Policy compliance, ethical behavior, professional standards	40.00	2	t	2025-06-12 12:27:12.822375
fd444d0e-99b6-49b9-964f-a0a984c3cb5d	discipline	Academic Discipline	Assignment completion, deadlines, quality of work	20.00	3	t	2025-06-12 12:27:12.822375
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, setting_key, setting_value, description, category, is_public, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: task_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_submissions (id, task_id, student_id, submitted_at, status, is_late, attachments, submission_text, score, rubric_scores, feedback, private_notes, graded_by, graded_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, intervention_id, name, description, quadrant_id, component_id, max_score, due_date, instructions, rubric, attachments, submission_type, allow_late_submission, late_penalty, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: teacher_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_assignments (id, teacher_id, student_id, term_id, quadrant_id, assigned_at, assigned_by, is_active, notes) FROM stdin;
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teachers (id, user_id, employee_id, name, specialization, department, assigned_quadrants, is_active, created_at, updated_at) FROM stdin;
b7deafb4-eb92-40e2-b195-514c8f9c4273	a6a1b023-cff1-4de5-90cf-535a759a73fe	EMP001	Dr. Sarah Johnson	Leadership & Communication	Management	["persona", "behavior"]	t	2025-06-12 12:41:36.038018	2025-06-12 12:41:36.038018
ac9ad30a-d01f-49c4-a0f1-8f312278dfe4	ddf4eb09-9f8e-4faf-bfb4-4266682bf352	EMP002	Prof. Michael Chen	Physical Education & Wellness	Sports	["wellness", "discipline"]	t	2025-06-12 12:41:36.055771	2025-06-12 12:41:36.055771
\.


--
-- Data for Name: terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.terms (id, name, description, start_date, end_date, is_active, is_current, academic_year, created_at) FROM stdin;
3c94aaf3-851e-410e-8f90-2fc7c89949a3	Term 1 / Level 0	First term of the academic year	2024-01-01	2024-06-30	t	t	2024	2025-06-12 12:27:12.824489
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, session_token, refresh_token, ip_address, user_agent, expires_at, created_at, last_accessed, is_active) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, status, last_login, created_at, updated_at) FROM stdin;
925e8e5a-d141-4b14-ab5f-4ce53587ec11	admin	admin@pepscorennexus.com	hashed_password_123	admin	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
a6a1b023-cff1-4de5-90cf-535a759a73fe	teacher1	teacher1@pepscorennexus.com	hashed_password_123	teacher	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
ddf4eb09-9f8e-4faf-bfb4-4266682bf352	teacher2	teacher2@pepscorennexus.com	hashed_password_123	teacher	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
db7c97a4-b344-4b83-8008-7b60c0ebc811	ajith.student	ajith@student.com	hashed_password_123	student	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
e1127431-0615-464c-a6fa-dfdd84ebec6a	rohan.student	rohan@student.com	hashed_password_123	student	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
87815124-b030-4a7d-9047-8fd4fd61692a	priya.student	priya@student.com	hashed_password_123	student	active	\N	2025-06-12 12:37:48.458168	2025-06-12 12:37:48.458168
\.


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_key UNIQUE (user_id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance_summary attendance_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_summary
    ADD CONSTRAINT attendance_summary_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: components components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_pkey PRIMARY KEY (id);


--
-- Name: data_imports data_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: file_uploads file_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_pkey PRIMARY KEY (id);


--
-- Name: houses houses_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_name_key UNIQUE (name);


--
-- Name: houses houses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (id);


--
-- Name: intervention_enrollments intervention_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_enrollments
    ADD CONSTRAINT intervention_enrollments_pkey PRIMARY KEY (id);


--
-- Name: intervention_quadrants intervention_quadrants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_quadrants
    ADD CONSTRAINT intervention_quadrants_pkey PRIMARY KEY (id);


--
-- Name: intervention_teachers intervention_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_teachers
    ADD CONSTRAINT intervention_teachers_pkey PRIMARY KEY (id);


--
-- Name: interventions interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: quadrants quadrants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quadrants
    ADD CONSTRAINT quadrants_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: shl_integrations shl_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shl_integrations
    ADD CONSTRAINT shl_integrations_pkey PRIMARY KEY (id);


--
-- Name: student_terms student_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_terms
    ADD CONSTRAINT student_terms_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_registration_no_key UNIQUE (registration_no);


--
-- Name: students students_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_key UNIQUE (user_id);


--
-- Name: sub_categories sub_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: task_submissions task_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: teacher_assignments teacher_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT teacher_assignments_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_employee_id_key UNIQUE (employee_id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_key UNIQUE (user_id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: attendance_summary uk_attendance_summary; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_summary
    ADD CONSTRAINT uk_attendance_summary UNIQUE (student_id, term_id, quadrant_id);


--
-- Name: attendance uk_attendance_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT uk_attendance_unique UNIQUE (student_id, term_id, quadrant_id, attendance_date);


--
-- Name: batches uk_batch_name_year; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT uk_batch_name_year UNIQUE (name, year);


--
-- Name: intervention_enrollments uk_intervention_enrollment; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_enrollments
    ADD CONSTRAINT uk_intervention_enrollment UNIQUE (intervention_id, student_id);


--
-- Name: intervention_quadrants uk_intervention_quadrant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_quadrants
    ADD CONSTRAINT uk_intervention_quadrant UNIQUE (intervention_id, quadrant_id);


--
-- Name: intervention_teachers uk_intervention_teacher; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_teachers
    ADD CONSTRAINT uk_intervention_teacher UNIQUE (intervention_id, teacher_id);


--
-- Name: scores uk_score_student_component_term; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT uk_score_student_component_term UNIQUE (student_id, component_id, term_id);


--
-- Name: sections uk_section_batch_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT uk_section_batch_name UNIQUE (batch_id, name);


--
-- Name: shl_integrations uk_shl_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shl_integrations
    ADD CONSTRAINT uk_shl_student UNIQUE (student_id);


--
-- Name: shl_integrations uk_shl_user_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shl_integrations
    ADD CONSTRAINT uk_shl_user_id UNIQUE (shl_user_id);


--
-- Name: student_terms uk_student_term; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_terms
    ADD CONSTRAINT uk_student_term UNIQUE (student_id, term_id);


--
-- Name: task_submissions uk_task_submission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT uk_task_submission UNIQUE (task_id, student_id);


--
-- Name: teacher_assignments uk_teacher_student_term_quadrant; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT uk_teacher_student_term_quadrant UNIQUE (teacher_id, student_id, term_id, quadrant_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (attendance_date);


--
-- Name: idx_attendance_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_quadrant ON public.attendance USING btree (quadrant_id);


--
-- Name: idx_attendance_student_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_student_term ON public.attendance USING btree (student_id, term_id);


--
-- Name: idx_attendance_student_term_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_student_term_quadrant ON public.attendance USING btree (student_id, term_id, quadrant_id);


--
-- Name: idx_attendance_summary_percentage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_summary_percentage ON public.attendance_summary USING btree (percentage);


--
-- Name: idx_attendance_summary_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_summary_quadrant ON public.attendance_summary USING btree (quadrant_id);


--
-- Name: idx_attendance_summary_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_summary_student ON public.attendance_summary USING btree (student_id);


--
-- Name: idx_attendance_summary_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_summary_term ON public.attendance_summary USING btree (term_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_batches_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_batches_active ON public.batches USING btree (is_active);


--
-- Name: idx_batches_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_batches_year ON public.batches USING btree (year);


--
-- Name: idx_components_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_components_category ON public.components USING btree (category);


--
-- Name: idx_components_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_components_order ON public.components USING btree (display_order);


--
-- Name: idx_components_subcategory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_components_subcategory ON public.components USING btree (sub_category_id);


--
-- Name: idx_data_imports_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_created ON public.data_imports USING btree (created_at);


--
-- Name: idx_data_imports_importer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_importer ON public.data_imports USING btree (imported_by);


--
-- Name: idx_data_imports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_status ON public.data_imports USING btree (status);


--
-- Name: idx_data_imports_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_term ON public.data_imports USING btree (term_id);


--
-- Name: idx_data_imports_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_imports_type ON public.data_imports USING btree (import_type);


--
-- Name: idx_email_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_created ON public.email_logs USING btree (created_at);


--
-- Name: idx_email_logs_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_recipient ON public.email_logs USING btree (recipient_email);


--
-- Name: idx_email_logs_sent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_sent ON public.email_logs USING btree (sent_at);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_logs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_type ON public.email_logs USING btree (email_type);


--
-- Name: idx_email_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_logs_user ON public.email_logs USING btree (recipient_user_id);


--
-- Name: idx_feedback_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);


--
-- Name: idx_feedback_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_student ON public.feedback USING btree (student_id);


--
-- Name: idx_feedback_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_teacher ON public.feedback USING btree (teacher_id);


--
-- Name: idx_file_uploads_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_uploads_created ON public.file_uploads USING btree (created_at);


--
-- Name: idx_file_uploads_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_uploads_entity ON public.file_uploads USING btree (entity_type, entity_id);


--
-- Name: idx_file_uploads_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_uploads_hash ON public.file_uploads USING btree (file_hash);


--
-- Name: idx_file_uploads_purpose; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_uploads_purpose ON public.file_uploads USING btree (upload_purpose);


--
-- Name: idx_file_uploads_uploader; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_uploads_uploader ON public.file_uploads USING btree (uploaded_by);


--
-- Name: idx_houses_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_houses_active ON public.houses USING btree (is_active);


--
-- Name: idx_intervention_enrollments_intervention; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_enrollments_intervention ON public.intervention_enrollments USING btree (intervention_id);


--
-- Name: idx_intervention_enrollments_intervention_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_enrollments_intervention_status ON public.intervention_enrollments USING btree (intervention_id, enrollment_status);


--
-- Name: idx_intervention_enrollments_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_enrollments_student ON public.intervention_enrollments USING btree (student_id);


--
-- Name: idx_intervention_quadrants_intervention; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_quadrants_intervention ON public.intervention_quadrants USING btree (intervention_id);


--
-- Name: idx_intervention_quadrants_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_quadrants_quadrant ON public.intervention_quadrants USING btree (quadrant_id);


--
-- Name: idx_intervention_teachers_intervention; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_teachers_intervention ON public.intervention_teachers USING btree (intervention_id);


--
-- Name: idx_intervention_teachers_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_intervention_teachers_teacher ON public.intervention_teachers USING btree (teacher_id);


--
-- Name: idx_interventions_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interventions_creator ON public.interventions USING btree (created_by);


--
-- Name: idx_interventions_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interventions_dates ON public.interventions USING btree (start_date, end_date);


--
-- Name: idx_interventions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_interventions_status ON public.interventions USING btree (status);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_quadrants_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quadrants_active ON public.quadrants USING btree (is_active);


--
-- Name: idx_quadrants_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quadrants_order ON public.quadrants USING btree (display_order);


--
-- Name: idx_scores_assessor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_assessor ON public.scores USING btree (assessed_by);


--
-- Name: idx_scores_component; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_component ON public.scores USING btree (component_id);


--
-- Name: idx_scores_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_date ON public.scores USING btree (assessment_date);


--
-- Name: idx_scores_student_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_student_term ON public.scores USING btree (student_id, term_id);


--
-- Name: idx_scores_student_term_component; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_student_term_component ON public.scores USING btree (student_id, term_id, component_id);


--
-- Name: idx_scores_term_component_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scores_term_component_score ON public.scores USING btree (term_id, component_id, obtained_score DESC);


--
-- Name: idx_sections_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sections_batch ON public.sections USING btree (batch_id);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_settings_category ON public.system_settings USING btree (category);


--
-- Name: idx_settings_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_settings_public ON public.system_settings USING btree (is_public);


--
-- Name: idx_shl_integrations_shl_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shl_integrations_shl_user ON public.shl_integrations USING btree (shl_user_id);


--
-- Name: idx_shl_integrations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shl_integrations_status ON public.shl_integrations USING btree (sync_status);


--
-- Name: idx_shl_integrations_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shl_integrations_sync ON public.shl_integrations USING btree (last_sync_at);


--
-- Name: idx_student_terms_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_terms_status ON public.student_terms USING btree (enrollment_status);


--
-- Name: idx_student_terms_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_terms_term ON public.student_terms USING btree (term_id);


--
-- Name: idx_student_terms_term_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_terms_term_score ON public.student_terms USING btree (term_id, total_score DESC);


--
-- Name: idx_students_batch_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_batch_section ON public.students USING btree (batch_id, section_id);


--
-- Name: idx_students_house; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_house ON public.students USING btree (house_id);


--
-- Name: idx_students_registration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_registration ON public.students USING btree (registration_no);


--
-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_status ON public.students USING btree (status);


--
-- Name: idx_subcategories_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_order ON public.sub_categories USING btree (display_order);


--
-- Name: idx_subcategories_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_quadrant ON public.sub_categories USING btree (quadrant_id);


--
-- Name: idx_task_submissions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_submissions_status ON public.task_submissions USING btree (status);


--
-- Name: idx_task_submissions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_submissions_student ON public.task_submissions USING btree (student_id);


--
-- Name: idx_task_submissions_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_submissions_task ON public.task_submissions USING btree (task_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_intervention; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_intervention ON public.tasks USING btree (intervention_id);


--
-- Name: idx_tasks_intervention_status_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_intervention_status_due ON public.tasks USING btree (intervention_id, status, due_date);


--
-- Name: idx_tasks_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_quadrant ON public.tasks USING btree (quadrant_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_teacher_assignments_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_assignments_active ON public.teacher_assignments USING btree (is_active);


--
-- Name: idx_teacher_assignments_quadrant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_assignments_quadrant ON public.teacher_assignments USING btree (quadrant_id);


--
-- Name: idx_teacher_assignments_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_assignments_student ON public.teacher_assignments USING btree (student_id);


--
-- Name: idx_teacher_assignments_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments USING btree (teacher_id);


--
-- Name: idx_teacher_assignments_term; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_assignments_term ON public.teacher_assignments USING btree (term_id);


--
-- Name: idx_teachers_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teachers_employee_id ON public.teachers USING btree (employee_id);


--
-- Name: idx_teachers_specialization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teachers_specialization ON public.teachers USING btree (specialization);


--
-- Name: idx_terms_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_terms_active ON public.terms USING btree (is_active);


--
-- Name: idx_terms_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_terms_current ON public.terms USING btree (is_current);


--
-- Name: idx_terms_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_terms_year ON public.terms USING btree (academic_year);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: interventions update_interventions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scores update_scores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shl_integrations update_shl_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_shl_integrations_updated_at BEFORE UPDATE ON public.shl_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teachers update_teachers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admins admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_marked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: attendance attendance_quadrant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_quadrant_id_fkey FOREIGN KEY (quadrant_id) REFERENCES public.quadrants(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance_summary attendance_summary_quadrant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_summary
    ADD CONSTRAINT attendance_summary_quadrant_id_fkey FOREIGN KEY (quadrant_id) REFERENCES public.quadrants(id) ON DELETE CASCADE;


--
-- Name: attendance_summary attendance_summary_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_summary
    ADD CONSTRAINT attendance_summary_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance_summary attendance_summary_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_summary
    ADD CONSTRAINT attendance_summary_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: components components_sub_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.components
    ADD CONSTRAINT components_sub_category_id_fkey FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON DELETE CASCADE;


--
-- Name: data_imports data_imports_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: data_imports data_imports_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_imports
    ADD CONSTRAINT data_imports_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: feedback feedback_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: feedback feedback_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;


--
-- Name: file_uploads file_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_uploads
    ADD CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: intervention_enrollments intervention_enrollments_enrolled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_enrollments
    ADD CONSTRAINT intervention_enrollments_enrolled_by_fkey FOREIGN KEY (enrolled_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: intervention_enrollments intervention_enrollments_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_enrollments
    ADD CONSTRAINT intervention_enrollments_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;


--
-- Name: intervention_enrollments intervention_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_enrollments
    ADD CONSTRAINT intervention_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: intervention_quadrants intervention_quadrants_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_quadrants
    ADD CONSTRAINT intervention_quadrants_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;


--
-- Name: intervention_quadrants intervention_quadrants_quadrant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_quadrants
    ADD CONSTRAINT intervention_quadrants_quadrant_id_fkey FOREIGN KEY (quadrant_id) REFERENCES public.quadrants(id) ON DELETE CASCADE;


--
-- Name: intervention_teachers intervention_teachers_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_teachers
    ADD CONSTRAINT intervention_teachers_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: intervention_teachers intervention_teachers_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_teachers
    ADD CONSTRAINT intervention_teachers_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;


--
-- Name: intervention_teachers intervention_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.intervention_teachers
    ADD CONSTRAINT intervention_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: interventions interventions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interventions
    ADD CONSTRAINT interventions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scores scores_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: scores scores_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id) ON DELETE CASCADE;


--
-- Name: scores scores_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: scores scores_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: sections sections_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;


--
-- Name: shl_integrations shl_integrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shl_integrations
    ADD CONSTRAINT shl_integrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_terms student_terms_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_terms
    ADD CONSTRAINT student_terms_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_terms student_terms_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_terms
    ADD CONSTRAINT student_terms_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: students students_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE RESTRICT;


--
-- Name: students students_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE SET NULL;


--
-- Name: students students_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sub_categories sub_categories_quadrant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_quadrant_id_fkey FOREIGN KEY (quadrant_id) REFERENCES public.quadrants(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: task_submissions task_submissions_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_submissions task_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: task_submissions task_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_submissions
    ADD CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.components(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_intervention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_intervention_id_fkey FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_quadrant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_quadrant_id_fkey FOREIGN KEY (quadrant_id) REFERENCES public.quadrants(id) ON DELETE RESTRICT;


--
-- Name: teacher_assignments teacher_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT teacher_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: teacher_assignments teacher_assignments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT teacher_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: teacher_assignments teacher_assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT teacher_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- Name: teacher_assignments teacher_assignments_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_assignments
    ADD CONSTRAINT teacher_assignments_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

