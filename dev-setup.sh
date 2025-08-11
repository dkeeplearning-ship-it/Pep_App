#!/bin/bash

# PEP Score Nexus - Development Setup Script
# This script helps set up the entire development environment

echo "🚀 PEP Score Nexus - Development Setup"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the pep-score-nexus root directory"
    exit 1
fi

print_info "Setting up PEP Score Nexus development environment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists psql; then
    print_warning "PostgreSQL client not found. Database setup may not work."
fi

print_status "Prerequisites check completed"

# Setup database
print_info "Setting up database..."
if command_exists psql; then
    export PGPASSWORD="newpassword"
    
    # Check if database exists
    if psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -qw pep_score_nexus; then
        print_status "Database 'pep_score_nexus' already exists"
    else
        print_info "Creating database..."
        if psql -U postgres -h localhost -c "CREATE DATABASE pep_score_nexus;" 2>/dev/null; then
            print_status "Database created successfully"
        else
            print_warning "Could not create database. You may need to set it up manually."
        fi
    fi
    
    # Test connection
    if psql -U postgres -h localhost -d pep_score_nexus -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_warning "Could not connect to database. Please check PostgreSQL setup."
    fi
else
    print_warning "PostgreSQL not available. Skipping database setup."
fi

# Setup backend
print_info "Setting up backend..."
cd backend

if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found"
    exit 1
fi

print_info "Installing backend dependencies..."
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

cd ..

# Setup frontend
print_info "Setting up frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found"
    exit 1
fi

print_info "Installing frontend dependencies..."

# Check if bun is available
if command_exists bun; then
    print_info "Using Bun for frontend dependencies..."
    if bun install; then
        print_status "Frontend dependencies installed with Bun"
    else
        print_warning "Bun install failed, falling back to npm..."
        if npm install; then
            print_status "Frontend dependencies installed with npm"
        else
            print_error "Failed to install frontend dependencies"
            exit 1
        fi
    fi
else
    print_info "Using npm for frontend dependencies..."
    if npm install; then
        print_status "Frontend dependencies installed with npm"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
fi

cd ..

# Test setup
print_info "Testing setup..."

# Test backend
print_info "Testing backend setup..."
cd backend
if npm run dev &
then
    BACKEND_PID=$!
    sleep 5
    
    if curl -s http://localhost:3001/health >/dev/null; then
        print_status "Backend is running correctly"
        kill $BACKEND_PID 2>/dev/null
    else
        print_warning "Backend may not be running correctly"
        kill $BACKEND_PID 2>/dev/null
    fi
else
    print_warning "Could not start backend for testing"
fi

cd ..

print_status "Development setup completed!"

echo ""
print_info "🎯 Next Steps:"
echo "1. Start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:3001"
echo "   pgAdmin: http://127.0.0.1/pgadmin4 (if installed)"
echo ""
print_info "📚 Documentation:"
echo "   Main README: README.md"
echo "   Frontend: frontend/README.md"
echo "   Database: docs/database/"
echo ""
print_info "🧪 Testing:"
echo "   Test APIs: ./test_apis.sh"
echo "   Setup pgAdmin: ./team_pgadmin_setup.sh"
echo ""

# Ask if user wants to start services
read -p "Would you like to start the development servers now? (y/n): " start_servers

if [[ $start_servers =~ ^[Yy]$ ]]; then
    print_info "Starting development servers..."
    
    # Start backend in background
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    # Start frontend
    cd frontend
    print_info "Starting frontend... (Press Ctrl+C to stop both servers)"
    npm run dev
    
    # Cleanup
    kill $BACKEND_PID 2>/dev/null
else
    print_info "Setup complete! Use the commands above to start the servers manually."
fi
