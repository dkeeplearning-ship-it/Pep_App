
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTerm } from "@/contexts/TermContext";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Home,
  User,
  BarChart3,
  Settings,
  MessageSquare,
  Users,
  LogOut,
  ClipboardEdit,
  FileBarChart,
  FileSpreadsheet,
  GraduationCap,
  PenTool,
  CheckSquare,
  BookOpen,
  Target,
  Calendar,
  TrendingUp,
  Shield,
  Activity,
  UserCog,
  UserCheck2,
  Edit3,
  GitBranch,
  TrendingUp as TrendingUpIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AppSidebar() {
  const { userRole, logout } = useAuth();
  const { selectedTerm, availableTerms, setSelectedTerm, isLoading } = useTerm();
  const navigate = useNavigate();
  const location = useLocation();

  const studentMenuItems = [
    { title: "Dashboard", path: "/student", icon: Home },
    { title: "Interventions", path: "/student/interventions", icon: BookOpen },
    { title: "My Tasks", path: "/student/tasks", icon: ClipboardEdit },
    { title: "Profile Update", path: "/student/profile-update", icon: Edit3 },
    { title: "Improvement Plan", path: "/student/improvement", icon: TrendingUp },
    { title: "Eligibility", path: "/student/eligibility", icon: Shield },
    { title: "Feedback", path: "/student/feedback", icon: MessageSquare },
    { title: "Settings", path: "/student/settings", icon: Settings },
  ];

  const teacherMenuItems = [
    { title: "Dashboard", path: "/teacher", icon: Home },
    { title: "My Students", path: "/teacher/students", icon: GraduationCap },
    { title: "My Microcompetencies", path: "/teacher/microcompetencies", icon: Target },
    { title: "Interventions", path: "/teacher/interventions", icon: BookOpen },
    { title: "Tasks", path: "/teacher/tasks", icon: ClipboardEdit },
    { title: "Feedback", path: "/teacher/feedback", icon: MessageSquare },
    { title: "Settings", path: "/teacher/settings", icon: Settings },
  ];

  const adminMenuItems = [
    { title: "Dashboard", path: "/admin", icon: Home },
    { title: "Manage Students", path: "/admin/students", icon: Users },
    { title: "Manage Teachers", path: "/admin/teachers", icon: PenTool },
    { title: "Manage Users", path: "/admin/users", icon: User },
    { title: "Role Management", path: "/admin/role-management", icon: UserCog },
    { title: "Profile Approval", path: "/admin/profile-approval", icon: UserCheck2 },
    { title: "Audit Log", path: "/admin/audit-log", icon: Activity },
    { title: "Term Management", path: "/admin/terms", icon: Calendar },
    { title: "Batch Progression", path: "/admin/batch-progression", icon: GitBranch },
    { title: "Level Progression", path: "/admin/level-progression", icon: TrendingUpIcon },
    { title: "Quadrant Management", path: "/admin/quadrants", icon: Target },
    { title: "Batch-Term Weightages", path: "/admin/batch-term-weightages", icon: Settings },
    { title: "Interventions", path: "/admin/interventions", icon: BookOpen },
    { title: "Manage Tasks", path: "/admin/tasks", icon: ClipboardEdit },
    { title: "Input Scores", path: "/admin/scores", icon: ClipboardEdit },
    { title: "Reports", path: "/admin/reports", icon: FileBarChart },
    { title: "Data Import", path: "/admin/import", icon: FileSpreadsheet },
  ];

  let menuItems;
  if (userRole === "admin") {
    menuItems = adminMenuItems;
  } else if (userRole === "teacher") {
    menuItems = teacherMenuItems;
  } else {
    menuItems = studentMenuItems;
  }

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center px-4 py-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">PEP Score Nexus</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    className={location.pathname === item.path ? "bg-primary text-white" : ""}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 space-y-2">
          {/* Term Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Academic Term</label>
            <Select
              value={selectedTerm?.id || ""}
              onValueChange={(termId) => {
                const term = availableTerms.find(t => t.id === termId);
                if (term) setSelectedTerm(term);
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select Term"} />
              </SelectTrigger>
              <SelectContent>
                {availableTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id} className="text-xs">
                    <div className="flex items-center justify-between w-full">
                      <span>{term.name}</span>
                      {term.is_current && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 p-2 rounded-md bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {userRole === "student" ? "Student User" : userRole === "teacher" ? "Teacher User" : "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {userRole === "student" ? "Batch 2024" : userRole === "teacher" ? "Wellness Instructor" : "Management"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
