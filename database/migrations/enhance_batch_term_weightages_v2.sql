-- =====================================================
-- ENHANCED BATCH-TERM WEIGHTAGE SYSTEM V2
-- =====================================================
-- This migration enhances the existing batch-term weightage system with:
-- 1. Zero weightage support (0% weightages)
-- 2. Hierarchy customization (is_active flags)
-- 3. Enhanced business rules support
-- 4. Improved audit trail
-- =====================================================

-- Add missing columns to existing tables
ALTER TABLE batch_term_subcategory_weightages 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_rules JSONB DEFAULT '{}';

ALTER TABLE batch_term_component_weightages 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_rules JSONB DEFAULT '{}';

ALTER TABLE batch_term_microcompetency_weightages 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_rules JSONB DEFAULT '{}';

-- Update weightage constraints to allow 0% weightages
ALTER TABLE batch_term_quadrant_weightages 
DROP CONSTRAINT IF EXISTS batch_term_quadrant_weightages_weightage_check,
ADD CONSTRAINT batch_term_quadrant_weightages_weightage_check 
CHECK (weightage >= 0 AND weightage <= 100);

ALTER TABLE batch_term_subcategory_weightages 
DROP CONSTRAINT IF EXISTS batch_term_subcategory_weightages_weightage_check,
ADD CONSTRAINT batch_term_subcategory_weightages_weightage_check 
CHECK (weightage >= 0 AND weightage <= 100);

ALTER TABLE batch_term_component_weightages 
DROP CONSTRAINT IF EXISTS batch_term_component_weightages_weightage_check,
ADD CONSTRAINT batch_term_component_weightages_weightage_check 
CHECK (weightage >= 0 AND weightage <= 100);

ALTER TABLE batch_term_microcompetency_weightages 
DROP CONSTRAINT IF EXISTS batch_term_microcompetency_weightages_weightage_check,
ADD CONSTRAINT batch_term_microcompetency_weightages_weightage_check 
CHECK (weightage >= 0 AND weightage <= 100);

-- Create enhanced validation function that handles zero weightages
CREATE OR REPLACE FUNCTION validate_weightage_totals_v2(p_config_id UUID)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB := '{}';
    quadrant_total DECIMAL(5,2);
    subcategory_totals JSONB := '{}';
    component_totals JSONB := '{}';
    microcompetency_totals JSONB := '{}';
    error_messages TEXT[] := ARRAY[]::TEXT[];
    warning_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Validate quadrant weightages (only active ones)
    SELECT COALESCE(SUM(weightage), 0) INTO quadrant_total
    FROM batch_term_quadrant_weightages btqw
    JOIN quadrants q ON btqw.quadrant_id = q.id
    WHERE btqw.config_id = p_config_id 
    AND q.is_active = true
    AND btqw.weightage > 0; -- Only count non-zero weightages

    IF ABS(quadrant_total - 100) > 0.01 THEN
        error_messages := array_append(error_messages, 
            format('Active quadrant weightages total %.2f%%, should be 100%%', quadrant_total));
    END IF;

    -- Validate subcategory weightages within each quadrant (only active ones)
    FOR quadrant_rec IN 
        SELECT DISTINCT q.id, q.name 
        FROM quadrants q 
        WHERE q.is_active = true
    LOOP
        SELECT COALESCE(SUM(btscw.weightage), 0) INTO quadrant_total
        FROM batch_term_subcategory_weightages btscw
        JOIN sub_categories sc ON btscw.subcategory_id = sc.id
        WHERE btscw.config_id = p_config_id 
        AND sc.quadrant_id = quadrant_rec.id
        AND sc.is_active = true
        AND btscw.is_active = true
        AND btscw.weightage > 0; -- Only count non-zero weightages

        subcategory_totals := subcategory_totals || 
            jsonb_build_object(quadrant_rec.name, quadrant_total);

        IF quadrant_total > 0 AND ABS(quadrant_total - 100) > 0.01 THEN
            error_messages := array_append(error_messages, 
                format('Active subcategory weightages in %s total %.2f%%, should be 100%%', 
                       quadrant_rec.name, quadrant_total));
        END IF;
    END LOOP;

    -- Validate component weightages within each subcategory (only active ones)
    FOR subcategory_rec IN 
        SELECT DISTINCT sc.id, sc.name, q.name as quadrant_name
        FROM sub_categories sc
        JOIN quadrants q ON sc.quadrant_id = q.id
        WHERE sc.is_active = true AND q.is_active = true
    LOOP
        SELECT COALESCE(SUM(btcw.weightage), 0) INTO quadrant_total
        FROM batch_term_component_weightages btcw
        JOIN components c ON btcw.component_id = c.id
        WHERE btcw.config_id = p_config_id 
        AND c.sub_category_id = subcategory_rec.id
        AND c.is_active = true
        AND btcw.is_active = true
        AND btcw.weightage > 0; -- Only count non-zero weightages

        component_totals := component_totals || 
            jsonb_build_object(
                format('%s.%s', subcategory_rec.quadrant_name, subcategory_rec.name), 
                quadrant_total
            );

        IF quadrant_total > 0 AND ABS(quadrant_total - 100) > 0.01 THEN
            error_messages := array_append(error_messages, 
                format('Active component weightages in %s.%s total %.2f%%, should be 100%%', 
                       subcategory_rec.quadrant_name, subcategory_rec.name, quadrant_total));
        END IF;
    END LOOP;

    -- Validate microcompetency weightages within each component (only active ones)
    FOR component_rec IN 
        SELECT DISTINCT c.id, c.name, sc.name as subcategory_name, q.name as quadrant_name
        FROM components c
        JOIN sub_categories sc ON c.sub_category_id = sc.id
        JOIN quadrants q ON sc.quadrant_id = q.id
        WHERE c.is_active = true AND sc.is_active = true AND q.is_active = true
    LOOP
        SELECT COALESCE(SUM(btmw.weightage), 0) INTO quadrant_total
        FROM batch_term_microcompetency_weightages btmw
        JOIN microcompetencies m ON btmw.microcompetency_id = m.id
        WHERE btmw.config_id = p_config_id 
        AND m.component_id = component_rec.id
        AND m.is_active = true
        AND btmw.is_active = true
        AND btmw.weightage > 0; -- Only count non-zero weightages

        microcompetency_totals := microcompetency_totals || 
            jsonb_build_object(
                format('%s.%s.%s', component_rec.quadrant_name, component_rec.subcategory_name, component_rec.name), 
                quadrant_total
            );

        IF quadrant_total > 0 AND ABS(quadrant_total - 100) > 0.01 THEN
            error_messages := array_append(error_messages, 
                format('Active microcompetency weightages in %s.%s.%s total %.2f%%, should be 100%%', 
                       component_rec.quadrant_name, component_rec.subcategory_name, component_rec.name, quadrant_total));
        END IF;
    END LOOP;

    -- Check for zero weightage warnings
    SELECT COUNT(*) INTO quadrant_total
    FROM batch_term_quadrant_weightages btqw
    WHERE btqw.config_id = p_config_id AND btqw.weightage = 0;
    
    IF quadrant_total > 0 THEN
        warning_messages := array_append(warning_messages, 
            format('%s quadrant(s) have 0%% weightage and will be excluded from calculations', quadrant_total::TEXT));
    END IF;

    -- Build validation result
    validation_result := jsonb_build_object(
        'config_id', p_config_id,
        'is_valid', array_length(error_messages, 1) IS NULL,
        'errors', COALESCE(array_to_json(error_messages), '[]'::json),
        'warnings', COALESCE(array_to_json(warning_messages), '[]'::json),
        'totals', jsonb_build_object(
            'quadrants', subcategory_totals,
            'subcategories', subcategory_totals,
            'components', component_totals,
            'microcompetencies', microcompetency_totals
        ),
        'validated_at', NOW()
    );

    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active hierarchy items for a batch-term configuration
CREATE OR REPLACE FUNCTION get_active_hierarchy_items(p_config_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    quadrant_items JSONB;
    subcategory_items JSONB;
    component_items JSONB;
    microcompetency_items JSONB;
BEGIN
    -- Get active quadrants
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', btqw.quadrant_id,
            'name', q.name,
            'weightage', btqw.weightage,
            'is_active', btqw.weightage > 0
        )
    ) INTO quadrant_items
    FROM batch_term_quadrant_weightages btqw
    JOIN quadrants q ON btqw.quadrant_id = q.id
    WHERE btqw.config_id = p_config_id
    AND q.is_active = true;

    -- Get active subcategories
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', btscw.subcategory_id,
            'name', sc.name,
            'quadrant_id', sc.quadrant_id,
            'weightage', btscw.weightage,
            'is_active', btscw.is_active AND btscw.weightage > 0
        )
    ) INTO subcategory_items
    FROM batch_term_subcategory_weightages btscw
    JOIN sub_categories sc ON btscw.subcategory_id = sc.id
    WHERE btscw.config_id = p_config_id
    AND sc.is_active = true;

    -- Get active components
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', btcw.component_id,
            'name', c.name,
            'subcategory_id', c.sub_category_id,
            'weightage', btcw.weightage,
            'is_active', btcw.is_active AND btcw.weightage > 0
        )
    ) INTO component_items
    FROM batch_term_component_weightages btcw
    JOIN components c ON btcw.component_id = c.id
    WHERE btcw.config_id = p_config_id
    AND c.is_active = true;

    -- Get active microcompetencies
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', btmw.microcompetency_id,
            'name', m.name,
            'component_id', m.component_id,
            'weightage', btmw.weightage,
            'is_active', btmw.is_active AND btmw.weightage > 0
        )
    ) INTO microcompetency_items
    FROM batch_term_microcompetency_weightages btmw
    JOIN microcompetencies m ON btmw.microcompetency_id = m.id
    WHERE btmw.config_id = p_config_id
    AND m.is_active = true;

    result := jsonb_build_object(
        'config_id', p_config_id,
        'quadrants', COALESCE(quadrant_items, '[]'::jsonb),
        'subcategories', COALESCE(subcategory_items, '[]'::jsonb),
        'components', COALESCE(component_items, '[]'::jsonb),
        'microcompetencies', COALESCE(microcompetency_items, '[]'::jsonb),
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update audit triggers to handle new columns
DROP TRIGGER IF EXISTS audit_subcategory_weightages ON batch_term_subcategory_weightages;
DROP TRIGGER IF EXISTS audit_component_weightages ON batch_term_component_weightages;
DROP TRIGGER IF EXISTS audit_microcompetency_weightages ON batch_term_microcompetency_weightages;

CREATE TRIGGER audit_subcategory_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_subcategory_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

CREATE TRIGGER audit_component_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_component_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

CREATE TRIGGER audit_microcompetency_weightages
    AFTER INSERT OR UPDATE OR DELETE ON batch_term_microcompetency_weightages
    FOR EACH ROW EXECUTE FUNCTION audit_weightage_changes();

-- Add comments for new functionality
COMMENT ON FUNCTION validate_weightage_totals_v2(UUID) IS 'Enhanced validation function that handles zero weightages and active/inactive items';
COMMENT ON FUNCTION get_active_hierarchy_items(UUID) IS 'Get all active hierarchy items for a batch-term configuration';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_term_subcategory_weightages_active 
ON batch_term_subcategory_weightages(config_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_batch_term_component_weightages_active 
ON batch_term_component_weightages(config_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_batch_term_microcompetency_weightages_active 
ON batch_term_microcompetency_weightages(config_id, is_active) WHERE is_active = true;

-- Update existing data to set default values
UPDATE batch_term_subcategory_weightages 
SET is_active = true, business_rules = '{}' 
WHERE is_active IS NULL OR business_rules IS NULL;

UPDATE batch_term_component_weightages 
SET is_active = true, business_rules = '{}' 
WHERE is_active IS NULL OR business_rules IS NULL;

UPDATE batch_term_microcompetency_weightages 
SET is_active = true, business_rules = '{}' 
WHERE is_active IS NULL OR business_rules IS NULL;
