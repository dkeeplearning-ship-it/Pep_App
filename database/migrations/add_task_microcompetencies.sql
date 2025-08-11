-- Migration: Add task_microcompetencies table and update tasks table
-- Date: 2024-01-15
-- Description: Implement microcompetency-centric task system

-- Step 1: Create task_microcompetencies table
CREATE TABLE IF NOT EXISTS task_microcompetencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id) ON DELETE CASCADE,
    weightage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_weightage CHECK (weightage > 0 AND weightage <= 100),
    UNIQUE(task_id, microcompetency_id)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_microcompetencies_task ON task_microcompetencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_microcompetencies_microcompetency ON task_microcompetencies(microcompetency_id);

-- Step 3: Remove quadrant_id and component_id columns from tasks table (if they exist)
-- Note: We'll keep them for now to maintain backward compatibility, but they're no longer required

-- Step 4: Update tasks table to make quadrant_id and component_id nullable (for backward compatibility)
ALTER TABLE tasks ALTER COLUMN quadrant_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN component_id DROP NOT NULL;

-- Step 5: Add created_by reference to teachers table instead of users (for better tracking)
-- First, let's add a new column for teacher_id
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_teacher_id UUID REFERENCES teachers(id);

-- Step 6: Update existing tasks to link to teachers (if any exist)
-- This is a data migration - you may need to adjust based on your existing data
UPDATE tasks 
SET created_by_teacher_id = (
    SELECT t.id 
    FROM teachers t 
    WHERE t.user_id = tasks.created_by
)
WHERE created_by_teacher_id IS NULL AND created_by IS NOT NULL;

-- Step 7: Create sample task_microcompetencies entries for existing tasks (if any)
-- This is optional - only if you have existing tasks that need to be migrated
-- INSERT INTO task_microcompetencies (task_id, microcompetency_id, weightage)
-- SELECT t.id, m.id, 100.00
-- FROM tasks t
-- CROSS JOIN microcompetencies m
-- WHERE t.component_id = m.component_id
-- AND NOT EXISTS (
--     SELECT 1 FROM task_microcompetencies tm 
--     WHERE tm.task_id = t.id AND tm.microcompetency_id = m.id
-- );

-- Step 8: Add helpful views for reporting
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
    ARRAY_AGG(tm.weightage ORDER BY tm.weightage DESC) as weightages
FROM tasks t
JOIN interventions i ON t.intervention_id = i.id
LEFT JOIN task_microcompetencies tm ON t.id = tm.task_id
LEFT JOIN microcompetencies m ON tm.microcompetency_id = m.id
GROUP BY t.id, t.name, t.max_score, t.due_date, t.status, i.name;

-- Step 9: Create view for teacher task permissions
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

-- Step 10: Add helpful functions for score calculations
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

-- Verification queries (run these to check the migration)
-- SELECT 'task_microcompetencies table created' as status, COUNT(*) as count FROM task_microcompetencies;
-- SELECT 'Tasks with microcompetencies' as status, COUNT(DISTINCT task_id) as count FROM task_microcompetencies;
-- SELECT * FROM task_microcompetency_summary LIMIT 5;
-- SELECT * FROM teacher_task_permissions LIMIT 5;

-- Migration completed successfully
SELECT 'Task microcompetencies migration completed successfully!' as status;
