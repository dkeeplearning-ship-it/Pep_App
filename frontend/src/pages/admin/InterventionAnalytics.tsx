import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Button
} from '@/components/ui/button';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Badge
} from '@/components/ui/badge';
import {
  Progress
} from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Users,
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Award,
  Activity
} from 'lucide-react';
import { interventionAPI } from '@/lib/api';
import { toast } from 'sonner';

interface AnalyticsData {
  intervention: {
    id: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    max_students: number;
    enrolled_count: number;
  };
  enrollment: {
    totalEnrolled: number;
    enrollmentRate: number;
    activeStudents: number;
    completedStudents: number;
  };
  microcompetencies: {
    totalAssigned: number;
    averageScore: number;
    completionRate: number;
    topPerforming: any[];
    lowPerforming: any[];
  };
  tasks: {
    totalTasks: number;
    completedTasks: number;
    averageTaskScore: number;
    taskCompletionRate: number;
    overdueSubmissions: number;
  };
  teachers: {
    totalAssigned: number;
    activeTeachers: number;
    teacherWorkload: any[];
  };
  timeline: {
    daysRemaining: number;
    progressPercentage: number;
    milestones: any[];
  };
}

const InterventionAnalytics: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (interventionId) {
      fetchAnalyticsData();
    }
  }, [interventionId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real analytics data from API
      const analyticsResponse = await interventionAPI.getInterventionAnalytics(interventionId!);
      const analyticsData = analyticsResponse.data;

      // Transform API response to match our interface
      const transformedAnalytics: AnalyticsData = {
        intervention: {
          id: analyticsData.intervention.id,
          name: analyticsData.intervention.name,
          description: '', // Not provided in analytics API
          status: analyticsData.intervention.status,
          start_date: '', // Not provided in analytics API
          end_date: '', // Not provided in analytics API
          max_students: analyticsData.enrollment.max_capacity,
          enrolled_count: analyticsData.enrollment.total_enrolled,
        },
        enrollment: {
          totalEnrolled: analyticsData.enrollment.total_enrolled,
          enrollmentRate: parseFloat(analyticsData.enrollment.capacity_utilization.replace('%', '')),
          activeStudents: analyticsData.enrollment.by_status?.active || 0,
          completedStudents: analyticsData.enrollment.by_status?.completed || 0,
        },
        microcompetencies: {
          totalAssigned: analyticsData.scoring.total_microcompetencies,
          averageScore: analyticsData.scoring.average_score,
          completionRate: analyticsData.scoring.scoring_progress,
          topPerforming: [], // Would need additional API call
          lowPerforming: [], // Would need additional API call
        },
        tasks: {
          totalTasks: 0, // Would need additional API call for task data
          completedTasks: 0, // Would need additional API call for task data
          averageTaskScore: 0, // Would need additional API call for task data
          taskCompletionRate: 0, // Would need additional API call for task data
          overdueSubmissions: 0, // Would need additional API call for task data
        },
        teachers: {
          totalAssigned: 0, // Would need additional API call for teacher data
          activeTeachers: 0, // Would need additional API call for teacher data
          teacherWorkload: [], // Would need additional API call for teacher data
        },
        timeline: {
          daysRemaining: analyticsData.intervention.duration_days || 0,
          progressPercentage: analyticsData.scoring.scoring_progress || 0,
          milestones: [], // Would need additional API call for milestone data
        },
      };

      setAnalyticsData(transformedAnalytics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No analytics data available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/interventions')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interventions
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{analyticsData.intervention.name}</h1>
            <p className="text-gray-600">Analytics & Performance Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(analyticsData.intervention.status)}>
            {analyticsData.intervention.status}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enrollment Rate</p>
                <p className="text-2xl font-bold">
                  {analyticsData.enrollment.enrollmentRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {analyticsData.enrollment.totalEnrolled}/{analyticsData.intervention.max_students} students
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Score</p>
                <p className="text-2xl font-bold">
                  {analyticsData.microcompetencies.averageScore}
                </p>
                <p className="text-xs text-gray-500">
                  Across all microcompetencies
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Task Completion</p>
                <p className="text-2xl font-bold">
                  {analyticsData.tasks.taskCompletionRate}%
                </p>
                <p className="text-xs text-gray-500">
                  {analyticsData.tasks.completedTasks}/{analyticsData.tasks.totalTasks} tasks
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Days Remaining</p>
                <p className="text-2xl font-bold">
                  {analyticsData.timeline.daysRemaining}
                </p>
                <p className="text-xs text-gray-500">
                  Until {formatDate(analyticsData.intervention.end_date)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Intervention Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Overall Progress</span>
                      <span className="text-sm font-medium">
                        {analyticsData.timeline.progressPercentage}%
                      </span>
                    </div>
                    <Progress value={analyticsData.timeline.progressPercentage} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Enrollment Progress</span>
                      <span className="text-sm font-medium">
                        {analyticsData.enrollment.enrollmentRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analyticsData.enrollment.enrollmentRate} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Completion Rate</span>
                      <span className="text-sm font-medium">
                        {analyticsData.microcompetencies.completionRate}%
                      </span>
                    </div>
                    <Progress value={analyticsData.microcompetencies.completionRate} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Total Students</span>
                    <span className="font-medium">{analyticsData.enrollment.totalEnrolled}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Active Students</span>
                    <span className="font-medium">{analyticsData.enrollment.activeStudents}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Microcompetencies</span>
                    <span className="font-medium">{analyticsData.microcompetencies.totalAssigned}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Assigned Teachers</span>
                    <span className="font-medium">{analyticsData.teachers.totalAssigned}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Total Tasks</span>
                    <span className="font-medium">{analyticsData.tasks.totalTasks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollment Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of student enrollment and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.enrollment.totalEnrolled}
                  </div>
                  <div className="text-sm text-gray-600">Total Enrolled</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.enrollment.activeStudents}
                  </div>
                  <div className="text-sm text-gray-600">Active Students</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData.enrollment.completedStudents}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Detailed student enrollment data will be available here with student performance metrics.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Microcompetency and scoring performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Performance charts and detailed scoring analytics will be displayed here.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Analytics</CardTitle>
              <CardDescription>
                Task completion rates and submission insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {analyticsData.tasks.totalTasks}
                  </div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {analyticsData.tasks.completedTasks}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {analyticsData.tasks.averageTaskScore}
                  </div>
                  <div className="text-sm text-gray-600">Avg Score</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {analyticsData.tasks.overdueSubmissions}
                  </div>
                  <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Detailed task analytics and submission timelines will be shown here.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline & Milestones</CardTitle>
              <CardDescription>
                Intervention timeline and key milestones tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Start Date</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(analyticsData.intervention.start_date)}
                      </div>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Current Progress</div>
                      <div className="text-sm text-gray-600">
                        {analyticsData.timeline.progressPercentage}% Complete
                      </div>
                    </div>
                  </div>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-medium">End Date</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(analyticsData.intervention.end_date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-orange-600">
                      {analyticsData.timeline.daysRemaining} days
                    </div>
                    <div className="text-xs text-gray-600">remaining</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterventionAnalytics; 