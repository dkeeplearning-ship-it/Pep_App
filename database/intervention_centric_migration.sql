-- PEP Score Nexus - Intervention-Centric Migration Script
-- Run this in Supabase SQL Editor to update the database schema

-- ==========================================
-- PHASE 1: CREATE NEW TABLES FOR INTERVENTION-CENTRIC SYSTEM
-- ==========================================

-- 1. Microcompetencies Table
-- Each competency is divided into microcompetencies with specific weightages
CREATE TABLE IF NOT EXISTS microcompetencies (
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

-- 2. Intervention Microcompetencies Mapping
-- Links interventions to specific microcompetencies with their weightages
CREATE TABLE IF NOT EXISTS intervention_microcompetencies (
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

-- 3. Teacher Microcompetency Assignments
-- Assigns teachers to specific microcompetencies within interventions
CREATE TABLE IF NOT EXISTS teacher_microcompetency_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    can_score BOOLEAN DEFAULT true,
    can_create_tasks BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT uk_teacher_micro_assignment UNIQUE (intervention_id, teacher_id, microcompetency_id)
);

CREATE INDEX idx_teacher_micro_assignments_intervention ON teacher_microcompetency_assignments(intervention_id);
CREATE INDEX idx_teacher_micro_assignments_teacher ON teacher_microcompetency_assignments(teacher_id);
CREATE INDEX idx_teacher_micro_assignments_microcompetency ON teacher_microcompetency_assignments(microcompetency_id);

-- 4. Microcompetency Scores (Primary scoring table)
-- Stores scores for students on specific microcompetencies within interventions
CREATE TABLE IF NOT EXISTS microcompetency_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    obtained_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((obtained_score / max_score) * 100) STORED,
    scored_by UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    status score_status DEFAULT 'Submitted',
    
    CONSTRAINT uk_student_intervention_microcompetency UNIQUE (student_id, intervention_id, microcompetency_id),
    CONSTRAINT chk_microcompetency_score_range CHECK (obtained_score >= 0 AND obtained_score <= max_score)
);

CREATE INDEX idx_microcompetency_scores_student ON microcompetency_scores(student_id);
CREATE INDEX idx_microcompetency_scores_intervention ON microcompetency_scores(intervention_id);
CREATE INDEX idx_microcompetency_scores_microcompetency ON microcompetency_scores(microcompetency_id);
CREATE INDEX idx_microcompetency_scores_teacher ON microcompetency_scores(scored_by);

-- ==========================================
-- PHASE 2: UPDATE EXISTING TABLES
-- ==========================================

-- Update interventions table to support intervention-centric workflow
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id) ON DELETE SET NULL;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS scoring_deadline TIMESTAMP;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS total_weightage DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS is_scoring_open BOOLEAN DEFAULT false;

-- Update tasks table to link to microcompetencies instead of components
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS microcompetency_id UUID REFERENCES microcompetencies(id) ON DELETE CASCADE;

-- Add intervention enrollment deadline
ALTER TABLE intervention_enrollments ADD COLUMN IF NOT EXISTS enrollment_deadline TIMESTAMP;

-- ==========================================
-- PHASE 3: CREATE CALCULATED SCORE VIEWS
-- ==========================================

-- View: Student Competency Scores (aggregated from microcompetency scores)
CREATE OR REPLACE VIEW student_competency_scores AS
SELECT 
    ms.student_id,
    ms.intervention_id,
    c.id as competency_id,
    c.name as competency_name,
    sc.quadrant_id,
    SUM(ms.obtained_score * im.weightage / 100) as obtained_score,
    SUM(ms.max_score * im.weightage / 100) as max_score,
    CASE 
        WHEN SUM(ms.max_score * im.weightage / 100) > 0 
        THEN (SUM(ms.obtained_score * im.weightage / 100) / SUM(ms.max_score * im.weightage / 100)) * 100
        ELSE 0 
    END as percentage,
    COUNT(ms.id) as microcompetencies_scored,
    COUNT(im.id) as total_microcompetencies
FROM microcompetency_scores ms
JOIN intervention_microcompetencies im ON ms.microcompetency_id = im.microcompetency_id 
    AND ms.intervention_id = im.intervention_id
JOIN microcompetencies mc ON ms.microcompetency_id = mc.id
JOIN components c ON mc.component_id = c.id
JOIN sub_categories sc ON c.sub_category_id = sc.id
GROUP BY ms.student_id, ms.intervention_id, c.id, c.name, sc.quadrant_id;

-- View: Student Quadrant Scores (aggregated from competency scores)
CREATE OR REPLACE VIEW student_quadrant_scores AS
SELECT 
    scs.student_id,
    scs.intervention_id,
    q.id as quadrant_id,
    q.name as quadrant_name,
    q.weightage as quadrant_weightage,
    SUM(scs.obtained_score) as obtained_score,
    SUM(scs.max_score) as max_score,
    CASE 
        WHEN SUM(scs.max_score) > 0 
        THEN (SUM(scs.obtained_score) / SUM(scs.max_score)) * 100
        ELSE 0 
    END as percentage,
    COUNT(DISTINCT scs.competency_id) as competencies_scored
FROM student_competency_scores scs
JOIN quadrants q ON scs.quadrant_id = q.id
GROUP BY scs.student_id, scs.intervention_id, q.id, q.name, q.weightage;

-- View: Student Intervention Total Scores
CREATE OR REPLACE VIEW student_intervention_scores AS
SELECT 
    sqs.student_id,
    sqs.intervention_id,
    SUM(sqs.obtained_score * sqs.quadrant_weightage / 100) as total_obtained_score,
    SUM(sqs.max_score * sqs.quadrant_weightage / 100) as total_max_score,
    CASE 
        WHEN SUM(sqs.max_score * sqs.quadrant_weightage / 100) > 0 
        THEN (SUM(sqs.obtained_score * sqs.quadrant_weightage / 100) / SUM(sqs.max_score * sqs.quadrant_weightage / 100)) * 100
        ELSE 0 
    END as total_percentage,
    COUNT(DISTINCT sqs.quadrant_id) as quadrants_scored
FROM student_quadrant_scores sqs
GROUP BY sqs.student_id, sqs.intervention_id;

-- ==========================================
-- PHASE 4: CREATE HELPER FUNCTIONS
-- ==========================================

-- Function to calculate grade from percentage
CREATE OR REPLACE FUNCTION calculate_grade_from_percentage(percentage DECIMAL)
RETURNS grade_type AS $$
BEGIN
    CASE
        WHEN percentage >= 90 THEN RETURN 'A+';
        WHEN percentage >= 80 THEN RETURN 'A';
        WHEN percentage >= 70 THEN RETURN 'B';
        WHEN percentage >= 60 THEN RETURN 'C';
        WHEN percentage >= 50 THEN RETURN 'D';
        WHEN percentage >= 40 THEN RETURN 'E';
        ELSE RETURN 'IC';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate student scores after microcompetency score update
CREATE OR REPLACE FUNCTION recalculate_student_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called after microcompetency scores are inserted/updated
    -- It can trigger recalculation of aggregated scores if needed
    
    -- For now, we rely on the views for real-time calculation
    -- In the future, we might want to cache calculated scores for performance
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for score recalculation
DROP TRIGGER IF EXISTS trigger_recalculate_scores ON microcompetency_scores;
CREATE TRIGGER trigger_recalculate_scores
    AFTER INSERT OR UPDATE OR DELETE ON microcompetency_scores
    FOR EACH ROW EXECUTE FUNCTION recalculate_student_scores();

-- ==========================================
-- PHASE 5: ADD UPDATED_AT TRIGGERS
-- ==========================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_microcompetencies_updated_at 
    BEFORE UPDATE ON microcompetencies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PHASE 6: INSERT SAMPLE MICROCOMPETENCIES
-- ==========================================

-- First, let's get the component IDs (you may need to adjust these based on your actual data)
DO $$
DECLARE
    persona_shl_comp_id UUID;
    persona_prof_comp_id UUID;
    wellness_physical_comp_id UUID;
    wellness_mental_comp_id UUID;
    behavior_conduct_comp_id UUID;
    discipline_attendance_comp_id UUID;
BEGIN
    -- Get component IDs (adjust these queries based on your actual component names)
    SELECT id INTO persona_shl_comp_id FROM components WHERE name ILIKE '%critical%thinking%' OR name ILIKE '%analysis%' LIMIT 1;
    SELECT id INTO persona_prof_comp_id FROM components WHERE name ILIKE '%professional%' OR name ILIKE '%communication%' LIMIT 1;
    SELECT id INTO wellness_physical_comp_id FROM components WHERE name ILIKE '%physical%' OR name ILIKE '%fitness%' LIMIT 1;
    SELECT id INTO wellness_mental_comp_id FROM components WHERE name ILIKE '%mental%' OR name ILIKE '%stress%' LIMIT 1;
    SELECT id INTO behavior_conduct_comp_id FROM components WHERE name ILIKE '%conduct%' OR name ILIKE '%behavior%' LIMIT 1;
    SELECT id INTO discipline_attendance_comp_id FROM components WHERE name ILIKE '%attendance%' OR name ILIKE '%discipline%' LIMIT 1;

    -- Insert sample microcompetencies for Persona - SHL Components
    IF persona_shl_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (persona_shl_comp_id, 'Problem Analysis', 'Ability to break down complex problems', 25.0, 10.0, 1),
        (persona_shl_comp_id, 'Critical Evaluation', 'Evaluating information critically', 25.0, 10.0, 2),
        (persona_shl_comp_id, 'Solution Development', 'Developing innovative solutions', 30.0, 10.0, 3),
        (persona_shl_comp_id, 'Decision Making', 'Making informed decisions', 20.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert sample microcompetencies for Persona - Professional Components
    IF persona_prof_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (persona_prof_comp_id, 'Verbal Communication', 'Effective verbal communication skills', 30.0, 10.0, 1),
        (persona_prof_comp_id, 'Written Communication', 'Clear and concise writing', 25.0, 10.0, 2),
        (persona_prof_comp_id, 'Presentation Skills', 'Delivering effective presentations', 25.0, 10.0, 3),
        (persona_prof_comp_id, 'Professional Etiquette', 'Workplace behavior and etiquette', 20.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert sample microcompetencies for Wellness - Physical
    IF wellness_physical_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (wellness_physical_comp_id, 'Cardiovascular Endurance', 'Heart and lung fitness', 30.0, 10.0, 1),
        (wellness_physical_comp_id, 'Muscular Strength', 'Overall muscle strength', 25.0, 10.0, 2),
        (wellness_physical_comp_id, 'Flexibility', 'Range of motion and flexibility', 25.0, 10.0, 3),
        (wellness_physical_comp_id, 'Body Composition', 'Healthy body composition', 20.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert sample microcompetencies for Wellness - Mental
    IF wellness_mental_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (wellness_mental_comp_id, 'Stress Management', 'Managing stress effectively', 35.0, 10.0, 1),
        (wellness_mental_comp_id, 'Emotional Intelligence', 'Understanding and managing emotions', 30.0, 10.0, 2),
        (wellness_mental_comp_id, 'Mindfulness', 'Present moment awareness', 20.0, 10.0, 3),
        (wellness_mental_comp_id, 'Work-Life Balance', 'Maintaining healthy balance', 15.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert sample microcompetencies for Behavior
    IF behavior_conduct_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (behavior_conduct_comp_id, 'Punctuality', 'Being on time consistently', 25.0, 10.0, 1),
        (behavior_conduct_comp_id, 'Responsibility', 'Taking ownership of actions', 25.0, 10.0, 2),
        (behavior_conduct_comp_id, 'Team Collaboration', 'Working effectively in teams', 30.0, 10.0, 3),
        (behavior_conduct_comp_id, 'Initiative', 'Taking proactive action', 20.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert sample microcompetencies for Discipline
    IF discipline_attendance_comp_id IS NOT NULL THEN
        INSERT INTO microcompetencies (component_id, name, description, weightage, max_score, display_order) VALUES
        (discipline_attendance_comp_id, 'Class Attendance', 'Regular class attendance', 40.0, 10.0, 1),
        (discipline_attendance_comp_id, 'Assignment Submission', 'Timely assignment submission', 30.0, 10.0, 2),
        (discipline_attendance_comp_id, 'Code Compliance', 'Following institutional code', 20.0, 10.0, 3),
        (discipline_attendance_comp_id, 'Academic Integrity', 'Maintaining academic honesty', 10.0, 10.0, 4)
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if tables were created successfully
SELECT 'microcompetencies' as table_name, COUNT(*) as record_count FROM microcompetencies
UNION ALL
SELECT 'intervention_microcompetencies' as table_name, COUNT(*) as record_count FROM intervention_microcompetencies
UNION ALL
SELECT 'teacher_microcompetency_assignments' as table_name, COUNT(*) as record_count FROM teacher_microcompetency_assignments
UNION ALL
SELECT 'microcompetency_scores' as table_name, COUNT(*) as record_count FROM microcompetency_scores;

-- Show sample microcompetencies created
SELECT 
    c.name as component_name,
    mc.name as microcompetency_name,
    mc.weightage,
    mc.max_score
FROM microcompetencies mc
JOIN components c ON mc.component_id = c.id
ORDER BY c.name, mc.display_order;

SELECT 'Migration completed successfully! New intervention-centric tables created.' as status;
