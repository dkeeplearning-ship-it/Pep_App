#!/bin/bash

# Setup and Test Script for Batch-Term Weightages
# This script helps set up the environment and run comprehensive tests

echo "🚀 PEP Score Nexus - Batch-Term Weightages Setup and Test"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Check if backend directory exists
print_status "Step 1: Checking project structure..."
if [ -d "backend" ]; then
    print_success "Backend directory found"
    cd backend
else
    print_error "Backend directory not found"
    exit 1
fi

# Step 2: Install dependencies
print_status "Step 2: Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Check if server is running
print_status "Step 3: Checking if server is running..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Server is running"
else
    print_warning "Server is not running. Please start your backend server first."
    print_status "You can start it with: npm start or npm run dev"
    echo ""
    read -p "Press Enter after starting your server, or Ctrl+C to exit..."
fi

# Step 4: Get admin token
print_status "Step 4: Setting up admin token..."
if [ -z "$ADMIN_TOKEN" ]; then
    print_warning "ADMIN_TOKEN environment variable not set"
    echo "Please provide an admin token. You can get one by:"
    echo "1. Login as admin through your app"
    echo "2. Or get one from database: SELECT session_token FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE u.role = 'admin' AND us.is_active = true LIMIT 1;"
    echo ""
    read -p "Enter admin token: " ADMIN_TOKEN
    export ADMIN_TOKEN
fi

if [ -n "$ADMIN_TOKEN" ]; then
    print_success "Admin token configured"
else
    print_error "Admin token is required for testing"
    exit 1
fi

# Step 5: Set up environment variables
print_status "Step 5: Setting up environment variables..."
export API_BASE_URL="http://localhost:3001/api/v1"
export DEBUG="true"

print_success "Environment configured:"
echo "  API_BASE_URL: $API_BASE_URL"
echo "  ADMIN_TOKEN: ${ADMIN_TOKEN:0:10}..."
echo "  DEBUG: $DEBUG"

# Step 6: Run comprehensive tests
print_status "Step 6: Running comprehensive tests..."
cd ..
if node test_and_fix_system.js; then
    print_success "Tests completed successfully"
else
    print_warning "Some tests failed. Check the output above for details."
fi

# Step 7: Provide next steps
echo ""
echo "=========================================================="
print_status "Next Steps Based on Test Results:"
echo ""
echo "If tests passed:"
echo "  ✅ Your system is ready for frontend development"
echo "  ✅ You can start creating custom weightage configurations"
echo "  ✅ Score calculations are using dynamic weightages"
echo ""
echo "If tests failed:"
echo "  🔧 Check the error messages and suggested fixes above"
echo "  🔧 Common issues and solutions:"
echo "     - Server not running: Start with 'npm start' in backend/"
echo "     - Database not migrated: Run the SQL migration script"
echo "     - Missing admin token: Get token from login or database"
echo "     - Route not found: Check if server.js includes new routes"
echo ""
echo "For detailed testing, you can also run:"
echo "  node test_batch_term_weightages.js"
echo ""
echo "=========================================================="

# Step 8: Optional - Create a sample configuration
read -p "Would you like to create a sample weightage configuration? (y/n): " create_sample

if [ "$create_sample" = "y" ] || [ "$create_sample" = "Y" ]; then
    print_status "Creating sample configuration..."
    
    # This would need to be customized based on actual batch/term IDs
    echo "To create a sample configuration, you'll need:"
    echo "1. A batch ID from your database"
    echo "2. A term ID from your database"
    echo ""
    echo "You can get these with:"
    echo "SELECT id, name FROM batches WHERE is_active = true LIMIT 1;"
    echo "SELECT id, name FROM terms WHERE is_active = true LIMIT 1;"
    echo ""
    echo "Then use the API endpoints to create and configure weightages."
fi

print_success "Setup and testing complete!"
