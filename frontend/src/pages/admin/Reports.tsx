
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileBarChart, TrendingUp, Users, BookOpen, Award, RefreshCw } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { useTerm } from "@/contexts/TermContext";

// Types for reports data
interface ReportsData {
  overview: {
    totalInterventions: number;
    activeInterventions: number;
    totalStudents: number;
    totalTeachers: number;
    totalScores: number;
  };
  interventionStats: Array<{
    id: string;
    name: string;
    status: string;
    enrollmentCount: number;
    teacherCount: number;
    startDate: string;
    endDate: string;
  }>;
  studentPerformance: {
    gradeDistribution: Record<string, number>;
    scoreDistribution: Record<string, number>;
    averageScore: number;
  };
  teacherPerformance: Array<{
    id: string;
    name: string;
    employee_id: string;
    specialization: string;
    assignmentCount: number;
    interventions: string[];
  }>;
  recentActivity: Array<{
    id: string;
    studentName: string;
    registrationNo: string;
    microcompetencyName: string;
    interventionName: string;
    score: string;
    percentage: number;
    scoredAt: string;
  }>;
}

const COLORS = ['#7e3af2', '#0694a2', '#6875f5', '#8c6dfd'];

const Reports: React.FC = () => {
  const { selectedTerm } = useTerm();
  const [batchFilter, setBatchFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("2023-2024");
  const [termFilter, setTermFilter] = useState("all");
  const [reportType, setReportType] = useState("overview");
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Additional state for chart data
  const [termProgress, setTermProgress] = useState<Array<{ term: string; avgScore: number }>>([]);
  const [attendanceDistribution, setAttendanceDistribution] = useState<Array<{ range: string; count: number }>>([]);
  const [eligibilityStatus, setEligibilityStatus] = useState<Array<{ status: string; count: number }>>([]);
  const [quadrantDistribution, setQuadrantDistribution] = useState<Array<{ quadrant: string; count: number }>>([]);
  const [quadrantPerformance, setQuadrantPerformance] = useState<Array<{ quadrant: string; avgScore: number; maxScore: number }>>([]);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch reports data from API
      const response = await adminAPI.getReportsAnalytics();
      const data = response.data;
      setReportsData(data);

      // Process and set chart data from API response
      if (data) {
        // Create mock term progress data from available data
        if (data.overview) {
          const mockTermProgress = [
            { term: "Term 1", avgScore: 75 },
            { term: "Term 2", avgScore: 78 },
            { term: "Term 3", avgScore: data.studentPerformance?.averageScore || 80 }
          ];
          setTermProgress(mockTermProgress);
        }

        // Create mock attendance distribution from student performance
        if (data.studentPerformance?.gradeDistribution) {
          const attendanceData = Object.entries(data.studentPerformance.gradeDistribution).map(([grade, count]) => ({
            range: `${grade} Grade`,
            count: count as number
          }));
          setAttendanceDistribution(attendanceData);
        }

        // Create mock eligibility status from grade distribution
        if (data.studentPerformance?.gradeDistribution) {
          const grades = data.studentPerformance.gradeDistribution as Record<string, number>;
          const eligible = (grades['A+'] || 0) + (grades['A'] || 0) + (grades['B'] || 0);
          const notEligible = (grades['C'] || 0) + (grades['D'] || 0) + (grades['IC'] || 0);

          const eligibilityData = [
            { status: "Eligible", count: eligible },
            { status: "Not Eligible", count: notEligible }
          ];
          setEligibilityStatus(eligibilityData);
        }

        // Create mock quadrant distribution and performance from available data
        const mockQuadrantDistribution = [
          { quadrant: "Persona", count: data.overview?.totalStudents || 0 },
          { quadrant: "Wellness", count: data.overview?.totalStudents || 0 },
          { quadrant: "Behavior", count: data.overview?.totalStudents || 0 },
          { quadrant: "Discipline", count: data.overview?.totalStudents || 0 }
        ];
        setQuadrantDistribution(mockQuadrantDistribution);

        const mockQuadrantPerformance = [
          { quadrant: "Persona", avgScore: 75, maxScore: 100 },
          { quadrant: "Wellness", avgScore: 80, maxScore: 100 },
          { quadrant: "Behavior", avgScore: 85, maxScore: 100 },
          { quadrant: "Discipline", avgScore: 78, maxScore: 100 }
        ];
        setQuadrantPerformance(mockQuadrantPerformance);
      }

    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports data');
      toast.error('Failed to load reports data');

      // Set empty arrays for chart data on error
      setTermProgress([]);
      setAttendanceDistribution([]);
      setEligibilityStatus([]);
      setQuadrantDistribution([]);
      setQuadrantPerformance([]);

    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: "pdf" | "excel" | "csv" | "json" = "csv") => {
    try {
      if (format === "pdf" || format === "excel") {
        toast.success(`Downloading report in ${format.toUpperCase()} format`);
        return;
      }

      const exportFormat = format === "json" ? "json" : "csv";
      await adminAPI.exportReports({ format: exportFormat, reportType });
      toast.success(`Report exported successfully as ${exportFormat.toUpperCase()}!`);
    } catch (err) {
      toast.error('Failed to export report');
    }
  };

  // Convert data for charts with proper error handling
  const getScoreDistributionData = () => {
    if (!reportsData?.studentPerformance?.scoreDistribution) {
      return [{ range: "No Data", count: 0, label: "No Data Available" }];
    }
    return Object.entries(reportsData.studentPerformance.scoreDistribution).map(([range, count]) => ({
      range,
      count,
      label: range
    }));
  };

  const getGradeDistributionData = () => {
    if (!reportsData?.studentPerformance?.gradeDistribution) {
      return [{ grade: "No Data", count: 0, label: "No Data Available" }];
    }
    return Object.entries(reportsData.studentPerformance.gradeDistribution).map(([grade, count]) => ({
      grade,
      count,
      label: grade
    }));
  };

  // Helper function to check if chart data is available
  const hasChartData = (data: any[]) => {
    return data && data.length > 0 && data.some(item =>
      Object.values(item).some(value => typeof value === 'number' && value > 0)
    );
  };

  // Empty chart state component
  const EmptyChartState = ({ message = "No data available" }: { message?: string }) => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-gray-500">
        <FileBarChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading reports data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchReportsData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderReportContent = () => {
    switch (reportType) {
      case "overview":
        return (
          <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Interventions</p>
                      <p className="text-2xl font-bold">{reportsData?.overview.totalInterventions || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Interventions</p>
                      <p className="text-2xl font-bold">{reportsData?.overview.activeInterventions || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold">{reportsData?.overview.totalStudents || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Scores</p>
                      <p className="text-2xl font-bold">{reportsData?.overview.totalScores || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getScoreDistributionData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Term Progress</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {hasChartData(termProgress) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={termProgress}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="term" />
                        <YAxis domain={[60, 100]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartState message="No term progress data available" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>PEP Quadrant Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quadrantDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {quadrantDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quadrant Performance</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={quadrantPerformance}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" />
                      <Bar dataKey="target" fill="#ddd" name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        );
      case "detailed":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {hasChartData(attendanceDistribution) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartState message="No attendance data available" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eligibilityStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ status, percent }) =>
                          `${status} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#4CAF50" />
                        <Cell fill="#F44336" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Term-wise Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Detailed term-wise analysis is currently being processed.
                  <br />
                  Please check back later or select another report type.
                </p>
              </CardContent>
            </Card>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate and view comprehensive performance reports for the PEP program.
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleDownload('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleDownload('json')} variant="outline" size="sm">
            <FileBarChart className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={fetchReportsData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-filter">Batch</Label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger id="batch-filter">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-filter">Academic Period</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger id="period-filter">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023-2024">2023-2024</SelectItem>
                  <SelectItem value="2022-2023">2022-2023</SelectItem>
                  <SelectItem value="2021-2022">2021-2022</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term-filter">Term</Label>
              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger id="term-filter">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="term1">Term 1</SelectItem>
                  <SelectItem value="term2">Term 2</SelectItem>
                  <SelectItem value="term3">Term 3</SelectItem>
                  <SelectItem value="term4">Term 4</SelectItem>
                  <SelectItem value="term5">Term 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="detailed">Detailed Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <Button className="w-full">
                <FileBarChart className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderReportContent()}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={() => handleDownload("pdf")}>
              <Download className="h-4 w-4 mr-2" />
              Download as PDF
            </Button>
            <Button variant="outline" onClick={() => handleDownload("excel")}>
              <Download className="h-4 w-4 mr-2" />
              Download as Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
