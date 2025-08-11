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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  UserCheck,
  Users,
  Target,
  AlertCircle,
  CheckCircle,
  Trash2,
  Settings,
  Edit,
  Eye,
  BarChart3,
  Calendar,
  Clock,
  BookOpen,
  Award,
  TrendingUp,
  Save,
  X,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { interventionAPI, adminAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';
import {
  Intervention,
  InterventionMicrocompetency,
  Teacher,
  TeacherAssignment
} from '@/types/intervention';

const InterventionTeachers: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();
  
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [assignedMicrocompetencies, setAssignedMicrocompetencies] = useState<InterventionMicrocompetency[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showWorkloadDialog, setShowWorkloadDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedMicrocompetencies, setSelectedMicrocompetencies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuadrant, setFilterQuadrant] = useState<string>('all');
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<string>('all');
  
  // Assignment form
  const [assignmentForm, setAssignmentForm] = useState({
    canScore: true,
    canCreateTasks: true,
    deadline: '',
    notes: '',
  });

  useEffect(() => {
    if (interventionId) {
      fetchData();
    }
  }, [interventionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        interventionResponse, 
        microcompetenciesResponse, 
        teachersResponse,
        assignmentsResponse
      ] = await Promise.all([
        interventionAPI.getInterventionById(interventionId!),
        interventionAPI.getInterventionMicrocompetencies(interventionId!),
        adminAPI.getAllTeachers(),
        interventionAPI.getInterventionTeacherAssignments(interventionId!)
      ]);
      
      setIntervention(interventionResponse.data);
      setAssignedMicrocompetencies(microcompetenciesResponse.data.microcompetencies);
      setAvailableTeachers(teachersResponse.data.teachers);
      setTeacherAssignments(assignmentsResponse.data.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher || selectedMicrocompetencies.length === 0) {
      toast.error('Please select a teacher and at least one microcompetency');
      return;
    }

    // Validate teacher status
    if (selectedTeacher.status !== 'Active') {
      toast.error(`Cannot assign inactive teacher: ${selectedTeacher.name}`);
      return;
    }

    // Validate quadrant permissions for selected microcompetencies
    const selectedMcs = assignedMicrocompetencies.filter(mc => 
      selectedMicrocompetencies.includes(mc.id)
    );

    const requiredQuadrants = [...new Set(selectedMcs.map(mc => mc.quadrant_id))];
    const teacherQuadrants = selectedTeacher.specialization_quadrants || [];
    const unauthorizedQuadrants = requiredQuadrants.filter(qId => 
      !teacherQuadrants.includes(qId)
    );

    if (unauthorizedQuadrants.length > 0) {
      const quadrantNames = unauthorizedQuadrants.map(qId => {
        const mc = selectedMcs.find(mc => mc.quadrant_id === qId);
        return mc?.quadrant_name || qId;
      });
      toast.error(`Teacher ${selectedTeacher.name} is not authorized for quadrants: ${quadrantNames.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);

      // Create individual assignments for each microcompetency
      const assignments = selectedMicrocompetencies.map(mcId => ({
        teacher_id: selectedTeacher.id,
        microcompetency_id: mcId,
        can_score: assignmentForm.canScore,
        can_create_tasks: assignmentForm.canCreateTasks,
      }));

      await interventionAPI.assignTeachersToMicrocompetencies(interventionId!, {
        assignments
      });
      
      toast.success('Teacher assigned successfully');
      setShowAssignDialog(false);
      resetAssignmentForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAssignmentForm = () => {
    setSelectedTeacher(null);
    setSelectedMicrocompetencies([]);
    setAssignmentForm({
      canScore: true,
      canCreateTasks: true,
      deadline: '',
      notes: '',
    });
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this teacher assignment?')) {
      return;
    }

    try {
      await interventionAPI.removeTeacherAssignment(interventionId!, assignmentId);
      toast.success('Teacher assignment removed successfully');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  const calculateWorkloadStats = () => {
    const teacherWorkload = teacherAssignments.reduce((acc, assignment) => {
      const teacherId = assignment.teacher.id;
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacher: assignment.teacher,
          totalMicrocompetencies: 0,
          canScoreCount: 0,
          quadrants: new Set(),
        };
      }
      acc[teacherId].totalMicrocompetencies += assignment.microcompetency_assignments.length;
      acc[teacherId].canScoreCount += assignment.microcompetency_assignments.filter(ma => ma.can_score).length;
      assignment.microcompetency_assignments.forEach(ma => {
        if (ma.microcompetencies?.components?.sub_categories?.quadrants?.name) {
          acc[teacherId].quadrants.add(ma.microcompetencies.components.sub_categories.quadrants.name);
        }
      });
      return acc;
    }, {} as Record<string, any>);

    return Object.values(teacherWorkload);
  };

  const getUnassignedMicrocompetencies = () => {
    const assignedIds = new Set();
    teacherAssignments.forEach(assignment => {
      assignment.microcompetency_assignments.forEach(ma => {
        assignedIds.add(ma.microcompetency_id);
      });
    });

    // assignedMicrocompetencies comes from intervention microcompetencies API
    // Each item has microcompetency.id as the actual microcompetency ID
    return assignedMicrocompetencies.filter(mc => {
      const microcompetencyId = mc.microcompetency?.id || mc.microcompetency_id;
      return !assignedIds.has(microcompetencyId);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  const workloadStats = calculateWorkloadStats();
  const unassignedMicrocompetencies = getUnassignedMicrocompetencies();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/interventions')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Assignments</h1>
          <p className="text-gray-600 mt-1">
            Manage teacher assignments for {intervention?.name}
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkloadDialog(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Workload Analysis
          </Button>
          <Button onClick={() => setShowAssignDialog(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Teacher
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Teachers</p>
                <p className="text-2xl font-bold">{workloadStats.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Microcompetencies</p>
                <p className="text-2xl font-bold">{assignedMicrocompetencies.length - unassignedMicrocompetencies.length}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">{unassignedMicrocompetencies.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coverage</p>
                <p className="text-2xl font-bold">
                  {assignedMicrocompetencies.length > 0 
                    ? Math.round(((assignedMicrocompetencies.length - unassignedMicrocompetencies.length) / assignedMicrocompetencies.length) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assignments">Current Assignments</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned Microcompetencies</TabsTrigger>
          <TabsTrigger value="workload">Workload Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Assignments ({teacherAssignments.length})</CardTitle>
              <CardDescription>
                Current teacher assignments for microcompetencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teacherAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No teachers assigned</h3>
                  <p className="text-gray-600 mb-4">
                    Start by assigning teachers to microcompetencies.
                  </p>
                  <Button onClick={() => setShowAssignDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign First Teacher
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {teacherAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              {assignment.teacher.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {assignment.teacher.email} • Employee ID: {assignment.teacher.employee_id}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {assignment.microcompetency_assignments.length} microcompetencies
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-gray-500">Permissions</Label>
                              <div className="flex gap-2 mt-1">
                                {assignment.microcompetency_assignments.some(ma => ma.can_score) && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Can Score
                                  </Badge>
                                )}
                                {assignment.microcompetency_assignments.some(ma => ma.can_view) && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    Can View
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Assigned Date</Label>
                              <p className="text-sm mt-1">{formatDate(assignment.assigned_at)}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm text-gray-500">Assigned Microcompetencies</Label>
                            <div className="mt-2 space-y-2">
                              {assignment.microcompetency_assignments.map((ma) => (
                                <div key={ma.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{ma.microcompetencies?.name}</div>
                                    <div className="text-xs text-gray-600">
                                      {ma.microcompetencies?.components?.sub_categories?.quadrants?.name} •
                                      {ma.microcompetencies?.components?.name}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {ma.can_score && (
                                      <Badge variant="outline" className="text-xs">Score</Badge>
                                    )}
                                    {ma.can_view && (
                                      <Badge variant="outline" className="text-xs">View</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Microcompetencies ({unassignedMicrocompetencies.length})</CardTitle>
              <CardDescription>
                Microcompetencies that haven't been assigned to any teacher yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedMicrocompetencies.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All microcompetencies assigned!</h3>
                  <p className="text-gray-600">
                    Every microcompetency has been assigned to a teacher.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedMicrocompetencies.map((mc) => (
                    <div key={mc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{mc.microcompetency?.name}</div>
                        <div className="text-sm text-gray-600">{mc.microcompetency?.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {mc.quadrant?.name}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {mc.microcompetency?.components?.name}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const microcompetencyId = mc.microcompetency?.id || mc.microcompetency_id;
                          setSelectedMicrocompetencies([microcompetencyId]);
                          setShowAssignDialog(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Teacher
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Workload Distribution</CardTitle>
              <CardDescription>
                Overview of microcompetency assignments per teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workloadStats.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No workload data</h3>
                  <p className="text-gray-600">
                    Assign teachers to see workload distribution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workloadStats.map((stat: any) => (
                    <div key={stat.teacher.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{stat.teacher.name}</div>
                          <div className="text-sm text-gray-600">{stat.teacher.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{stat.totalMicrocompetencies}</div>
                          <div className="text-sm text-gray-600">microcompetencies</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-500">Can Score</Label>
                          <div className="font-medium">{stat.canScoreCount}</div>
                        </div>
                        <div>
                          <Label className="text-gray-500">Can View</Label>
                          <div className="font-medium">{stat.totalMicrocompetencies - stat.canScoreCount}</div>
                        </div>
                        <div>
                          <Label className="text-gray-500">Quadrants</Label>
                          <div className="font-medium">{stat.quadrants.size}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Workload</span>
                          <span>{stat.totalMicrocompetencies} / {assignedMicrocompetencies.length}</span>
                        </div>
                        <Progress
                          value={(stat.totalMicrocompetencies / assignedMicrocompetencies.length) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Teacher Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        setShowAssignDialog(open);
        if (!open) resetAssignmentForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Teacher to Microcompetencies</DialogTitle>
            <DialogDescription>
              Select a teacher and assign them to specific microcompetencies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Teacher Selection */}
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <Select
                value={selectedTeacher?.id || ''}
                onValueChange={(value) => {
                  const teacher = availableTeachers.find(t => t.id === value);
                  setSelectedTeacher(teacher || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Microcompetency Selection */}
            <div className="space-y-2">
              <Label>Select Microcompetencies</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {unassignedMicrocompetencies.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600">All microcompetencies are already assigned</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {unassignedMicrocompetencies.map((mc) => (
                      <div key={mc.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={selectedMicrocompetencies.includes(mc.microcompetency?.id || mc.microcompetency_id)}
                          onCheckedChange={(checked) => {
                            const microcompetencyId = mc.microcompetency?.id || mc.microcompetency_id;
                            if (checked) {
                              setSelectedMicrocompetencies(prev => [...prev, microcompetencyId]);
                            } else {
                              setSelectedMicrocompetencies(prev => prev.filter(id => id !== microcompetencyId));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{mc.microcompetency?.name}</div>
                          <div className="text-sm text-gray-600">{mc.microcompetency?.description}</div>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {mc.quadrant?.name}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Component: {mc.microcompetency?.components?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              Max Score: {mc.maxScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canScore"
                    checked={assignmentForm.canScore}
                    onCheckedChange={(checked) => setAssignmentForm(prev => ({
                      ...prev,
                      canScore: checked as boolean
                    }))}
                  />
                  <Label htmlFor="canScore">Can Score Students</Label>
                  <p className="text-xs text-gray-500">
                    Teacher can assign scores to students for these microcompetencies
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canCreateTasks"
                    checked={assignmentForm.canCreateTasks}
                    onCheckedChange={(checked) => setAssignmentForm(prev => ({
                      ...prev,
                      canCreateTasks: checked as boolean
                    }))}
                  />
                  <Label htmlFor="canCreateTasks">Can Create Tasks</Label>
                  <p className="text-xs text-gray-500">
                    Teacher can create assessment tasks for these microcompetencies
                  </p>
                </div>
              </div>
            </div>

            {selectedMicrocompetencies.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedMicrocompetencies.length} microcompetency(ies) selected for assignment
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignTeacher}
              disabled={isSubmitting || !selectedTeacher || selectedMicrocompetencies.length === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Assign Teacher
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workload Analysis Dialog */}
      <Dialog open={showWorkloadDialog} onOpenChange={setShowWorkloadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workload Analysis</DialogTitle>
            <DialogDescription>
              Detailed analysis of teacher workload distribution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4">
                Detailed workload analysis and recommendations will be available here.
              </p>
              <Button variant="outline" onClick={() => setShowWorkloadDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterventionTeachers;
