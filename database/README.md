# PEP Score Nexus Database Setup

## 🚀 Quick Start

### 1. Fresh Database Installation

```bash
# Create a new PostgreSQL database
createdb pep_score_nexus

# Run the complete setup script
psql -U your_username -d pep_score_nexus -f database_setup.sql

# Verify the installation
psql -U your_username -d pep_score_nexus -f verify_setup.sql
```

### 2. Migration from Older Version

If you have an existing database, run the migration script:

```bash
# Run the migration script
psql -U your_username -d pep_score_nexus -f migrations/add_task_microcompetencies.sql
```

## 📊 Database Schema Overview

### Core Tables

- **users**: System users (students, teachers, admins)
- **students**: Student-specific information
- **teachers**: Teacher-specific information
- **quadrants**: Main assessment areas (Persona, Wellness, Behavior, Discipline)
- **sub_categories**: Sub-divisions within quadrants
- **components**: Assessment components within sub-categories
- **microcompetencies**: Granular competencies within components

### Intervention System

- **interventions**: Training programs/courses
- **intervention_enrollments**: Student enrollments in interventions
- **teacher_microcompetency_assignments**: Teacher assignments to specific microcompetencies

### Microcompetency-Centric Task System

- **tasks**: Assessment tasks created by teachers
- **task_microcompetencies**: Mapping of tasks to microcompetencies with weightages
- **task_submissions**: Student submissions for tasks
- **microcompetency_scores**: Individual microcompetency scores (auto-updated)

## 🎯 Key Features

### ✅ Microcompetency-Centric Tasks

- Tasks are created for specific microcompetencies, not broad interventions
- Teachers can only create tasks for their assigned microcompetencies
- Weightage distribution allows tasks to target multiple microcompetencies

### ✅ Automatic Score Updates

- Grading tasks automatically updates microcompetency scores
- Weighted calculations based on task weightages
- Cumulative scoring allows multiple tasks per microcompetency

### ✅ Permission-Based Access

- Teachers need `can_create_tasks` permission to create tasks
- Teachers need `can_score` permission to grade submissions
- Fine-grained control over teacher capabilities

## 🔧 Database Functions

### Score Calculation

```sql
-- Calculate microcompetency score from task score
SELECT calculate_microcompetency_score_from_task(
    task_score := 18.5,
    task_max_score := 20.0,
    microcompetency_weightage := 60.0,
    microcompetency_max_score := 10.0
);
-- Returns: 5.55
```

### Validation

```sql
-- Validate task weightages total 100%
SELECT validate_task_weightages('task-uuid-here');
-- Returns: true/false
```

### Grade Calculation

```sql
-- Calculate letter grade from percentage
SELECT calculate_grade(85.5);
-- Returns: 'A'
```

## 📈 Helpful Views

### Task Summary

```sql
-- View tasks with their microcompetencies
SELECT * FROM task_microcompetency_summary 
WHERE intervention_name = 'Sripathi Intervention';
```

### Teacher Permissions

```sql
-- Check teacher task permissions
SELECT * FROM teacher_task_permissions 
WHERE teacher_name = 'John Doe';
```

### Student Progress

```sql
-- Monitor student microcompetency progress
SELECT * FROM student_microcompetency_progress 
WHERE student_name = 'Jane Smith' 
  AND intervention_name = 'Sripathi Intervention';
```

## 🔍 Common Queries

### Create a Task with Microcompetencies

```sql
-- 1. Insert the task
INSERT INTO tasks (intervention_id, name, description, max_score, due_date, created_by_teacher_id)
VALUES ('intervention-uuid', 'Essay Task', 'Write an essay', 20.0, '2024-02-20 23:59:59', 'teacher-uuid');

-- 2. Add microcompetency mappings
INSERT INTO task_microcompetencies (task_id, microcompetency_id, weightage)
VALUES 
    ('task-uuid', 'microcompetency-1-uuid', 60.0),
    ('task-uuid', 'microcompetency-2-uuid', 40.0);
```

### Grade a Submission

```sql
-- Update submission
UPDATE task_submissions 
SET score = 18.5, feedback = 'Excellent work!', status = 'Graded'
WHERE id = 'submission-uuid';

-- This will trigger automatic microcompetency score updates via the application
```

### Check Teacher Assignments

```sql
-- Get teacher's assigned microcompetencies for an intervention
SELECT 
    m.name as microcompetency_name,
    tma.can_create_tasks,
    tma.can_score
FROM teacher_microcompetency_assignments tma
JOIN microcompetencies m ON tma.microcompetency_id = m.id
WHERE tma.teacher_id = 'teacher-uuid' 
  AND tma.intervention_id = 'intervention-uuid'
  AND tma.is_active = true;
```

## 🚨 Important Notes

### Data Integrity

- All weightages in `task_microcompetencies` must total exactly 100% per task
- Teachers can only create tasks for microcompetencies they're assigned to
- Microcompetency scores are automatically calculated and should not be manually edited

### Performance

- The database includes optimized indexes for common queries
- Views are provided for complex reporting needs
- Use the provided functions for calculations to ensure consistency

### Backup Strategy

```bash
# Regular backup
pg_dump -U your_username pep_score_nexus > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U your_username -d pep_score_nexus < backup_file.sql
```

## 🔄 Migration Path

### From Legacy System

1. Run `database_setup.sql` for fresh installation
2. Import existing user/student/teacher data
3. Set up interventions and microcompetency assignments
4. Begin using the new task system

### Version Updates

1. Always backup before migration
2. Run migration scripts in order
3. Verify with `verify_setup.sql`
4. Test functionality before going live

## 📞 Support

For database-related issues:

1. Check the verification script output
2. Review the function and view definitions
3. Ensure all constraints are satisfied
4. Verify teacher permissions are correctly set

## 🎉 Success Indicators

After setup, you should see:

- ✅ All tables created successfully
- ✅ Views and functions working
- ✅ Default data populated
- ✅ Indexes created for performance
- ✅ Constraints enforcing data integrity

The system is ready when teachers can create tasks for their assigned microcompetencies and grading automatically updates student scores!
