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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  Send,
  User,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { interventionAPI } from '@/lib/api';
import {
  TeacherInterventionDetails,
  InterventionMicrocompetency,
  EnrolledStudent
} from '@/types/intervention';
import { useAuth } from '@/contexts/AuthContext';

const InterventionScoringPage: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [interventionDetails, setInterventionDetails] = useState<TeacherInterventionDetails | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMicrocompetency, setSelectedMicrocompetency] = useState<InterventionMicrocompetency | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [showScoringDialog, setShowScoringDialog] = useState(false);
  const [scoreForm, setScoreForm] = useState({
    obtained_score: 0,
    feedback: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);



  useEffect(() => {
    if (interventionId && user?.id) {
      fetchData();
    }
  }, [interventionId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const [detailsResponse, studentsResponse] = await Promise.all([
        interventionAPI.getTeacherInterventionMicrocompetencies(user.id, interventionId!),
        interventionAPI.getTeacherInterventionStudents(user.id, interventionId!)
      ]);

      setInterventionDetails(detailsResponse.data);
      setStudents(studentsResponse.data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreStudent = (microcompetency: InterventionMicrocompetency, student: EnrolledStudent) => {
    setSelectedMicrocompetency(microcompetency);
    setSelectedStudent(student);
    setScoreForm({
      obtained_score: 0,
      feedback: '',
    });
    setShowScoringDialog(true);
  };

  const handleSubmitScore = async () => {
    if (!selectedMicrocompetency || !selectedStudent || !user?.id) return;

    try {
      setIsSubmitting(true);
      await interventionAPI.scoreStudentMicrocompetency(
        user.id,
        interventionId!,
        selectedStudent.id,
        selectedMicrocompetency.microcompetencies!.id,
        scoreForm
      );
      
      toast.success('Score submitted successfully');
      setShowScoringDialog(false);
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
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
        return <CheckCircle className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/teacher/interventions')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Intervention Scoring</h1>
          <p className="text-gray-600 mt-1">
            Score students for {interventionDetails?.intervention.name}
          </p>
        </div>
      </div>

      {/* Intervention Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {interventionDetails?.intervention.name}
          </CardTitle>
          <CardDescription>
            {interventionDetails?.intervention.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Status</Label>
              <Badge className={`mt-1 ${getStatusColor(interventionDetails?.intervention.status || '')}`}>
                {getStatusIcon(interventionDetails?.intervention.status || '')}
                <span className="ml-1">{interventionDetails?.intervention.status}</span>
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Duration</Label>
              <p className="text-sm mt-1">
                {interventionDetails?.intervention.start_date && formatDate(interventionDetails.intervention.start_date)} - 
                {interventionDetails?.intervention.end_date && formatDate(interventionDetails.intervention.end_date)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Scoring Status</Label>
              <div className="mt-1">
                {interventionDetails?.intervention.is_scoring_open ? (
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
            <div>
              <Label className="text-sm text-gray-500">Your Microcompetencies</Label>
              <p className="text-sm mt-1 font-medium">
                {interventionDetails?.microcompetencies.length || 0} assigned
              </p>
            </div>
          </div>
          
          {interventionDetails?.intervention.scoring_deadline && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Scoring Deadline: {formatDate(interventionDetails.intervention.scoring_deadline)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="microcompetencies" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="microcompetencies">Your Microcompetencies</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="microcompetencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Microcompetencies ({interventionDetails?.microcompetencies.length || 0})</CardTitle>
              <CardDescription>
                Microcompetencies you can score for this intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!interventionDetails?.microcompetencies || interventionDetails.microcompetencies.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No microcompetencies assigned</h3>
                  <p className="text-gray-600">
                    You haven't been assigned any microcompetencies for this intervention yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {interventionDetails.microcompetencies.map((microcompetency) => (
                    <Card key={microcompetency.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{microcompetency.microcompetencies?.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {microcompetency.microcompetencies?.description}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Max Score</div>
                            <div className="text-lg font-bold text-blue-600">{microcompetency.max_score}</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">
                              {microcompetency.microcompetencies?.components?.sub_categories?.quadrants?.name}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Component: {microcompetency.microcompetencies?.components?.name}
                            </span>
                            <span className="text-sm text-gray-600">
                              Weightage: {microcompetency.weightage}%
                            </span>
                          </div>
                          <Button
                            onClick={() => navigate(`/teacher/interventions/${interventionId}/microcompetencies/${microcompetency.microcompetencies?.id}/scoring`)}
                            size="sm"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Score Students
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students ({students.length})</CardTitle>
              <CardDescription>
                Students enrolled in this intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No students enrolled</h3>
                  <p className="text-gray-600">
                    No students have been enrolled in this intervention yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Registration No</TableHead>
                      <TableHead>Enrollment Status</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{student.registration_no}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              student.enrollment_status === 'Enrolled'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {student.enrollment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDate(student.enrolled_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/students/${student.id}/scores`)}
                          >
                            View Scores
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Progress</CardTitle>
              <CardDescription>
                Overview of scoring progress for this intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Analytics</h3>
                <p className="text-gray-600 mb-4">
                  Detailed scoring progress and analytics will be available here.
                </p>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scoring Dialog */}
      <Dialog open={showScoringDialog} onOpenChange={setShowScoringDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Score Student</DialogTitle>
            <DialogDescription>
              Score {selectedStudent?.name} for {selectedMicrocompetency?.microcompetencies?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score (out of {selectedMicrocompetency?.max_score})</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max={selectedMicrocompetency?.max_score || 10}
                value={scoreForm.obtained_score}
                onChange={(e) => setScoreForm(prev => ({
                  ...prev,
                  obtained_score: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Provide feedback for the student..."
                value={scoreForm.feedback}
                onChange={(e) => setScoreForm(prev => ({
                  ...prev,
                  feedback: e.target.value
                }))}
                rows={3}
              />
            </div>

            {selectedMicrocompetency && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Microcompetency: {selectedMicrocompetency.microcompetencies?.name}</div>
                  <div>Max Score: {selectedMicrocompetency.max_score}</div>
                  <div>Weightage: {selectedMicrocompetency.weightage}%</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoringDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitScore} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterventionScoringPage;
