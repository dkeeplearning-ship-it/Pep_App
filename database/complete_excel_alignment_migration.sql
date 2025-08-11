-- Smart Multi-Batch Term Progression System Migration
-- This script implements a comprehensive solution for managing multiple student batches
-- across different terms with proper progression, completion tracking, and eligibility integration

-- =====================================================
-- BACKUP AND SAFETY MEASURES
-- =====================================================

-- Create backup tables before making changes
CREATE TABLE IF NOT EXISTS backup_students AS SELECT * FROM students;
CREATE TABLE IF NOT EXISTS backup_batches AS SELECT * FROM batches;
CREATE TABLE IF NOT EXISTS backup_terms AS SELECT * FROM terms;

-- Log migration start
INSERT INTO audit_logs (action, entity_type, new_values, created_at)
VALUES ('MIGRATION_START', 'SYSTEM', '{"migration": "smart_batch_progression", "timestamp": "' || NOW() || '"}', NOW());

BEGIN;

-- =====================================================
-- 1. ENHANCED BATCH MANAGEMENT SYSTEM
-- =====================================================

-- Enhance batches table with progression tracking
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS current_term_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_terms INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS batch_start_date DATE,
ADD COLUMN IF NOT EXISTS expected_graduation_date DATE,
ADD COLUMN IF NOT EXISTS batch_status VARCHAR(20) DEFAULT 'active'; -- active, graduated, suspended

-- Create batch term progression tracking
CREATE TABLE IF NOT EXISTS batch_term_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    term_number INTEGER NOT NULL, -- 1, 2, 3, 4 (Level 0, 1, 2, 3)
    status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed, skipped
    start_date DATE,
    end_date DATE,
    completion_date DATE,
    students_enrolled INTEGER DEFAULT 0,
    students_completed INTEGER DEFAULT 0,
    students_failed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(batch_id, term_number)
);

-- =====================================================
-- 2. ENHANCED TERMS WITH LEVEL PROGRESSION
-- =====================================================

-- Enhance terms table to support level progression and status management
ALTER TABLE terms
ADD COLUMN IF NOT EXISTS term_number INTEGER DEFAULT 1, -- 1=Level 0, 2=Level 1, 3=Level 2, 4=Level 3
ADD COLUMN IF NOT EXISTS term_status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed, archived
ADD COLUMN IF NOT EXISTS level_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS attendance_threshold DECIMAL(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS progression_requirements JSONB,
ADD COLUMN IF NOT EXISTS eligibility_rules JSONB,
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS max_students INTEGER;

-- =====================================================
-- 3. STUDENT TERM PROGRESSION TRACKING
-- =====================================================

-- Create comprehensive student term tracking
CREATE TABLE IF NOT EXISTS student_term_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    term_number INTEGER NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'enrolled', -- enrolled, active, completed, failed, withdrawn
    eligibility_status VARCHAR(20) DEFAULT 'pending', -- eligible, ict, not_cleared, conditional
    final_hps DECIMAL(5,2),
    final_grade VARCHAR(5),
    attendance_percentage DECIMAL(5,2),
    quadrant_scores JSONB, -- Store final quadrant scores
    progression_notes TEXT,
    can_progress_to_next BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, term_id)
);

-- =====================================================
-- 4. BEHAVIOR QUADRANT ENHANCEMENT
-- =====================================================

-- Add Behavior Rating Tool sub-category and components
DO $$
DECLARE
    behavior_quadrant_id UUID;
    behavior_rating_subcategory_id UUID;
BEGIN
    -- Get Behavior quadrant ID
    SELECT id INTO behavior_quadrant_id 
    FROM quadrants 
    WHERE name = 'Behavior' 
    LIMIT 1;
    
    -- Create Behavior Rating Tool sub-category
    INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order, is_active)
    VALUES (behavior_quadrant_id, 'Behavior Rating Tool', 'Faculty-based 1-5 rating scale for specific behavior criteria', 100.00, 1, true)
    ON CONFLICT (quadrant_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        weightage = EXCLUDED.weightage
    RETURNING id INTO behavior_rating_subcategory_id;
    
    -- Add the 5 Excel behavior components
    INSERT INTO components (sub_category_id, name, category, max_score, description, display_order, is_active) VALUES
    (behavior_rating_subcategory_id, 'Prepares for class', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 1, true),
    (behavior_rating_subcategory_id, 'Participates in class discussions', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 2, true),
    (behavior_rating_subcategory_id, 'Demonstrates good manners', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 3, true),
    (behavior_rating_subcategory_id, 'Arrives on time and is properly groomed', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 4, true),
    (behavior_rating_subcategory_id, 'Submits good quality assignments following ethical standards', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 5, true)
    ON CONFLICT (sub_category_id, name) DO UPDATE SET
        max_score = EXCLUDED.max_score,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order;
END $$;

-- =====================================================
-- 5. ATTENDANCE ELIGIBILITY INTEGRATION
-- =====================================================

-- Create attendance eligibility table (integrated with existing HPS calculation)
CREATE TABLE IF NOT EXISTS attendance_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    attendance_type VARCHAR(50) NOT NULL, -- overall, wellness, component_specific
    component_id UUID REFERENCES components(id),
    total_sessions INTEGER DEFAULT 0,
    attended_sessions INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    eligibility_status VARCHAR(20) DEFAULT 'ict', -- eligible, ict, not_cleared
    threshold_required DECIMAL(5,2) DEFAULT 75.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, term_id, attendance_type, COALESCE(component_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- =====================================================
-- 6. STUDENT RANKINGS SYSTEM
-- =====================================================

-- Create student rankings table
CREATE TABLE IF NOT EXISTS student_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    quadrant_id UUID REFERENCES quadrants(id),
    rank_position INTEGER,
    total_students INTEGER,
    score DECIMAL(5,2),
    ranking_type VARCHAR(20) DEFAULT 'quadrant', -- quadrant, overall
    grade VARCHAR(5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, term_id, COALESCE(quadrant_id, '00000000-0000-0000-0000-000000000000'::UUID), ranking_type)
);

-- =====================================================
-- 7. TERM LIFECYCLE MANAGEMENT
-- =====================================================

-- Create term lifecycle events table
CREATE TABLE IF NOT EXISTS term_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id),
    event_type VARCHAR(50) NOT NULL, -- created, activated, completed, archived
    event_date TIMESTAMP DEFAULT NOW(),
    triggered_by UUID REFERENCES users(id),
    event_data JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. SMART TERM SETUP AND DATA MIGRATION
-- =====================================================

-- Update existing terms with proper term numbers and level information
UPDATE terms SET
    term_number = CASE
        WHEN name LIKE '%Term 1%' OR name LIKE '%Level 0%' THEN 1
        WHEN name LIKE '%Term 2%' OR name LIKE '%Level 1%' THEN 2
        WHEN name LIKE '%Term 3%' OR name LIKE '%Level 2%' THEN 3
        WHEN name LIKE '%Term 4%' OR name LIKE '%Level 3%' THEN 4
        ELSE 1
    END,
    level_name = CASE
        WHEN name LIKE '%Term 1%' OR name LIKE '%Level 0%' THEN 'Level 0 (Foundation)'
        WHEN name LIKE '%Term 2%' OR name LIKE '%Level 1%' THEN 'Level 1 (Intermediate)'
        WHEN name LIKE '%Term 3%' OR name LIKE '%Level 2%' THEN 'Level 2 (Advanced)'
        WHEN name LIKE '%Term 4%' OR name LIKE '%Level 3%' THEN 'Level 3 (Capstone)'
        ELSE 'Level 0 (Foundation)'
    END,
    attendance_threshold = CASE
        WHEN name LIKE '%Term 1%' OR name LIKE '%Level 0%' THEN 75.00
        WHEN name LIKE '%Term 2%' OR name LIKE '%Level 1%' THEN 80.00
        WHEN name LIKE '%Term 3%' OR name LIKE '%Level 2%' THEN 85.00
        WHEN name LIKE '%Term 4%' OR name LIKE '%Level 3%' THEN 90.00
        ELSE 75.00
    END,
    progression_requirements = CASE
        WHEN name LIKE '%Term 1%' OR name LIKE '%Level 0%' THEN '{"persona_threshold": 40, "wellness_threshold": 40, "behavior_threshold": 3, "discipline_threshold": 3}'
        WHEN name LIKE '%Term 2%' OR name LIKE '%Level 1%' THEN '{"persona_threshold": 45, "wellness_threshold": 45, "behavior_threshold": 3.5, "discipline_threshold": 3.5}'
        WHEN name LIKE '%Term 3%' OR name LIKE '%Level 2%' THEN '{"persona_threshold": 50, "wellness_threshold": 50, "behavior_threshold": 4, "discipline_threshold": 4}'
        WHEN name LIKE '%Term 4%' OR name LIKE '%Level 3%' THEN '{"persona_threshold": 55, "wellness_threshold": 55, "behavior_threshold": 4.5, "discipline_threshold": 4.5}'
        ELSE '{"persona_threshold": 40, "wellness_threshold": 40, "behavior_threshold": 3, "discipline_threshold": 3}'
    END,
    eligibility_rules = '{"attendance_required": true, "quadrant_clearance_required": ["Persona", "Wellness"], "behavior_rating_min": 3}',
    term_status = CASE
        WHEN is_current = true THEN 'active'
        WHEN end_date < CURRENT_DATE THEN 'completed'
        WHEN start_date > CURRENT_DATE THEN 'upcoming'
        ELSE 'upcoming'
    END
WHERE term_number IS NULL;

-- =====================================================
-- 4. ENHANCE STUDENTS TABLE
-- =====================================================

-- Add level-related columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS current_level_id UUID REFERENCES terms(id),
ADD COLUMN IF NOT EXISTS overall_attendance DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(20) DEFAULT 'eligible';

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_student_level_progression_student_term ON student_level_progression(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_attendance_eligibility_student_term ON attendance_eligibility(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_rankings_student_term ON student_rankings(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_rankings_quadrant ON student_rankings(quadrant_id, ranking_type);
CREATE INDEX IF NOT EXISTS idx_terms_level_number ON terms(level_number);

-- =====================================================
-- 6. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to check level progression eligibility
CREATE OR REPLACE FUNCTION check_level_progression_eligibility(
    p_student_id UUID,
    p_current_term_id UUID
) RETURNS JSONB AS $$
DECLARE
    attendance_pct DECIMAL(5,2);
    current_level INTEGER;
    eligibility_result JSONB;
BEGIN
    -- Get current level
    SELECT level_number INTO current_level 
    FROM terms 
    WHERE id = p_current_term_id;
    
    -- Get attendance percentage
    SELECT percentage INTO attendance_pct
    FROM attendance_eligibility
    WHERE student_id = p_student_id 
    AND term_id = p_current_term_id
    AND attendance_type = 'overall'
    LIMIT 1;
    
    -- Default attendance if not found
    IF attendance_pct IS NULL THEN
        attendance_pct := 0;
    END IF;
    
    -- Determine eligibility
    eligibility_result := jsonb_build_object(
        'eligible', CASE 
            WHEN attendance_pct >= 75 THEN true 
            ELSE false 
        END,
        'attendance_status', CASE 
            WHEN attendance_pct >= 75 THEN 'Eligible'
            ELSE 'ICT'
        END,
        'current_level', current_level,
        'next_level', current_level + 1,
        'attendance_percentage', attendance_pct
    );
    
    RETURN eligibility_result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate student rank in quadrant
CREATE OR REPLACE FUNCTION calculate_student_quadrant_rank(
    p_student_id UUID,
    p_term_id UUID,
    p_quadrant_id UUID
) RETURNS INTEGER AS $$
DECLARE
    student_score DECIMAL(5,2);
    rank_position INTEGER;
BEGIN
    -- Get student's score for this quadrant (simplified)
    SELECT COALESCE(AVG(s.obtained_score), 0) INTO student_score
    FROM scores s
    JOIN components c ON c.id = s.component_id
    JOIN sub_categories sc ON sc.id = c.sub_category_id
    WHERE s.student_id = p_student_id
    AND s.term_id = p_term_id
    AND sc.quadrant_id = p_quadrant_id;
    
    -- Calculate rank (count students with higher scores)
    SELECT COUNT(*) + 1 INTO rank_position
    FROM (
        SELECT s.student_id, AVG(s.obtained_score) as avg_score
        FROM scores s
        JOIN components c ON c.id = s.component_id
        JOIN sub_categories sc ON sc.id = c.sub_category_id
        WHERE s.term_id = p_term_id
        AND sc.quadrant_id = p_quadrant_id
        GROUP BY s.student_id
        HAVING AVG(s.obtained_score) > student_score
    ) higher_scores;
    
    RETURN rank_position;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample attendance eligibility data
INSERT INTO attendance_eligibility (student_id, term_id, attendance_type, percentage, eligibility_status, threshold_required)
SELECT 
    s.id as student_id,
    s.current_term_id as term_id,
    'overall' as attendance_type,
    75 + (RANDOM() * 20) as percentage, -- Random attendance between 75-95%
    CASE WHEN (75 + (RANDOM() * 20)) >= 75 THEN 'eligible' ELSE 'ict' END as eligibility_status,
    75.00 as threshold_required
FROM students s
WHERE s.current_term_id IS NOT NULL
ON CONFLICT (student_id, term_id, attendance_type, component_id) DO NOTHING;

-- Insert sample level progression data
INSERT INTO student_level_progression (student_id, term_id, level_number, eligibility_status, attendance_percentage)
SELECT 
    s.id as student_id,
    s.current_term_id as term_id,
    0 as level_number, -- Start all students at Level 0
    'eligible' as eligibility_status,
    ae.percentage as attendance_percentage
FROM students s
JOIN attendance_eligibility ae ON ae.student_id = s.id AND ae.term_id = s.current_term_id
WHERE s.current_term_id IS NOT NULL
AND ae.attendance_type = 'overall'
ON CONFLICT (student_id, term_id) DO NOTHING;

-- =====================================================
-- 8. UPDATE COMPONENT MAX SCORES FOR ADMIN FLEXIBILITY
-- =====================================================

-- Ensure SHL components can be changed to 5-point scale
UPDATE components 
SET description = CONCAT(COALESCE(description, ''), ' (Admin can change max_score to 5 for rating scale)')
WHERE category = 'SHL';

-- Ensure Physical fitness components can be changed to 5-point scale  
UPDATE components 
SET description = CONCAT(COALESCE(description, ''), ' (Admin can change max_score to 5 for rating scale)')
WHERE category = 'Physical';

COMMIT;

-- =====================================================
-- 9. SMART BATCH INITIALIZATION
-- =====================================================

-- Initialize existing batches with progression tracking
DO $$
DECLARE
    batch_record RECORD;
    term_record RECORD;
BEGIN
    -- Loop through existing batches
    FOR batch_record IN SELECT id, name FROM batches LOOP
        -- Set up batch progression (assume starting at term 1)
        UPDATE batches
        SET current_term_number = 1,
            max_terms = 4,
            batch_start_date = CURRENT_DATE - INTERVAL '6 months',
            expected_graduation_date = CURRENT_DATE + INTERVAL '18 months',
            batch_status = 'active'
        WHERE id = batch_record.id;

        -- Create batch term progression plan
        FOR term_record IN SELECT id, term_number FROM terms WHERE term_number BETWEEN 1 AND 4 ORDER BY term_number LOOP
            INSERT INTO batch_term_progression (batch_id, term_id, term_number, status, students_enrolled)
            VALUES (
                batch_record.id,
                term_record.id,
                term_record.term_number,
                CASE WHEN term_record.term_number = 1 THEN 'active' ELSE 'upcoming' END,
                (SELECT COUNT(*) FROM students WHERE batch_id = batch_record.id)
            )
            ON CONFLICT (batch_id, term_number) DO UPDATE SET
                term_id = EXCLUDED.term_id,
                status = EXCLUDED.status,
                students_enrolled = EXCLUDED.students_enrolled;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 10. STUDENT TERM PROGRESSION INITIALIZATION
-- =====================================================

-- Initialize student term progressions for existing students
INSERT INTO student_term_progression (student_id, batch_id, term_id, term_number, status, enrollment_date)
SELECT
    s.id as student_id,
    s.batch_id,
    s.current_term_id as term_id,
    COALESCE(t.term_number, 1) as term_number,
    'enrolled' as status,
    CURRENT_DATE - INTERVAL '30 days' as enrollment_date
FROM students s
LEFT JOIN terms t ON t.id = s.current_term_id
WHERE s.batch_id IS NOT NULL
ON CONFLICT (student_id, term_id) DO NOTHING;

-- =====================================================
-- 11. SAMPLE ATTENDANCE DATA
-- =====================================================

-- Insert sample attendance eligibility data for existing students
INSERT INTO attendance_eligibility (student_id, term_id, attendance_type, percentage, eligibility_status, threshold_required)
SELECT
    s.id as student_id,
    s.current_term_id as term_id,
    'overall' as attendance_type,
    75 + (RANDOM() * 20) as percentage, -- Random attendance between 75-95%
    CASE WHEN (75 + (RANDOM() * 20)) >= 75 THEN 'eligible' ELSE 'ict' END as eligibility_status,
    75.00 as threshold_required
FROM students s
WHERE s.current_term_id IS NOT NULL
ON CONFLICT (student_id, term_id, attendance_type, component_id) DO NOTHING;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Verify behavior components were added
SELECT 'Behavior Components Added' as verification, COUNT(*) as count
FROM components c
JOIN sub_categories sc ON sc.id = c.sub_category_id
JOIN quadrants q ON q.id = sc.quadrant_id
WHERE q.name = 'Behavior' AND c.category = 'Behavior';

-- Verify batch progression setup
SELECT 'Batch Progressions Created' as verification,
       COUNT(DISTINCT batch_id) as batches_with_progression,
       COUNT(*) as total_progressions
FROM batch_term_progression;

-- Verify student term progressions
SELECT 'Student Term Progressions' as verification,
       COUNT(*) as student_progressions,
       (SELECT COUNT(*) FROM attendance_eligibility) as attendance_records,
       (SELECT COUNT(*) FROM student_rankings) as ranking_records
FROM student_term_progression;

-- Verify terms have proper structure
SELECT 'Terms Enhanced' as verification,
       COUNT(*) as total_terms,
       COUNT(CASE WHEN term_status = 'active' THEN 1 END) as active_terms,
       COUNT(CASE WHEN term_status = 'upcoming' THEN 1 END) as upcoming_terms,
       COUNT(CASE WHEN term_status = 'completed' THEN 1 END) as completed_terms
FROM terms;

-- Show batch progression summary
SELECT
    b.name as batch_name,
    b.current_term_number,
    b.batch_status,
    COUNT(s.id) as student_count,
    STRING_AGG(DISTINCT t.name, ', ') as current_terms
FROM batches b
LEFT JOIN students s ON s.batch_id = b.id
LEFT JOIN terms t ON t.id = s.current_term_id
GROUP BY b.id, b.name, b.current_term_number, b.batch_status
ORDER BY b.name;
