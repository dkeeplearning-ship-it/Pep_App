import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Video,
  Link,
  ClipboardCheck
} from "lucide-react";
import api, { interventionAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTerm } from "@/contexts/TermContext";
import TaskSubmissionsDialog from "@/components/teacher/TaskSubmissionsDialog";
import DirectAssessmentDialog from "@/components/teacher/DirectAssessmentDialog";

interface Task {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  maxScore: number;
  status: string;
  submissionType: string;
  requiresSubmission: boolean;
  interventionId: string;
  interventionName: string;
  microcompetencies: Array<{
    id: string;
    name: string;
    weightage: number;
    quadrant: string;
  }>;
  submissionCount: number;
  gradedCount: number;
}

interface Microcompetency {
  id: string;
  name: string;
  maxScore: number;
  component: string;
  subCategory: string;
  quadrant: string;
  canScore: boolean;
  canCreateTasks: boolean;
  assignedAt: string;
}



const TeacherTasks: React.FC = () => {
  const { user } = useAuth();
  const { selectedTerm } = useTerm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [microcompetencies, setMicrocompetencies] = useState<Microcompetency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [showDirectAssessmentDialog, setShowDirectAssessmentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Form states
  const [taskForm, setTaskForm] = useState({
    name: "",
    description: "",
    interventionId: "",
    selectedMicrocompetencies: [] as Array<{microcompetencyId: string, weightage: number}>,
    maxScore: 10,
    dueDate: "",
    instructions: "",
    submissionType: "Document",
    requiresSubmission: true,
    allowLateSubmission: true,
    latePenalty: 0
  });

  useEffect(() => {
    fetchData();
  }, [selectedTerm]); // Reload when term changes

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current teacher ID from auth context
      if (!user?.id) {
        toast.error('User not authenticated');
        return;
      }

      // Get teacher's assigned interventions
      const interventionsResponse = await api.intervention.getTeacherInterventions(user.id);
      const interventions = interventionsResponse.data.interventions || [];

      setInterventions(interventions);

      // Get teacher's tasks (filtered by selected term)
      const tasksResponse = await api.scoreCalculation.getTeacherTasks({
        termId: selectedTerm?.id
      });
      const tasks = tasksResponse.data.tasks || [];

      console.log('Fetched tasks:', tasks);
      setTasks(tasks);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('User context:', user);
      toast.error(`Failed to load tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Fallback to empty state
      setTasks([]);
      setInterventions([]);
      setMicrocompetencies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMicrocompetencies = async (interventionId: string) => {
    try {
      console.log('Fetching microcompetencies for intervention:', interventionId);
      const response = await api.intervention.getTeacherInterventionMicrocompetencies(user?.id!, interventionId);
      console.log('Full microcompetencies response:', JSON.stringify(response, null, 2));

      // Transform the response to match our interface
      const microcompetencies = (response.data.microcompetencies || []).map((mc: any, index: number) => {
        console.log(`Processing microcompetency ${index}:`, JSON.stringify(mc, null, 2));

        // Try different possible structures
        const mcData = mc.microcompetencies || mc;
        const componentData = mcData.components || mcData.component || {};
        const subCategoryData = componentData.sub_categories || componentData.subCategory || {};
        const quadrantData = subCategoryData.quadrants || subCategoryData.quadrant || {};

        return {
          id: mcData.id || mc.id,
          name: mcData.name || mc.name || 'Unknown Microcompetency',
          description: mcData.description || mc.description || '',
          maxScore: mc.max_score || 10,
          weightage: mc.weightage || 0,
          component: componentData.name || 'Unknown Component',
          subCategory: subCategoryData.name || 'Unknown Sub Category',
          quadrant: quadrantData.name || 'Unknown Quadrant',
          canScore: true,
          canCreateTasks: true,
          assignedAt: new Date().toISOString()
        };
      });

      console.log('Transformed microcompetencies:', microcompetencies);
      setMicrocompetencies(microcompetencies);
    } catch (error) {
      console.error('Error fetching microcompetencies:', error);
      toast.error(`Failed to load microcompetencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMicrocompetencies([]);
    }
  };

  const handleCreateTask = async () => {
    try {
      // Debug: Log form state
      console.log('Task form state:', taskForm);
      console.log('Validation checks:', {
        name: !!taskForm.name,
        interventionId: !!taskForm.interventionId,
        dueDate: !!taskForm.dueDate,
        selectedMicrocompetencies: taskForm.selectedMicrocompetencies.length > 0
      });

      // Validate form
      if (!taskForm.name || !taskForm.interventionId || !taskForm.dueDate || taskForm.selectedMicrocompetencies.length === 0) {
        toast.error('Please fill in all required fields and select microcompetencies');
        return;
      }

      // Validate total weightage equals 100
      const totalWeightage = taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0);
      if (Math.abs(totalWeightage - 100) > 0.01) {
        toast.error(`Total weightage must equal 100%. Current total: ${totalWeightage}%`);
        return;
      }

      const taskData = {
        name: taskForm.name,
        description: taskForm.description,
        microcompetencies: taskForm.selectedMicrocompetencies,
        maxScore: taskForm.maxScore,
        dueDate: taskForm.dueDate,
        instructions: taskForm.instructions,
        submissionType: taskForm.submissionType,
        requiresSubmission: taskForm.requiresSubmission,
        allowLateSubmission: taskForm.allowLateSubmission,
        latePenalty: taskForm.latePenalty
      };

      console.log('Creating task with data:', taskData);
      console.log('Intervention ID:', taskForm.interventionId);

      await interventionAPI.createMicrocompetencyTask(taskForm.interventionId, taskData);

      toast.success('Task created successfully with microcompetency mappings');
      setShowCreateDialog(false);
      resetTaskForm();
      fetchData();
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(`Failed to create task: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      name: "",
      description: "",
      interventionId: "",
      selectedMicrocompetencies: [],
      maxScore: 10,
      dueDate: "",
      instructions: "",
      submissionType: "Document",
      requiresSubmission: true,
      allowLateSubmission: true,
      latePenalty: 0
    });
    setMicrocompetencies([]);
  };

  const handleInterventionChange = (interventionId: string) => {
    setTaskForm({...taskForm, interventionId, selectedMicrocompetencies: []});
    if (interventionId) {
      fetchMicrocompetencies(interventionId);
    } else {
      setMicrocompetencies([]);
    }
  };

  const handleSubmissionTypeChange = (submissionType: string) => {
    const requiresSubmission = submissionType !== 'Direct_Assessment';
    setTaskForm({
      ...taskForm,
      submissionType,
      requiresSubmission,
      // Reset submission-related fields if direct assessment
      allowLateSubmission: requiresSubmission ? taskForm.allowLateSubmission : false,
      latePenalty: requiresSubmission ? taskForm.latePenalty : 0
    });
  };

  const handleMicrocompetencyWeightageChange = (microcompetencyId: string, weightage: number) => {
    const updatedMicrocompetencies = taskForm.selectedMicrocompetencies.map(mc =>
      mc.microcompetencyId === microcompetencyId ? { ...mc, weightage } : mc
    );
    setTaskForm({...taskForm, selectedMicrocompetencies: updatedMicrocompetencies});
  };

  const toggleMicrocompetency = (microcompetencyId: string) => {
    const isSelected = taskForm.selectedMicrocompetencies.some(mc => mc.microcompetencyId === microcompetencyId);

    if (isSelected) {
      const updatedMicrocompetencies = taskForm.selectedMicrocompetencies.filter(mc => mc.microcompetencyId !== microcompetencyId);
      setTaskForm({...taskForm, selectedMicrocompetencies: updatedMicrocompetencies});
    } else {
      const remainingWeightage = 100 - taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0);
      const newMicrocompetency = {
        microcompetencyId,
        weightage: Math.max(1, remainingWeightage)
      };
      setTaskForm({...taskForm, selectedMicrocompetencies: [...taskForm.selectedMicrocompetencies, newMicrocompetency]});
    }
  };

  const handleViewSubmissions = async (task: Task) => {
    setSelectedTask(task);
    setShowSubmissionsDialog(true);
  };

  const handleDirectAssessment = (task: Task) => {
    setSelectedTask(task);
    setShowDirectAssessmentDialog(true);
  };

  const handleSubmissionGraded = () => {
    // Refresh tasks data to update submission counts
    fetchData();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      description: task.description,
      interventionId: task.interventionId,
      selectedMicrocompetencies: task.microcompetencies.map(mc => ({
        microcompetencyId: mc.id,
        weightage: mc.weightage
      })),
      maxScore: task.maxScore,
      dueDate: task.dueDate,
      instructions: '', // We'll need to fetch this from the task details
      submissionType: task.submissionType,
      allowLateSubmission: true, // Default values for fields not in the task interface
      latePenalty: 0
    });
    // Fetch microcompetencies for the intervention
    fetchMicrocompetencies(task.interventionId);
    setShowEditDialog(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      // Validate weightages
      const totalWeightage = taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0);
      if (Math.abs(totalWeightage - 100) > 0.01) {
        toast.error(`Total weightage must equal 100%. Current total: ${totalWeightage}%`);
        return;
      }

      const updateData = {
        name: taskForm.name,
        description: taskForm.description,
        maxScore: taskForm.maxScore,
        dueDate: taskForm.dueDate,
        instructions: taskForm.instructions,
        submissionType: taskForm.submissionType,
        allowLateSubmission: taskForm.allowLateSubmission,
        latePenalty: taskForm.latePenalty
      };

      await api.scoreCalculation.updateTask(editingTask.id, updateData);

      toast.success('Task updated successfully');
      setShowEditDialog(false);
      setEditingTask(null);
      resetTaskForm();
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!confirm(`Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.scoreCalculation.deleteTask(taskId);
      toast.success('Task deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Draft' : 'Active';
      await api.scoreCalculation.updateTask(taskId, { status: newStatus });
      toast.success(`Task ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubmissionTypeIcon = (type: string) => {
    switch (type) {
      case 'Document': return <FileText className="h-4 w-4" />;
      case 'Presentation': return <Users className="h-4 w-4" />;
      case 'Video': return <Video className="h-4 w-4" />;
      case 'Link': return <Link className="h-4 w-4" />;
      case 'Text': return <FileText className="h-4 w-4" />;
      case 'Direct_Assessment': return <ClipboardCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSubmissionTypeLabel = (type: string) => {
    switch (type) {
      case 'Document': return 'Document Submission';
      case 'Presentation': return 'Presentation Submission';
      case 'Video': return 'Video Submission';
      case 'Link': return 'Link Submission';
      case 'Text': return 'Text Submission';
      case 'Direct_Assessment': return 'Direct Assessment';
      default: return type;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return task.status === "Active";
    if (activeTab === "draft") return task.status === "Draft";
    if (activeTab === "completed") return task.status === "Completed";
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-1">Task Management</h1>
          <p className="text-muted-foreground">
            Create and manage tasks for your intervention students.
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a new task for students in your interventions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Task Name</Label>
                  <Input
                    id="name"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <Label htmlFor="maxScore">Max Score</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    value={taskForm.maxScore}
                    onChange={(e) => setTaskForm({...taskForm, maxScore: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="intervention">Intervention</Label>
                  <Select value={taskForm.interventionId} onValueChange={handleInterventionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intervention" />
                    </SelectTrigger>
                    <SelectContent>
                      {interventions.map((intervention) => (
                        <SelectItem key={intervention.id} value={intervention.id}>
                          {intervention.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => {
                      console.log('Date input changed:', e.target.value);
                      setTaskForm({...taskForm, dueDate: e.target.value});
                    }}
                    required
                  />
                </div>
              </div>

              {/* Assessment Type Selection */}
              <div>
                <Label htmlFor="submissionType">Assessment Type</Label>
                <Select value={taskForm.submissionType} onValueChange={handleSubmissionTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document">Document Submission</SelectItem>
                    <SelectItem value="Presentation">Presentation Submission</SelectItem>
                    <SelectItem value="Video">Video Submission</SelectItem>
                    <SelectItem value="Link">Link Submission</SelectItem>
                    <SelectItem value="Text">Text Submission</SelectItem>
                    <SelectItem value="Direct_Assessment">Direct Assessment (No Submission)</SelectItem>
                  </SelectContent>
                </Select>
                {taskForm.submissionType === 'Direct_Assessment' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Direct Assessment:</strong> Students will not submit any work. You will score them directly based on physical tests, observations, or oral exams.
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions (only for submission-based tasks) */}
              {taskForm.requiresSubmission && (
                <div>
                  <Label htmlFor="instructions">Instructions for Students</Label>
                  <Textarea
                    id="instructions"
                    value={taskForm.instructions}
                    onChange={(e) => setTaskForm({...taskForm, instructions: e.target.value})}
                    placeholder="Enter detailed instructions for students"
                  />
                </div>
              )}

              {/* Late Submission Settings (only for submission-based tasks) */}
              {taskForm.requiresSubmission && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowLateSubmission"
                      checked={taskForm.allowLateSubmission}
                      onChange={(e) => setTaskForm({...taskForm, allowLateSubmission: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="allowLateSubmission">Allow Late Submission</Label>
                  </div>
                  {taskForm.allowLateSubmission && (
                    <div>
                      <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                      <Input
                        id="latePenalty"
                        type="number"
                        min="0"
                        max="100"
                        value={taskForm.latePenalty}
                        onChange={(e) => setTaskForm({...taskForm, latePenalty: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Microcompetency Selection */}
              <div>
                <Label>Assign Microcompetencies & Weightages</Label>
                {microcompetencies.length > 0 ? (
                  <div className="space-y-3 mt-2 max-h-60 overflow-y-auto border rounded p-3">
                    {microcompetencies.map((mc) => {
                      const isSelected = taskForm.selectedMicrocompetencies.some(selected => selected.microcompetencyId === mc.id);
                      const selectedMc = taskForm.selectedMicrocompetencies.find(selected => selected.microcompetencyId === mc.id);

                      return (
                        <div key={mc.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMicrocompetency(mc.id)}
                              className="rounded"
                            />
                            <div>
                              <p className="font-medium">{mc.name}</p>
                              <p className="text-sm text-gray-500">{mc.quadrant} • {mc.component}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm">Weightage:</Label>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={selectedMc?.weightage || 0}
                                onChange={(e) => handleMicrocompetencyWeightageChange(mc.id, parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                              <span className="text-sm">%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {taskForm.selectedMicrocompetencies.length > 0 && (
                      <div className="mt-3 p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium">
                          Total Weightage: {taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0)}%
                          {Math.abs(taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0) - 100) > 0.01 && (
                            <span className="text-red-600 ml-2">(Must equal 100%)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : taskForm.interventionId ? (
                  <div className="mt-2 p-4 border rounded bg-gray-50 text-center">
                    <p className="text-gray-600">No microcompetencies assigned to you for this intervention.</p>
                    <p className="text-sm text-gray-500">Contact your admin to get microcompetencies assigned.</p>
                  </div>
                ) : (
                  <div className="mt-2 p-4 border rounded bg-gray-50 text-center">
                    <p className="text-gray-600">Please select an intervention first.</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details and microcompetency assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Task Name</Label>
                  <Input
                    id="edit-name"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                    placeholder="Enter task name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-maxScore">Max Score</Label>
                  <Input
                    id="edit-maxScore"
                    type="number"
                    value={taskForm.maxScore}
                    onChange={(e) => setTaskForm({...taskForm, maxScore: parseInt(e.target.value) || 0})}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="datetime-local"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-submissionType">Assessment Type</Label>
                  <Select value={taskForm.submissionType} onValueChange={handleSubmissionTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Document">Document Submission</SelectItem>
                      <SelectItem value="Presentation">Presentation Submission</SelectItem>
                      <SelectItem value="Video">Video Submission</SelectItem>
                      <SelectItem value="Link">Link Submission</SelectItem>
                      <SelectItem value="Text">Text Submission</SelectItem>
                      <SelectItem value="Direct_Assessment">Direct Assessment (No Submission)</SelectItem>
                    </SelectContent>
                  </Select>
                  {taskForm.submissionType === 'Direct_Assessment' && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Direct Assessment:</strong> Students will not submit any work. You will score them directly based on physical tests, observations, or oral exams.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Instructions (only for submission-based tasks) */}
              {taskForm.requiresSubmission && (
                <div className="space-y-2">
                  <Label htmlFor="edit-instructions">Instructions</Label>
                  <Textarea
                    id="edit-instructions"
                    value={taskForm.instructions}
                    onChange={(e) => setTaskForm({...taskForm, instructions: e.target.value})}
                    placeholder="Enter detailed instructions for students"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Assigned Microcompetencies</Label>
                <p className="text-sm text-gray-600">Note: Microcompetency assignments cannot be changed after task creation.</p>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                  {taskForm.selectedMicrocompetencies.map((selectedMc) => {
                    const mc = microcompetencies.find(m => m.id === selectedMc.microcompetencyId);
                    return mc ? (
                      <div key={mc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div>
                          <span className="font-medium">{mc.name}</span>
                          <span className="text-sm text-gray-600 ml-2">({mc.quadrant})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={selectedMc.weightage}
                            onChange={(e) => handleMicrocompetencyWeightageChange(mc.id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                    ) : null;
                  })}
                  {taskForm.selectedMicrocompetencies.length > 0 && (
                    <div className="mt-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium">
                        Total Weightage: {taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0)}%
                        {Math.abs(taskForm.selectedMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0) - 100) > 0.01 && (
                          <span className="text-red-600 ml-2">(Must equal 100%)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTask}>Update Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({tasks.filter(t => t.status === 'Active').length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({tasks.filter(t => t.status === 'Draft').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({tasks.filter(t => t.status === 'Completed').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {activeTab === "all" 
                    ? "You haven't created any tasks yet. Create your first task to get started."
                    : `No ${activeTab} tasks found.`
                  }
                </p>
                {activeTab === "all" && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getSubmissionTypeIcon(task.submissionType)}
                          <h3 className="text-lg font-semibold">{task.name}</h3>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{task.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {task.submissionCount} submissions
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {task.gradedCount} graded
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{task.interventionName}</Badge>
                          {task.microcompetencies.map((mc) => (
                            <Badge key={mc.id} variant="secondary" className="text-xs">
                              {mc.name} ({mc.weightage}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.submissionType === 'Direct_Assessment' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDirectAssessment(task)}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Direct Assessment
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmissions(task)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Submissions
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTask(task)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={task.status === 'Active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {task.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id, task.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Submissions Dialog */}
      <TaskSubmissionsDialog
        task={selectedTask}
        open={showSubmissionsDialog}
        onOpenChange={setShowSubmissionsDialog}
        onSubmissionGraded={handleSubmissionGraded}
      />

      {/* Direct Assessment Dialog */}
      <DirectAssessmentDialog
        task={selectedTask}
        open={showDirectAssessmentDialog}
        onOpenChange={setShowDirectAssessmentDialog}
        onAssessmentCreated={handleSubmissionGraded}
      />
    </div>
  );
};

export default TeacherTasks;
