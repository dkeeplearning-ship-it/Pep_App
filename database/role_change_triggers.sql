-- Role Change Automation Triggers for PEP Score Nexus
-- This file contains database triggers that automatically handle role-specific table entries

-- Function to handle role changes at database level
CREATE OR REPLACE FUNCTION handle_user_role_change()
RETURNS TRIGGER AS $$
DECLARE
    current_term_id UUID;
BEGIN
    -- Only proceed if role has actually changed
    IF OLD.role = NEW.role THEN
        RETURN NEW;
    END IF;

    -- Log the role change
    RAISE NOTICE 'User % role changed from % to %', NEW.id, OLD.role, NEW.role;

    -- Get current term for student assignments
    SELECT id INTO current_term_id 
    FROM terms 
    WHERE is_current = true 
    LIMIT 1;

    -- Handle new role requirements
    IF NEW.role = 'student' THEN
        -- Ensure student record exists
        INSERT INTO students (
            user_id,
            registration_no,
            name,
            course,
            status,
            current_term_id
        ) VALUES (
            NEW.id,
            'REG-' || EXTRACT(EPOCH FROM NOW())::bigint,
            COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.username),
            'PGDM',
            'Active',
            current_term_id
        )
        ON CONFLICT (user_id) DO UPDATE SET
            name = COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.username),
            status = 'Active',
            current_term_id = COALESCE(current_term_id, students.current_term_id),
            updated_at = CURRENT_TIMESTAMP;

        RAISE NOTICE 'Student record ensured for user %', NEW.id;

    ELSIF NEW.role = 'teacher' THEN
        -- Ensure teacher record exists
        INSERT INTO teachers (
            user_id,
            employee_id,
            name,
            is_active
        ) VALUES (
            NEW.id,
            'EMP-' || EXTRACT(EPOCH FROM NOW())::bigint,
            COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.username),
            true
        )
        ON CONFLICT (user_id) DO UPDATE SET
            name = COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.username),
            is_active = true,
            updated_at = CURRENT_TIMESTAMP;

        RAISE NOTICE 'Teacher record ensured for user %', NEW.id;
    END IF;

    -- Handle old role cleanup
    IF OLD.role = 'teacher' AND NEW.role != 'teacher' THEN
        -- Deactivate teacher record instead of deleting (preserve history)
        UPDATE teachers 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = NEW.id;

        RAISE NOTICE 'Teacher record deactivated for user %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user role changes
DROP TRIGGER IF EXISTS trigger_user_role_change ON users;
CREATE TRIGGER trigger_user_role_change
    AFTER UPDATE OF role ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_role_change();

-- Function to automatically set current term for new students
CREATE OR REPLACE FUNCTION set_current_term_for_student()
RETURNS TRIGGER AS $$
DECLARE
    current_term_id UUID;
BEGIN
    -- Only set current_term_id if it's not already set
    IF NEW.current_term_id IS NULL THEN
        SELECT id INTO current_term_id 
        FROM terms 
        WHERE is_current = true 
        LIMIT 1;
        
        IF current_term_id IS NOT NULL THEN
            NEW.current_term_id = current_term_id;
            RAISE NOTICE 'Set current term % for new student %', current_term_id, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new student records
DROP TRIGGER IF EXISTS trigger_set_current_term_for_student ON students;
CREATE TRIGGER trigger_set_current_term_for_student
    BEFORE INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION set_current_term_for_student();

-- Function to log role changes in admin_actions table
CREATE OR REPLACE FUNCTION log_role_change_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if role has actually changed
    IF OLD.role != NEW.role THEN
        INSERT INTO admin_actions (
            admin_id,
            action_type,
            target_user_id,
            action_details,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            COALESCE(NEW.promoted_by, NEW.id), -- Use promoted_by if available, otherwise the user themselves
            'role_change',
            NEW.id,
            jsonb_build_object(
                'oldValue', jsonb_build_object('role', OLD.role),
                'newValue', jsonb_build_object('role', NEW.role),
                'reason', COALESCE(NEW.promotion_reason, 'Database trigger'),
                'automated', true
            ),
            '127.0.0.1', -- Default IP for database triggers
            'Database Trigger',
            CURRENT_TIMESTAMP
        );

        RAISE NOTICE 'Logged role change action for user % (% -> %)', NEW.id, OLD.role, NEW.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging role changes
DROP TRIGGER IF EXISTS trigger_log_role_change_action ON users;
CREATE TRIGGER trigger_log_role_change_action
    AFTER UPDATE OF role ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_role_change_action();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);

-- Comments for documentation
COMMENT ON FUNCTION handle_user_role_change() IS 'Automatically handles role-specific table entries when user roles are changed';
COMMENT ON FUNCTION set_current_term_for_student() IS 'Automatically sets current term for new student records';
COMMENT ON FUNCTION log_role_change_action() IS 'Automatically logs role changes in admin_actions table';

COMMENT ON TRIGGER trigger_user_role_change ON users IS 'Triggers role-specific table management when user role changes';
COMMENT ON TRIGGER trigger_set_current_term_for_student ON students IS 'Sets current term for new student records';
COMMENT ON TRIGGER trigger_log_role_change_action ON users IS 'Logs role changes in admin_actions table';
