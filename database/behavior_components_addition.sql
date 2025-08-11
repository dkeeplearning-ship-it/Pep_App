-- Add Behavior Rating Tool Components to match Excel system
-- These are the 5 specific behavior criteria from Excel

-- First, get the Behavior quadrant ID
DO $$
DECLARE
    behavior_quadrant_id UUID;
    behavior_rating_subcategory_id UUID;
BEGIN
    -- Get Behavior quadrant ID
    SELECT id INTO behavior_quadrant_id 
    FROM quadrants 
    WHERE name = 'Behavior' 
    LIMIT 1;
    
    -- Create or get Behavior Rating Tool sub-category
    INSERT INTO sub_categories (quadrant_id, name, description, weightage, display_order, is_active)
    VALUES (behavior_quadrant_id, 'Behavior Rating Tool', 'Faculty-based 1-5 rating scale for specific behavior criteria', 100.00, 1, true)
    ON CONFLICT (quadrant_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        weightage = EXCLUDED.weightage
    RETURNING id INTO behavior_rating_subcategory_id;
    
    -- Add the 5 Excel behavior components with 5-point scale
    INSERT INTO components (sub_category_id, name, category, max_score, description, display_order, is_active) VALUES
    (behavior_rating_subcategory_id, 'Prepares for class', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 1, true),
    (behavior_rating_subcategory_id, 'Participates in class discussions', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 2, true),
    (behavior_rating_subcategory_id, 'Demonstrates good manners', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 3, true),
    (behavior_rating_subcategory_id, 'Arrives on time and is properly groomed', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 4, true),
    (behavior_rating_subcategory_id, 'Submits good quality assignments following ethical standards', 'Behavior', 5.00, '1-5 rating scale: 5=Consistently demonstrates, 1=Often demonstrates negative behavior', 5, true)
    ON CONFLICT (sub_category_id, name) DO UPDATE SET
        max_score = EXCLUDED.max_score,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order;
        
END $$;
