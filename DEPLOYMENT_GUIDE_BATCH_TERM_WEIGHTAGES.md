# Deployment Guide: Batch-Term Specific Weightages

## Overview

This guide provides step-by-step instructions for deploying the batch-term specific weightages feature to the PEP Score Nexus system.

## Prerequisites

- Database admin access (PostgreSQL)
- Backend server admin access
- Admin user credentials for testing
- Backup of current system (recommended)

## Deployment Steps

### Phase 1: Database Migration

#### Step 1.1: Backup Current Database
```bash
# Create a backup before migration
pg_dump -h your-host -U your-user -d pep_score_nexus > backup_before_weightage_migration.sql
```

#### Step 1.2: Run Database Migration
```bash
# Connect to your database
psql -h your-host -U your-user -d pep_score_nexus

# Run the migration script
\i database/migrations/add_term_batch_specific_weightages.sql
```

#### Step 1.3: Migrate Existing Data
```sql
-- Execute the migration function
SELECT migrate_existing_weightages();

-- Verify migration
SELECT COUNT(*) FROM batch_term_weightage_config;
SELECT COUNT(*) FROM batch_term_quadrant_weightages;
```

#### Step 1.4: Verify Database Schema
```sql
-- Check if all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'batch_term_%';

-- Check if all functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%weightage%';

-- Verify triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%weightage%';
```

### Phase 2: Backend Deployment

#### Step 2.1: Deploy New Files
Copy the following new files to your backend server:
- `backend/src/services/enhancedWeightageValidationService.js`
- `backend/src/services/enhancedUnifiedScoreCalculationService.js`
- `backend/src/controllers/batchTermWeightageController.js`
- `backend/src/routes/batchTermWeightages.js`

#### Step 2.2: Update Existing Files
Update the following files:
- `backend/src/server.js` (add new route)

#### Step 2.3: Install Dependencies
```bash
cd backend
npm install
```

#### Step 2.4: Restart Backend Server
```bash
# Using PM2
pm2 restart pep-score-nexus-backend

# Or using systemctl
sudo systemctl restart pep-score-nexus-backend

# Or manual restart
npm run start
```

#### Step 2.5: Verify Backend Deployment
```bash
# Check server health
curl http://your-server:3001/health

# Check new API endpoints
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://your-server:3001/api/v1/admin/batch-term-weightages/batches
```

### Phase 3: Testing and Validation

#### Step 3.1: Run Automated Tests
```bash
# Set environment variables
export API_BASE_URL=http://your-server:3001/api/v1
export ADMIN_TOKEN=your-admin-token

# Run the test suite
node test_batch_term_weightages.js
```

#### Step 3.2: Manual Testing Checklist

**Database Functions:**
- [ ] `get_batch_term_weightage_config()` returns correct results
- [ ] `validate_weightage_totals()` validates correctly
- [ ] Audit triggers are working (check `weightage_change_audit` table)

**API Endpoints:**
- [ ] GET `/admin/batch-term-weightages/` returns configurations
- [ ] POST `/admin/batch-term-weightages/` creates new configurations
- [ ] PUT `/admin/batch-term-weightages/:batchId/:termId/quadrants` updates weightages
- [ ] GET `/admin/batch-term-weightages/:batchId/:termId/validate` validates configurations

**Score Calculation:**
- [ ] Enhanced unified score calculation uses dynamic weightages
- [ ] Fallback to default weightages works when no specific config exists
- [ ] Student score summaries are updated with correct version (3)

#### Step 3.3: Performance Testing
```bash
# Test score calculation performance
time curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://your-server:3001/api/v1/unified-scores/calculate/STUDENT_ID/TERM_ID

# Test bulk recalculation
time curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://your-server:3001/api/v1/admin/batch-term-weightages/BATCH_ID/TERM_ID/recalculate
```

### Phase 4: Data Validation

#### Step 4.1: Verify Weightage Migration
```sql
-- Check that all active batches have configurations
SELECT b.name as batch_name, t.name as term_name, 
       CASE WHEN btc.id IS NOT NULL THEN 'Has Config' ELSE 'Missing Config' END as status
FROM batches b
CROSS JOIN terms t
LEFT JOIN batch_term_weightage_config btc ON b.id = btc.batch_id AND t.id = btc.term_id
WHERE b.is_active = true AND t.is_active = true
ORDER BY b.name, t.name;
```

#### Step 4.2: Validate Weightage Totals
```sql
-- Validate all configurations
SELECT btc.id, btc.config_name, validate_weightage_totals(btc.id) as validation
FROM batch_term_weightage_config btc
WHERE btc.is_active = true;
```

#### Step 4.3: Check Score Calculation Versions
```sql
-- Verify that scores are being calculated with new version
SELECT calculation_version, COUNT(*) as count
FROM student_score_summary
GROUP BY calculation_version
ORDER BY calculation_version;
```

### Phase 5: Monitoring and Rollback Plan

#### Step 5.1: Set Up Monitoring
Monitor the following metrics:
- API response times for weightage endpoints
- Score calculation performance
- Database query performance
- Error rates in application logs

#### Step 5.2: Rollback Plan (if needed)

**Database Rollback:**
```sql
-- Disable new system (if needed)
UPDATE batch_term_weightage_config SET is_active = false;

-- Restore from backup (if necessary)
-- psql -h your-host -U your-user -d pep_score_nexus < backup_before_weightage_migration.sql
```

**Backend Rollback:**
```bash
# Revert to previous backend version
git checkout previous-version
npm install
pm2 restart pep-score-nexus-backend
```

### Phase 6: User Training and Documentation

#### Step 6.1: Admin Training
- Provide training on new weightage management interfaces
- Document common workflows and best practices
- Create troubleshooting guides

#### Step 6.2: Update Documentation
- Update API documentation
- Update user manuals
- Create video tutorials (if applicable)

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] All automated tests pass
- [ ] Manual testing completed successfully
- [ ] No critical errors in logs
- [ ] Performance metrics within acceptable range
- [ ] Admin users can access new features

### Short-term (Week 1)
- [ ] Monitor system performance and stability
- [ ] Collect user feedback
- [ ] Address any minor issues or bugs
- [ ] Optimize queries if needed

### Long-term (Month 1)
- [ ] Analyze usage patterns
- [ ] Optimize performance based on real usage
- [ ] Plan for additional features or improvements
- [ ] Document lessons learned

## Troubleshooting

### Common Issues

**Issue: Migration fails with foreign key errors**
```sql
-- Check for orphaned records
SELECT 'students' as table_name, COUNT(*) as orphaned_count
FROM students s
LEFT JOIN batches b ON s.batch_id = b.id
WHERE b.id IS NULL;
```

**Issue: API endpoints return 500 errors**
```bash
# Check backend logs
tail -f /var/log/pep-score-nexus/backend.log

# Check database connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'pep_score_nexus';
```

**Issue: Score calculations are slow**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename LIKE 'batch_term_%'
ORDER BY tablename, attname;
```

### Support Contacts

- Database Issues: [DBA Contact]
- Backend Issues: [Backend Team Contact]
- API Issues: [API Team Contact]
- General Support: [Support Team Contact]

## Success Criteria

The deployment is considered successful when:
1. All automated tests pass (100% pass rate)
2. Manual testing checklist is completed
3. No critical errors in system logs
4. Performance metrics are within 10% of baseline
5. Admin users can successfully manage weightages
6. Score calculations work correctly with dynamic weightages
7. System falls back gracefully to defaults when needed

## Conclusion

This deployment introduces a powerful new feature that allows for flexible weightage management across different batches and terms. The implementation maintains backward compatibility while providing the flexibility needed for different educational scenarios.

For questions or issues during deployment, refer to the troubleshooting section or contact the appropriate support team.
