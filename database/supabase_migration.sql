-- Supabase Migration: Add task_microcompetencies table
-- Run this in Supabase SQL Editor

-- Step 1: Create task_microcompetencies table
CREATE TABLE IF NOT EXISTS task_microcompetencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    weightage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_weightage CHECK (weightage > 0 AND weightage <= 100),
    UNIQUE(task_id, microcompetency_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_microcompetencies_task ON task_microcompetencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_microcompetencies_microcompetency ON task_microcompetencies(microcompetency_id);

-- Step 3: Make quadrant_id and component_id nullable in tasks table (for backward compatibility)
ALTER TABLE tasks ALTER COLUMN quadrant_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN component_id DROP NOT NULL;

-- Step 4: Add created_by_teacher_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_teacher_id UUID REFERENCES teachers(id);

-- Step 5: Update existing tasks to link to teachers (if any exist)
UPDATE tasks 
SET created_by_teacher_id = (
    SELECT t.id 
    FROM teachers t 
    WHERE t.user_id = tasks.created_by
)
WHERE created_by_teacher_id IS NULL AND created_by IS NOT NULL;

-- Step 6: Create helpful views
CREATE OR REPLACE VIEW task_microcompetency_summary AS
SELECT 
    t.id as task_id,
    t.name as task_name,
    t.max_score,
    t.due_date,
    t.status,
    i.name as intervention_name,
    COUNT(tm.microcompetency_id) as microcompetency_count,
    COALESCE(SUM(tm.weightage), 0) as total_weightage,
    ARRAY_AGG(m.name ORDER BY tm.weightage DESC) FILTER (WHERE m.name IS NOT NULL) as microcompetency_names,
    ARRAY_AGG(tm.weightage ORDER BY tm.weightage DESC) FILTER (WHERE tm.weightage IS NOT NULL) as weightages
FROM tasks t
JOIN interventions i ON t.intervention_id = i.id
LEFT JOIN task_microcompetencies tm ON t.id = tm.task_id
LEFT JOIN microcompetencies m ON tm.microcompetency_id = m.id
GROUP BY t.id, t.name, t.max_score, t.due_date, t.status, i.name;

-- Step 7: Create view for teacher task permissions
CREATE OR REPLACE VIEW teacher_task_permissions AS
SELECT DISTINCT
    t.id as teacher_id,
    i.id as intervention_id,
    i.name as intervention_name,
    COUNT(tma.microcompetency_id) as assigned_microcompetencies,
    COUNT(CASE WHEN tma.can_create_tasks THEN 1 END) as can_create_tasks_count,
    COUNT(CASE WHEN tma.can_score THEN 1 END) as can_score_count
FROM teachers t
JOIN teacher_microcompetency_assignments tma ON t.id = tma.teacher_id
JOIN interventions i ON tma.intervention_id = i.id
WHERE tma.is_active = true
GROUP BY t.id, i.id, i.name;

-- Step 8: Create function for score calculations
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

-- Step 9: Enable Row Level Security (RLS) for the new table
ALTER TABLE task_microcompetencies ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for task_microcompetencies
-- Teachers can view task_microcompetencies for tasks they created
CREATE POLICY "Teachers can view their task microcompetencies" ON task_microcompetencies
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE created_by_teacher_id IN (
                SELECT id FROM teachers WHERE user_id = auth.uid()
            )
        )
    );

-- Teachers can insert task_microcompetencies for tasks they create
CREATE POLICY "Teachers can insert task microcompetencies" ON task_microcompetencies
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE created_by_teacher_id IN (
                SELECT id FROM teachers WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can do everything
CREATE POLICY "Admins can manage all task microcompetencies" ON task_microcompetencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 11: Create microcompetency_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS microcompetency_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    obtained_score DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(8,2) NOT NULL DEFAULT 10.00,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN max_score > 0 THEN (obtained_score / max_score) * 100 
            ELSE 0 
        END
    ) STORED,
    scored_at TIMESTAMPTZ DEFAULT NOW(),
    scored_by UUID REFERENCES teachers(id),
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_obtained_score CHECK (obtained_score >= 0),
    CONSTRAINT chk_max_score CHECK (max_score > 0),
    UNIQUE(student_id, microcompetency_id, intervention_id)
);

-- Add indexes for microcompetency_scores
CREATE INDEX IF NOT EXISTS idx_microcompetency_scores_student ON microcompetency_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_microcompetency_scores_microcompetency ON microcompetency_scores(microcompetency_id);
CREATE INDEX IF NOT EXISTS idx_microcompetency_scores_intervention ON microcompetency_scores(intervention_id);

-- Enable RLS for microcompetency_scores
ALTER TABLE microcompetency_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for microcompetency_scores
CREATE POLICY "Students can view their own scores" ON microcompetency_scores
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM students WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage scores for their microcompetencies" ON microcompetency_scores
    FOR ALL USING (
        microcompetency_id IN (
            SELECT microcompetency_id FROM teacher_microcompetency_assignments
            WHERE teacher_id IN (
                SELECT id FROM teachers WHERE user_id = auth.uid()
            ) AND is_active = true
        )
    );

CREATE POLICY "Admins can manage all scores" ON microcompetency_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT 'task_microcompetencies table created' as status, COUNT(*) as count FROM task_microcompetencies;
SELECT 'microcompetency_scores table ready' as status, COUNT(*) as count FROM microcompetency_scores;
