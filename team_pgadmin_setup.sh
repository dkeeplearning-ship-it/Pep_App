#!/bin/bash

# PEP Score Nexus - Team pgAdmin Setup Script
# This script helps team members set up pgAdmin to access the shared database

echo "🚀 PEP Score Nexus - Team pgAdmin Setup"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    print_error "This script is designed for Ubuntu/Debian systems"
    exit 1
fi

print_info "Checking system requirements..."

# Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Installing..."
    sudo apt update
    sudo apt install -y postgresql-client
    print_status "PostgreSQL client installed"
else
    print_status "PostgreSQL client is already installed"
fi

# Check if pgAdmin4 is installed
if ! command -v pgadmin4 &> /dev/null && [ ! -f "/usr/pgadmin4/bin/setup-web.sh" ]; then
    print_warning "pgAdmin4 not found. Installing..."
    
    # Add pgAdmin4 repository
    curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg
    sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list'
    
    # Update and install
    sudo apt update
    sudo apt install -y pgadmin4
    
    print_status "pgAdmin4 installed"
    
    # Setup web interface
    print_info "Setting up pgAdmin4 web interface..."
    sudo /usr/pgadmin4/bin/setup-web.sh
    
else
    print_status "pgAdmin4 is already installed"
fi

# Test database connection
print_info "Testing database connection..."

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pep_score_nexus"
DB_USER="postgres"

# Prompt for database host if not localhost
read -p "Enter database host (press Enter for localhost): " input_host
if [ ! -z "$input_host" ]; then
    DB_HOST="$input_host"
fi

# Test connection
export PGPASSWORD="newpassword"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'Connection successful!' as status;" &> /dev/null; then
    print_status "Database connection successful!"
else
    print_error "Cannot connect to database. Please check:"
    echo "  - Host: $DB_HOST"
    echo "  - Port: $DB_PORT"
    echo "  - Database: $DB_NAME"
    echo "  - Username: $DB_USER"
    echo "  - Password: newpassword"
    exit 1
fi

# Get local IP for team sharing
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
print_status "Setup completed successfully!"
echo ""
print_info "pgAdmin4 Access Information:"
echo "  🌐 URL: http://127.0.0.1/pgadmin4"
echo "  📧 Email: admin@pepscorennexus.com"
echo "  🔑 Password: admin123"
echo ""
print_info "Database Connection Details:"
echo "  🖥️  Host: $DB_HOST"
echo "  🔌 Port: $DB_PORT"
echo "  🗄️  Database: $DB_NAME"
echo "  👤 Username: $DB_USER"
echo "  🔑 Password: newpassword"
echo ""
print_info "For Team Access (if sharing this machine):"
echo "  🌐 Team URL: http://$LOCAL_IP/pgadmin4"
echo "  🖥️  Team Host: $LOCAL_IP"
echo ""
print_warning "Next Steps:"
echo "1. Open pgAdmin4 in your browser"
echo "2. Login with the credentials above"
echo "3. Add a new server connection"
echo "4. Use the database connection details"
echo "5. Explore the 31 tables in pep_score_nexus database"
echo ""
print_info "Documentation:"
echo "  📖 Setup Guide: docs/database/pgAdmin_Team_Setup_Guide.md"
echo "  🗄️  Database Guide: docs/database/PostgreSQL_Setup_Guide.md"
echo ""

# Open pgAdmin in browser
read -p "Would you like to open pgAdmin4 in your browser now? (y/n): " open_browser
if [[ $open_browser =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://127.0.0.1/pgadmin4"
        print_status "pgAdmin4 opened in browser"
    elif command -v open &> /dev/null; then
        open "http://127.0.0.1/pgadmin4"
        print_status "pgAdmin4 opened in browser"
    else
        print_info "Please manually open: http://127.0.0.1/pgadmin4"
    fi
fi

echo ""
print_status "🎉 Team pgAdmin setup complete! Happy database exploring!"
