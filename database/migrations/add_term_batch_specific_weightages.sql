-- Migration: Add Term and Batch Specific Weightages Support
-- This migration adds support for term-specific and batch-specific weightages
-- while maintaining backward compatibility with the existing system

-- =====================================================
-- 1. BATCH TERM WEIGHTAGE CONFIGURATION
-- =====================================================

-- Main configuration table for batch-term weightage settings
CREATE TABLE IF NOT EXISTS batch_term_weightage_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    config_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one active config per batch-term combination
    UNIQUE(batch_id, term_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Index for performance
CREATE INDEX idx_batch_term_weightage_config_batch_term ON batch_term_weightage_config(batch_id, term_id);
CREATE INDEX idx_batch_term_weightage_config_active ON batch_term_weightage_config(is_active);

-- =====================================================
-- 2. QUADRANT WEIGHTAGES (TERM-BATCH SPECIFIC)
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_term_quadrant_weightages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES batch_term_weightage_config(id) ON DELETE CASCADE,
    quadrant_id VARCHAR(50) NOT NULL REFERENCES quadrants(id),
    weightage DECIMAL(5,2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    minimum_attendance DECIMAL(5,2) DEFAULT 0.00 CHECK (minimum_attendance >= 0 AND minimum_attendance <= 100),
    business_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(config_id, quadrant_id)
);

CREATE INDEX idx_batch_term_quadrant_weightages_config ON batch_term_quadrant_weightages(config_id);
CREATE INDEX idx_batch_term_quadrant_weightages_quadrant ON batch_term_quadrant_weightages(quadrant_id);

-- =====================================================
-- 3. SUB-CATEGORY WEIGHTAGES (TERM-BATCH SPECIFIC)
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_term_subcategory_weightages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES batch_term_weightage_config(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES sub_categories(id),
    weightage DECIMAL(5,2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(config_id, subcategory_id)
);

CREATE INDEX idx_batch_term_subcategory_weightages_config ON batch_term_subcategory_weightages(config_id);
CREATE INDEX idx_batch_term_subcategory_weightages_subcategory ON batch_term_subcategory_weightages(subcategory_id);

-- =====================================================
-- 4. COMPONENT WEIGHTAGES (TERM-BATCH SPECIFIC)
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_term_component_weightages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES batch_term_weightage_config(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES components(id),
    weightage DECIMAL(5,2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    max_score DECIMAL(5,2) DEFAULT NULL, -- Override default max_score if needed
    minimum_score DECIMAL(5,2) DEFAULT NULL, -- Override default minimum_score if needed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(config_id, component_id)
);

CREATE INDEX idx_batch_term_component_weightages_config ON batch_term_component_weightages(config_id);
CREATE INDEX idx_batch_term_component_weightages_component ON batch_term_component_weightages(component_id);

-- =====================================================
-- 5. MICROCOMPETENCY WEIGHTAGES (TERM-BATCH SPECIFIC)
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_term_microcompetency_weightages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES batch_term_weightage_config(id) ON DELETE CASCADE,
    microcompetency_id UUID NOT NULL REFERENCES microcompetencies(id),
    weightage DECIMAL(5,2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    max_score DECIMAL(5,2) DEFAULT NULL, -- Override default max_score if needed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(config_id, microcompetency_id)
);

CREATE INDEX idx_batch_term_microcompetency_weightages_config ON batch_term_microcompetency_weightages(config_id);
CREATE INDEX idx_batch_term_microcompetency_weightages_microcompetency ON batch_term_microcompetency_weightages(microcompetency_id);

-- =====================================================
-- 6. WEIGHTAGE INHERITANCE RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS weightage_inheritance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('batch_to_batch', 'term_to_term', 'default_system')),
    source_config_id UUID REFERENCES batch_term_weightage_config(id),
    target_batch_id UUID REFERENCES batches(id),
    target_term_id UUID REFERENCES terms(id),
    inheritance_level VARCHAR(50) NOT NULL CHECK (inheritance_level IN ('all', 'quadrant', 'subcategory', 'component', 'microcompetency')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure logical consistency
    CHECK (
        (rule_type = 'batch_to_batch' AND source_config_id IS NOT NULL AND target_batch_id IS NOT NULL) OR
        (rule_type = 'term_to_term' AND source_config_id IS NOT NULL AND target_term_id IS NOT NULL) OR
        (rule_type = 'default_system' AND source_config_id IS NULL)
    )
);

CREATE INDEX idx_weightage_inheritance_rules_type ON weightage_inheritance_rules(rule_type);
CREATE INDEX idx_weightage_inheritance_rules_active ON weightage_inheritance_rules(is_active);

-- =====================================================
-- 7. AUDIT TRAIL FOR WEIGHTAGE CHANGES
-- =====================================================

CREATE TABLE IF NOT EXISTS weightage_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES batch_term_weightage_config(id),
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'inherit')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('quadrant', 'subcategory', 'component', 'microcompetency')),
    entity_id VARCHAR(255) NOT NULL, -- Can be UUID or string depending on entity_type
    old_weightage DECIMAL(5,2),
    new_weightage DECIMAL(5,2),
    change_reason TEXT,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    
    -- Store additional context
    change_context JSONB DEFAULT '{}'
);

CREATE INDEX idx_weightage_change_audit_config ON weightage_change_audit(config_id);
CREATE INDEX idx_weightage_change_audit_type ON weightage_change_audit(change_type);
CREATE INDEX idx_weightage_change_audit_entity ON weightage_change_audit(entity_type, entity_id);
CREATE INDEX idx_weightage_change_audit_date ON weightage_change_audit(changed_at);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get active weightage configuration for a batch-term combination
CREATE OR REPLACE FUNCTION get_batch_term_weightage_config(p_batch_id UUID, p_term_id UUID)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
BEGIN
    SELECT id INTO config_id
    FROM batch_term_weightage_config
    WHERE batch_id = p_batch_id
      AND term_id = p_term_id
      AND is_active = true
    LIMIT 1;

    RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get quadrant weightage for a specific batch-term
CREATE OR REPLACE FUNCTION get_quadrant_weightage(p_batch_id UUID, p_term_id UUID, p_quadrant_id VARCHAR)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    config_id UUID;
    weightage_value DECIMAL(5,2);
BEGIN
    -- Get the active configuration
    config_id := get_batch_term_weightage_config(p_batch_id, p_term_id);

    IF config_id IS NOT NULL THEN
        -- Get term-batch specific weightage
        SELECT weightage INTO weightage_value
        FROM batch_term_quadrant_weightages
        WHERE config_id = config_id AND quadrant_id = p_quadrant_id;

        IF weightage_value IS NOT NULL THEN
            RETURN weightage_value;
        END IF;
    END IF;

    -- Fallback to default quadrant weightage
    SELECT weightage INTO weightage_value
    FROM quadrants
    WHERE id = p_quadrant_id AND is_active = true;

    RETURN COALESCE(weightage_value, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to validate weightage totals
CREATE OR REPLACE FUNCTION validate_weightage_totals(p_config_id UUID)
RETURNS JSONB AS $$
DECLARE
    quadrant_total DECIMAL(5,2);
    subcategory_totals JSONB := '{}';
    component_totals JSONB := '{}';
    microcompetency_totals JSONB := '{}';
    validation_result JSONB := '{"valid": true, "errors": []}';
    rec RECORD;
BEGIN
    -- Check quadrant weightages total to 100%
    SELECT COALESCE(SUM(weightage), 0) INTO quadrant_total
    FROM batch_term_quadrant_weightages
    WHERE config_id = p_config_id;

    IF quadrant_total != 100 THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
        validation_result := jsonb_set(validation_result, '{errors}',
            validation_result->'errors' || jsonb_build_array(
                format('Quadrant weightages total %.2f%%, should be 100%%', quadrant_total)
            )
        );
    END IF;

    -- Check subcategory weightages within each quadrant
    FOR rec IN
        SELECT sc.quadrant_id, COALESCE(SUM(btscw.weightage), 0) as total_weightage
        FROM sub_categories sc
        LEFT JOIN batch_term_subcategory_weightages btscw ON sc.id = btscw.subcategory_id AND btscw.config_id = p_config_id
        GROUP BY sc.quadrant_id
    LOOP
        IF rec.total_weightage > 0 AND rec.total_weightage != 100 THEN
            validation_result := jsonb_set(validation_result, '{valid}', 'false');
            validation_result := jsonb_set(validation_result, '{errors}',
                validation_result->'errors' || jsonb_build_array(
                    format('Subcategory weightages in quadrant %s total %.2f%%, should be 100%%',
                           rec.quadrant_id, rec.total_weightage)
                )
            );
        END IF;
    END LOOP;

    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS FOR AUDIT TRAIL
-- =====================================================

-- Trigger function for audit trail
CREATE OR REPLACE FUNCTION audit_weightage_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO weightage_change_audit (
            config_id, change_type, entity_type, entity_id,
            new_weightage, changed_by, change_context
        ) VALUES (
            NEW.config_id, 'create',
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN 'quadrant'
                WHEN 'batch_term_subcategory_weightages' THEN 'subcategory'
                WHEN 'batch_term_component_weightages' THEN 'component'
                WHEN 'batch_term_microcompetency_weightages' THEN 'microcompetency'
            END,
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN NEW.quadrant_id::TEXT
                WHEN 'batch_term_subcategory_weightages' THEN NEW.subcategory_id::TEXT
                WHEN 'batch_term_component_weightages' THEN NEW.component_id::TEXT
                WHEN 'batch_term_microcompetency_weightages' THEN NEW.microcompetency_id::TEXT
            END,
            NEW.weightage,
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'),
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO weightage_change_audit (
            config_id, change_type, entity_type, entity_id,
            old_weightage, new_weightage, changed_by, change_context
        ) VALUES (
            NEW.config_id, 'update',
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN 'quadrant'
                WHEN 'batch_term_subcategory_weightages' THEN 'subcategory'
                WHEN 'batch_term_component_weightages' THEN 'component'
                WHEN 'batch_term_microcompetency_weightages' THEN 'microcompetency'
            END,
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN NEW.quadrant_id::TEXT
                WHEN 'batch_term_subcategory_weightages' THEN NEW.subcategory_id::TEXT
                WHEN 'batch_term_component_weightages' THEN NEW.component_id::TEXT
                WHEN 'batch_term_microcompetency_weightages' THEN NEW.microcompetency_id::TEXT
            END,
            OLD.weightage, NEW.weightage,
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'),
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO weightage_change_audit (
            config_id, change_type, entity_type, entity_id,
            old_weightage, changed_by, change_context
        ) VALUES (
            OLD.config_id, 'delete',
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN 'quadrant'
                WHEN 'batch_term_subcategory_weightages' THEN 'subcategory'
                WHEN 'batch_term_component_weightages' THEN 'component'
                WHEN 'batch_term_microcompetency_weightages' THEN 'microcompetency'
            END,
            CASE TG_TABLE_NAME
                WHEN 'batch_term_quadrant_weightages' THEN OLD.quadrant_id::TEXT
                WHEN 'batch_term_subcategory_weightages' THEN OLD.subcategory_id::TEXT
                WHEN 'batch_term_component_weightages' THEN OLD.component_id::TEXT
                WHEN 'batch_term_microcompetency_weightages' THEN OLD.microcompetency_id::TEXT
            END,
            OLD.weightage,
            COALESCE(current_setting('app.current_user_id', true)::UUID, '00000000-0000-0000-0000-000000000000'),
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all weightage tables
CREATE TRIGGER audit_quadrant_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_quadrant_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

CREATE TRIGGER audit_subcategory_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_subcategory_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

CREATE TRIGGER audit_component_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_component_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

CREATE TRIGGER audit_microcompetency_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_microcompetency_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

-- =====================================================
-- 10. DATA MIGRATION AND SAMPLE DATA
-- =====================================================

-- Function to create default weightage configuration for existing batch-term combinations
CREATE OR REPLACE FUNCTION migrate_existing_weightages()
RETURNS VOID AS $$
DECLARE
    batch_rec RECORD;
    term_rec RECORD;
    config_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get a system admin user for the migration
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found for migration';
    END IF;

    -- Create configurations for all active batch-term combinations
    FOR batch_rec IN SELECT id, name FROM batches WHERE is_active = true LOOP
        FOR term_rec IN SELECT id, name FROM terms WHERE is_active = true LOOP

            -- Create configuration
            INSERT INTO batch_term_weightage_config (
                batch_id, term_id, config_name, description,
                is_active, created_by
            ) VALUES (
                batch_rec.id, term_rec.id,
                format('Default Config - %s - %s', batch_rec.name, term_rec.name),
                'Migrated from existing system weightages',
                true, admin_user_id
            ) RETURNING id INTO config_id;

            -- Migrate quadrant weightages
            INSERT INTO batch_term_quadrant_weightages (
                config_id, quadrant_id, weightage, minimum_attendance, business_rules
            )
            SELECT
                config_id, id, weightage, minimum_attendance, business_rules
            FROM quadrants
            WHERE is_active = true;

            -- Migrate subcategory weightages
            INSERT INTO batch_term_subcategory_weightages (
                config_id, subcategory_id, weightage
            )
            SELECT
                config_id, id, weightage
            FROM sub_categories
            WHERE is_active = true;

            -- Migrate component weightages
            INSERT INTO batch_term_component_weightages (
                config_id, component_id, weightage, max_score, minimum_score
            )
            SELECT
                config_id, id, weightage, max_score, minimum_score
            FROM components
            WHERE is_active = true;

            -- Migrate microcompetency weightages
            INSERT INTO batch_term_microcompetency_weightages (
                config_id, microcompetency_id, weightage, max_score
            )
            SELECT
                config_id, id, weightage, max_score
            FROM microcompetencies
            WHERE is_active = true;

        END LOOP;
    END LOOP;

    RAISE NOTICE 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. VIEWS FOR EASY ACCESS
-- =====================================================

-- View to get complete weightage configuration for a batch-term
CREATE OR REPLACE VIEW v_batch_term_weightage_summary AS
SELECT
    btc.id as config_id,
    btc.batch_id,
    b.name as batch_name,
    btc.term_id,
    t.name as term_name,
    btc.config_name,
    btc.is_active,

    -- Quadrant weightages
    jsonb_agg(
        DISTINCT jsonb_build_object(
            'quadrant_id', btqw.quadrant_id,
            'quadrant_name', q.name,
            'weightage', btqw.weightage,
            'minimum_attendance', btqw.minimum_attendance
        )
    ) FILTER (WHERE btqw.id IS NOT NULL) as quadrant_weightages,

    -- Summary statistics
    COUNT(DISTINCT btqw.quadrant_id) as quadrant_count,
    COUNT(DISTINCT btscw.subcategory_id) as subcategory_count,
    COUNT(DISTINCT btcw.component_id) as component_count,
    COUNT(DISTINCT btmw.microcompetency_id) as microcompetency_count

FROM batch_term_weightage_config btc
JOIN batches b ON btc.batch_id = b.id
JOIN terms t ON btc.term_id = t.id
LEFT JOIN batch_term_quadrant_weightages btqw ON btc.id = btqw.config_id
LEFT JOIN quadrants q ON btqw.quadrant_id = q.id
LEFT JOIN batch_term_subcategory_weightages btscw ON btc.id = btscw.config_id
LEFT JOIN batch_term_component_weightages btcw ON btc.id = btcw.config_id
LEFT JOIN batch_term_microcompetency_weightages btmw ON btc.id = btmw.config_id
GROUP BY btc.id, btc.batch_id, b.name, btc.term_id, t.name, btc.config_name, btc.is_active;

-- =====================================================
-- 12. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE batch_term_weightage_config IS 'Main configuration table for batch-term specific weightages';
COMMENT ON TABLE batch_term_quadrant_weightages IS 'Term and batch specific quadrant weightages';
COMMENT ON TABLE batch_term_subcategory_weightages IS 'Term and batch specific subcategory weightages';
COMMENT ON TABLE batch_term_component_weightages IS 'Term and batch specific component weightages';
COMMENT ON TABLE batch_term_microcompetency_weightages IS 'Term and batch specific microcompetency weightages';
COMMENT ON TABLE weightage_inheritance_rules IS 'Rules for inheriting weightages between batches and terms';
COMMENT ON TABLE weightage_change_audit IS 'Audit trail for all weightage changes';

COMMENT ON FUNCTION get_batch_term_weightage_config(UUID, UUID) IS 'Get active weightage configuration ID for a batch-term combination';
COMMENT ON FUNCTION get_quadrant_weightage(UUID, UUID, VARCHAR) IS 'Get quadrant weightage with fallback to default';
COMMENT ON FUNCTION validate_weightage_totals(UUID) IS 'Validate that weightages sum to 100% at each level';
COMMENT ON FUNCTION migrate_existing_weightages() IS 'Migrate existing weightages to new term-batch specific structure';

-- =====================================================
-- 13. ADDITIONAL HELPER FUNCTIONS FOR COPYING WEIGHTAGES
-- =====================================================

-- Function to copy default quadrant weightages to a configuration
CREATE OR REPLACE FUNCTION copy_default_quadrant_weightages(p_config_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO batch_term_quadrant_weightages (
        config_id, quadrant_id, weightage, minimum_attendance, business_rules
    )
    SELECT
        p_config_id, id, weightage, minimum_attendance, business_rules
    FROM quadrants
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to copy default subcategory weightages to a configuration
CREATE OR REPLACE FUNCTION copy_default_subcategory_weightages(p_config_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO batch_term_subcategory_weightages (
        config_id, subcategory_id, weightage
    )
    SELECT
        p_config_id, id, weightage
    FROM sub_categories
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to copy default component weightages to a configuration
CREATE OR REPLACE FUNCTION copy_default_component_weightages(p_config_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO batch_term_component_weightages (
        config_id, component_id, weightage, max_score, minimum_score
    )
    SELECT
        p_config_id, id, weightage, max_score, minimum_score
    FROM components
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to copy default microcompetency weightages to a configuration
CREATE OR REPLACE FUNCTION copy_default_microcompetency_weightages(p_config_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO batch_term_microcompetency_weightages (
        config_id, microcompetency_id, weightage, max_score
    )
    SELECT
        p_config_id, id, weightage, max_score
    FROM microcompetencies
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to copy weightages from one configuration to another
CREATE OR REPLACE FUNCTION copy_weightage_configuration(p_source_config_id UUID, p_target_config_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Copy quadrant weightages
    INSERT INTO batch_term_quadrant_weightages (
        config_id, quadrant_id, weightage, minimum_attendance, business_rules
    )
    SELECT
        p_target_config_id, quadrant_id, weightage, minimum_attendance, business_rules
    FROM batch_term_quadrant_weightages
    WHERE config_id = p_source_config_id;

    -- Copy subcategory weightages
    INSERT INTO batch_term_subcategory_weightages (
        config_id, subcategory_id, weightage
    )
    SELECT
        p_target_config_id, subcategory_id, weightage
    FROM batch_term_subcategory_weightages
    WHERE config_id = p_source_config_id;

    -- Copy component weightages
    INSERT INTO batch_term_component_weightages (
        config_id, component_id, weightage, max_score, minimum_score
    )
    SELECT
        p_target_config_id, component_id, weightage, max_score, minimum_score
    FROM batch_term_component_weightages
    WHERE config_id = p_source_config_id;

    -- Copy microcompetency weightages
    INSERT INTO batch_term_microcompetency_weightages (
        config_id, microcompetency_id, weightage, max_score
    )
    SELECT
        p_target_config_id, microcompetency_id, weightage, max_score
    FROM batch_term_microcompetency_weightages
    WHERE config_id = p_source_config_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get weightage summary for a configuration
CREATE OR REPLACE FUNCTION get_weightage_summary(p_config_id UUID)
RETURNS JSONB AS $$
DECLARE
    summary JSONB := '{}';
    quadrant_data JSONB;
    subcategory_data JSONB;
    component_data JSONB;
    microcompetency_data JSONB;
BEGIN
    -- Get quadrant weightages
    SELECT jsonb_agg(
        jsonb_build_object(
            'quadrant_id', btqw.quadrant_id,
            'quadrant_name', q.name,
            'weightage', btqw.weightage,
            'minimum_attendance', btqw.minimum_attendance
        )
    ) INTO quadrant_data
    FROM batch_term_quadrant_weightages btqw
    JOIN quadrants q ON btqw.quadrant_id = q.id
    WHERE btqw.config_id = p_config_id;

    -- Get subcategory weightages
    SELECT jsonb_agg(
        jsonb_build_object(
            'subcategory_id', btscw.subcategory_id,
            'subcategory_name', sc.name,
            'quadrant_id', sc.quadrant_id,
            'weightage', btscw.weightage
        )
    ) INTO subcategory_data
    FROM batch_term_subcategory_weightages btscw
    JOIN sub_categories sc ON btscw.subcategory_id = sc.id
    WHERE btscw.config_id = p_config_id;

    -- Get component weightages
    SELECT jsonb_agg(
        jsonb_build_object(
            'component_id', btcw.component_id,
            'component_name', c.name,
            'subcategory_id', c.sub_category_id,
            'weightage', btcw.weightage,
            'max_score', COALESCE(btcw.max_score, c.max_score),
            'minimum_score', COALESCE(btcw.minimum_score, c.minimum_score)
        )
    ) INTO component_data
    FROM batch_term_component_weightages btcw
    JOIN components c ON btcw.component_id = c.id
    WHERE btcw.config_id = p_config_id;

    -- Get microcompetency weightages
    SELECT jsonb_agg(
        jsonb_build_object(
            'microcompetency_id', btmw.microcompetency_id,
            'microcompetency_name', m.name,
            'component_id', m.component_id,
            'weightage', btmw.weightage,
            'max_score', COALESCE(btmw.max_score, m.max_score)
        )
    ) INTO microcompetency_data
    FROM batch_term_microcompetency_weightages btmw
    JOIN microcompetencies m ON btmw.microcompetency_id = m.id
    WHERE btmw.config_id = p_config_id;

    -- Build summary
    summary := jsonb_build_object(
        'config_id', p_config_id,
        'quadrants', COALESCE(quadrant_data, '[]'::jsonb),
        'subcategories', COALESCE(subcategory_data, '[]'::jsonb),
        'components', COALESCE(component_data, '[]'::jsonb),
        'microcompetencies', COALESCE(microcompetency_data, '[]'::jsonb)
    );

    RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Term-Batch Specific Weightages Migration Complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT migrate_existing_weightages(); to migrate existing data';
    RAISE NOTICE '2. Update application code to use new weightage functions';
    RAISE NOTICE '3. Test the new weightage system thoroughly';
    RAISE NOTICE '==============================================';
END $$;
