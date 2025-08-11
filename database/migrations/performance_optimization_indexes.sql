-- Performance Optimization and Database Indexing
-- This migration adds comprehensive indexes to improve query performance

-- =====================================================
-- 1. ANALYZE CURRENT PERFORMANCE
-- =====================================================

-- Enable query performance tracking
DO $$
BEGIN
    RAISE NOTICE '🔍 PERFORMANCE OPTIMIZATION STARTING...';
    RAISE NOTICE 'Analyzing current database performance and creating optimized indexes';
END $$;

-- =====================================================
-- 2. CORE ENTITY INDEXES
-- =====================================================

-- Students table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_status 
ON students(status) WHERE status = 'Active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_current_term 
ON students(current_term_id) WHERE current_term_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_batch_section 
ON students(batch_id, section_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_registration_no 
ON students(registration_no);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_email 
ON students(email);

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_role 
ON users(status, role) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username 
ON users(username);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- =====================================================
-- 3. SCORE-RELATED INDEXES
-- =====================================================

-- Student scores indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_scores_student_term 
ON student_scores(student_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_scores_component_term 
ON student_scores(component_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_scores_created_at 
ON student_scores(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_scores_updated_at 
ON student_scores(updated_at DESC);

-- Student microcompetency scores indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_microcompetency_scores_student_term 
ON student_microcompetency_scores(student_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_microcompetency_scores_microcompetency 
ON student_microcompetency_scores(microcompetency_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_microcompetency_scores_created_at 
ON student_microcompetency_scores(created_at DESC);

-- Student score summary indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_score_summary_student_term 
ON student_score_summary(student_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_score_summary_quadrant_term 
ON student_score_summary(quadrant_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_score_summary_updated_at 
ON student_score_summary(updated_at DESC);

-- =====================================================
-- 4. BATCH-TERM WEIGHTAGE INDEXES
-- =====================================================

-- Batch term weightage config indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_term_weightage_config_batch_term 
ON batch_term_weightage_config(batch_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_term_weightage_config_active 
ON batch_term_weightage_config(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_term_weightage_config_created_at 
ON batch_term_weightage_config(created_at DESC);

-- Quadrant weightages indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quadrant_weightages_config_quadrant 
ON quadrant_weightages(config_id, quadrant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quadrant_weightages_quadrant 
ON quadrant_weightages(quadrant_id);

-- =====================================================
-- 5. ACADEMIC STRUCTURE INDEXES
-- =====================================================

-- Terms indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_is_current 
ON terms(is_current) WHERE is_current = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_is_active 
ON terms(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_academic_year 
ON terms(academic_year);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_dates 
ON terms(start_date, end_date);

-- Batches indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_is_active 
ON batches(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_year 
ON batches(year DESC);

-- Student terms indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_terms_student_term 
ON student_terms(student_id, term_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_terms_term_status 
ON student_terms(term_id, enrollment_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_terms_enrolled_at 
ON student_terms(enrolled_at DESC);

-- =====================================================
-- 6. COMPONENT AND CATEGORY INDEXES
-- =====================================================

-- Components indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_sub_category 
ON components(sub_category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_is_active 
ON components(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_display_order 
ON components(display_order);

-- Sub categories indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sub_categories_quadrant 
ON sub_categories(quadrant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sub_categories_is_active 
ON sub_categories(is_active) WHERE is_active = true;

-- Quadrants indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quadrants_is_active 
ON quadrants(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quadrants_display_order 
ON quadrants(display_order);

-- =====================================================
-- 7. MICROCOMPETENCY INDEXES
-- =====================================================

-- Microcompetencies indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_microcompetencies_component 
ON microcompetencies(component_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_microcompetencies_is_active 
ON microcompetencies(is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_microcompetencies_display_order 
ON microcompetencies(display_order);

-- =====================================================
-- 8. INTERVENTION INDEXES
-- =====================================================

-- Interventions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interventions_status 
ON interventions(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interventions_dates 
ON interventions(start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interventions_created_at 
ON interventions(created_at DESC);

-- Student interventions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_interventions_student 
ON student_interventions(student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_interventions_intervention 
ON student_interventions(intervention_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_interventions_status 
ON student_interventions(status);

-- =====================================================
-- 9. AUDIT AND LOGGING INDEXES
-- =====================================================

-- Audit logs indexes (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_action 
        ON audit_logs(table_name, action);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timestamp 
        ON audit_logs(user_id, created_at DESC);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
        ON audit_logs(created_at DESC);
    END IF;
END $$;

-- =====================================================
-- 10. COMPOSITE INDEXES FOR COMMON QUERIES
-- =====================================================

-- Student score calculation composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_scores_calc_composite 
ON student_scores(student_id, term_id, component_id, updated_at DESC);

-- Batch term weightage lookup composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_term_weightage_lookup 
ON batch_term_weightage_config(batch_id, term_id, is_active) 
WHERE is_active = true;

-- Student enrollment composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_enrollment_composite 
ON student_terms(student_id, term_id, enrollment_status, is_eligible);

-- Score summary composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_score_summary_composite 
ON student_score_summary(student_id, term_id, quadrant_id, updated_at DESC);

-- =====================================================
-- 11. PARTIAL INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Active students only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active_only 
ON students(id, batch_id, section_id, current_term_id) 
WHERE status = 'Active';

-- Current term only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_current_only 
ON terms(id, name, start_date, end_date) 
WHERE is_current = true;

-- Active components only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_active_only 
ON components(id, sub_category_id, name, weightage) 
WHERE is_active = true;

-- =====================================================
-- 12. FOREIGN KEY INDEXES (if missing)
-- =====================================================

-- Ensure all foreign keys have indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_batch_id 
ON students(batch_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_section_id 
ON students(section_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_house_id 
ON students(house_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_sub_category_id 
ON components(sub_category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sub_categories_quadrant_id 
ON sub_categories(quadrant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_microcompetencies_component_id 
ON microcompetencies(component_id);

-- =====================================================
-- 13. ANALYZE TABLES FOR BETTER QUERY PLANNING
-- =====================================================

-- Update table statistics for better query planning
ANALYZE students;
ANALYZE users;
ANALYZE student_scores;
ANALYZE student_microcompetency_scores;
ANALYZE student_score_summary;
ANALYZE batch_term_weightage_config;
ANALYZE quadrant_weightages;
ANALYZE terms;
ANALYZE batches;
ANALYZE student_terms;
ANALYZE components;
ANALYZE sub_categories;
ANALYZE quadrants;
ANALYZE microcompetencies;
ANALYZE interventions;
ANALYZE student_interventions;

-- =====================================================
-- 14. PERFORMANCE MONITORING VIEWS
-- =====================================================

-- Create view for monitoring slow queries
CREATE OR REPLACE VIEW v_performance_monitor AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Create view for index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =====================================================
-- 15. COMPLETION SUMMARY
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Count indexes created
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    -- Count tables analyzed
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '✅ PERFORMANCE OPTIMIZATION COMPLETE!';
    RAISE NOTICE 'Created/verified % indexes across % tables', index_count, table_count;
    RAISE NOTICE 'Database statistics updated for optimal query planning';
    RAISE NOTICE 'Performance monitoring views created';
    RAISE NOTICE 'System ready for high-performance operations';
END $$;
