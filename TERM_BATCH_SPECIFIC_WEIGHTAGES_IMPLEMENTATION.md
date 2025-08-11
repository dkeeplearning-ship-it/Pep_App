# Term-Batch Specific Weightages Implementation

## Overview

This document outlines the comprehensive implementation of term-specific and batch-specific weightages for the PEP Score Nexus system. The implementation addresses the client's requirement for different weightages across different terms and batches while maintaining backward compatibility with the existing system.

## Problem Statement

The current system uses fixed weightages stored in database tables (`quadrants`, `sub_categories`, `components`, `microcompetencies`) and hardcoded weightages in the scoring calculation service. The client needs:

1. **Term-specific weightages**: Different weightages for different terms
2. **Batch-specific weightages**: Different batches should have different weightages for the same term
3. **Hierarchical weightages**: Different weightages at all levels (quadrant, sub-category, component, microcompetency)
4. **Backward compatibility**: System should work with existing data and fall back to defaults when no specific configuration exists

## Solution Architecture

### 1. Database Schema Design

#### New Tables Created:

1. **`batch_term_weightage_config`**: Main configuration table
   - Links batch-term combinations to weightage configurations
   - Supports multiple configurations per batch-term (with one active)
   - Tracks creation and modification history

2. **`batch_term_quadrant_weightages`**: Term-batch specific quadrant weightages
   - Overrides default quadrant weightages
   - Includes minimum attendance and business rules

3. **`batch_term_subcategory_weightages`**: Term-batch specific subcategory weightages
   - Overrides default subcategory weightages within quadrants

4. **`batch_term_component_weightages`**: Term-batch specific component weightages
   - Overrides default component weightages within subcategories
   - Can override max_score and minimum_score

5. **`batch_term_microcompetency_weightages`**: Term-batch specific microcompetency weightages
   - Overrides default microcompetency weightages within components
   - Can override max_score

6. **`weightage_inheritance_rules`**: Rules for inheriting weightages
   - Supports batch-to-batch, term-to-term, and default system inheritance

7. **`weightage_change_audit`**: Audit trail for all weightage changes
   - Tracks who changed what, when, and why
   - Maintains history for compliance and debugging

### 2. Backend Services

#### Enhanced Services Created:

1. **`enhancedWeightageValidationService.js`**
   - Fetches term-batch specific weightages with fallback to defaults
   - Validates weightage totals at all levels
   - Manages weightage configuration CRUD operations

2. **`enhancedUnifiedScoreCalculationService.js`**
   - Uses dynamic weightages based on student's batch and term
   - Maintains backward compatibility with existing scoring logic
   - Applies hierarchical weightages correctly

3. **`batchTermWeightageController.js`**
   - API controller for managing batch-term weightages
   - Handles CRUD operations, validation, and bulk operations

### 3. API Endpoints

New API endpoints under `/api/v1/admin/batch-term-weightages/`:

- `GET /` - Get all configurations
- `GET /:batchId/:termId` - Get specific configuration
- `POST /` - Create new configuration
- `PUT /:batchId/:termId/quadrants` - Update quadrant weightages
- `PUT /:batchId/:termId/subcategories` - Update subcategory weightages
- `GET /:batchId/:termId/validate` - Validate configuration
- `POST /:batchId/:termId/recalculate` - Recalculate all student scores
- `POST /copy` - Copy configuration between batch-terms

### 4. Database Functions

#### Helper Functions:

1. **`get_batch_term_weightage_config(batch_id, term_id)`**
   - Returns active configuration ID for batch-term combination

2. **`get_quadrant_weightage(batch_id, term_id, quadrant_id)`**
   - Returns quadrant weightage with fallback to default

3. **`validate_weightage_totals(config_id)`**
   - Validates that weightages sum to 100% at each level

4. **`copy_default_*_weightages(config_id)`**
   - Functions to copy default weightages to new configurations

5. **`copy_weightage_configuration(source_config_id, target_config_id)`**
   - Copies weightages from one configuration to another

## Implementation Features

### 1. Backward Compatibility
- System falls back to default weightages when no specific configuration exists
- Existing APIs continue to work without modification
- Gradual migration path for existing data

### 2. Validation System
- Comprehensive validation at all levels
- Real-time validation feedback
- Prevents invalid weightage configurations

### 3. Audit Trail
- Complete audit trail for all weightage changes
- Tracks who made changes, when, and why
- Supports compliance and debugging requirements

### 4. Inheritance System
- Copy weightages from other batch-term combinations
- Inherit from previous terms or batches
- Default system fallback

### 5. Performance Optimization
- Efficient database queries with proper indexing
- Caching of frequently accessed weightages
- Minimal impact on existing score calculations

## Migration Strategy

### Phase 1: Database Migration
1. Run the migration script: `database/migrations/add_term_batch_specific_weightages.sql`
2. Execute: `SELECT migrate_existing_weightages();` to migrate existing data
3. Verify migration with validation queries

### Phase 2: Backend Deployment
1. Deploy new services and controllers
2. Update existing services to use enhanced versions
3. Test API endpoints thoroughly

### Phase 3: Frontend Integration
1. Create admin interfaces for weightage management
2. Add validation feedback and preview features
3. Implement bulk operations and copy functionality

### Phase 4: Testing and Validation
1. Comprehensive testing of all scenarios
2. Performance testing with large datasets
3. User acceptance testing with admin users

## Usage Examples

### Creating a New Configuration
```javascript
POST /api/v1/admin/batch-term-weightages/
{
  "batch_id": "batch-uuid",
  "term_id": "term-uuid",
  "config_name": "Batch 2024 Term 1 Custom Weightages",
  "description": "Custom weightages for advanced batch",
  "inherit_from": null // or another config_id
}
```

### Updating Quadrant Weightages
```javascript
PUT /api/v1/admin/batch-term-weightages/batch-uuid/term-uuid/quadrants
{
  "weightages": [
    {
      "quadrant_id": "persona",
      "weightage": 60.0,
      "minimum_attendance": 75.0
    },
    {
      "quadrant_id": "wellness",
      "weightage": 25.0,
      "minimum_attendance": 80.0
    },
    {
      "quadrant_id": "behavior",
      "weightage": 10.0,
      "minimum_attendance": 75.0
    },
    {
      "quadrant_id": "discipline",
      "weightage": 5.0,
      "minimum_attendance": 90.0
    }
  ]
}
```

### Score Calculation with Dynamic Weightages
The enhanced scoring service automatically:
1. Detects student's batch and current term
2. Fetches appropriate weightage configuration
3. Falls back to defaults if no specific configuration exists
4. Applies dynamic weightages in the calculation
5. Updates student score summary with version tracking

## Benefits

1. **Flexibility**: Different weightages for different batches and terms
2. **Scalability**: Supports unlimited batch-term combinations
3. **Maintainability**: Clean separation of concerns and modular design
4. **Auditability**: Complete audit trail for compliance
5. **Performance**: Optimized queries and minimal overhead
6. **User-Friendly**: Intuitive admin interfaces for weightage management

## Next Steps

1. **Frontend Development**: Create admin interfaces for weightage management
2. **Testing**: Comprehensive testing across all scenarios
3. **Documentation**: User guides and training materials
4. **Deployment**: Staged rollout with monitoring
5. **Support**: Training for administrators and ongoing support

## Technical Considerations

### Database Performance
- Proper indexing on all foreign keys and frequently queried columns
- Efficient queries with minimal joins
- Caching strategy for frequently accessed weightages

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate weightage ranges
- Triggers maintain audit trail automatically

### Security
- Role-based access control for weightage management
- Audit trail for security compliance
- Input validation and sanitization

### Monitoring
- Performance monitoring for score calculations
- Error tracking and alerting
- Usage analytics for optimization

This implementation provides a robust, scalable, and maintainable solution for term-batch specific weightages while ensuring backward compatibility and system reliability.
