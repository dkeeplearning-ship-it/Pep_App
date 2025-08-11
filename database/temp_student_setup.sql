-- Create academic structure first
INSERT INTO academic_years (id, name, start_date, end_date, is_current, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    '2024-25',
    '2024-04-01',
    '2025-03-31',
    true,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO terms (id, name, academic_year_id, start_date, end_date, is_current, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Term 1',
    ay.id,
    '2024-04-01',
    '2024-09-30',
    true,
    NOW(),
    NOW()
FROM academic_years ay WHERE ay.name = '2024-25' AND ay.is_current = true
ON CONFLICT DO NOTHING;

INSERT INTO courses (id, name, code, description, duration_years, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Computer Science Engineering',
    'CSE',
    'Bachelor of Technology in Computer Science',
    4,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO batches (id, name, course_id, academic_year_id, start_date, end_date, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '2024-CSE-A',
    c.id,
    ay.id,
    '2024-04-01',
    '2028-03-31',
    NOW(),
    NOW()
FROM courses c, academic_years ay 
WHERE c.code = 'CSE' AND ay.name = '2024-25' AND ay.is_current = true
ON CONFLICT DO NOTHING;

INSERT INTO sections (id, name, batch_id, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Section A',
    b.id,
    NOW(),
    NOW()
FROM batches b WHERE b.name = '2024-CSE-A'
ON CONFLICT DO NOTHING;

INSERT INTO houses (id, name, color, description, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Phoenix House',
    '#FF6B35',
    'Rise from challenges stronger than before',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Now create the student profile
INSERT INTO students (
    id,
    user_id,
    registration_no,
    course_id,
    batch_id,
    section_id,
    house_id,
    admission_date,
    current_semester,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'ca3aa331-ebde-4bc7-874b-2ae417c97d05',
    'CSE2024001',
    c.id,
    b.id,
    s.id,
    h.id,
    '2024-04-01',
    1,
    'active',
    NOW(),
    NOW()
FROM courses c, batches b, sections s, houses h
WHERE c.code = 'CSE' 
  AND b.name = '2024-CSE-A'
  AND s.name = 'Section A'
  AND h.name = 'Phoenix House'
ON CONFLICT (user_id) DO UPDATE SET
    registration_no = EXCLUDED.registration_no,
    course_id = EXCLUDED.course_id,
    batch_id = EXCLUDED.batch_id,
    section_id = EXCLUDED.section_id,
    house_id = EXCLUDED.house_id,
    admission_date = EXCLUDED.admission_date,
    current_semester = EXCLUDED.current_semester,
    status = EXCLUDED.status,
    updated_at = NOW();
