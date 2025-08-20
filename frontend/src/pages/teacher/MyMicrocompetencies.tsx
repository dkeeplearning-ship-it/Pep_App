import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Target,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Plus,
  BarChart3,
  FileText,
  Award,
} from 'lucide-react';
import { interventionAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

interface AssignedMicrocompetency {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  component: string;
  subCategory: string;
  quadrant: string;
  canScore: boolean;
  canCreateTasks: boolean;
  assignedAt: string;
  intervention: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  scoringStats: {
    totalStudents: number;
    scoredStudents: number;
    averageScore: number;
    completionPercentage: number;
  };
  taskStats: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
  };
}

const MyMicrocompetencies: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [microcompetencies, setMicrocompetencies] = useState<AssignedMicrocompetency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIntervention, setSelectedIntervention] = useState<string>('all');
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('all');
  const [interventions, setInterventions] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get teacher's interventions and assigned microcompetencies
      const [interventionsResponse, microcompetenciesResponse] = await Promise.all([
        interventionAPI.getTeacherInterventions(user.id),
        fetch(`${API_BASE_URL}/api/v1/teacher-microcompetencies/${user.id}/microcompetencies`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json())
      ]);

      setInterventions(interventionsResponse.data.interventions || []);
      setMicrocompetencies(microcompetenciesResponse.data.microcompetencies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast.error('Failed to load microcompetencies');
    } finally {
      setLoading(false);
    }
  };

  const filteredMicrocompetencies = microcompetencies.filter(mc => {
    const matchesSearch = mc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mc.component.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIntervention = selectedIntervention === 'all' || 
                               mc.intervention.id === selectedIntervention;
    
    const matchesQuadrant = selectedQuadrant === 'all' || 
                           mc.quadrant.toLowerCase() === selectedQuadrant.toLowerCase();

    return matchesSearch && matchesIntervention && matchesQuadrant;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleScoreMicrocompetency = (interventionId: string, microcompetencyId: string) => {
    navigate(`/teacher/interventions/${interventionId}/microcompetencies/${microcompetencyId}/scoring`);
  };

  const handleCreateTask = (interventionId: string) => {
    navigate(`/teacher/tasks?intervention=${interventionId}`);
  };

  const handleViewDetails = (interventionId: string, microcompetencyId: string) => {
    navigate(`/teacher/interventions/${interventionId}/microcompetencies/${microcompetencyId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Microcompetencies</h1>
          <p className="text-muted-foreground">
            Manage and score your assigned microcompetencies across all interventions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/teacher/tasks')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{microcompetencies.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {interventions.length} interventions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students to Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {microcompetencies.reduce((sum, mc) => sum + (mc.scoringStats?.totalStudents || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total student assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {microcompetencies.length > 0 
                ? Math.round(microcompetencies.reduce((sum, mc) => sum + (mc.scoringStats?.completionPercentage || 0), 0) / microcompetencies.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all assignments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {microcompetencies.reduce((sum, mc) => sum + (mc.taskStats?.activeTasks || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Microcompetencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search microcompetencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="intervention">Intervention</Label>
              <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                <SelectTrigger>
                  <SelectValue placeholder="All interventions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Interventions</SelectItem>
                  {interventions.map((intervention) => (
                    <SelectItem key={intervention.id} value={intervention.id}>
                      {intervention.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quadrant">Quadrant</Label>
              <Select value={selectedQuadrant} onValueChange={setSelectedQuadrant}>
                <SelectTrigger>
                  <SelectValue placeholder="All quadrants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quadrants</SelectItem>
                  <SelectItem value="persona">Persona</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="behavior">Behavior</SelectItem>
                  <SelectItem value="discipline">Discipline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedIntervention('all');
                  setSelectedQuadrant('all');
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

      {/* Microcompetencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Microcompetencies ({filteredMicrocompetencies.length})</CardTitle>
          <CardDescription>
            Your microcompetency assignments across all active interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMicrocompetencies.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No microcompetencies found</h3>
              <p className="text-muted-foreground">
                {microcompetencies.length === 0 
                  ? "You haven't been assigned any microcompetencies yet."
                  : "No microcompetencies match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Microcompetency</TableHead>
                    <TableHead>Intervention</TableHead>
                    <TableHead>Quadrant</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMicrocompetencies.map((mc) => (
                    <TableRow key={mc.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mc.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {mc.component} • Max Score: {mc.maxScore}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mc.intervention.name}</div>
                          <Badge className={getStatusColor(mc.intervention.status)}>
                            {mc.intervention.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{mc.quadrant}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">
                            {mc.scoringStats?.scoredStudents || 0}/{mc.scoringStats?.totalStudents || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">scored</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={getCompletionColor(mc.scoringStats?.completionPercentage || 0)}>
                              {mc.scoringStats?.completionPercentage || 0}%
                            </span>
                          </div>
                          <Progress 
                            value={mc.scoringStats?.completionPercentage || 0} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">
                            {mc.taskStats?.activeTasks || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">active</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {mc.canScore && (
                            <Badge variant="secondary" className="text-xs">
                              Score
                            </Badge>
                          )}
                          {mc.canCreateTasks && (
                            <Badge variant="secondary" className="text-xs">
                              Tasks
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(mc.intervention.id, mc.id)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {mc.canScore && (
                            <Button
                              size="sm"
                              onClick={() => handleScoreMicrocompetency(mc.intervention.id, mc.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {mc.canCreateTasks && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateTask(mc.intervention.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyMicrocompetencies;
