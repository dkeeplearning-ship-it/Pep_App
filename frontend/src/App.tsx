
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TermProvider } from "@/contexts/TermContext";
// Microsoft SSO imports - temporarily disabled to fix hook error
// import { MsalProvider } from "@azure/msal-react";
// import { PublicClientApplication } from "@azure/msal-browser";
// import { msalConfig } from "@/config/msalConfig";

import Layout from "./components/layout/Layout";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import SSOCallback from "./pages/SSOCallback";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTasks from "./pages/student/StudentTasks";
import QuadrantDetail from "./pages/student/QuadrantDetail";
import Feedback from "./pages/student/Feedback";
import Settings from "./pages/student/Settings";
import EligibilityPage from "./pages/student/EligibilityPage";
import ImprovementPlan from "./pages/student/ImprovementPlan";
import InterventionsPage from "./pages/student/InterventionsPage";
import InterventionDetailsPage from "./pages/student/InterventionDetailsPage";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherStudents from "./pages/teacher/TeacherStudents";

import InterventionScoringPage from "./pages/teacher/InterventionScoringPage";
import MicrocompetencyScoringPage from "./pages/teacher/MicrocompetencyScoringPage";
import TeacherFeedback from "./pages/teacher/TeacherFeedback";
import TeacherInterventions from "./pages/teacher/TeacherInterventions";
import TeacherSettings from "./pages/teacher/TeacherSettings";
import TeacherTasks from "./pages/teacher/TeacherTasks";
import MyMicrocompetencies from "./pages/teacher/MyMicrocompetencies";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageStudents from "./pages/admin/ManageStudents";
import InputScores from "./pages/admin/InputScores";
import Reports from "./pages/admin/Reports";
import DataImport from "./pages/admin/DataImport";
import ManageTeachers from "./pages/admin/ManageTeachers";
import TermManagement from "./pages/admin/TermManagement";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageInterventions from "./pages/admin/ManageInterventions";
import ManageTasks from "./pages/admin/ManageTasks";
import InterventionMicrocompetencies from "./pages/admin/InterventionMicrocompetencies";
import InterventionTeachers from "./pages/admin/InterventionTeachers";
import QuadrantManagement from "./pages/admin/QuadrantManagement";
import InterventionStudents from "./pages/admin/InterventionStudents";
import InterventionSettings from "./pages/admin/InterventionSettings";
import InterventionAnalytics from "./pages/admin/InterventionAnalytics";
import UserRoleManagement from "./pages/admin/UserRoleManagement";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import ProfileUpdate from "./pages/student/ProfileUpdate";
import ProfileApproval from "./pages/admin/ProfileApproval";
import BatchTermWeightageManagement from "./pages/admin/BatchTermWeightageManagement";
import HierarchyTest from "./pages/admin/HierarchyTest";

// Batch Progression Components
import BatchProgressionManagement from "./components/admin/BatchProgressionManagement";
import SmartBatchProgressionDashboard from "./components/SmartBatchProgressionDashboard";
import LevelProgressionDashboard from "./components/LevelProgressionDashboard";
import StudentLevelProgressionDashboard from "./components/student/StudentLevelProgressionDashboard";

const queryClient = new QueryClient();

// Create MSAL instance - temporarily disabled
// const msalInstance = new PublicClientApplication(msalConfig);

// Protected route component
const ProtectedRoute = ({
  children,
  requiredRole
}: {
  children: React.ReactNode;
  requiredRole: "student" | "admin" | "teacher";
}) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/sso-callback" element={<SSOCallback />} />
      <Route path="/index" element={<Index />} />

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <StudentDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/tasks" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <StudentTasks />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/quadrant/:quadrantId" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <QuadrantDetail />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/feedback" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <Feedback />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/settings" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/eligibility" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <EligibilityPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/improvement" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <ImprovementPlan />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/interventions" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <InterventionsPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/student/interventions/:id" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <InterventionDetailsPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/students" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherStudents />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/teacher/feedback" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherFeedback />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/tasks" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherTasks />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/settings" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherSettings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/interventions" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <TeacherInterventions />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/microcompetencies" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <MyMicrocompetencies />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/interventions/:interventionId/scoring" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <InterventionScoringPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/interventions/:interventionId/microcompetencies/:microcompetencyId/scoring" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <MicrocompetencyScoringPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/teacher/students/:studentId/scores" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout>
            <div className="container mx-auto p-6">
              <h1 className="text-2xl font-bold mb-4">Student Score Details</h1>
              <p className="text-gray-600">Detailed student score view will be implemented here.</p>
            </div>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ManageStudents />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/scores" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InputScores />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/import" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <DataImport />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/teachers" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ManageTeachers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ManageUsers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/terms" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <TermManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ManageInterventions />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/tasks" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ManageTasks />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/quadrants" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <QuadrantManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions/:interventionId/microcompetencies" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InterventionMicrocompetencies />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions/:interventionId/teachers" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InterventionTeachers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions/:interventionId/students" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InterventionStudents />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions/:interventionId/analytics" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InterventionAnalytics />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/interventions/:interventionId/settings" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <InterventionSettings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/role-management" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <UserRoleManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-log" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <AdminAuditLog />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/profile-approval" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <ProfileApproval />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/batch-term-weightages" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <BatchTermWeightageManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/hierarchy-test" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <HierarchyTest />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/batch-progression" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <BatchProgressionManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/level-progression" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <LevelProgressionDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/smart-batch-dashboard" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <SmartBatchProgressionDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student/profile-update" element={
        <ProtectedRoute requiredRole="student">
          <Layout>
            <ProfileUpdate />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TermProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </TermProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
