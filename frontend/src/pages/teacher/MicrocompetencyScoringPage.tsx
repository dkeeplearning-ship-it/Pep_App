import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Target, 
  User, 
  CheckCircle, 
  Clock, 
  Edit,
  Save,
  X
} from 'lucide-react';
import { interventionAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface MicrocompetencyDetails {
  id: string;
  name: string;
  description: string;
  max_score: number;
  weightage: number;
  intervention: {
    id: string;
    name: string;
    description: string;
    is_scoring_open: boolean;
    scoring_deadline?: string;
  };
}

interface StudentScore {
  id: string;
  name: string;
  registration_no: string;
  enrollment_status: string;
  enrolled_at: string;
  score?: {
    obtained_score: number;
    max_score: number;
    percentage: number;
    feedback?: string;
    status: string;
    scored_at: string;
  };
}

const MicrocompetencyScoringPage: React.FC = () => {
  const { interventionId, microcompetencyId } = useParams<{ 
    interventionId: string; 
    microcompetencyId: string; 
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [microcompetencyDetails, setMicrocompetencyDetails] = useState<MicrocompetencyDetails | null>(null);
  const [students, setStudents] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScoringDialog, setShowScoringDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentScore | null>(null);
  const [scoreForm, setScoreForm] = useState({
    obtained_score: 0,
    feedback: '',
    status: 'Submitted' as 'Draft' | 'Submitted' | 'Reviewed'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (interventionId && microcompetencyId && user?.id) {
      fetchData();
    }
  }, [interventionId, microcompetencyId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get microcompetency details and students
      const [microcompetenciesResponse, studentsResponse] = await Promise.all([
        interventionAPI.getTeacherInterventionMicrocompetencies(user.id, interventionId!),
        interventionAPI.getTeacherInterventionStudents(user.id, interventionId!, microcompetencyId)
      ]);

      // Find the specific microcompetency
      const targetMicrocompetency = microcompetenciesResponse.data.microcompetencies.find(
        (mc: any) => mc.microcompetencies?.id === microcompetencyId
      );

      if (!targetMicrocompetency) {
        throw new Error('Microcompetency not found or not assigned to you');
      }

      setMicrocompetencyDetails({
        id: targetMicrocompetency.microcompetencies.id,
        name: targetMicrocompetency.microcompetencies.name,
        description: targetMicrocompetency.microcompetencies.description,
        max_score: targetMicrocompetency.max_score,
        weightage: targetMicrocompetency.weightage,
        intervention: microcompetenciesResponse.data.intervention
      });

      setStudents(studentsResponse.data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreStudent = (student: StudentScore) => {
    setSelectedStudent(student);
    setScoreForm({
      obtained_score: student.score?.obtained_score || 0,
      feedback: student.score?.feedback || '',
      status: (student.score?.status as any) || 'Submitted'
    });
    setShowScoringDialog(true);
  };

  const handleSubmitScore = async () => {
    if (!selectedStudent || !user?.id || !microcompetencyDetails) return;

    try {
      setIsSubmitting(true);
      
      await interventionAPI.scoreStudentMicrocompetency(
        user.id,
        interventionId!,
        selectedStudent.id,
        microcompetencyId!,
        scoreForm
      );

      toast.success('Score submitted successfully');
      setShowScoringDialog(false);
      setSelectedStudent(null);
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading microcompetency details...</p>
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
            <X className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/teacher/interventions/${interventionId}/scoring`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Intervention
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Microcompetency Scoring</h1>
            <p className="text-gray-600">{microcompetencyDetails?.name}</p>
          </div>
        </div>
        <Badge
          className={
            microcompetencyDetails?.intervention.is_scoring_open
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-red-100 text-red-800 border-red-200'
          }
        >
          {microcompetencyDetails?.intervention.is_scoring_open ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Scoring Open
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 mr-1" />
              Scoring Closed
            </>
          )}
        </Badge>
      </div>

      {/* Microcompetency Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {microcompetencyDetails?.name}
          </CardTitle>
          <CardDescription>
            {microcompetencyDetails?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Max Score</Label>
              <p className="text-lg font-bold text-blue-600">{microcompetencyDetails?.max_score}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Weightage</Label>
              <p className="text-lg font-bold text-purple-600">{microcompetencyDetails?.weightage}%</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Students to Score</Label>
              <p className="text-lg font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({students.length})</CardTitle>
          <CardDescription>
            Score students on this microcompetency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No students enrolled</h3>
              <p className="text-gray-600">
                No students are enrolled in this intervention yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Registration No</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
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
                      {student.score ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor(student.score.percentage)}`}>
                            {student.score.obtained_score}/{student.score.max_score}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({student.score.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not scored</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.score ? (
                        <Badge
                          variant={student.score.status === 'Submitted' ? 'default' : 'secondary'}
                        >
                          {student.score.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.score?.scored_at ? (
                        <span className="text-sm text-gray-600">
                          {formatDate(student.score.scored_at)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScoreStudent(student)}
                        disabled={!microcompetencyDetails?.intervention.is_scoring_open}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {student.score ? 'Edit Score' : 'Score'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Scoring Dialog */}
      <Dialog open={showScoringDialog} onOpenChange={setShowScoringDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Score Student</DialogTitle>
            <DialogDescription>
              Score {selectedStudent?.name} on {microcompetencyDetails?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="score">Score (out of {microcompetencyDetails?.max_score})</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max={microcompetencyDetails?.max_score}
                value={scoreForm.obtained_score}
                onChange={(e) => setScoreForm(prev => ({ 
                  ...prev, 
                  obtained_score: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Provide feedback for the student..."
                value={scoreForm.feedback}
                onChange={(e) => setScoreForm(prev => ({ ...prev, feedback: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={scoreForm.status}
                onValueChange={(value: 'Draft' | 'Submitted' | 'Reviewed') => 
                  setScoreForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScoringDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitScore}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Score
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MicrocompetencyScoringPage;
