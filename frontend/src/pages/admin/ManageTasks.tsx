import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Calendar,
  Users,
  FileText,
  Target
} from "lucide-react";
import { interventionAPI, adminAPI } from "@/lib/api";
import { useTerm } from "@/contexts/TermContext";

interface Task {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  dueDate: string;
  status: string;
  submissionType: string;
  interventionName: string;
  createdBy: string;
  microcompetencies: Array<{
    id: string;
    name: string;
    weightage: number;
    quadrant: string;
  }>;
  submissionCount: number;
  gradedCount: number;
  createdAt: string;
}

interface Intervention {
  id: string;
  name: string;
  status: string;
}

const ManageTasks: React.FC = () => {
  const { selectedTerm } = useTerm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIntervention, setSelectedIntervention] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedTerm]); // Add selectedTerm as dependency

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get interventions for filter and tasks data
      const [interventionsResponse, tasksResponse] = await Promise.all([
        adminAPI.getAllInterventions(),
        interventionAPI.getAllTasks({
          termId: selectedTerm?.id // Filter tasks by selected term
        })
      ]);

      setInterventions(interventionsResponse.data.interventions || []);

      // Transform tasks data to match our interface
      const transformedTasks: Task[] = tasksResponse.data.tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        maxScore: task.maxScore,
        dueDate: task.dueDate,
        status: task.status,
        submissionType: task.submissionType,
        interventionName: task.interventionName,
        createdBy: task.createdBy,
        microcompetencies: task.microcompetencies.map(mc => ({
          id: mc.id,
          name: mc.name,
          weightage: mc.weightage,
          quadrant: mc.quadrant
        })),
        submissionCount: task.submissionCount,
        gradedCount: task.gradedCount,
        createdAt: task.createdAt
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tasks');

      // Fallback to empty state
      setTasks([]);
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIntervention = selectedIntervention === "all" || 
                               task.interventionName === selectedIntervention;
    
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    
    return matchesSearch && matchesIntervention && matchesStatus;
  });

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubmissionProgress = (submitted: number, graded: number) => {
    if (submitted === 0) return { percentage: 0, color: 'bg-gray-200' };
    const percentage = (graded / submitted) * 100;
    if (percentage === 100) return { percentage, color: 'bg-green-500' };
    if (percentage >= 50) return { percentage, color: 'bg-yellow-500' };
    return { percentage, color: 'bg-red-500' };
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
          <h1 className="text-3xl font-bold text-gray-900">Manage Tasks</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all intervention tasks</p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Tasks</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, description, or teacher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="intervention">Intervention</Label>
              <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                <SelectTrigger>
                  <SelectValue placeholder="All Interventions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Interventions</SelectItem>
                  {interventions.map((intervention) => (
                    <SelectItem key={intervention.id} value={intervention.name}>
                      {intervention.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedIntervention("all");
                  setSelectedStatus("all");
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tasks ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tasks found matching your criteria</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Intervention</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Microcompetencies</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const progress = getSubmissionProgress(task.submissionCount, task.gradedCount);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="text-sm text-gray-500">{task.submissionType} • {task.maxScore} pts</p>
                        </div>
                      </TableCell>
                      <TableCell>{task.interventionName}</TableCell>
                      <TableCell>{task.createdBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
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
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-gray-400" />
                            {task.gradedCount}/{task.submissionCount} graded
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${progress.color}`}
                              style={{ width: `${progress.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(task)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Task Details: {selectedTask?.name}
            </DialogTitle>
            <DialogDescription>
              Comprehensive overview of task configuration and progress
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedTask.name}</p>
                    <p><strong>Description:</strong> {selectedTask.description}</p>
                    <p><strong>Max Score:</strong> {selectedTask.maxScore} points</p>
                    <p><strong>Submission Type:</strong> {selectedTask.submissionType}</p>
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Timeline & Progress</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Created:</strong> {new Date(selectedTask.createdAt).toLocaleString()}</p>
                    <p><strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleString()}</p>
                    <p><strong>Created By:</strong> {selectedTask.createdBy}</p>
                    <p><strong>Intervention:</strong> {selectedTask.interventionName}</p>
                    <p><strong>Submissions:</strong> {selectedTask.submissionCount} total, {selectedTask.gradedCount} graded</p>
                  </div>
                </div>
              </div>

              {/* Microcompetencies */}
              <div>
                <h3 className="font-semibold mb-2">Assigned Microcompetencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTask.microcompetencies.map((mc) => (
                    <Card key={mc.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{mc.name}</div>
                          <div className="text-sm text-gray-500">{mc.quadrant} Quadrant</div>
                        </div>
                        <Badge variant="secondary">{mc.weightage}%</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTasks;
