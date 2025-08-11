-- Row Level Security (RLS) Policies for PEP Score Nexus
-- This file contains database-level security policies

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION auth.user_role() 
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin() 
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user's student record
CREATE OR REPLACE FUNCTION auth.current_student_id() 
RETURNS UUID AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user's teacher record
CREATE OR REPLACE FUNCTION auth.current_teacher_id() 
RETURNS UUID AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ===============================
-- USERS TABLE POLICIES
-- ===============================

-- Admins can see all users
CREATE POLICY "admin_users_all" ON users
  FOR ALL USING (auth.is_admin());

-- Users can see their own record
CREATE POLICY "users_own_record" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own record (limited fields)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- ===============================
-- STUDENTS TABLE POLICIES
-- ===============================

-- Admins can see all students
CREATE POLICY "admin_students_all" ON students
  FOR ALL USING (auth.is_admin());

-- Students can see their own record
CREATE POLICY "students_own_record" ON students
  FOR SELECT USING (user_id = auth.uid());

-- Teachers can see students they're assigned to teach
CREATE POLICY "teachers_assigned_students" ON students
  FOR SELECT USING (
    auth.user_role() = 'teacher' AND
    id IN (
      SELECT DISTINCT ta.student_id 
      FROM teacher_assignments ta 
      WHERE ta.teacher_id = auth.current_teacher_id() 
        AND ta.is_active = true
    )
  );

-- ===============================
-- TEACHERS TABLE POLICIES
-- ===============================

-- Admins can see all teachers
CREATE POLICY "admin_teachers_all" ON teachers
  FOR ALL USING (auth.is_admin());

-- Teachers can see their own record
CREATE POLICY "teachers_own_record" ON teachers
  FOR SELECT USING (user_id = auth.uid());

-- Students can see teachers assigned to them
CREATE POLICY "students_assigned_teachers" ON teachers
  FOR SELECT USING (
    auth.user_role() = 'student' AND
    id IN (
      SELECT DISTINCT ta.teacher_id 
      FROM teacher_assignments ta 
      WHERE ta.student_id = auth.current_student_id() 
        AND ta.is_active = true
    )
  );

-- ===============================
-- SCORES TABLE POLICIES
-- ===============================

-- Admins can see all scores
CREATE POLICY "admin_scores_all" ON scores
  FOR ALL USING (auth.is_admin());

-- Students can see their own scores
CREATE POLICY "students_own_scores" ON scores
  FOR SELECT USING (
    auth.user_role() = 'student' AND
    student_id = auth.current_student_id()
  );

-- Teachers can see scores for students they assess
CREATE POLICY "teachers_assess_scores" ON scores
  FOR ALL USING (
    auth.user_role() = 'teacher' AND
    student_id IN (
      SELECT DISTINCT ta.student_id 
      FROM teacher_assignments ta 
      WHERE ta.teacher_id = auth.current_teacher_id() 
        AND ta.is_active = true
    )
  );

-- ===============================
-- ATTENDANCE TABLE POLICIES
-- ===============================

-- Admins can see all attendance
CREATE POLICY "admin_attendance_all" ON attendance
  FOR ALL USING (auth.is_admin());

-- Students can see their own attendance
CREATE POLICY "students_own_attendance" ON attendance
  FOR SELECT USING (
    auth.user_role() = 'student' AND
    student_id = auth.current_student_id()
  );

-- Teachers can see attendance for students they teach
CREATE POLICY "teachers_student_attendance" ON attendance
  FOR ALL USING (
    auth.user_role() = 'teacher' AND
    student_id IN (
      SELECT DISTINCT ta.student_id 
      FROM teacher_assignments ta 
      WHERE ta.teacher_id = auth.current_teacher_id() 
        AND ta.is_active = true
    )
  );

-- ===============================
-- FEEDBACK TABLE POLICIES
-- ===============================

-- Admins can see all feedback
CREATE POLICY "admin_feedback_all" ON feedback
  FOR ALL USING (auth.is_admin());

-- Students can see feedback given to them
CREATE POLICY "students_received_feedback" ON feedback
  FOR SELECT USING (
    auth.user_role() = 'student' AND
    student_id = auth.current_student_id()
  );

-- Teachers can see feedback they gave
CREATE POLICY "teachers_given_feedback" ON feedback
  FOR ALL USING (
    auth.user_role() = 'teacher' AND
    teacher_id = auth.current_teacher_id()
  );

-- ===============================
-- NOTIFICATIONS TABLE POLICIES
-- ===============================

-- Users can only see their own notifications
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Admins can see all notifications (for system monitoring)
CREATE POLICY "admin_notifications_all" ON notifications
  FOR SELECT USING (auth.is_admin());

-- ===============================
-- SYSTEM TABLES (No RLS needed)
-- ===============================

-- Tables like batches, sections, houses, quadrants, components
-- are considered "public" within the system and don't need RLS
-- as they contain configuration data, not sensitive user data

-- ===============================
-- SERVICE ROLE BYPASS
-- ===============================

-- Allow service role (backend) to bypass RLS for administrative operations
-- This is set at the connection level, not in SQL 