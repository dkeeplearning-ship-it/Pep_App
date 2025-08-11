import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Target,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  specialization: string;
  is_active: boolean;
  interventions_assigned?: number;
}

interface Intervention {
  id: string;
  name: string;
  status: string;
  max_students: number;
  enrolled_count: number;
  assigned_teachers: number;
}

interface BulkAssignmentData {
  interventionId: string;
  teacherIds: string[];
  role: string;
  microcompetencyIds: string[];
}

const BulkTeacherAssignment: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [assignmentRole, setAssignmentRole] = useState('Assistant');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [assignmentProgress, setAssignmentProgress] = useState(0);
  const [assignmentResults, setAssignmentResults] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [teachersResponse, interventionsResponse] = await Promise.all([
        fetch('/api/v1/admin/teachers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/v1/interventions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (teachersResponse.ok && interventionsResponse.ok) {
        const teachersData = await teachersResponse.json();
        const interventionsData = await interventionsResponse.json();
        
        setTeachers(teachersData.data || []);
        setInterventions(interventionsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || teacher.department === departmentFilter;
    return matchesSearch && matchesDepartment && teacher.is_active;
  });

  const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))];

  const handleTeacherSelection = (teacherId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacherId]);
    } else {
      setSelectedTeachers(prev => prev.filter(id => id !== teacherId));
    }
  };

  const handleInterventionSelection = (interventionId: string, checked: boolean) => {
    if (checked) {
      setSelectedInterventions(prev => [...prev, interventionId]);
    } else {
      setSelectedInterventions(prev => prev.filter(id => id !== interventionId));
    }
  };

  const selectAllTeachers = () => {
    setSelectedTeachers(filteredTeachers.map(t => t.id));
  };

  const clearTeacherSelection = () => {
    setSelectedTeachers([]);
  };

  const selectAllInterventions = () => {
    setSelectedInterventions(interventions.filter(i => i.status === 'Active').map(i => i.id));
  };

  const clearInterventionSelection = () => {
    setSelectedInterventions([]);
  };

  const executeBulkAssignment = async () => {
    if (selectedTeachers.length === 0 || selectedInterventions.length === 0) {
      toast.error('Please select teachers and interventions');
      return;
    }

    try {
      setLoading(true);
      setAssignmentProgress(0);

      // Prepare bulk assignment data
      const assignments: BulkAssignmentData[] = selectedInterventions.map(interventionId => ({
        interventionId,
        teacherIds: selectedTeachers,
        role: assignmentRole,
        microcompetencyIds: []
      }));

      // Execute bulk assignment
      const response = await fetch('/api/v1/admin/bulk-teacher-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ assignments }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute bulk assignment');
      }

      const result = await response.json();
      setAssignmentResults(result);
      setAssignmentProgress(100);

      if (result.success) {
        toast.success(`Bulk assignment completed: ${result.successCount} successful, ${result.errorCount} failed`);
      } else {
        toast.error('Bulk assignment completed with errors');
      }

      // Refresh data
      await fetchData();
      
      // Clear selections
      setSelectedTeachers([]);
      setSelectedInterventions([]);
      setShowAssignmentDialog(false);

    } catch (error) {
      console.error('Error executing bulk assignment:', error);
      toast.error('Failed to execute bulk assignment');
    } finally {
      setLoading(false);
    }
  };

  const assignByDepartment = async (department: string) => {
    try {
      setLoading(true);

      const response = await fetch('/api/v1/admin/assign-teachers-by-criteria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          interventionIds: selectedInterventions,
          criteria: {
            department,
            role: assignmentRole,
            limit: 5
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign by department');
      }

      const result = await response.json();
      toast.success(`Assigned teachers from ${department} department`);
      
      await fetchData();

    } catch (error) {
      console.error('Error assigning by department:', error);
      toast.error('Failed to assign by department');
    } finally {
      setLoading(false);
    }
  };

  const renderTeacherSelection = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Teachers ({selectedTeachers.length} selected)
            </CardTitle>
            <CardDescription>
              Choose teachers to assign to interventions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllTeachers}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearTeacherSelection}>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Teachers</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="department">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Teacher List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredTeachers.map(teacher => (
              <div key={teacher.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedTeachers.includes(teacher.id)}
                  onCheckedChange={(checked) => handleTeacherSelection(teacher.id, checked as boolean)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{teacher.name}</span>
                    <Badge variant="outline">{teacher.department}</Badge>
                    {teacher.specialization && (
                      <Badge variant="secondary">{teacher.specialization}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {teacher.interventions_assigned || 0} interventions
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTeachers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No teachers found matching the criteria
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderInterventionSelection = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select Interventions ({selectedInterventions.length} selected)
            </CardTitle>
            <CardDescription>
              Choose interventions to assign teachers to
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllInterventions}>
              Select Active
            </Button>
            <Button variant="outline" size="sm" onClick={clearInterventionSelection}>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {interventions.filter(i => i.status === 'Active').map(intervention => (
            <div key={intervention.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                checked={selectedInterventions.includes(intervention.id)}
                onCheckedChange={(checked) => handleInterventionSelection(intervention.id, checked as boolean)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{intervention.name}</span>
                  <Badge variant="outline">{intervention.status}</Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Capacity: {intervention.enrolled_count}/{intervention.max_students}</span>
                  <span>Teachers: {intervention.assigned_teachers}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderAssignmentOptions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Assignment Options
        </CardTitle>
        <CardDescription>
          Configure assignment settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="role">Teacher Role</Label>
            <Select value={assignmentRole} onValueChange={setAssignmentRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead Teacher</SelectItem>
                <SelectItem value="Assistant">Assistant Teacher</SelectItem>
                <SelectItem value="Observer">Observer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quick Assignment by Department</Label>
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <Button
                  key={dept}
                  variant="outline"
                  size="sm"
                  onClick={() => assignByDepartment(dept)}
                  disabled={selectedInterventions.length === 0 || loading}
                >
                  Assign {dept}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Teacher Assignment</h2>
          <p className="text-muted-foreground">
            Assign multiple teachers to multiple interventions efficiently
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
            <DialogTrigger asChild>
              <Button 
                disabled={selectedTeachers.length === 0 || selectedInterventions.length === 0}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Execute Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Bulk Assignment</DialogTitle>
                <DialogDescription>
                  You are about to assign {selectedTeachers.length} teachers to {selectedInterventions.length} interventions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Teachers:</span> {selectedTeachers.length}
                    </div>
                    <div>
                      <span className="font-medium">Interventions:</span> {selectedInterventions.length}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {assignmentRole}
                    </div>
                    <div>
                      <span className="font-medium">Total Assignments:</span> {selectedTeachers.length * selectedInterventions.length}
                    </div>
                  </div>
                </div>
                {assignmentProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{assignmentProgress}%</span>
                    </div>
                    <Progress value={assignmentProgress} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={executeBulkAssignment} disabled={loading}>
                  {loading ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assignment Results */}
      {assignmentResults && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Bulk assignment completed: {assignmentResults.successCount} successful, {assignmentResults.errorCount} failed
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {renderTeacherSelection()}
          {renderAssignmentOptions()}
        </div>
        <div>
          {renderInterventionSelection()}
        </div>
      </div>
    </div>
  );
};

export default BulkTeacherAssignment;
