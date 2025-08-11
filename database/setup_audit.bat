@echo off
REM PEP Score Nexus Database Audit Setup Script for Windows
REM This script sets up the environment and runs the database audit

echo 🔍 PEP Score Nexus Database Audit Setup
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version

REM Navigate to the database directory
cd /d "%~dp0"

REM Install dependencies if package.json exists
if exist "package.json" (
    echo 📦 Installing dependencies...
    npm install
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ package.json not found. Please ensure you're in the correct directory.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found
    echo 📝 Please create a .env file with your Supabase credentials
    echo    You can copy .env.example and update the values:
    echo    copy .env.example .env
    echo.
    echo    Required variables:
    echo    - SUPABASE_DB_HOST
    echo    - SUPABASE_DB_PORT
    echo    - SUPABASE_DB_NAME
    echo    - SUPABASE_DB_USER
    echo    - SUPABASE_DB_PASSWORD
    echo.
    
    set /p create_env="Do you want to create .env file now? (y/n): "
    
    if /i "%create_env%"=="y" (
        if exist ".env.example" (
            copy .env.example .env
            echo ✅ .env file created from template
            echo 📝 Please edit .env file with your actual Supabase credentials
            echo    notepad .env
        ) else (
            echo ❌ .env.example not found
        )
    )
    
    echo.
    echo 🔧 After setting up .env, run the audit with:
    echo    npm run audit
    pause
    exit /b 0
)

echo ✅ .env file found

REM Run the audit
echo.
echo 🚀 Starting database audit...
echo ==============================

npm run audit

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Database audit completed successfully!
    echo.
    echo 📄 Check the generated JSON report for detailed results
    echo 📊 Review the console output for summary information
) else (
    echo.
    echo ❌ Database audit failed
    echo 🔧 Please check your database credentials and connection
)

pause
