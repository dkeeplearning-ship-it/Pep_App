-- Sample data for testing PEP Score Nexus APIs
-- Connect to pep_score_nexus database first

-- Insert sample users
INSERT INTO users (username, email, password_hash, role, status) VALUES
('admin', 'admin@pepscorennexus.com', 'hashed_password_123', 'admin', 'active'),
('teacher1', 'teacher1@pepscorennexus.com', 'hashed_password_123', 'teacher', 'active'),
('teacher2', 'teacher2@pepscorennexus.com', 'hashed_password_123', 'teacher', 'active'),
('ajith.student', 'ajith@student.com', 'hashed_password_123', 'student', 'active'),
('rohan.student', 'rohan@student.com', 'hashed_password_123', 'student', 'active'),
('priya.student', 'priya@student.com', 'hashed_password_123', 'student', 'active');

-- Get the batch and section IDs
-- Insert sample sections for the existing batch
INSERT INTO sections (batch_id, name, capacity, is_active) 
SELECT id, 'A', 60, true FROM batches WHERE name = 'PGDM 2024'
UNION ALL
SELECT id, 'B', 60, true FROM batches WHERE name = 'PGDM 2024'
UNION ALL
SELECT id, 'C', 60, true FROM batches WHERE name = 'PGDM 2024';

-- Insert sample teachers
INSERT INTO teachers (user_id, employee_id, name, specialization, department, assigned_quadrants, is_active)
SELECT
    u.id,
    'EMP001',
    'Dr. Sarah Johnson',
    'Leadership & Communication',
    'Management',
    '["persona", "behavior"]'::jsonb,
    true
FROM users u WHERE u.username = 'teacher1';

INSERT INTO teachers (user_id, employee_id, name, specialization, department, assigned_quadrants, is_active)
SELECT
    u.id,
    'EMP002',
    'Prof. Michael Chen',
    'Physical Education & Wellness',
    'Sports',
    '["wellness", "discipline"]'::jsonb,
    true
FROM users u WHERE u.username = 'teacher2';

-- Insert sample students
INSERT INTO students (user_id, registration_no, name, course, batch_id, section_id, house_id, gender, phone, overall_score, grade, status, current_term)
SELECT
    u.id,
    '2334',
    'Ajith Kumar',
    'PGDM',
    b.id,
    s.id,
    h.id,
    'Male'::gender_type,
    '+91-9876543210',
    95.00,
    'A+'::grade_type,
    'Active'::student_status,
    'Term1'
FROM users u, batches b, sections s, houses h
WHERE u.username = 'ajith.student'
AND b.name = 'PGDM 2024'
AND s.name = 'A'
AND h.name = 'Daredevils';

INSERT INTO students (user_id, registration_no, name, course, batch_id, section_id, house_id, gender, phone, overall_score, grade, status, current_term)
SELECT
    u.id,
    '2335',
    'Rohan Sharma',
    'PGDM',
    b.id,
    s.id,
    h.id,
    'Male'::gender_type,
    '+91-9876543211',
    97.00,
    'A+'::grade_type,
    'Active'::student_status,
    'Term1'
FROM users u, batches b, sections s, houses h
WHERE u.username = 'rohan.student'
AND b.name = 'PGDM 2024'
AND s.name = 'A'
AND h.name = 'Coronation';

INSERT INTO students (user_id, registration_no, name, course, batch_id, section_id, house_id, gender, phone, overall_score, grade, status, current_term)
SELECT
    u.id,
    '2336',
    'Priya Mehta',
    'PGDM',
    b.id,
    s.id,
    h.id,
    'Female'::gender_type,
    '+91-9876543212',
    96.00,
    'A+'::grade_type,
    'Active'::student_status,
    'Term1'
FROM users u, batches b, sections s, houses h
WHERE u.username = 'priya.student'
AND b.name = 'PGDM 2024'
AND s.name = 'B'
AND h.name = 'Apache';

-- Insert sample components for testing
-- Get sub-category IDs and insert components
INSERT INTO components (sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active)
SELECT
    sc.id,
    'Analysis & Critical Thinking (A&C)',
    'Ability to analyze complex problems and think critically',
    14.29, -- 80% of persona (50%) divided by 7 SHL components
    5.00,
    0.00,
    'SHL'::component_category,
    1,
    true
FROM sub_categories sc
WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active)
SELECT
    sc.id,
    'Communication (C)',
    'Effective verbal and written communication skills',
    14.29,
    5.00,
    0.00,
    'SHL'::component_category,
    2,
    true
FROM sub_categories sc
WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active)
SELECT
    sc.id,
    'Leadership (L)',
    'Ability to lead and inspire others',
    14.29,
    5.00,
    0.00,
    'SHL'::component_category,
    3,
    true
FROM sub_categories sc
WHERE sc.name = 'SHL Competencies';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active)
SELECT
    sc.id,
    'ESPA',
    'English Speaking and Presentation Assessment',
    10.00, -- 20% of persona (50%) divided by 2 professional components
    10.00,
    0.00,
    'Professional'::component_category,
    1,
    true
FROM sub_categories sc
WHERE sc.name = 'Professional Readiness';

INSERT INTO components (sub_category_id, name, description, weightage, max_score, minimum_score, category, display_order, is_active)
SELECT
    sc.id,
    'Push Ups',
    'Physical strength assessment through push-ups',
    10.00, -- 40% of wellness (30%) divided by 4 physical components
    5.00,
    0.00,
    'Physical'::component_category,
    1,
    true
FROM sub_categories sc
WHERE sc.name = 'Physical Fitness';

-- Insert sample scores
INSERT INTO scores (student_id, component_id, term_id, obtained_score, max_score, assessment_date, assessed_by, assessment_type, notes, status)
SELECT
    s.id,
    c.id,
    t.id,
    4.0,
    5.0,
    CURRENT_DATE,
    u.id,
    'Teacher'::assessment_type,
    'Good performance in critical thinking',
    'Approved'::score_status
FROM students s, components c, terms t, users u
WHERE s.registration_no = '2334'
AND c.name = 'Analysis & Critical Thinking (A&C)'
AND t.name = 'Term 1 / Level 0'
AND u.role = 'teacher'
LIMIT 1;

INSERT INTO scores (student_id, component_id, term_id, obtained_score, max_score, assessment_date, assessed_by, assessment_type, notes, status)
SELECT
    s.id,
    c.id,
    t.id,
    4.5,
    5.0,
    CURRENT_DATE,
    u.id,
    'Teacher'::assessment_type,
    'Excellent communication skills',
    'Approved'::score_status
FROM students s, components c, terms t, users u
WHERE s.registration_no = '2334'
AND c.name = 'Communication (C)'
AND t.name = 'Term 1 / Level 0'
AND u.role = 'teacher'
LIMIT 1;

INSERT INTO scores (student_id, component_id, term_id, obtained_score, max_score, assessment_date, assessed_by, assessment_type, notes, status)
SELECT
    s.id,
    c.id,
    t.id,
    8.0,
    10.0,
    CURRENT_DATE,
    u.id,
    'Teacher'::assessment_type,
    'Strong presentation skills',
    'Approved'::score_status
FROM students s, components c, terms t, users u
WHERE s.registration_no = '2334'
AND c.name = 'ESPA'
AND t.name = 'Term 1 / Level 0'
AND u.role = 'teacher'
LIMIT 1;

-- Insert sample attendance records
INSERT INTO attendance (student_id, term_id, quadrant_id, attendance_date, is_present, marked_by)
SELECT
    s.id,
    t.id,
    'persona',
    CURRENT_DATE - INTERVAL '1 day',
    true,
    u.id
FROM students s, terms t, users u
WHERE s.registration_no = '2334'
AND t.name = 'Term 1 / Level 0'
AND u.role = 'teacher'
LIMIT 1;

INSERT INTO attendance (student_id, term_id, quadrant_id, attendance_date, is_present, marked_by)
SELECT
    s.id,
    t.id,
    'wellness',
    CURRENT_DATE - INTERVAL '1 day',
    true,
    u.id
FROM students s, terms t, users u
WHERE s.registration_no = '2334'
AND t.name = 'Term 1 / Level 0'
AND u.role = 'teacher'
LIMIT 1;

-- Insert sample attendance summary
INSERT INTO attendance_summary (student_id, term_id, quadrant_id, total_sessions, attended_sessions)
SELECT
    s.id,
    t.id,
    'persona',
    20,
    18
FROM students s, terms t
WHERE s.registration_no = '2334'
AND t.name = 'Term 1 / Level 0';

INSERT INTO attendance_summary (student_id, term_id, quadrant_id, total_sessions, attended_sessions)
SELECT
    s.id,
    t.id,
    'wellness',
    15,
    13
FROM students s, terms t
WHERE s.registration_no = '2334'
AND t.name = 'Term 1 / Level 0';

-- Insert student terms
INSERT INTO student_terms (student_id, term_id, enrollment_status, total_score, grade, overall_status, rank, is_eligible)
SELECT
    s.id,
    t.id,
    'Enrolled'::enrollment_status,
    95.00,
    'A+'::grade_type,
    'Good'::status_type,
    1,
    true
FROM students s, terms t
WHERE s.registration_no = '2334'
AND t.name = 'Term 1 / Level 0';

INSERT INTO student_terms (student_id, term_id, enrollment_status, total_score, grade, overall_status, rank, is_eligible)
SELECT
    s.id,
    t.id,
    'Enrolled'::enrollment_status,
    97.00,
    'A+'::grade_type,
    'Good'::status_type,
    1,
    true
FROM students s, terms t
WHERE s.registration_no = '2335'
AND t.name = 'Term 1 / Level 0';

INSERT INTO student_terms (student_id, term_id, enrollment_status, total_score, grade, overall_status, rank, is_eligible)
SELECT
    s.id,
    t.id,
    'Enrolled'::enrollment_status,
    96.00,
    'A+'::grade_type,
    'Good'::status_type,
    2,
    true
FROM students s, terms t
WHERE s.registration_no = '2336'
AND t.name = 'Term 1 / Level 0';

SELECT 'Sample data inserted successfully!' as status;
