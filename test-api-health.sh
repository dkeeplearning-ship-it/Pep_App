#!/bin/bash

# PEP Score Nexus API Health Check Script
# This script performs a quick health check of all critical API endpoints

echo "🎯 PEP Score Nexus API Health Check"
echo "===================================="

# Configuration
API_BASE="http://localhost:3001/api/v1"
ADMIN_USER="admin1"
ADMIN_PASS="password123"
TEACHER_USER="sri@e.com"
TEACHER_PASS="12345678"
STUDENT_USER="student1"
STUDENT_PASS="password123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_endpoint() {
    local description="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    
    ((TOTAL_TESTS++))
    log_info "Testing: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -H "$headers" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -H "$headers" -d "$data" "$API_BASE$endpoint")
    fi
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        log_success "$description - HTTP $http_code"
        return 0
    else
        log_error "$description - Expected HTTP $expected_status, got HTTP $http_code"
        if [ ! -z "$response_body" ]; then
            echo "Response: $response_body" | head -c 200
            echo ""
        fi
        return 1
    fi
}

# Start testing
echo ""
log_info "Starting API health check..."
echo ""

# Test 1: Admin Login
log_info "=== Phase 1: Authentication Tests ==="
ADMIN_TOKEN=""
response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
    "$API_BASE/auth/login")

((TOTAL_TESTS++))
if echo "$response" | grep -q '"success":true'; then
    ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "Admin login successful"
else
    log_error "Admin login failed"
    echo "Response: $response"
fi

# Test 2: Teacher Login
TEACHER_TOKEN=""
response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEACHER_USER\",\"password\":\"$TEACHER_PASS\"}" \
    "$API_BASE/auth/login")

((TOTAL_TESTS++))
if echo "$response" | grep -q '"success":true'; then
    TEACHER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "Teacher login successful"
else
    log_error "Teacher login failed"
    echo "Response: $response"
fi

# Test 3: Student Login
STUDENT_TOKEN=""
response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"$STUDENT_USER\",\"password\":\"$STUDENT_PASS\"}" \
    "$API_BASE/auth/login")

((TOTAL_TESTS++))
if echo "$response" | grep -q '"success":true'; then
    STUDENT_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "Student login successful"
else
    log_error "Student login failed"
    echo "Response: $response"
fi

# Test 4: Invalid Login
response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"username":"invalid","password":"wrong"}' \
    "$API_BASE/auth/login")

((TOTAL_TESTS++))
if echo "$response" | grep -q '"success":false'; then
    log_success "Invalid login correctly rejected"
else
    log_error "Security issue: Invalid login was accepted!"
fi

echo ""
log_info "=== Phase 2: Admin API Tests ==="

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Test admin endpoints
    test_endpoint "Get all students" "GET" "/students" "Authorization: Bearer $ADMIN_TOKEN" "" "200"
    test_endpoint "Get all batches" "GET" "/level-progression/batches" "Authorization: Bearer $ADMIN_TOKEN" "" "200"
    test_endpoint "Get all teachers" "GET" "/teachers" "Authorization: Bearer $ADMIN_TOKEN" "" "200"
    test_endpoint "Get all interventions" "GET" "/interventions" "Authorization: Bearer $ADMIN_TOKEN" "" "200"
else
    log_warning "Skipping admin tests - no admin token"
fi

echo ""
log_info "=== Phase 3: Teacher API Tests ==="

if [ ! -z "$TEACHER_TOKEN" ]; then
    # Test teacher endpoints
    test_endpoint "Teacher dashboard access" "GET" "/teacher-dashboard" "Authorization: Bearer $TEACHER_TOKEN" "" "200"
else
    log_warning "Skipping teacher tests - no teacher token"
fi

echo ""
log_info "=== Phase 4: Student API Tests ==="

if [ ! -z "$STUDENT_TOKEN" ]; then
    # Test student endpoints
    test_endpoint "Student dashboard access" "GET" "/student-dashboard" "Authorization: Bearer $STUDENT_TOKEN" "" "200"
else
    log_warning "Skipping student tests - no student token"
fi

echo ""
log_info "=== Phase 5: Critical Functionality Tests ==="

if [ ! -z "$ADMIN_TOKEN" ]; then
    # Test batch completion with real UUID
    log_info "Testing batch completion with real UUID..."
    
    # Get first batch
    batch_response=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_BASE/level-progression/batches")
    
    if echo "$batch_response" | grep -q '"success":true'; then
        # Extract first batch ID and current term
        batch_id=$(echo "$batch_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        current_term=$(echo "$batch_response" | grep -o '"current_term_number":[0-9]*' | head -1 | cut -d':' -f2)
        
        if [ ! -z "$batch_id" ] && [ ! -z "$current_term" ]; then
            log_info "Testing completion of term $current_term for batch $batch_id"
            
            completion_response=$(curl -s -X POST \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"triggeredBy":"admin"}' \
                "$API_BASE/level-progression/batches/$batch_id/complete-term/$current_term")
            
            ((TOTAL_TESTS++))
            if echo "$completion_response" | grep -q '"success":true'; then
                log_success "Batch term completion successful"
            else
                log_error "Batch term completion failed"
                echo "Response: $completion_response" | head -c 200
                echo ""
            fi
        else
            log_warning "Could not extract batch ID or term number"
        fi
    else
        log_warning "Could not fetch batches for completion test"
    fi
fi

echo ""
log_info "=== Phase 6: Database Connectivity Test ==="

# Test if we can reach the database through the API
((TOTAL_TESTS++))
if [ ! -z "$ADMIN_TOKEN" ]; then
    db_test=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API_BASE/students")
    if echo "$db_test" | grep -q '"success":true'; then
        log_success "Database connectivity working"
    else
        log_error "Database connectivity issues"
    fi
else
    log_warning "Skipping database test - no admin token"
fi

echo ""
echo "🏁 Test Summary"
echo "==============="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠️  Some tests failed. Success rate: $SUCCESS_RATE%${NC}"
fi

echo ""
if [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${GREEN}🎉 System appears to be healthy!${NC}"
    exit 0
else
    echo -e "${RED}🚨 System has issues that need attention!${NC}"
    exit 1
fi
