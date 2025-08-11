-- Migration: Add Direct Assessment Support
-- Date: 2025-01-02
-- Description: Add support for direct assessment tasks that don't require student submissions

-- 1. Add 'Direct_Assessment' to submission_type enum
ALTER TYPE submission_type ADD VALUE 'Direct_Assessment';

-- 2. Add requires_submission field to tasks table
ALTER TABLE tasks ADD COLUMN requires_submission BOOLEAN DEFAULT true;

-- 3. Create direct_assessments table
CREATE TABLE direct_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    private_notes TEXT,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_direct_assessment UNIQUE (task_id, student_id),
    CONSTRAINT chk_direct_assessment_score CHECK (score >= 0)
);

-- 4. Create indexes for direct_assessments table
CREATE INDEX idx_direct_assessments_task ON direct_assessments(task_id);
CREATE INDEX idx_direct_assessments_student ON direct_assessments(student_id);
CREATE INDEX idx_direct_assessments_assessed_by ON direct_assessments(assessed_by);

-- 5. Update existing tasks to set requires_submission based on submission_type
UPDATE tasks 
SET requires_submission = CASE 
    WHEN submission_type = 'Direct_Assessment' THEN false 
    ELSE true 
END;

-- 6. Add comment to document the new functionality
COMMENT ON TABLE direct_assessments IS 'Stores direct assessment scores for tasks that do not require student submissions (e.g., physical tests, oral exams, observations)';
COMMENT ON COLUMN tasks.requires_submission IS 'Indicates whether the task requires student submissions (false for direct assessment tasks)';
COMMENT ON COLUMN tasks.submission_type IS 'Type of submission or assessment method. Direct_Assessment indicates no submission required.';
