import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClipboardCheck, User, Calendar, Award } from "lucide-react";
import api from "@/lib/api";

interface DirectAssessment {
  id: string;
  task_id: string;
  student_id: string;
  score: number;
  feedback?: string;
  private_notes?: string;
  assessed_at: string;
  students: {
    id: string;
    name: string;
    registration_no: string;
  };
  users: {
    name: string;
  };
}

interface Task {
  id: string;
  name: string;
  maxScore: number;
  dueDate: string;
  interventionId: string;
  submissionType: string;
  requiresSubmission: boolean;
  microcompetencies: Array<{
    id: string;
    name: string;
    weightage: number;
    quadrant: string;
  }>;
}

interface Student {
  id: string;
  name: string;
  registration_no: string;
}

interface DirectAssessmentDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssessmentCreated?: () => void;
}

const DirectAssessmentDialog: React.FC<DirectAssessmentDialogProps> = ({
  task,
  open,
  onOpenChange,
  onAssessmentCreated
}) => {
  const [assessments, setAssessments] = useState<DirectAssessment[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showScoringDialog, setShowScoringDialog] = useState(false);
  const [scoringForm, setScoringForm] = useState({
    score: '',
    feedback: '',
    privateNotes: ''
  });

  useEffect(() => {
    if (open && task) {
      fetchData();
    }
  }, [open, task]);

  const fetchData = async () => {
    if (!task) return;
    
    try {
      setLoading(true);
      
      // Fetch existing assessments and enrolled students in parallel
      const [assessmentsResponse, studentsResponse] = await Promise.all([
        api.intervention.getTaskDirectAssessments(task.id),
        // We'll need to add this API method to get enrolled students
        api.intervention.getInterventionStudents(task.interventionId)
      ]);

      setAssessments(assessmentsResponse.data.assessments || []);
      setEnrolledStudents(studentsResponse.data.students || []);
      
    } catch (error) {
      console.error('Error fetching direct assessment data:', error);
      toast.error('Failed to load assessment data');
      setAssessments([]);
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreStudent = (student: Student) => {
    // Check if student already has an assessment
    const existingAssessment = assessments.find(a => a.student_id === student.id);
    
    if (existingAssessment) {
      setScoringForm({
        score: existingAssessment.score.toString(),
        feedback: existingAssessment.feedback || '',
        privateNotes: existingAssessment.private_notes || ''
      });
    } else {
      setScoringForm({
        score: '',
        feedback: '',
        privateNotes: ''
      });
    }
    
    setSelectedStudent(student);
    setShowScoringDialog(true);
  };

  const submitAssessment = async () => {
    if (!selectedStudent || !task) return;

    try {
      const score = parseFloat(scoringForm.score);
      
      if (isNaN(score) || score < 0 || score > task.maxScore) {
        toast.error(`Score must be between 0 and ${task.maxScore}`);
        return;
      }

      // Check if assessment already exists
      const existingAssessment = assessments.find(a => a.student_id === selectedStudent.id);

      if (existingAssessment) {
        // Update existing assessment
        await api.intervention.updateDirectAssessment(existingAssessment.id, {
          score,
          feedback: scoringForm.feedback,
          privateNotes: scoringForm.privateNotes
        });
        toast.success('Assessment updated successfully');
      } else {
        // Create new assessment
        const response = await api.intervention.createDirectAssessment(task.id, {
          studentId: selectedStudent.id,
          score,
          feedback: scoringForm.feedback,
          privateNotes: scoringForm.privateNotes
        });

        // Show detailed feedback about microcompetency updates
        if (response.data.microcompetencyUpdates && response.data.microcompetencyUpdates.length > 0) {
          const updates = response.data.microcompetencyUpdates;
          const updateSummary = updates.map(update => 
            `${update.microcompetencyName}: ${update.percentage.toFixed(1)}% (${update.action})`
          ).join('\n');
          
          toast.success(
            `Assessment created successfully!\n\nMicrocompetency Updates:\n${updateSummary}`,
            { duration: 5000 }
          );
        } else {
          toast.success('Assessment created successfully');
        }
      }

      setShowScoringDialog(false);
      setSelectedStudent(null);
      fetchData();
      onAssessmentCreated?.();
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    }
  };

  const getAssessmentStatus = (student: Student) => {
    const assessment = assessments.find(a => a.student_id === student.id);
    return assessment ? 'assessed' : 'pending';
  };

  const getAssessmentScore = (student: Student) => {
    const assessment = assessments.find(a => a.student_id === student.id);
    return assessment?.score;
  };

  if (!task) return null;

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Direct Assessment - {task.name}
            </DialogTitle>
            <DialogDescription>
              Score students directly without requiring submissions. Scores will automatically update microcompetency progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Max Score</p>
                    <p className="font-semibold">{task.maxScore} points</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assessment Type</p>
                    <p className="font-semibold">Direct Assessment</p>
                  </div>
                </div>
                
                {/* Microcompetencies */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Microcompetencies</p>
                  <div className="flex flex-wrap gap-2">
                    {task.microcompetencies.map((mc) => (
                      <Badge key={mc.id} variant="outline">
                        {mc.name} ({mc.weightage}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrolled Students</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading students...</div>
                ) : enrolledStudents.length > 0 ? (
                  <div className="space-y-2">
                    {enrolledStudents.map((student) => {
                      const status = getAssessmentStatus(student);
                      const score = getAssessmentScore(student);
                      
                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-gray-500">{student.registration_no}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {status === 'assessed' && (
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{score}/{task.maxScore}</p>
                                <p className="text-xs text-gray-500">Assessed</p>
                              </div>
                            )}
                            
                            <Button
                              size="sm"
                              variant={status === 'assessed' ? 'outline' : 'default'}
                              onClick={() => handleScoreStudent(student)}
                            >
                              {status === 'assessed' ? 'Update Score' : 'Score Student'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No students enrolled in this intervention
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={showScoringDialog} onOpenChange={setShowScoringDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Score Student</DialogTitle>
            <DialogDescription>
              Score {selectedStudent?.name} for {task.name}
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
                value={scoringForm.score}
                onChange={(e) => setScoringForm({...scoringForm, score: e.target.value})}
                placeholder="Enter score"
              />
            </div>
            
            <div>
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={scoringForm.feedback}
                onChange={(e) => setScoringForm({...scoringForm, feedback: e.target.value})}
                placeholder="Provide feedback to the student"
              />
            </div>
            
            <div>
              <Label htmlFor="privateNotes">Private Notes (Optional)</Label>
              <Textarea
                id="privateNotes"
                value={scoringForm.privateNotes}
                onChange={(e) => setScoringForm({...scoringForm, privateNotes: e.target.value})}
                placeholder="Private notes for your reference"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoringDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitAssessment}>
              Submit Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DirectAssessmentDialog;
