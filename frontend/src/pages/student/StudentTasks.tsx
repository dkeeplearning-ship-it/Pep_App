import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  FileText,
  Send,
  Save,
  AlertCircle,
  CheckCircle,
  Target,
  BookOpen
} from "lucide-react";
import { interventionAPI, studentAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Task {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  dueDate: string;
  instructions: string;
  submissionType: string;
  allowLateSubmission: boolean;
  latePenalty: number;
  status: string;
  interventionName: string;
  microcompetencies: Array<{
    id: string;
    name: string;
    weightage: number;
    component: {
      id: string;
      name: string;
      max_score: number;
      weightage: number;
      sub_category: {
        name: string;
        weightage: number;
        quadrant: {
          name: string;
          weightage: number;
          color: string;
        };
      };
    };
  }>;
  submission?: {
    id: string;
    status: string;
    score?: number;
    submittedAt: string;
    feedback?: string;
    isLate: boolean;
  };
  canSubmit: boolean;
  isOverdue: boolean;
  interventionProgress?: {
    totalTasks: number;
    completedTasks: number;
    averageScore: number;
    interventionPercentage: number;
  };
}

interface Intervention {
  id: string;
  name: string;
  status: string;
}

const StudentTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    originalName: string;
    filename: string;
    url: string;
    size: number;
  }>>([]);

  useEffect(() => {
    fetchInterventions();
  }, []);

  useEffect(() => {
    if (selectedIntervention) {
      fetchTasks();
    }
  }, [selectedIntervention]);

  const fetchInterventions = async () => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        setLoading(false);
        return;
      }

      // Get current student profile to get student ID
      const currentStudentResponse = await studentAPI.getCurrentStudent();
      const studentId = currentStudentResponse.data.id;

      const response = await studentAPI.getStudentInterventions(studentId);
      const transformedInterventions: Intervention[] = response.data.interventions.map(intervention => ({
        id: intervention.id,
        name: intervention.name,
        status: intervention.status as 'Draft' | 'Active' | 'Completed' | 'Cancelled'
      }));

      setInterventions(transformedInterventions);
      if (transformedInterventions.length > 0) {
        setSelectedIntervention(transformedInterventions[0].id);
      } else {
        // No interventions found, stop loading
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching interventions:', error);
      toast.error('Failed to load interventions');

      // Set empty array instead of mock data
      setInterventions([]);
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedIntervention || !user?.id) return;

    try {
      setLoading(true);

      // Get current student ID
      const currentStudentResponse = await studentAPI.getCurrentStudent();
      const studentId = currentStudentResponse.data.id;

      // Use student-specific API endpoint
      const response = await studentAPI.getStudentInterventionTasks(studentId, selectedIntervention);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');

      // Set empty array instead of mock data
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setSubmissionText(task.submission?.status === 'Draft' ? '' : ''); // Load draft content if available
    setAttachments([]); // Reset attachments - in real app, load existing attachments from submission
    setShowSubmissionDialog(true);
  };

  const handleSubmitTask = async () => {
    if (!selectedTask || !submissionText.trim()) {
      toast.error('Please enter your submission');
      return;
    }

    try {
      setSubmitting(true);
      await interventionAPI.submitTask(selectedTask.id, {
        submissionText,
        attachments: attachments.map(file => file.url)
      });
      
      toast.success('Task submitted successfully!');
      setShowSubmissionDialog(false);
      setSubmissionText("");
      fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error('Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedTask) return;

    try {
      await interventionAPI.saveTaskDraft(selectedTask.id, {
        submissionText,
        attachments: attachments.map(file => file.url)
      });
      
      toast.success('Draft saved successfully!');
      fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const getTaskStatusColor = (task: Task) => {
    if (task.submission?.status === 'Graded') return 'bg-green-100 text-green-800';
    if (task.submission?.status === 'Submitted') return 'bg-blue-100 text-blue-800';
    if (task.submission?.status === 'Draft') return 'bg-yellow-100 text-yellow-800';
    if (task.isOverdue) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getTaskStatusText = (task: Task) => {
    if (task.submission?.status === 'Graded') return 'Graded';
    if (task.submission?.status === 'Submitted') return 'Submitted';
    if (task.submission?.status === 'Draft') return 'Draft Saved';
    if (task.isOverdue) return 'Overdue';
    return 'Not Started';
  };

  const getTaskIcon = (task: Task) => {
    if (task.submission?.status === 'Graded') return <CheckCircle className="h-4 w-4" />;
    if (task.submission?.status === 'Submitted') return <Send className="h-4 w-4" />;
    if (task.submission?.status === 'Draft') return <Save className="h-4 w-4" />;
    if (task.isOverdue) return <AlertCircle className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600 mt-2">Complete your intervention tasks and track your progress</p>
        </div>
      </div>

      {/* Intervention Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <Label htmlFor="intervention">Select Intervention</Label>
              {interventions.length > 0 ? (
                <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an intervention" />
                  </SelectTrigger>
                  <SelectContent>
                    {interventions.map((intervention) => (
                      <SelectItem key={intervention.id} value={intervention.id}>
                        {intervention.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No interventions available. You may not be enrolled in any interventions yet.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tasks available for this intervention</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <Card key={task.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTaskClick(task)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{task.name}</CardTitle>
                  <Badge className={getTaskStatusColor(task)}>
                    <span className="flex items-center gap-1">
                      {getTaskIcon(task)}
                      {getTaskStatusText(task)}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    {task.isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span>Max Score: {task.maxScore} points</span>
                  </div>

                  {task.submission?.score !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Score: {task.submission.score}/{task.maxScore}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((task.submission.score / task.maxScore) * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* Quadrant Impact */}
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span>Impact: {[...new Set(task.microcompetencies.map(mc => mc.component?.sub_category?.quadrant?.name || 'Unknown'))].join(', ')}</span>
                  </div>

                  {/* Task Weight */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Total Weight: {task.microcompetencies.reduce((sum, mc) => sum + mc.weightage, 0)}%</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {task.microcompetencies.slice(0, 2).map((mc) => (
                      <Badge key={mc.id} variant="outline" className="text-xs">
                        {mc.name} ({mc.weightage}%)
                      </Badge>
                    ))}
                    {task.microcompetencies.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{task.microcompetencies.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Submission Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTask?.name}
            </DialogTitle>
            <DialogDescription>
              Complete your task submission below
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {/* Task Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-gray-600">{new Date(selectedTask.dueDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Max Score</p>
                  <p className="text-sm text-gray-600">{selectedTask.maxScore} points</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Quadrants Impacted</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[...new Set(selectedTask.microcompetencies.map(mc => mc.component?.sub_category?.quadrant?.name || 'Unknown'))].map((quadrant, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {quadrant}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Weight</p>
                  <p className="text-sm text-gray-600">
                    {selectedTask.microcompetencies.reduce((sum, mc) => sum + mc.weightage, 0)}% of intervention score
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium">Microcompetencies & Components</p>
                  <div className="space-y-2 mt-2">
                    {selectedTask.microcompetencies.map((mc) => (
                      <div key={mc.id} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-xs">{mc.name}</div>
                          <div className="text-xs text-gray-500">{mc.component?.name || 'Unknown Component'} • {mc.component?.sub_category?.quadrant?.name || 'Unknown Quadrant'}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {mc.weightage}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <p className="text-gray-600 text-sm">{selectedTask.instructions}</p>
              </div>

              {/* Submission Area */}
              <div>
                <Label htmlFor="submission">Your Submission</Label>
                <Textarea
                  id="submission"
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your submission here..."
                  rows={10}
                  className="mt-2"
                />
              </div>

              {/* File Upload */}
              <div>
                <Label>Attachments</Label>
                <div className="mt-2">
                  <FileUpload
                    onFilesUploaded={setAttachments}
                    maxFiles={5}
                    maxFileSize={10}
                    existingFiles={attachments}
                  />
                </div>
              </div>

              {/* Feedback (if graded) */}
              {selectedTask.submission?.feedback && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Teacher Feedback</h3>
                  <p className="text-sm text-gray-700">{selectedTask.submission.feedback}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionDialog(false)}>
              Cancel
            </Button>
            {selectedTask?.canSubmit && (
              <>
                <Button variant="outline" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={handleSubmitTask} disabled={submitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Task'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentTasks;
