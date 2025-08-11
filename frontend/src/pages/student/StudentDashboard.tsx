
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import ScoreRing from "@/components/common/ScoreRing";
import QuadrantCard from "@/components/common/QuadrantCard";
import LeaderboardCard from "@/components/common/LeaderboardCard";
import AreasForImprovement from "@/components/student/AreasForImprovement";
import { Student, Leaderboard } from "@/types/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import StatusBadge from "@/components/common/StatusBadge";
import { Link } from "react-router-dom";
import { InfoIcon } from "lucide-react";
import { studentAPI, unifiedScoreAPI } from "@/lib/api";
import { useTerm } from "@/contexts/TermContext";
import {
  transformStudentPerformanceData,
  transformLeaderboardData,
  transformAttendanceData
} from "@/lib/dataTransform";
// Import all necessary types

const StudentDashboard: React.FC = () => {
  const { selectedTerm, availableTerms } = useTerm();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<Leaderboard | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);
  const [termComparisonData, setTermComparisonData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [interventionData, setInterventionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API
  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First get current student to get their ID
        console.log('🔄 Loading student data...');
        const currentStudentResponse = await studentAPI.getCurrentStudent();
        const studentId = currentStudentResponse.data.id;
        console.log('✅ Student ID:', studentId);

        // Use selected term ID for data fetching
        const termId = selectedTerm?.id;
        console.log('📅 Selected term ID:', termId);

        // Fetch all required data using both legacy and new unified APIs
        const [
          performanceResponse,
          leaderboardResponse,
          attendanceResponse,
          interventionResponse,
          unifiedScoreResponse
        ] = await Promise.all([
          studentAPI.getStudentPerformance(studentId, termId, true).catch((error) => {
            console.error('Performance API failed:', error);
            // Show user-friendly error for critical data
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
              throw new Error('Your session has expired. Please log in again.');
            }
            throw new Error('Unable to load performance data. Please try refreshing the page.');
          }),
          studentAPI.getStudentLeaderboard(studentId, termId).catch((error) => {
            console.warn('Leaderboard API failed (non-critical):', error);
            return null;
          }),
          studentAPI.getStudentAttendance(studentId, termId).catch((error) => {
            console.warn('Attendance API failed (non-critical):', error);
            return null;
          }),
          studentAPI.getStudentInterventionPerformance(studentId, termId).catch((error) => {
            console.warn('Intervention API failed (non-critical):', error);
            return null;
          }),
          // Try to get unified score data (new system)
          termId ? unifiedScoreAPI.getStudentScoreSummary(studentId, termId).catch((error) => {
            console.warn('Unified score API failed, using legacy data:', error);
            // Check for authentication errors
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
              console.warn('Authentication issue with unified scores, will use legacy data');
            }
            return null;
          }) : Promise.resolve(null)
        ]);

        // Check if we have the minimum required data
        if (!performanceResponse) {
          throw new Error('Unable to load student performance data. The API may be unavailable.');
        }

        // Transform API data to UI format
        const transformedStudent = transformStudentPerformanceData(performanceResponse);

        // Enhance with unified score data if available
        if (unifiedScoreResponse?.data?.summary) {
          const unifiedSummary = unifiedScoreResponse.data.summary;
          console.log('✅ Using unified score data:', unifiedSummary);

          // Update the transformed student data with unified scores
          if (transformedStudent.terms && transformedStudent.terms.length > 0) {
            const currentTermData = transformedStudent.terms[0];
            currentTermData.totalScore = unifiedSummary.total_hps;
            currentTermData.grade = unifiedSummary.overall_grade as any;
            currentTermData.overallStatus = unifiedSummary.overall_status as any;

            // Update quadrant scores with unified data (convert percentage to points)
            if (currentTermData.quadrants) {
              currentTermData.quadrants.forEach(quadrant => {
                let percentageScore = 0;
                switch (quadrant.name.toLowerCase()) {
                  case 'persona':
                    percentageScore = unifiedSummary.persona_score;
                    break;
                  case 'wellness':
                    percentageScore = unifiedSummary.wellness_score;
                    break;
                  case 'behavior':
                    percentageScore = unifiedSummary.behavior_score;
                    break;
                  case 'discipline':
                    percentageScore = unifiedSummary.discipline_score;
                    break;
                }

                // Convert percentage score to actual points based on weightage
                quadrant.obtained = (percentageScore * quadrant.weightage) / 100;
                quadrant.maxScore = quadrant.weightage; // Ensure maxScore is set
              });
            }
          }
        } else {
          console.log('📊 Using legacy score data (unified scores not available)');
        }

        // Use real leaderboard data if available, otherwise set null to show appropriate UI state
        const leaderboard = leaderboardResponse
          ? transformLeaderboardData(leaderboardResponse)
          : null;

        // Use real attendance data if available, otherwise set null to show appropriate UI state
        const attendance = attendanceResponse
          ? transformAttendanceData(attendanceResponse)
          : null;

        // Process intervention data
        const interventions = interventionResponse?.data || null;

        // Data loaded successfully

        // Generate time series and term comparison from current term only
        // Note: Using only current term data to avoid showing incorrect historical data
        const currentTerm = transformedStudent.terms.find(term => term.termId === termId) || transformedStudent.terms[0];
        const timeSeries = currentTerm
          ? {
              overall: [{
                term: currentTerm.termName,
                score: currentTerm.totalScore
              }]
            }
          : { overall: [] };

        const termComparison = currentTerm
          ? [{
              termName: currentTerm.termName,
              overall: currentTerm.totalScore
            }]
          : [];

        // Validate data before setting state
        if (!transformedStudent || !transformedStudent.terms || transformedStudent.terms.length === 0) {
          throw new Error('Invalid student data structure');
        }

        // Set all state
        setStudentData(transformedStudent);
        setLeaderboardData(leaderboard);
        setTimeSeriesData(timeSeries);
        setTermComparisonData(termComparison);
        setAttendanceData(attendance);
        setInterventionData(interventions);

      } catch (err) {
        console.error('Failed to load student data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';

        // Provide user-friendly error messages based on error type
        if (errorMessage.includes('Student profile not found')) {
          setError('Student profile not found. Please contact your administrator to set up your student profile.');
        } else if (errorMessage.includes('session has expired') || errorMessage.includes('unauthorized')) {
          setError('Your session has expired. Please log in again to continue.');
        } else if (errorMessage.includes('performance data')) {
          setError('Unable to load your performance data. This might be a temporary issue. Please try refreshing the page.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setError('Network connection issue. Please check your internet connection and try again.');
        } else {
          // Generic fallback with helpful suggestion
          setError('Unable to load dashboard data. Please try refreshing the page or contact support if the issue persists.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [selectedTerm]); // Reload when selected term changes

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !studentData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load dashboard data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Use current term data (first term in the array since we're filtering by selected term)
  const currentTermData = studentData.terms && studentData.terms.length > 0
    ? studentData.terms[0]
    : {
        quadrants: [],
        totalScore: 0,
        overallStatus: 'Progress' as const,
        grade: 'IC' as const
      };
  const { quadrants, totalScore, overallStatus, grade } = currentTermData;
  const overallLeaderboard = leaderboardData?.overall || {
    batchAvg: 0,
    batchBest: 0,
    topStudents: [],
    userRank: 0
  };

  const summaryMetrics = [
    {
      label: "Previous Term Score",
      value: studentData.terms.length > 1
        ? studentData.terms[studentData.terms.length - 2].totalScore.toFixed(1)
        : "-",
      maxValue: 100
    },
    {
      label: "Best Term Score",
      value: studentData.terms.length > 0
        ? Math.max(...studentData.terms.map(term => term.totalScore)).toFixed(1)
        : "0",
      maxValue: 100
    },
    {
      label: "Batch Avg Score",
      value: leaderboardData && typeof overallLeaderboard.batchAvg === 'number'
        ? overallLeaderboard.batchAvg.toFixed(1)
        : "-",
      maxValue: 100
    },
    {
      label: "Batch Best Score",
      value: leaderboardData && typeof overallLeaderboard.batchBest === 'number'
        ? overallLeaderboard.batchBest.toFixed(1)
        : "-",
      maxValue: 100
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-1">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {studentData.name}! Here's your PEP performance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {selectedTerm?.name || 'Current Term'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 flex flex-col items-center justify-center py-6">
          <h2 className="text-lg font-medium mb-4">Overall HPS Score</h2>
          <ScoreRing score={totalScore} maxScore={100} size="lg" />
          <div className="mt-4 flex flex-col items-center space-y-2">
            <div className="flex items-center">
              <span className="mr-2">Status:</span>
              <StatusBadge status={overallStatus} />
            </div>
            <div className="flex items-center">
              <span className="mr-2">Grade:</span>
              <Badge variant={grade === 'A+' ? "default" : grade === 'A' ? "secondary" : grade === 'B' ? "outline" : "destructive"}>
                {grade}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Score Progress Across Terms</CardTitle>
          </CardHeader>
          <CardContent className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeSeriesData?.overall || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="term" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Status</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Overall Attendance</span>
                    <span className="text-sm font-medium">{attendanceData.overall || 0}%</span>
                  </div>
                  <Progress value={attendanceData.overall || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Wellness Attendance</span>
                    <span className="text-sm font-medium">{attendanceData.wellness || 0}%</span>
                  </div>
                  <Progress value={attendanceData.wellness || 0} className="h-2" />
                </div>
                <div className="flex items-center mt-4">
                  <span className="mr-2">Eligibility Status:</span>
                  <Badge variant={
                    attendanceData.eligibility === "Eligible" ? "outline" : "destructive"
                  }>
                    {attendanceData.eligibility || "Unknown"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span>Note: Minimum 80% attendance required for eligibility in Persona and Wellness quadrants.</span>
                  <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                    <Link to="/student/eligibility" className="flex items-center">
                      <InfoIcon className="h-3 w-3 mr-1" />
                      View Rules
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Attendance data not available</p>
                <p className="text-xs mt-1">Please contact your administrator if this persists</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Term Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {termComparisonData && termComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={termComparisonData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="termName" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overall" fill="hsl(var(--primary))" name="Overall Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No term comparison data available</p>
                  <p className="text-xs mt-1">Data will appear as you complete more terms</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intervention Performance Section */}
        {interventionData && (
          <Card>
            <CardHeader>
              <CardTitle>Intervention Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {interventionData.summary.totalInterventions}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Interventions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(interventionData.summary.averageScore)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(interventionData.summary.overallProgress)}%</span>
                  </div>
                  <Progress value={interventionData.summary.overallProgress} className="h-2" />
                </div>

                {/* Active Interventions */}
                {interventionData.interventions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Active Interventions</h4>
                    {interventionData.interventions.slice(0, 3).map((intervention: any) => (
                      <div key={intervention.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{intervention.name}</span>
                        <Badge variant={intervention.status === 'Active' ? 'default' : 'secondary'}>
                          {intervention.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {metric.label}
                </h3>
                <p className="text-2xl font-bold">
                  {metric.value}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{metric.maxValue}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="quadrants">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="quadrants">Quadrant Scores</TabsTrigger>
          <TabsTrigger value="components">Component Details</TabsTrigger>
          <TabsTrigger value="microcompetencies">Microcompetency Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="quadrants" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quadrants.map((quadrant, index) => (
              <QuadrantCard
                key={quadrant.id}
                quadrant={quadrant}
                batchAvg={leaderboardData?.quadrants[quadrant.id]?.batchAvg || 0}
                batchBest={leaderboardData?.quadrants[quadrant.id]?.batchBest || 0}
                gradientClass={
                  index === 0
                    ? "card-gradient-primary"
                    : index === 1
                    ? "card-gradient-secondary"
                    : index === 2
                    ? "card-gradient-indigo"
                    : "card-gradient-purple"
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="space-y-6">
            {quadrants.map((quadrant) => (
              <Card key={quadrant.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>{quadrant.name} - Sub-categories & Components</span>
                    <Badge variant="outline">{quadrant.obtained.toFixed(1)}/{quadrant.maxScore || quadrant.weightage}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Hierarchical breakdown showing sub-categories and their components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* NEW: Show sub-categories if available, otherwise fall back to flat components */}
                    {quadrant.sub_categories && quadrant.sub_categories.length > 0 ? (
                      quadrant.sub_categories.map((subCategory) => (
                        <div key={subCategory.id} className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-lg">{subCategory.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {subCategory.weightage}% of {quadrant.name}
                              </Badge>
                              <Badge variant="outline">
                                {subCategory.obtained.toFixed(1)}/{subCategory.maxScore.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                          {subCategory.description && (
                            <p className="text-sm text-muted-foreground mb-4">{subCategory.description}</p>
                          )}
                          
                          {/* Components within this sub-category */}
                          <div className="space-y-3">
                            {subCategory.components.map((component) => (
                              <div key={component.id} className="bg-background border rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{component.name}</span>
                                    {component.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {component.category}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {component.score.toFixed(1)}/{component.maxScore.toFixed(1)}
                                    </span>
                                    {component.weightage && (
                                      <Badge variant="secondary" className="text-xs">
                                        {component.weightage}%
                                      </Badge>
                                    )}
                                    {component.status && (
                                      <StatusBadge status={component.status} />
                                    )}
                                  </div>
                                </div>
                                <Progress 
                                  value={component.maxScore > 0 ? (component.score / component.maxScore) * 100 : 0} 
                                  className="h-2" 
                                />
                                {component.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{component.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      /* LEGACY: Fall back to flat components structure */
                  <div className="space-y-4">
                    {quadrant.components.map((component) => (
                      <div key={component.id} className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{component.name}</span>
                            <span className="text-sm font-medium">{component.score}/{component.maxScore}</span>
                          </div>
                          <Progress value={(component.score / component.maxScore) * 100} className="h-2" />
                        </div>
                        {component.status && (
                          <div className="ml-4">
                            <StatusBadge status={component.status} />
                          </div>
                        )}
                      </div>
                    ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="microcompetencies">
          <div className="space-y-6">
            {quadrants.map((quadrant) => (
              <Card key={quadrant.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>{quadrant.name} Microcompetencies</span>
                    <Badge variant="outline">{quadrant.obtained}/{quadrant.maxScore || quadrant.weightage}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown of microcompetency scores within each component
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {quadrant.components.map((component) => (
                      <div key={component.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-lg">{component.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{component.score}/{component.maxScore}</span>
                            {component.status && <StatusBadge status={component.status} />}
                          </div>
                        </div>

                        {/* Microcompetencies for this component */}
                        <div className="space-y-3">
                          {component.microcompetencies && component.microcompetencies.length > 0 ? (
                            component.microcompetencies.map((micro, index) => (
                              <div key={micro.id || index} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">{micro.name}</span>
                                    <span className="text-sm font-medium">
                                      {micro.score !== undefined ? `${micro.score}/${micro.maxScore}` : 'Not scored'}
                                    </span>
                                  </div>
                                  {micro.description && (
                                    <p className="text-xs text-muted-foreground mb-1">{micro.description}</p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={micro.score !== undefined ? (micro.score / micro.maxScore) * 100 : 0}
                                      className="h-1.5 flex-1"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {micro.score !== undefined ? `${Math.round((micro.score / micro.maxScore) * 100)}%` : '0%'}
                                    </span>
                                  </div>
                                </div>
                                {micro.feedback && (
                                  <div className="ml-4">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <InfoIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <p className="text-sm">No microcompetency data available for this component</p>
                              <p className="text-xs">Scores will appear here once assessments are completed</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {leaderboardData ? (
          <LeaderboardCard
            leaders={overallLeaderboard.topStudents}
            userRank={overallLeaderboard.userRank}
            maxScore={100}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Leaderboard data not available</p>
                <p className="text-xs mt-1">Rankings will appear once more students have scores</p>
              </div>
            </CardContent>
          </Card>
        )}

        <AreasForImprovement studentData={studentData} />
      </div>
    </div>
  );
};

export default StudentDashboard;
