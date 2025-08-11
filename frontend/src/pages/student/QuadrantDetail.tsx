
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/common/StatusBadge";
import LeaderboardCard from "@/components/common/LeaderboardCard";
import BehaviorRatingScale from "@/components/student/BehaviorRatingScale";
import { studentAPI } from "@/lib/api";
import { useTerm } from "@/contexts/TermContext";
import { transformStudentPerformanceData, transformLeaderboardData } from "@/lib/dataTransform";
import { Student, Leaderboard } from "@/types/api";

// Legacy type for backward compatibility
interface QuadrantData {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weightage: number;
  obtained: number;
  grade: string;
  status: string;
  attendance?: number;
  eligibility?: string;
  components: any[];
  sub_categories?: any[];
}
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, AlertCircle, TrendingDown, CheckCircle2, BookOpen, Target } from "lucide-react";

const QuadrantDetail: React.FC = () => {
  const { quadrantId } = useParams<{ quadrantId: string }>();
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<Leaderboard | null>(null);
  const [quadrantDetails, setQuadrantDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<string>(quadrantId || "persona");

  // Load data from API
  useEffect(() => {
    const loadQuadrantData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current student first
        const currentStudentResponse = await studentAPI.getCurrentStudent();
        const studentId = currentStudentResponse.data.id;

        // Fetch performance data and quadrant details (using selected term)
        const [performanceResponse, leaderboardResponse, quadrantDetailsResponse] = await Promise.all([
          studentAPI.getStudentPerformance(studentId, selectedTerm?.id, true),
          studentAPI.getStudentLeaderboard(studentId, selectedTerm?.id).catch(() => null),
          studentAPI.getQuadrantDetails(studentId, activeQuadrant, selectedTerm?.id).catch(() => null)
        ]);

        // Transform data
        const transformedStudent = transformStudentPerformanceData(performanceResponse);
        const leaderboard = leaderboardResponse
          ? transformLeaderboardData(leaderboardResponse)
          : null;

        setStudentData(transformedStudent);
        setLeaderboardData(leaderboard);
        setQuadrantDetails(quadrantDetailsResponse?.data);

      } catch (err) {
        console.error('Failed to load quadrant data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadQuadrantData();
  }, [activeQuadrant, selectedTerm]); // Reload when term or quadrant changes

  // Update active quadrant when URL param changes
  useEffect(() => {
    if (quadrantId) {
      setActiveQuadrant(quadrantId);
    }
  }, [quadrantId]);

  // Handle quadrant change
  const handleQuadrantChange = (newQuadrantId: string) => {
    if (newQuadrantId !== activeQuadrant) {
      navigate(`/student/quadrant/${newQuadrantId}`);
      setActiveQuadrant(newQuadrantId);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quadrant details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !studentData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load quadrant data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Find the current term data (use the first term as current)
  const currentTermData = studentData.terms?.[0] || studentData.terms?.find(term => term.termId === studentData.currentTerm);
  const quadrant = currentTermData?.quadrants.find((q) => q.id === activeQuadrant);
  const leaderboard = leaderboardData?.quadrants?.[activeQuadrant || ""];

  // Use quadrant details data if available, otherwise fall back to transformed student data
  const quadrantDisplayData = quadrantDetails?.quadrant ? {
    ...quadrant,
    obtained: quadrantDetails.quadrant.obtainedScore || 0,
    maxScore: quadrantDetails.quadrant.totalMax || quadrantDetails.quadrant.weightage,
    weightage: quadrantDetails.quadrant.weightage,
    status: quadrantDetails.quadrant.status,
    sub_categories: quadrantDetails.subCategories || quadrant?.sub_categories || []
  } : quadrant;

  // Generate chart data from current term only (to avoid showing incorrect historical data)
  const chartData = currentTermData ? [{
    term: currentTermData.termName,
    score: quadrantDisplayData?.obtained || 0
  }] : [];

  if (!quadrant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Quadrant not found</h1>
        <p className="text-muted-foreground mb-4">
          The requested quadrant "{activeQuadrant}" could not be found or you don't have access to it.
        </p>
        <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
      </div>
    );
  }

  const getGradientClass = () => {
    switch (activeQuadrant) {
      case "persona":
        return "card-gradient-primary";
      case "wellness":
        return "card-gradient-secondary";
      case "behavior":
        return "card-gradient-indigo";
      case "discipline":
        return "card-gradient-purple";
      default:
        return "card-gradient-primary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/student")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{quadrant.name} Quadrant</h1>
            <p className="text-muted-foreground">
              Detailed breakdown of your performance in {quadrant.name.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {selectedTerm?.name || 'Current Term'}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <Tabs value={activeQuadrant} onValueChange={handleQuadrantChange} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            {currentTermData?.quadrants.map((q) => (
              <TabsTrigger key={q.id} value={q.id} className="flex items-center justify-center">
                <div className="flex items-center">
                  <span className="mr-1">{q.name}</span>
                  {q.status && (
                    <Badge variant={q.status === "Cleared" ? "outline" : "destructive"} className="ml-1 text-xs py-0 h-5">
                      {q.obtained?.toFixed(1) || '0.0'}/{q.weightage}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`col-span-1 ${getGradientClass()} text-white`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">Your Score</h2>
              <div className="text-4xl font-bold mb-4">
              {quadrantDisplayData?.obtained?.toFixed(1) || '0.0'}/{quadrantDisplayData?.maxScore || quadrantDisplayData?.weightage || 0}
              </div>
              <div className="inline-flex">
                <StatusBadge
                  status={quadrantDisplayData?.status || 'Not Assessed'}
                  className="border border-white/20"
                />
              </div>

              {quadrant.attendance && (
                <div className="mt-3 text-sm">
                  <p className="text-white/70">Attendance: {quadrant.attendance}%</p>
                  <p className="text-white/70">
                    Status:
                    <Badge variant={quadrant.eligibility === "Eligible" ? "outline" : "destructive"} className="ml-2">
                      {quadrant.eligibility}
                    </Badge>
                  </p>
                </div>
              )}
            </div>

            {/* Batch comparison section */}
            <div className="mt-4 pt-4 border-t border-white/20">
              {leaderboard ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-white/70">Batch Average</p>
                    <p className="font-bold">{leaderboard.batchAvg || 0}/{quadrant.weightage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Batch Best</p>
                    <p className="font-bold">{leaderboard.batchBest || 0}/{quadrant.weightage}</p>
                  </div>
                  {quadrant.rank && (
                    <div className="col-span-2 mt-2">
                      <p className="text-xs text-white/70">Your Rank</p>
                      <p className="font-bold">#{quadrant.rank} in batch</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-white/70">Batch comparison data not available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progress Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="term" />
                <YAxis domain={[0, quadrantDisplayData?.maxScore || quadrantDisplayData?.weightage || 100]} />
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

      <div>
        <h2 className="text-xl font-semibold mt-8">Breakdown by Sub-Categories</h2>

        {/* NEW: Dynamic sub-category structure */}
        {quadrantDisplayData?.sub_categories && quadrantDisplayData.sub_categories.length > 0 ? (
          <div className="space-y-8 mt-6">
            {quadrantDisplayData.sub_categories.map((subCategory) => (
              <div key={subCategory.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{subCategory.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {subCategory.weightage}% of {quadrantDisplayData.name}
                    </Badge>
                    <Badge variant="outline">
                      {(subCategory.obtained || 0).toFixed(1)}/{(subCategory.maxScore || 0).toFixed(1)}
                    </Badge>
                  </div>
                </div>

                {subCategory.description && (
                  <p className="text-sm text-muted-foreground">{subCategory.description}</p>
                )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subCategory.components.map((component) => (
                  <Card key={component.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{component.name}</h4>
                            {component.description && (
                              <p className="text-xs text-muted-foreground mt-1">{component.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                        {component.status && (
                          <StatusBadge status={component.status} />
                        )}
                            {component.category && (
                              <Badge variant="outline" className="text-xs">
                                {component.category}
                              </Badge>
                            )}
                          </div>
                      </div>
                        <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Score</span>
                            <div className="flex items-center gap-2">
                          <span className="font-bold">
                                {component.score.toFixed(1)}/{component.maxScore.toFixed(1)}
                          </span>
                              {component.weightage && (
                                <Badge variant="secondary" className="text-xs">
                                  {component.weightage}%
                                </Badge>
                              )}
                            </div>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                                width: `${component.maxScore > 0 ? (component.score / component.maxScore) * 100 : 0}%`,
                            }}
                          />
                          </div>
                          <div className="text-right text-xs text-muted-foreground mt-1">
                            {component.maxScore > 0 ? Math.round((component.score / component.maxScore) * 100) : 0}%
                          </div>
                        </div>

                        {/* Show microcompetencies if available */}
                        {component.microcompetencies && component.microcompetencies.length > 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <h5 className="text-xs font-medium mb-2">Microcompetencies</h5>
                            <div className="space-y-1">
                              {component.microcompetencies.map((micro) => (
                                <div key={micro.id} className="flex justify-between items-center text-xs">
                                  <span className="truncate">{micro.name}</span>
                                  <div className="flex items-center gap-1">
                                    {micro.score !== undefined ? (
                                      <span className="font-medium">
                                        {micro.score.toFixed(1)}/{micro.maxScore}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">Not scored</span>
                                    )}
                                    <Badge variant="outline" className="text-xs py-0">
                                      {micro.weightage}%
                                    </Badge>
                        </div>
                      </div>
                ))}
            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                ))}
            </div>
              </div>
            ))}
          </div>
        ) : (
          /* LEGACY: Fall back to flat components structure */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {quadrant.components.map((component) => (
              <Card key={component.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{component.name}</h3>
                    {component.status && (
                      <StatusBadge status={component.status} />
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score</span>
                      <span className="font-bold">
                        {component.score}/{component.maxScore}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(component.score / component.maxScore) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {activeQuadrant === "behavior" && (
        <div className="mt-8">
          <BehaviorRatingScale />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {leaderboard ? (
          <LeaderboardCard
            leaders={leaderboard.topStudents}
            userRank={leaderboard.userRank}
            maxScore={quadrant.weightage}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Leaderboard data is not available at the moment.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Improvement Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {quadrant.eligibility === "Not Eligible" ? (
              <div className="flex items-start gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Attendance Shortage</p>
                  <p>Your attendance is below the required 80% threshold for this quadrant. Please improve your attendance to become eligible.</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 text-amber-600" />
                      <span>Set a goal to attend at least 90% of remaining sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BookOpen className="h-4 w-4 mt-0.5 text-amber-600" />
                      <span>Request make-up sessions if available for missed classes</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {quadrant.components
                  .filter(c => c.status === "Progress" || c.status === "Deteriorate")
                  .slice(0, 3)
                  .map(component => {
                    // Generate specific recommendations based on component and quadrant
                    const specificRecommendations = [];

                    if (activeQuadrant === "persona") {
                      if (component.name.includes("Critical Thinking")) {
                        specificRecommendations.push("Practice analytical exercises and case studies");
                        specificRecommendations.push("Participate in debate clubs or discussion forums");
                      } else if (component.name.includes("Communication")) {
                        specificRecommendations.push("Join public speaking workshops or Toastmasters");
                        specificRecommendations.push("Practice written communication through essays and reports");
                      } else if (component.name.includes("Leadership")) {
                        specificRecommendations.push("Take initiative in group projects and activities");
                        specificRecommendations.push("Volunteer for leadership roles in student organizations");
                      } else if (component.name.includes("Teamwork")) {
                        specificRecommendations.push("Focus on active listening and collaboration skills");
                        specificRecommendations.push("Seek feedback from team members on your contributions");
                      } else if (component.name.includes("Negotiation")) {
                        specificRecommendations.push("Practice conflict resolution techniques");
                        specificRecommendations.push("Study effective negotiation strategies and apply them");
                      } else if (component.category === "Professional") {
                        specificRecommendations.push("Dedicate more time to professional development activities");
                        specificRecommendations.push("Seek mentorship from industry professionals");
                      }
                    } else if (activeQuadrant === "wellness") {
                      specificRecommendations.push("Establish a regular fitness routine focusing on this area");
                      specificRecommendations.push("Consult with the wellness instructor for personalized guidance");
                    } else if (activeQuadrant === "behavior") {
                      specificRecommendations.push("Set specific, measurable goals for improvement in this area");
                      specificRecommendations.push("Request feedback from instructors on your progress");
                    } else if (activeQuadrant === "discipline") {
                      specificRecommendations.push("Create a structured schedule to improve consistency");
                      specificRecommendations.push("Use productivity tools to track and manage your commitments");
                    }

                    return (
                      <div key={component.id} className="border-l-2 pl-4 py-1 border-l-amber-500">
                        <div className="flex items-start gap-2">
                          {component.status === "Deteriorate" ? (
                            <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{component.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {component.status === "Deteriorate"
                                ? `This area shows significant decline and requires immediate attention.`
                                : `This area needs continued focus to reach optimal performance.`}
                            </p>

                            {specificRecommendations.length > 0 && (
                              <ul className="mt-2 space-y-1 text-sm">
                                {specificRecommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Target className="h-4 w-4 mt-0.5 text-primary" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {quadrant.components.filter(c => c.status === "Progress" || c.status === "Deteriorate").length === 0 && (
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Excellent Performance</p>
                      <p>All components are in good standing. Keep up the excellent work!</p>
                      <p className="text-sm text-muted-foreground mt-2">Consider mentoring peers who may be struggling in this area.</p>
                    </div>
                  </div>
                )}

                {quadrant.components.filter(c => c.status === "Progress" || c.status === "Deteriorate").length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dashed">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/student/improvement')}>
                      View Complete Improvement Plan
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuadrantDetail;
