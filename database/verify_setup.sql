-- PEP Score Nexus Database Verification Script
-- Run this after database_setup.sql to verify everything is working correctly

-- Check if all main tables exist
SELECT 'Checking main tables...' as status;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'users', 'students', 'teachers', 'quadrants', 'sub_categories', 
            'components', 'microcompetencies', 'interventions', 'tasks', 
            'task_microcompetencies', 'microcompetency_scores', 
            'teacher_microcompetency_assignments', 'task_submissions'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'users', 'students', 'teachers', 'quadrants', 'sub_categories', 
        'components', 'microcompetencies', 'interventions', 'tasks', 
        'task_microcompetencies', 'microcompetency_scores', 
        'teacher_microcompetency_assignments', 'task_submissions'
    )
ORDER BY table_name;

-- Check if views exist
SELECT 'Checking views...' as status;

SELECT 
    table_name as view_name,
    CASE 
        WHEN table_name IN (
            'task_microcompetency_summary', 'teacher_task_permissions', 
            'student_microcompetency_progress'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'VIEW'
    AND table_name IN (
        'task_microcompetency_summary', 'teacher_task_permissions', 
        'student_microcompetency_progress'
    )
ORDER BY table_name;

-- Check if functions exist
SELECT 'Checking functions...' as status;

SELECT 
    routine_name as function_name,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
        'calculate_grade', 'calculate_microcompetency_score_from_task', 
        'validate_task_weightages', 'update_updated_at_column'
    )
ORDER BY routine_name;

-- Check table relationships and constraints
SELECT 'Checking key constraints...' as status;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    '✅ ACTIVE' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
    AND tc.table_name IN ('tasks', 'task_microcompetencies', 'microcompetency_scores')
ORDER BY tc.table_name, tc.constraint_type;

-- Test function functionality
SELECT 'Testing functions...' as status;

-- Test microcompetency score calculation
SELECT 
    'calculate_microcompetency_score_from_task' as function_name,
    calculate_microcompetency_score_from_task(18.5, 20.0, 60.0, 10.0) as result,
    '5.55 expected' as expected_result;

-- Test grade calculation
SELECT 
    'calculate_grade' as function_name,
    calculate_grade(85.5) as result,
    'A expected' as expected_result;

-- Check default data
SELECT 'Checking default data...' as status;

SELECT 'quadrants' as table_name, COUNT(*) as record_count FROM quadrants
UNION ALL
SELECT 'sub_categories' as table_name, COUNT(*) as record_count FROM sub_categories
UNION ALL
SELECT 'components' as table_name, COUNT(*) as record_count FROM components
UNION ALL
SELECT 'houses' as table_name, COUNT(*) as record_count FROM houses
UNION ALL
SELECT 'terms' as table_name, COUNT(*) as record_count FROM terms
UNION ALL
SELECT 'batches' as table_name, COUNT(*) as record_count FROM batches
ORDER BY table_name;

-- Check indexes
SELECT 'Checking indexes...' as status;

SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_task_%' OR 
        indexname LIKE 'idx_microcompetency_%' OR
        indexname LIKE 'idx_teacher_microcompetency_%'
    )
ORDER BY tablename, indexname;

-- Sample data validation queries
SELECT 'Sample validation queries...' as status;

-- Check if task_microcompetencies table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'task_microcompetencies'
ORDER BY ordinal_position;

-- Check if microcompetency_scores table structure is correct
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'microcompetency_scores'
ORDER BY ordinal_position;

-- Final verification
SELECT 
    '🎉 PEP Score Nexus Database Verification Complete!' as status,
    'Microcompetency-Centric Task System Ready for Use!' as task_system_status,
    NOW() as verified_at;

-- Usage instructions
SELECT 
    'NEXT STEPS:' as instruction_type,
    '1. Create users, students, and teachers' as step_1,
    '2. Set up interventions and assign microcompetencies' as step_2,
    '3. Assign teachers to microcompetencies with permissions' as step_3,
    '4. Teachers can now create tasks for their assigned microcompetencies' as step_4,
    '5. Grading tasks will automatically update microcompetency scores' as step_5;
