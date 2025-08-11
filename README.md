# PEP Score Nexus

A comprehensive educational management system for tracking student performance across multiple assessment quadrants with advanced intervention management capabilities.

## 🚀 Live Demo

**Lovable Preview**: https://lovable.dev/projects/909f6c8d-e8fd-45e5-a9b3-498a704a71c0

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

PEP Score Nexus is a sophisticated educational management platform designed to track and analyze student performance across four key quadrants:

- **Persona** (50%): SHL Competencies + Professional Readiness
- **Wellness** (30%): Physical + Mental + Social Wellness
- **Behavior** (10%): Professional Conduct + Interpersonal Skills + Personal Development
- **Discipline** (10%): Attendance + Code of Conduct + Academic Discipline

### Key Stakeholders

- **Students**: Track performance, view feedback, participate in interventions
- **Teachers**: Assess students, manage interventions, provide feedback
- **Admins**: System management, reporting, user administration

## ✨ Features

### Core Assessment System
- **Multi-Quadrant Scoring**: Comprehensive assessment across 4 quadrants
- **Component-Level Tracking**: Detailed breakdown with specific weightages
- **Business Rule Validation**: Automatic eligibility calculation
- **Grade Calculation**: A+ to IC grading scale with status tracking

### Advanced Intervention System
- **Course/Program Management**: Create and manage educational interventions
- **Multi-Teacher Collaboration**: Assign multiple teachers to interventions
- **Task-Based Assessment**: Structured assignments with rubric scoring
- **Cross-Quadrant Integration**: Interventions spanning multiple assessment areas

### User Management
- **Role-Based Access Control**: Student, Teacher, Admin roles
- **House System**: Student engagement through house competitions
- **Batch Management**: Academic structure with sections and terms

### Analytics & Reporting
- **Performance Dashboards**: Real-time student performance tracking
- **Leaderboards**: Competitive rankings and achievements
- **Detailed Reports**: Comprehensive analytics for all stakeholders
- **Attendance Tracking**: Automated attendance monitoring with eligibility rules

## 🛠 Technology Stack

### Frontend
- **React 18**: Modern React with hooks and context
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Vite**: Fast build tool and development server

### Backend (✅ Implemented)
- **Node.js + Express.js**: RESTful API server
- **PostgreSQL**: Production database with 31 tables
- **pgAdmin4**: Database administration interface
- **JWT**: Authentication and authorization (ready for implementation)

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Git**: Version control

## 📁 Project Structure

```
pep-score-nexus/
├── frontend/                # 🎨 React Frontend Application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── admin/      # Admin-specific components
│   │   │   ├── common/     # Shared components
│   │   │   ├── layout/     # Layout components
│   │   │   ├── student/    # Student-specific components
│   │   │   └── ui/         # Base UI components (shadcn/ui)
│   │   ├── contexts/       # React contexts for state management
│   │   ├── data/          # Mock data (to be replaced with API calls)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   ├── pages/         # Page components
│   │   │   ├── admin/     # Admin pages
│   │   │   ├── student/   # Student pages
│   │   │   └── teacher/   # Teacher pages
│   │   └── main.tsx       # App entry point
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   ├── vite.config.ts     # Vite configuration
│   └── README.md          # Frontend documentation
├── backend/                # 🚀 Node.js Backend API
│   ├── src/
│   │   ├── config/        # Database and app configuration
│   │   ├── controllers/   # API route controllers
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/    # Express middleware
│   │   └── server.js      # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env              # Environment variables
├── docs/                  # 📚 Documentation
│   ├── api/              # API documentation
│   ├── architecture/     # Technical architecture
│   ├── database/         # Database schema and pgAdmin guides
│   ├── requirements/     # Requirements and specifications
│   ├── diagrams/         # User flow diagrams
│   ├── assets/           # Documentation assets
│   └── README.md         # Documentation index
├── database/             # 🗄️ Database Files
│   ├── database_setup.sql           # Complete schema creation
│   ├── sample_data.sql             # Sample data insertion
│   └── pep_score_nexus_backup.sql  # Full database backup
├── team_pgadmin_setup.sh # 🔧 Team setup script
├── test_apis.sh          # 🧪 API testing script
└── README.md             # Main project documentation
```

## 📚 Documentation

### Core Documentation
- **[API Documentation](docs/api/PEP_Score_Nexus_API_Documentation.md)**: Complete API specification with 180+ endpoints
- **[Database Architecture](docs/database/PEP_Score_Nexus_Database_Architecture.md)**: PostgreSQL schema with 31 tables
- **[Technical Architecture](docs/architecture/PEP_Score_Nexus_Technical_Architecture.md)**: System design and architecture
- **[Requirements Specification](docs/requirements/SRS.md)**: Detailed system requirements

### User Flow Diagrams
- **[Student User Flow](docs/diagrams/student_user_flow.svg)**: Student journey and interactions
- **[Teacher User Flow](docs/diagrams/teacher_user_flow.svg)**: Teacher workflow and features
- **[Admin User Flow](docs/diagrams/admin_user_flow.svg)**: Administrative processes

### Sample Data
- **[Student Data Sample](docs/assets/HPS%20-%20Jagsom%202024%20Students%20View.xlsx)**: Example student data structure

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- PostgreSQL 14+ (for database)
- Git for version control

### Quick Start

#### 🗄️ **Database Setup (Required First)**
```bash
# 1. Start PostgreSQL service
sudo systemctl start postgresql

# 2. Create database and tables
psql -U postgres -h localhost -c "CREATE DATABASE pep_score_nexus;"
psql -U postgres -h localhost -d pep_score_nexus -f database_setup.sql

# 3. Insert sample data
psql -U postgres -h localhost -d pep_score_nexus -f sample_data.sql

# 4. Setup pgAdmin for team access (optional)
./team_pgadmin_setup.sh
```

#### 🚀 **Backend API Setup**
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Start API server
npm run dev
# Server runs on http://localhost:3001
```

#### 🎨 **Frontend Setup**
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install
# Or use Bun: bun install

# 3. Start development server
npm run dev
# Or use Bun: bun dev
# Frontend runs on http://localhost:8080
```

#### ✅ **Verify Setup**
```bash
# Test API endpoints
./test_apis.sh

# Access pgAdmin (if installed)
# http://127.0.0.1/pgadmin4
```

## 💻 Development

### Available Scripts

#### Frontend (in `frontend/` directory)
```bash
# Development
npm run dev          # Start frontend dev server (port 8080)
bun dev             # Alternative with Bun

# Building
npm run build       # Build for production
npm run preview     # Preview production build

# Code Quality
npm run lint        # Run ESLint
```

#### Backend (in `backend/` directory)
```bash
# Development
npm run dev         # Start API server with nodemon (port 3001)
npm start          # Start API server in production mode

# Testing
npm test           # Run tests (when implemented)
```

#### Database
```bash
# Test database connection
psql -U postgres -h localhost -d pep_score_nexus

# Backup database
pg_dump -U postgres -h localhost -d pep_score_nexus > backup.sql

# Test APIs
./test_apis.sh
```

### Development Workflow

**Using Lovable (Recommended)**

Simply visit the [Lovable Project](https://lovable.dev/projects/909f6c8d-e8fd-45e5-a9b3-498a704a71c0) and start prompting. Changes made via Lovable will be committed automatically to this repo.

**Using Local IDE**

1. Make your changes locally
2. Test thoroughly
3. Commit and push changes
4. Changes will be reflected in Lovable

**Using GitHub Codespaces**

1. Navigate to the repository main page
2. Click "Code" → "Codespaces" → "New codespace"
3. Edit files directly in the browser
4. Commit and push when done

## 🌐 Deployment

### Lovable Deployment (Recommended)

1. Open [Lovable Project](https://lovable.dev/projects/909f6c8d-e8fd-45e5-a9b3-498a704a71c0)
2. Click Share → Publish
3. Your app will be deployed automatically

### Custom Domain

To connect a custom domain:
1. Navigate to Project > Settings > Domains
2. Click Connect Domain
3. Follow the [custom domain guide](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

### Cloud Database Deployment

The PostgreSQL database schema is compatible with:
- ✅ **Supabase** (Recommended for MVP)
- ✅ **AWS RDS PostgreSQL** (Enterprise)
- ✅ **Google Cloud SQL**
- ✅ **Azure Database for PostgreSQL**
- ✅ **Railway** (Development)

See [Database Architecture](docs/database/PEP_Score_Nexus_Database_Architecture.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add documentation for new features
- Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the [docs](docs/) directory
- **Issues**: Create an issue on GitHub
- **Lovable Support**: Use the Lovable platform for AI-assisted development

---

**Built with ❤️ using Lovable AI Platform**
