import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Star
} from "lucide-react";
import { interventionAPI } from "@/lib/api";

interface TaskSubmission {
  id: string;
  studentName: string;
  registrationNo: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  status: string;
  isLate: boolean;
  attachments?: string[];
}

interface Task {
  id: string;
  name: string;
  maxScore: number;
  dueDate: string;
  interventionId: string;
  microcompetencies: Array<{
    id: string;
    name: string;
    weightage: number;
    quadrant: string;
  }>;
}

interface TaskSubmissionsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmissionGraded?: () => void;
}

const TaskSubmissionsDialog: React.FC<TaskSubmissionsDialogProps> = ({
  task,
  open,
  onOpenChange,
  onSubmissionGraded
}) => {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [showGradingDialog, setShowGradingDialog] = useState(false);
  const [gradingForm, setGradingForm] = useState({
    score: '',
    feedback: '',
    privateNotes: ''
  });

  useEffect(() => {
    if (open && task) {
      fetchSubmissions();
    }
  }, [open, task]);

  const fetchSubmissions = async () => {
    if (!task) return;

    try {
      setLoading(true);

      // Use the intervention ID from the task to get submissions
      const response = await interventionAPI.getTeacherSubmissions(task.interventionId, { taskId: task.id });

      // Transform the API response to match our interface
      const transformedSubmissions: TaskSubmission[] = response.data.map(submission => ({
        id: submission.id,
        studentName: submission.students.name,
        registrationNo: submission.students.registration_no,
        submittedAt: submission.submitted_at,
        score: submission.score,
        feedback: submission.feedback,
        status: submission.status === 'graded' ? 'Graded' : 'Submitted',
        isLate: submission.is_late,
        attachments: [] // We'll need to add attachment support later
      }));

      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
      // Fallback to empty array instead of mock data
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setGradingForm({
      score: submission.score?.toString() || '',
      feedback: submission.feedback || '',
      privateNotes: ''
    });
    setShowGradingDialog(true);
  };

  const submitGrade = async () => {
    if (!selectedSubmission || !task) return;

    try {
      const score = gradingForm.score ? parseFloat(gradingForm.score) : undefined;
      
      if (score !== undefined && (score < 0 || score > task.maxScore)) {
        toast.error(`Score must be between 0 and ${task.maxScore}`);
        return;
      }

      const response = await interventionAPI.gradeTaskSubmission(selectedSubmission.id, {
        score,
        feedback: gradingForm.feedback,
        privateNotes: gradingForm.privateNotes
      });

      // Show detailed feedback about microcompetency updates
      if (response.data.microcompetencyUpdates && response.data.microcompetencyUpdates.length > 0) {
        const updates = response.data.microcompetencyUpdates;
        const updateSummary = updates.map(update => 
          `${update.microcompetencyName}: ${update.percentage.toFixed(1)}% (${update.action})`
        ).join('\n');
        
        toast.success(
          `Submission graded successfully!\n\nMicrocompetency Updates:\n${updateSummary}`,
          { duration: 5000 }
        );
      } else {
        toast.success('Submission updated successfully');
      }

      setShowGradingDialog(false);
      setSelectedSubmission(null);
      fetchSubmissions();
      onSubmissionGraded?.();
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error('Failed to grade submission');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Graded': return 'bg-green-100 text-green-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Graded': return <CheckCircle className="h-4 w-4" />;
      case 'Submitted': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Task Submissions: {task.name}
            </DialogTitle>
            <DialogDescription>
              Review and grade student submissions for this task.
            </DialogDescription>
          </DialogHeader>

          {/* Task Info */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Max Score: {task.maxScore}</p>
                  <p className="text-sm text-gray-500">Due: {new Date(task.dueDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Microcompetencies:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.microcompetencies.map((mc) => (
                      <Badge key={mc.id} variant="outline" className="text-xs">
                        {mc.name} ({mc.weightage}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Registration No</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.studentName}</TableCell>
                    <TableCell>{submission.registrationNo}</TableCell>
                    <TableCell>
                      <div>
                        {new Date(submission.submittedAt).toLocaleString()}
                        {submission.isLate && (
                          <Badge variant="destructive" className="ml-2 text-xs">Late</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(submission.status)}
                          {submission.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {submission.score !== undefined ? (
                        <span className="font-medium">
                          {submission.score}/{task.maxScore}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not graded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleGradeSubmission(submission)}
                        variant={submission.status === 'Graded' ? 'outline' : 'default'}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {submission.status === 'Graded' ? 'Update Grade' : 'Grade'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={showGradingDialog} onOpenChange={setShowGradingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Grade {selectedSubmission?.studentName}'s submission for {task.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="score">Score (out of {task.maxScore})</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max={task.maxScore}
                step="0.1"
                value={gradingForm.score}
                onChange={(e) => setGradingForm({...gradingForm, score: e.target.value})}
                placeholder="Enter score"
              />
            </div>
            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={gradingForm.feedback}
                onChange={(e) => setGradingForm({...gradingForm, feedback: e.target.value})}
                placeholder="Provide feedback to the student"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="privateNotes">Private Notes (for teachers only)</Label>
              <Textarea
                id="privateNotes"
                value={gradingForm.privateNotes}
                onChange={(e) => setGradingForm({...gradingForm, privateNotes: e.target.value})}
                placeholder="Internal notes (not visible to students)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitGrade}>
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskSubmissionsDialog;
