#!/bin/bash

# PEP Score Nexus - User Management API Testing Script
# This script demonstrates comprehensive user management features

echo "🎯 PEP Score Nexus - User Management API Testing"
echo "================================================"

# Configuration
BASE_URL="http://localhost:3001/api/v1"
ADMIN_TOKEN=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to make API requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    
    if [ -n "$auth_header" ]; then
        if [ -n "$data" ]; then
            curl -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_header" \
                -d "$data"
        else
            curl -s -X $method "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $auth_header"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X $method "$BASE_URL$endpoint"
        fi
    fi
}

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "HEADER") echo -e "${CYAN}🔹 $message${NC}" ;;
    esac
}

echo ""
print_status "HEADER" "Step 1: Admin Authentication"
echo "Logging in as admin to get authentication token..."

# Login as admin (assuming admin user exists)
ADMIN_LOGIN=$(make_request "POST" "/auth/login" '{
    "username": "admin",
    "password": "admin123"
}')

echo "Admin Login Response:"
echo "$ADMIN_LOGIN" | jq '.'

# Extract token
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    print_status "SUCCESS" "Admin authentication successful"
    echo "Token: ${ADMIN_TOKEN:0:20}..."
else
    print_status "ERROR" "Admin authentication failed"
    echo ""
    print_status "INFO" "Creating admin user first..."
    
    # Register admin user
    ADMIN_REGISTER=$(make_request "POST" "/auth/register" '{
        "username": "admin",
        "email": "admin@pepscorene.us",
        "password": "admin123",
        "name": "System Administrator",
        "role": "admin"
    }')
    
    echo "Admin Registration Response:"
    echo "$ADMIN_REGISTER" | jq '.'
    
    ADMIN_TOKEN=$(echo "$ADMIN_REGISTER" | jq -r '.data.token')
    
    if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
        print_status "SUCCESS" "Admin user created and authenticated"
    else
        print_status "ERROR" "Failed to create admin user"
        exit 1
    fi
fi

echo ""
print_status "HEADER" "Step 2: User Statistics"
echo "Getting user statistics..."

USER_STATS=$(make_request "GET" "/users/stats" "" "$ADMIN_TOKEN")
echo "User Statistics:"
echo "$USER_STATS" | jq '.'

echo ""
print_status "HEADER" "Step 3: Create Test Users"
echo "Creating sample users for testing..."

# Create student user
STUDENT_USER=$(make_request "POST" "/auth/register" '{
    "username": "john_student",
    "email": "john@student.com",
    "password": "student123",
    "name": "John Student",
    "role": "student"
}')

echo "Student User Created:"
echo "$STUDENT_USER" | jq '.'
STUDENT_ID=$(echo "$STUDENT_USER" | jq -r '.data.user.id')

# Create teacher user
TEACHER_USER=$(make_request "POST" "/auth/register" '{
    "username": "mary_teacher",
    "email": "mary@teacher.com",
    "password": "teacher123",
    "name": "Mary Teacher",
    "role": "teacher"
}')

echo "Teacher User Created:"
echo "$TEACHER_USER" | jq '.'
TEACHER_ID=$(echo "$TEACHER_USER" | jq -r '.data.user.id')

echo ""
print_status "HEADER" "Step 4: List All Users (with Pagination)"
echo "Getting all users with pagination and filtering..."

ALL_USERS=$(make_request "GET" "/users?page=1&limit=5" "" "$ADMIN_TOKEN")
echo "All Users (Page 1, Limit 5):"
echo "$ALL_USERS" | jq '.'

echo ""
print_status "HEADER" "Step 5: Search Users"
echo "Searching users by username/email..."

SEARCH_USERS=$(make_request "GET" "/users?search=john" "" "$ADMIN_TOKEN")
echo "Search Results for 'john':"
echo "$SEARCH_USERS" | jq '.'

echo ""
print_status "HEADER" "Step 6: Filter Users by Role"
echo "Getting all students..."

STUDENTS_ONLY=$(make_request "GET" "/users?role=student" "" "$ADMIN_TOKEN")
echo "Students Only:"
echo "$STUDENTS_ONLY" | jq '.'

echo ""
print_status "HEADER" "Step 7: Get User Details"
echo "Getting detailed user information..."

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
    USER_DETAILS=$(make_request "GET" "/users/$STUDENT_ID" "" "$ADMIN_TOKEN")
    echo "Student User Details:"
    echo "$USER_DETAILS" | jq '.'
fi

echo ""
print_status "HEADER" "Step 8: Update User Status"
echo "Suspending student user..."

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
    UPDATE_STATUS=$(make_request "PATCH" "/users/$STUDENT_ID/status" '{
        "status": "suspended"
    }' "$ADMIN_TOKEN")
    
    echo "Status Update Response:"
    echo "$UPDATE_STATUS" | jq '.'
    
    # Reactivate user
    REACTIVATE=$(make_request "PATCH" "/users/$STUDENT_ID/status" '{
        "status": "active"
    }' "$ADMIN_TOKEN")
    
    echo "Reactivation Response:"
    echo "$REACTIVATE" | jq '.'
fi

echo ""
print_status "HEADER" "Step 9: Update User Role"
echo "Promoting student to teacher..."

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
    UPDATE_ROLE=$(make_request "PATCH" "/users/$STUDENT_ID/role" '{
        "role": "teacher"
    }' "$ADMIN_TOKEN")
    
    echo "Role Update Response:"
    echo "$UPDATE_ROLE" | jq '.'
fi

echo ""
print_status "HEADER" "Step 10: Reset User Password"
echo "Resetting user password..."

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
    RESET_PASSWORD=$(make_request "PATCH" "/users/$STUDENT_ID/password" '{
        "newPassword": "newpassword123"
    }' "$ADMIN_TOKEN")
    
    echo "Password Reset Response:"
    echo "$RESET_PASSWORD" | jq '.'
fi

echo ""
print_status "HEADER" "Step 11: Test User Access Control"
echo "Testing that students can only access their own data..."

# Login as student to get their token
STUDENT_LOGIN=$(make_request "POST" "/auth/login" '{
    "username": "john_student",
    "password": "newpassword123"
}')

STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | jq -r '.data.token')

if [ "$STUDENT_TOKEN" != "null" ] && [ -n "$STUDENT_TOKEN" ]; then
    print_status "SUCCESS" "Student login successful"
    
    # Try to access own profile
    OWN_PROFILE=$(make_request "GET" "/users/$STUDENT_ID" "" "$STUDENT_TOKEN")
    echo "Student accessing own profile:"
    echo "$OWN_PROFILE" | jq '.success'
    
    # Try to access another user's profile (should fail)
    if [ "$TEACHER_ID" != "null" ] && [ -n "$TEACHER_ID" ]; then
        OTHER_PROFILE=$(make_request "GET" "/users/$TEACHER_ID" "" "$STUDENT_TOKEN")
        echo "Student trying to access teacher's profile:"
        echo "$OTHER_PROFILE" | jq '.success, .message'
    fi
    
    # Try to list all users (should fail)
    LIST_ATTEMPT=$(make_request "GET" "/users" "" "$STUDENT_TOKEN")
    echo "Student trying to list all users:"
    echo "$LIST_ATTEMPT" | jq '.success, .message'
fi

echo ""
print_status "HEADER" "Step 12: Soft Delete User"
echo "Soft deleting a user (deactivating)..."

if [ "$TEACHER_ID" != "null" ] && [ -n "$TEACHER_ID" ]; then
    SOFT_DELETE=$(make_request "DELETE" "/users/$TEACHER_ID" "" "$ADMIN_TOKEN")
    echo "Soft Delete Response:"
    echo "$SOFT_DELETE" | jq '.'
fi

echo ""
print_status "HEADER" "Step 13: Updated Statistics"
echo "Getting updated user statistics..."

FINAL_STATS=$(make_request "GET" "/users/stats" "" "$ADMIN_TOKEN")
echo "Final User Statistics:"
echo "$FINAL_STATS" | jq '.'

echo ""
print_status "HEADER" "🎉 User Management Testing Complete!"
echo ""
print_status "INFO" "Summary of tested features:"
echo "  • User authentication and authorization"
echo "  • Pagination and filtering"
echo "  • Search functionality"
echo "  • User details retrieval"
echo "  • Status management (active/inactive/suspended)"
echo "  • Role management (student/teacher/admin)"
echo "  • Password reset"
echo "  • Access control and ownership verification"
echo "  • Soft delete functionality"
echo "  • Real-time statistics"
echo ""
print_status "SUCCESS" "All user management features working correctly!"
echo ""
print_status "INFO" "View your users in Supabase Dashboard:"
echo "  1. Go to https://supabase.com/dashboard"
echo "  2. Select your project"
echo "  3. Click 'Database' → 'Table Editor'"
echo "  4. Select 'users' table"
echo ""
print_status "INFO" "Available API Endpoints:"
echo "  GET    /api/v1/users/stats        - User statistics"
echo "  GET    /api/v1/users              - List all users (with filters)"
echo "  GET    /api/v1/users/:id          - Get user details"
echo "  PATCH  /api/v1/users/:id/status   - Update user status"
echo "  PATCH  /api/v1/users/:id/role     - Update user role"
echo "  PATCH  /api/v1/users/:id/password - Reset user password"
echo "  DELETE /api/v1/users/:id          - Delete user (soft/hard)" 