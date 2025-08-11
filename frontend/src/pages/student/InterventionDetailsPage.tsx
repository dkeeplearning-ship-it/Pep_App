import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Users,
  Target,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  FileText,
  User,
  Award,
  TrendingUp,
} from 'lucide-react';
import { studentAPI, studentInterventionAPI } from '@/lib/api';
import { InterventionDetails, InterventionMicrocompetency } from '@/types/intervention';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/contexts/TermContext';

const InterventionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTerm } = useTerm();
  const [intervention, setIntervention] = useState<any>(null);
  const [studentScore, setStudentScore] = useState<any>(null);
  const [microcompetencyData, setMicrocompetencyData] = useState<any>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInterventionDetails();
    }
  }, [id, selectedTerm]); // Reload when term changes

  const fetchInterventionDetails = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Get current student profile to get student ID
      const currentStudentResponse = await studentAPI.getCurrentStudent();
      const studentId = currentStudentResponse.data.id;
      setCurrentStudentId(studentId);

      // Use student-specific endpoint that doesn't require admin privileges
      const interventionResponse = await studentAPI.getStudentInterventionDetails(studentId, id!);

      setIntervention(interventionResponse.data.intervention);
      if (interventionResponse.data.progress) {
        setStudentScore(interventionResponse.data.progress);
      }

      // Get microcompetency breakdown for enrolled students
      try {
        const microcompetencyResponse = await studentInterventionAPI.getStudentInterventionBreakdown(studentId, id!);
        setMicrocompetencyData(microcompetencyResponse.data);
      } catch (microError) {
        console.warn('Could not fetch microcompetency data:', microError);
        // Don't set error state for this - it's optional data
      }
    } catch (err) {
      console.error('Error fetching intervention details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch intervention details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!intervention || !user) return;
    
    try {
      setEnrolling(true);
      // This would typically be handled by a student enrollment API
      // For now, we'll show a success message
      alert('Enrollment request submitted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll in intervention');
    } finally {
      setEnrolling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <PlayCircle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Draft':
        return <Clock className="h-4 w-4" />;
      case 'Cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-green-600';
      case 'Completed':
        return 'text-blue-600';
      case 'Draft':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Intervention not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const progress = calculateProgress(intervention.start_date, intervention.end_date);
  const daysRemaining = getDaysRemaining(intervention.end_date);
  const isEnrolled = currentStudentId && intervention.enrolled_students.some(student => student.id === currentStudentId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/student/interventions')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Interventions
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intervention Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl">{intervention.name}</CardTitle>
                    <Badge className={getStatusColor(intervention.status)}>
                      {getStatusIcon(intervention.status)}
                      <span className="ml-1">{intervention.status}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {intervention.description}
                  </CardDescription>
                </div>
              </div>

              {/* Progress Bar for Active Interventions */}
              {intervention.status === 'Active' && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="text-sm text-gray-600">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Intervention ended'}
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Tabs Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">My Scores</TabsTrigger>
              <TabsTrigger value="microcompetencies">Microcompetencies</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Objectives */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {intervention.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Prerequisites */}
              {intervention.prerequisites && intervention.prerequisites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Prerequisites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intervention.prerequisites.map((prerequisite, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{prerequisite}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Scoring Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Scoring Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Scoring Status</span>
                      <div className="flex items-center gap-2">
                        {intervention.is_scoring_open ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {intervention.scoring_deadline && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Scoring Deadline</span>
                        <span className="font-medium">{formatDate(intervention.scoring_deadline)}</span>
                      </div>
                    )}

                    {studentScore && studentScore.maxScore > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Your Overall Score</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {((studentScore.currentScore / studentScore.maxScore) * 100).toFixed(1)}%
                          </Badge>
                          <span className="text-sm text-gray-600">
                            ({studentScore.currentScore}/{studentScore.maxScore})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores" className="space-y-4">
              {!studentScore ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Award className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No scores yet</h3>
                    <p className="text-gray-600 text-center">
                      You haven't been scored for this intervention yet. Scores will appear here once teachers begin scoring.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Overall Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Overall Progress & Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Score Information */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-blue-600">
                            {studentScore.maxScore > 0 ? ((studentScore.currentScore / studentScore.maxScore) * 100).toFixed(1) : '0'}%
                          </span>
                          <span className="text-gray-600">
                            {studentScore.currentScore} / {studentScore.maxScore} points
                          </span>
                        </div>
                        <Progress value={studentScore.maxScore > 0 ? (studentScore.currentScore / studentScore.maxScore) * 100 : 0} className="h-3" />
                        
                        {/* Task Progress */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{studentScore.completedTasks}</div>
                            <div className="text-sm text-gray-600">Tasks Completed</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{studentScore.totalTasks}</div>
                            <div className="text-sm text-gray-600">Total Tasks</div>
                          </div>
                        </div>

                        {/* Completion Percentage */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm text-gray-600">{studentScore.completionPercentage}%</span>
                          </div>
                          <Progress value={studentScore.completionPercentage} className="h-2" />
                        </div>

                        {/* Rank Information */}
                        {studentScore.rank > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-800">
                              Your rank: <span className="font-bold">#{studentScore.rank}</span> out of {studentScore.totalStudents} students
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Task Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Details</h3>
                        <p className="text-gray-600">
                          Detailed task breakdown and scores will be available here once teachers begin scoring individual tasks.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="microcompetencies" className="space-y-4">
              {isEnrolled && microcompetencyData?.breakdown ? (
                <div className="space-y-4">
                  {microcompetencyData.breakdown.map((quadrant: any) => (
                    <Card key={quadrant.quadrant_id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          {quadrant.quadrant_name}
                        </CardTitle>
                        <CardDescription>
                          Score: {quadrant.quadrant_total_obtained}/{quadrant.quadrant_total_max}
                          ({quadrant.quadrant_percentage.toFixed(1)}%)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {quadrant.components.map((component: any) => (
                            <div key={component.component_id} className="border-l-4 border-l-blue-200 pl-4">
                              <h4 className="font-medium text-gray-900">{component.component_name}</h4>
                              <p className="text-sm text-gray-600 mb-2">
                                Score: {component.component_total_obtained}/{component.component_total_max}
                                ({component.component_percentage.toFixed(1)}%)
                              </p>
                              <div className="space-y-2">
                                {component.microcompetencies.map((micro: any) => (
                                  <div key={micro.id} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-sm">{micro.name}</h5>
                                        <p className="text-xs text-gray-600">{micro.description}</p>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium">
                                          {micro.score.obtained_score}/{micro.score.max_score}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {micro.score.percentage.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                    {micro.score.feedback && (
                                      <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                        <strong>Feedback:</strong> {micro.score.feedback}
                                      </div>
                                    )}
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                      <span>Weightage: {micro.intervention_weightage}%</span>
                                      <span>Scored: {new Date(micro.score.scored_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isEnrolled ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Microcompetencies</h3>
                    <p className="text-gray-600 text-center">
                      Loading your microcompetency progress...
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Microcompetencies</h3>
                    <p className="text-gray-600 text-center">
                      Enroll in this intervention to view microcompetency details.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="teachers" className="space-y-4">
              {intervention.teachers.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <User className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No teachers assigned</h3>
                    <p className="text-gray-600 text-center">
                      Teachers will be assigned to this intervention soon.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {intervention.teachers.map((teacher) => (
                    <Card key={teacher.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{teacher.name}</CardTitle>
                            <p className="text-sm text-gray-600">{teacher.employee_id}</p>
                          </div>
                          <Badge variant="outline">{teacher.role}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Assigned Quadrants:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {teacher.assigned_quadrants.map((quadrant) => (
                                <Badge key={quadrant} variant="secondary" className="text-xs capitalize">
                                  {quadrant}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Enrolled Students ({intervention.enrolled_students.length}/{intervention.max_students})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {intervention.enrolled_students.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No students enrolled</h3>
                      <p className="text-gray-600">Be the first to join this intervention!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {intervention.enrolled_students.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-gray-600">{student.registration_no}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {student.enrollment_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">
                  {Math.ceil((new Date(intervention.end_date).getTime() - new Date(intervention.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Start Date</span>
                <span className="font-medium">{formatDate(intervention.start_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">End Date</span>
                <span className="font-medium">{formatDate(intervention.end_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Scoring Status</span>
                <span className="font-medium">
                  {intervention.is_scoring_open ? 'Open' : 'Closed'}
                </span>
              </div>
              {studentScore && studentScore.maxScore > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Your Score</span>
                  <span className="font-medium">{((studentScore.currentScore / studentScore.maxScore) * 100).toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrollment Action */}
          {intervention.status === 'Active' && !isEnrolled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Join This Intervention</CardTitle>
                <CardDescription>
                  Start your learning journey and develop new skills.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleEnroll} 
                  disabled={enrolling}
                  className="w-full"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </Button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  You can withdraw within the first week if needed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Already Enrolled */}
          {isEnrolled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Enrolled
                </CardTitle>
                <CardDescription>
                  You are enrolled in this intervention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View My Progress
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterventionDetailsPage;
