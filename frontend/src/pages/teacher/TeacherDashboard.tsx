import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowRight,
  Search,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  FileText,
  MessageSquare
} from "lucide-react";
import { teacherAPI, interventionAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTerm } from "@/contexts/TermContext";

// Types for dashboard data
interface TeacherDashboardData {
  teacher: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
    specialization: string;
  };
  overview: {
    totalStudents: number;
    pendingAssessments: number;
    recentFeedback: number;
    assignedQuadrants: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    score: string;
    date: string;
    notes?: string;
  }>;
  assignedQuadrants: Array<{
    id: string;
    name: string;
    display_order: number;
  }>;
  currentTerm: string;
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTerm } = useTerm();

  // State management
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Fetch dashboard data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user, selectedTerm]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await teacherAPI.getDashboard(user.id, selectedTerm?.id);
      setDashboardData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // For now, we'll show recent activities instead of student performance
  // This can be updated when student performance data is available
  const filteredActivities = dashboardData?.recentActivities?.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "incomplete":
        return <Badge variant="destructive">Incomplete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your students and interventions</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={fetchDashboardData}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {dashboardData.teacher.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-5 w-5 text-amber-500" />
              Pending Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.overview.pendingAssessments}</div>
            <p className="text-sm text-muted-foreground">
              Students waiting for assessment
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-between"
              onClick={() => navigate("/teacher/students")}
            >
              View pending <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-500" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.overview.totalStudents}</div>
            <p className="text-sm text-muted-foreground">
              Students assigned to you
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-between"
              onClick={() => navigate("/teacher/students")}
            >
              View students <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Target className="mr-2 h-5 w-5 text-purple-500" />
              Quadrants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.overview.assignedQuadrants}</div>
            <p className="text-sm text-muted-foreground">
              Quadrants you can assess
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-between"
              onClick={() => navigate("/teacher/interventions")}
            >
              View assignments <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assessment Activities</CardTitle>
              <CardDescription>
                Your recent assessment activities and scores
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search activities..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="text-sm">
                  {selectedTerm?.name || 'Current Term'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="rounded-full bg-primary/10 p-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Score: {activity.score}</span>
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                        </div>
                        {activity.notes && (
                          <p className="text-xs text-muted-foreground">{activity.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/teacher/students")}
                      >
                        View Details
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium mb-2">No recent activities</p>
                    <p className="text-sm">Start assessing students to see your activity here</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate("/teacher/students")}
                    >
                      View Students
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent assessment activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 border-b pb-3 last:border-0 last:pb-0">
                      <div className="rounded-full bg-primary/10 p-1">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">Score: {activity.score}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Assigned Quadrants</CardTitle>
              <CardDescription>
                Quadrants you can assess for students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.assignedQuadrants.length > 0 ? (
                  dashboardData.assignedQuadrants.map((quadrant) => (
                    <div key={quadrant.id} className="flex items-start gap-2 border-b pb-3 last:border-0 last:pb-0">
                      <div className="rounded-full bg-blue-100 p-1">
                        <Target className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{quadrant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Assessment quadrant
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm">No quadrants assigned</p>
                    <p className="text-xs">Contact admin for assignments</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
