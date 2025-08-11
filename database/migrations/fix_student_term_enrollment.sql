-- Fix Student-Term Enrollment Data Integrity Issues
-- This migration fixes critical data inconsistencies in student-term enrollment

-- =====================================================
-- 1. ANALYZE CURRENT STATE
-- =====================================================

-- Check current term enrollment issues
DO $$
DECLARE
    current_term_id UUID;
    students_count INTEGER;
    enrolled_in_current INTEGER;
    mismatched_students INTEGER;
BEGIN
    -- Get current term
    SELECT id INTO current_term_id FROM terms WHERE is_current = true LIMIT 1;
    
    -- Count total students
    SELECT COUNT(*) INTO students_count FROM students WHERE status = 'active';
    
    -- Count students enrolled in current term
    SELECT COUNT(*) INTO enrolled_in_current 
    FROM student_terms st 
    WHERE st.term_id = current_term_id;
    
    -- Count students with mismatched current_term_id
    SELECT COUNT(*) INTO mismatched_students
    FROM students s
    WHERE s.current_term_id != current_term_id 
    AND s.status = 'active';
    
    RAISE NOTICE '=== STUDENT-TERM ENROLLMENT ANALYSIS ===';
    RAISE NOTICE 'Current Term ID: %', current_term_id;
    RAISE NOTICE 'Total Active Students: %', students_count;
    RAISE NOTICE 'Students Enrolled in Current Term: %', enrolled_in_current;
    RAISE NOTICE 'Students with Mismatched current_term_id: %', mismatched_students;
    RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- 2. FIX STUDENT CURRENT_TERM_ID REFERENCES
-- =====================================================

-- Update all active students to point to the current term
UPDATE students 
SET current_term_id = (SELECT id FROM terms WHERE is_current = true LIMIT 1)
WHERE status = 'active';

-- =====================================================
-- 3. ENROLL STUDENTS IN CURRENT TERM (IF NOT ALREADY)
-- =====================================================

-- Insert missing student-term enrollments for current term
INSERT INTO student_terms (
    student_id, 
    term_id, 
    enrollment_status, 
    total_score, 
    grade, 
    overall_status, 
    is_eligible, 
    enrolled_at
)
SELECT 
    s.id as student_id,
    t.id as term_id,
    'Enrolled' as enrollment_status,
    0 as total_score,
    'IC' as grade,
    'Progress' as overall_status,
    true as is_eligible,
    NOW() as enrolled_at
FROM students s
CROSS JOIN terms t
WHERE s.status = 'active'
  AND t.is_current = true
  AND NOT EXISTS (
    SELECT 1 FROM student_terms st 
    WHERE st.student_id = s.id 
    AND st.term_id = t.id
  );

-- =====================================================
-- 4. CREATE TERM ENROLLMENT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to enroll a student in a term
CREATE OR REPLACE FUNCTION enroll_student_in_term(
    p_student_id UUID,
    p_term_id UUID,
    p_enrollment_status VARCHAR DEFAULT 'Enrolled'
) RETURNS BOOLEAN AS $$
DECLARE
    enrollment_exists BOOLEAN;
BEGIN
    -- Check if enrollment already exists
    SELECT EXISTS(
        SELECT 1 FROM student_terms 
        WHERE student_id = p_student_id AND term_id = p_term_id
    ) INTO enrollment_exists;
    
    IF enrollment_exists THEN
        RAISE NOTICE 'Student % already enrolled in term %', p_student_id, p_term_id;
        RETURN FALSE;
    END IF;
    
    -- Create enrollment
    INSERT INTO student_terms (
        student_id, term_id, enrollment_status, total_score, 
        grade, overall_status, is_eligible, enrolled_at
    ) VALUES (
        p_student_id, p_term_id, p_enrollment_status, 0,
        'IC', 'Progress', true, NOW()
    );
    
    RAISE NOTICE 'Student % enrolled in term %', p_student_id, p_term_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to transition student to next term
CREATE OR REPLACE FUNCTION transition_student_to_term(
    p_student_id UUID,
    p_new_term_id UUID,
    p_complete_current BOOLEAN DEFAULT true
) RETURNS BOOLEAN AS $$
DECLARE
    current_term_id UUID;
    final_score DECIMAL(5,2);
    final_grade VARCHAR(5);
    final_status VARCHAR(20);
BEGIN
    -- Get student's current term
    SELECT current_term_id INTO current_term_id FROM students WHERE id = p_student_id;
    
    IF current_term_id IS NULL THEN
        RAISE EXCEPTION 'Student % has no current term', p_student_id;
    END IF;
    
    -- Complete current term if requested
    IF p_complete_current THEN
        -- Get final scores from student_score_summary
        SELECT total_hps, overall_grade, overall_status 
        INTO final_score, final_grade, final_status
        FROM student_score_summary 
        WHERE student_id = p_student_id AND term_id = current_term_id;
        
        -- Update current term enrollment as completed
        UPDATE student_terms 
        SET 
            enrollment_status = 'Completed',
            total_score = COALESCE(final_score, 0),
            grade = COALESCE(final_grade, 'IC'),
            overall_status = COALESCE(final_status, 'Progress'),
            completed_at = NOW()
        WHERE student_id = p_student_id AND term_id = current_term_id;
    END IF;
    
    -- Enroll in new term
    PERFORM enroll_student_in_term(p_student_id, p_new_term_id);
    
    -- Update student's current term
    UPDATE students SET current_term_id = p_new_term_id WHERE id = p_student_id;
    
    RAISE NOTICE 'Student % transitioned from term % to term %', 
                 p_student_id, current_term_id, p_new_term_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk enroll all active students in a term
CREATE OR REPLACE FUNCTION bulk_enroll_students_in_term(
    p_term_id UUID,
    p_enrollment_status VARCHAR DEFAULT 'Enrolled'
) RETURNS INTEGER AS $$
DECLARE
    enrolled_count INTEGER := 0;
    student_record RECORD;
BEGIN
    FOR student_record IN 
        SELECT id FROM students WHERE status = 'active'
    LOOP
        IF enroll_student_in_term(student_record.id, p_term_id, p_enrollment_status) THEN
            enrolled_count := enrolled_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Bulk enrolled % students in term %', enrolled_count, p_term_id;
    RETURN enrolled_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TERM TRANSITION FUNCTIONS
-- =====================================================

-- Function to activate a new term and transition students
CREATE OR REPLACE FUNCTION activate_term_and_transition_students(
    p_term_id UUID,
    p_complete_previous BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
    previous_term_id UUID;
    students_transitioned INTEGER := 0;
    students_enrolled INTEGER := 0;
    result JSONB;
    student_record RECORD;
BEGIN
    -- Get previous current term
    SELECT id INTO previous_term_id FROM terms WHERE is_current = true;
    
    -- Set new current term
    UPDATE terms SET is_current = false WHERE is_current = true;
    UPDATE terms SET is_current = true WHERE id = p_term_id;
    
    -- Transition all active students
    FOR student_record IN 
        SELECT id FROM students WHERE status = 'active'
    LOOP
        BEGIN
            PERFORM transition_student_to_term(
                student_record.id, 
                p_term_id, 
                p_complete_previous
            );
            students_transitioned := students_transitioned + 1;
        EXCEPTION WHEN OTHERS THEN
            -- If transition fails, just enroll in new term
            IF enroll_student_in_term(student_record.id, p_term_id) THEN
                students_enrolled := students_enrolled + 1;
            END IF;
            -- Update current term anyway
            UPDATE students SET current_term_id = p_term_id WHERE id = student_record.id;
        END;
    END LOOP;
    
    result := jsonb_build_object(
        'success', true,
        'previous_term_id', previous_term_id,
        'new_term_id', p_term_id,
        'students_transitioned', students_transitioned,
        'students_enrolled', students_enrolled,
        'total_affected', students_transitioned + students_enrolled
    );
    
    RAISE NOTICE 'Term activation complete: %', result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VALIDATION AND REPORTING FUNCTIONS
-- =====================================================

-- Function to validate student-term enrollment integrity
CREATE OR REPLACE FUNCTION validate_student_term_integrity()
RETURNS JSONB AS $$
DECLARE
    current_term_id UUID;
    total_students INTEGER;
    enrolled_in_current INTEGER;
    mismatched_current_term INTEGER;
    students_without_enrollment INTEGER;
    validation_result JSONB;
    issues JSONB := '[]'::jsonb;
BEGIN
    -- Get current term
    SELECT id INTO current_term_id FROM terms WHERE is_current = true LIMIT 1;
    
    -- Count total active students
    SELECT COUNT(*) INTO total_students FROM students WHERE status = 'active';
    
    -- Count students enrolled in current term
    SELECT COUNT(*) INTO enrolled_in_current 
    FROM student_terms st 
    WHERE st.term_id = current_term_id;
    
    -- Count students with wrong current_term_id
    SELECT COUNT(*) INTO mismatched_current_term
    FROM students s
    WHERE s.current_term_id != current_term_id 
    AND s.status = 'active';
    
    -- Count students without any enrollment in current term
    SELECT COUNT(*) INTO students_without_enrollment
    FROM students s
    WHERE s.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM student_terms st 
        WHERE st.student_id = s.id AND st.term_id = current_term_id
    );
    
    -- Build issues array
    IF mismatched_current_term > 0 THEN
        issues := issues || jsonb_build_array(
            format('%s students have incorrect current_term_id', mismatched_current_term)
        );
    END IF;
    
    IF students_without_enrollment > 0 THEN
        issues := issues || jsonb_build_array(
            format('%s students are not enrolled in current term', students_without_enrollment)
        );
    END IF;
    
    validation_result := jsonb_build_object(
        'valid', (mismatched_current_term = 0 AND students_without_enrollment = 0),
        'current_term_id', current_term_id,
        'total_students', total_students,
        'enrolled_in_current', enrolled_in_current,
        'mismatched_current_term', mismatched_current_term,
        'students_without_enrollment', students_without_enrollment,
        'issues', issues
    );
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FINAL VALIDATION
-- =====================================================

-- Run validation and show results
DO $$
DECLARE
    validation_result JSONB;
BEGIN
    SELECT validate_student_term_integrity() INTO validation_result;
    
    RAISE NOTICE '=== FINAL VALIDATION RESULTS ===';
    RAISE NOTICE '%', validation_result;
    RAISE NOTICE '================================';
END $$;

-- Add helpful comments
COMMENT ON FUNCTION enroll_student_in_term(UUID, UUID, VARCHAR) IS 'Enroll a student in a specific term';
COMMENT ON FUNCTION transition_student_to_term(UUID, UUID, BOOLEAN) IS 'Transition student from current term to new term';
COMMENT ON FUNCTION bulk_enroll_students_in_term(UUID, VARCHAR) IS 'Bulk enroll all active students in a term';
COMMENT ON FUNCTION activate_term_and_transition_students(UUID, BOOLEAN) IS 'Activate new term and transition all students';
COMMENT ON FUNCTION validate_student_term_integrity() IS 'Validate student-term enrollment data integrity';

RAISE NOTICE '✅ Student-Term Enrollment Fix Complete!';
RAISE NOTICE 'New functions available:';
RAISE NOTICE '- enroll_student_in_term(student_id, term_id)';
RAISE NOTICE '- transition_student_to_term(student_id, new_term_id)';
RAISE NOTICE '- bulk_enroll_students_in_term(term_id)';
RAISE NOTICE '- activate_term_and_transition_students(term_id)';
RAISE NOTICE '- validate_student_term_integrity()';
