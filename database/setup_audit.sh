#!/bin/bash

# PEP Score Nexus Database Audit Setup Script
# This script sets up the environment and runs the database audit

echo "🔍 PEP Score Nexus Database Audit Setup"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Navigate to the database directory
cd "$(dirname "$0")"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
else
    echo "❌ package.json not found. Please ensure you're in the correct directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo "📝 Please create a .env file with your Supabase credentials"
    echo "   You can copy .env.example and update the values:"
    echo "   cp .env.example .env"
    echo ""
    echo "   Required variables:"
    echo "   - SUPABASE_DB_HOST"
    echo "   - SUPABASE_DB_PORT"
    echo "   - SUPABASE_DB_NAME"
    echo "   - SUPABASE_DB_USER"
    echo "   - SUPABASE_DB_PASSWORD"
    echo ""
    
    read -p "Do you want to create .env file now? (y/n): " create_env
    
    if [ "$create_env" = "y" ] || [ "$create_env" = "Y" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✅ .env file created from template"
            echo "📝 Please edit .env file with your actual Supabase credentials"
            echo "   nano .env"
        else
            echo "❌ .env.example not found"
        fi
    fi
    
    echo ""
    echo "🔧 After setting up .env, run the audit with:"
    echo "   npm run audit"
    exit 0
fi

echo "✅ .env file found"

# Run the audit
echo ""
echo "🚀 Starting database audit..."
echo "=============================="

npm run audit

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database audit completed successfully!"
    echo ""
    echo "📄 Check the generated JSON report for detailed results"
    echo "📊 Review the console output for summary information"
else
    echo ""
    echo "❌ Database audit failed"
    echo "🔧 Please check your database credentials and connection"
fi
