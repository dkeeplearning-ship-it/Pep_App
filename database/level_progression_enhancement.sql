-- Enhance existing term system to support Level 0-3 progression
-- This maintains backward compatibility while adding level functionality

-- Add level-related columns to existing terms table
ALTER TABLE terms 
ADD COLUMN IF NOT EXISTS level_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS attendance_threshold DECIMAL(5,2) DEFAULT 75.00,
ADD COLUMN IF NOT EXISTS progression_requirements JSONB,
ADD COLUMN IF NOT EXISTS eligibility_rules JSONB;

-- Create level progression tracking table
CREATE TABLE IF NOT EXISTS student_level_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, failed, ict
    progression_date TIMESTAMP,
    eligibility_status VARCHAR(20) DEFAULT 'pending', -- eligible, ict, not_cleared, conditional
    attendance_percentage DECIMAL(5,2),
    quadrant_clearance JSONB, -- Track which quadrants are cleared
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, term_id)
);

-- Create attendance eligibility tracking
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
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update existing terms to include level information
UPDATE terms SET 
    level_number = 0,
    level_name = 'Level 0',
    attendance_threshold = 75.00,
    progression_requirements = '{"persona_threshold": 40, "wellness_threshold": 40, "behavior_threshold": 3, "discipline_threshold": 3}',
    eligibility_rules = '{"attendance_required": 75, "quadrant_clearance_required": ["Persona", "Wellness"], "behavior_rating_min": 3}'
WHERE name LIKE '%Level 0%' OR name LIKE '%Term 1%';

UPDATE terms SET 
    level_number = 1,
    level_name = 'Level 1',
    attendance_threshold = 80.00,
    progression_requirements = '{"persona_threshold": 45, "wellness_threshold": 45, "behavior_threshold": 3.5, "discipline_threshold": 3.5}',
    eligibility_rules = '{"attendance_required": 80, "quadrant_clearance_required": ["Persona", "Wellness", "Behavior"], "behavior_rating_min": 3.5}'
WHERE name LIKE '%Level 1%' OR name LIKE '%Term 2%';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_level_progression_student_term ON student_level_progression(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_attendance_eligibility_student_term ON attendance_eligibility(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_terms_level_number ON terms(level_number);

-- Create function to check level progression eligibility
CREATE OR REPLACE FUNCTION check_level_progression_eligibility(
    p_student_id UUID,
    p_current_term_id UUID
) RETURNS JSONB AS $$
DECLARE
    attendance_pct DECIMAL(5,2);
    quadrant_scores JSONB;
    eligibility_result JSONB;
    current_level INTEGER;
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
    
    -- Get quadrant scores (simplified - would need actual score calculation)
    SELECT jsonb_build_object(
        'persona', 50,
        'wellness', 45,
        'behavior', 3.5,
        'discipline', 3.5
    ) INTO quadrant_scores;
    
    -- Determine eligibility
    eligibility_result := jsonb_build_object(
        'eligible', CASE 
            WHEN attendance_pct >= 75 AND 
                 (quadrant_scores->>'persona')::DECIMAL >= 40 AND
                 (quadrant_scores->>'wellness')::DECIMAL >= 40
            THEN true 
            ELSE false 
        END,
        'attendance_status', CASE 
            WHEN attendance_pct >= 75 THEN 'Eligible'
            ELSE 'ICT'
        END,
        'quadrant_status', quadrant_scores,
        'next_level', current_level + 1
    );
    
    RETURN eligibility_result;
END;
$$ LANGUAGE plpgsql;
