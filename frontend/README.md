# 🎨 PEP Score Nexus - Frontend

## 📋 Overview

This is the React-based frontend application for the PEP Score Nexus educational management system. Built with modern technologies including React, TypeScript, Vite, and Tailwind CSS.

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Forms**: React Hook Form
- **State Management**: React Context
- **Icons**: Lucide React
- **Package Manager**: Bun (with npm fallback)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Backend API running on port 3001

### Installation & Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (using Bun - preferred)
bun install

# Or using npm
npm install

# Start development server
bun dev
# Or: npm run dev

# Open in browser
# http://localhost:8080
```

### Available Scripts

```bash
# Development
bun dev          # Start dev server
npm run dev      # Alternative with npm

# Building
bun run build    # Build for production
npm run build    # Alternative with npm

# Preview
bun run preview  # Preview production build
npm run preview  # Alternative with npm

# Linting
bun run lint     # Run ESLint
npm run lint     # Alternative with npm
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── charts/       # Chart components
│   │   ├── forms/        # Form components
│   │   └── layout/       # Layout components
│   ├── contexts/         # React contexts
│   ├── data/            # Mock data (to be replaced with API)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # App entry point
│   └── index.css        # Global styles
├── components.json       # shadcn/ui configuration
├── eslint.config.js     # ESLint configuration
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 🎯 Current Features

### ✅ Implemented
- **Dashboard**: Overview with key metrics and charts
- **Student Management**: Student list, profiles, and scores
- **Assessment System**: 4-quadrant scoring system
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Theme**: Theme switching capability
- **Navigation**: Sidebar and breadcrumb navigation
- **Charts & Analytics**: Interactive data visualizations

### 🔄 Using Mock Data (To Be Replaced)
Currently the frontend uses mock data from `src/data/` directory. This needs to be replaced with real API calls to the backend.

### 📊 Mock Data Files
```
src/data/
├── mockStudents.ts      # Student data
├── mockScores.ts        # Score data
├── mockAttendance.ts    # Attendance data
└── mockInterventions.ts # Intervention data
```

## 🔗 API Integration (Next Steps)

### Backend API Endpoints
The backend is running on `http://localhost:3001` with these endpoints:

```
✅ GET /api/v1/quadrants         # Get all quadrants
✅ GET /api/v1/quadrants/:id     # Get specific quadrant
✅ GET /api/v1/quadrants/stats   # Get quadrant statistics
✅ GET /api/v1/students          # Get all students
✅ GET /api/v1/students/:id      # Get student details
✅ POST /api/v1/students         # Create new student
```

### Integration Tasks
1. **Replace Mock Data**: Remove mock data and connect to real APIs
2. **API Service Layer**: Create API service functions
3. **Error Handling**: Implement proper error handling
4. **Loading States**: Add loading indicators
5. **Authentication**: Implement user authentication

## 🎨 UI Components

### shadcn/ui Components Used
- **Layout**: Card, Sheet, Separator
- **Navigation**: Button, Badge, Breadcrumb
- **Forms**: Input, Select, Textarea, Checkbox
- **Data Display**: Table, Avatar, Progress
- **Feedback**: Alert, Toast, Dialog
- **Charts**: Custom chart components with Recharts

### Custom Components
- **DashboardCard**: Metric display cards
- **StudentCard**: Student profile cards
- **ScoreChart**: Score visualization
- **AttendanceChart**: Attendance tracking
- **QuadrantOverview**: 4-quadrant system display

## 🎯 Pages & Routes

```
/                    # Dashboard (overview)
/students           # Student list
/students/:id       # Student profile
/assessments        # Assessment management
/interventions      # Intervention system
/analytics          # Advanced analytics
/settings           # Application settings
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME=PEP Score Nexus
VITE_APP_VERSION=1.0.0
```

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Custom color palette
- Extended spacing and typography
- shadcn/ui integration
- Dark mode support

## 🚧 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow React functional component patterns
- Use custom hooks for logic separation
- Implement proper error boundaries

### Component Structure
```tsx
// Component template
import { FC } from 'react';

interface ComponentProps {
  // Define props
}

export const Component: FC<ComponentProps> = ({ ...props }) => {
  // Component logic
  
  return (
    // JSX
  );
};
```

### API Integration Pattern
```tsx
// API service example
const fetchStudents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/students`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

## 🔄 Migration from Mock to Real Data

### Priority Order
1. **Students API**: Replace mock student data
2. **Quadrants API**: Replace mock assessment data
3. **Scores API**: Replace mock scoring data
4. **Attendance API**: Replace mock attendance data
5. **Interventions API**: Replace mock intervention data

### Steps for Each API
1. Create API service function
2. Update React hooks/contexts
3. Remove corresponding mock data
4. Add error handling and loading states
5. Test thoroughly

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Change port in vite.config.ts or use different port
   bun dev --port 3000
   ```

2. **API Connection Issues**
   - Ensure backend is running on port 3001
   - Check CORS configuration
   - Verify API endpoints

3. **Build Issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules bun.lockb
   bun install
   ```

4. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   bun run type-check
   ```

## 📚 Resources

- **React Documentation**: https://react.dev/
- **Vite Documentation**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **Recharts**: https://recharts.org/

## 🎯 Next Steps

1. **API Integration**: Connect to real backend APIs
2. **Authentication**: Implement user login/logout
3. **Real-time Updates**: Add WebSocket support
4. **Performance**: Optimize bundle size and loading
5. **Testing**: Add unit and integration tests
6. **Deployment**: Set up production build and deployment

---

**The frontend is ready for API integration with the PostgreSQL backend!**
