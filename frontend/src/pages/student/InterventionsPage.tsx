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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  Calendar,
  Users,
  Target,
  Clock,
  TrendingUp,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  PlayCircle,
} from 'lucide-react';
import { interventionAPI, studentInterventionAPI, studentAPI } from '@/lib/api';
import { Intervention } from '@/types/intervention';
import { useAuth } from '@/contexts/AuthContext';
import { useTerm } from '@/contexts/TermContext';

const InterventionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTerm } = useTerm();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [studentScores, setStudentScores] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    fetchData();
  }, [statusFilter, user, selectedTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // First get current student to get their ID
      const currentStudentResponse = await studentAPI.getCurrentStudent();
      const studentId = currentStudentResponse.data.id;

      const [interventionsResponse, scoresResponse] = await Promise.all([
        // Use student-specific interventions endpoint with term filtering
        studentAPI.getStudentInterventions(studentId, selectedTerm?.id),
        // Get student intervention scores
        studentInterventionAPI.getStudentScores(studentId)
      ]);

      // Transform the interventions data to match the expected Intervention type
      const transformedInterventions = (interventionsResponse.data.interventions || []).map(intervention => ({
        id: intervention.id,
        name: intervention.name,
        description: intervention.description,
        status: intervention.status as 'Draft' | 'Active' | 'Completed' | 'Cancelled',
        start_date: intervention.start_date,
        end_date: intervention.end_date,
        max_students: intervention.max_students,
        objectives: intervention.objectives,
        is_scoring_open: intervention.is_scoring_open,
        scoring_deadline: intervention.scoring_deadline || '',
        enrolled_count: intervention.enrolled_count,
        created_at: new Date().toISOString(), // Default value for missing field
        updated_at: new Date().toISOString(), // Default value for missing field
      }));

      setInterventions(transformedInterventions);
      if (scoresResponse) {
        setStudentScores(scoresResponse.data);
      }
    } catch (err) {
      console.error('Error fetching student interventions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventions = fetchData;

  const handleSearch = () => {
    fetchInterventions();
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
        return <PlayCircle className="h-4 w-4" />;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = intervention.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         intervention.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'available') {
      return matchesSearch && intervention.status === 'Active';
    } else if (activeTab === 'enrolled') {
      // This would need to be filtered based on student enrollment status
      return matchesSearch;
    } else if (activeTab === 'completed') {
      return matchesSearch && intervention.status === 'Completed';
    }
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interventions</h1>
            <p className="text-gray-600 mt-1">
              Discover and participate in skill development programs
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {selectedTerm?.name || 'Current Term'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search interventions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} variant="outline">
            Search
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="enrolled">My Interventions</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredInterventions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No interventions found
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  {activeTab === 'available' 
                    ? "There are no active interventions available at the moment."
                    : activeTab === 'enrolled'
                    ? "You haven't enrolled in any interventions yet."
                    : "You haven't completed any interventions yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInterventions.map((intervention) => (
                <Card 
                  key={intervention.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/student/interventions/${intervention.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{intervention.name}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(intervention.status)}>
                            {getStatusIcon(intervention.status)}
                            <span className="ml-1">{intervention.status}</span>
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardDescription className="line-clamp-2">
                      {intervention.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Progress Bar for Active Interventions */}
                    {intervention.status === 'Active' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {calculateProgress(intervention.start_date, intervention.end_date)}%
                          </span>
                        </div>
                        <Progress 
                          value={calculateProgress(intervention.start_date, intervention.end_date)} 
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Intervention Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(intervention.start_date)} - {formatDate(intervention.end_date)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>
                          {intervention.enrolled_count || 0} / {intervention.max_students} students
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Target className="h-4 w-4 mr-2" />
                        <span>{intervention.objectives?.length || 0} objectives</span>
                      </div>
                    </div>

                    {/* Scoring Status */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Scoring Status</h4>
                      <div className="flex items-center gap-2">
                        {intervention.is_scoring_open ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Scoring Open
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Scoring Closed
                          </Badge>
                        )}
                        {intervention.scoring_deadline && (
                          <span className="text-xs text-gray-600">
                            Due: {formatDate(intervention.scoring_deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Student Score (if enrolled) */}
                    {studentScores && studentScores.scores && studentScores.scores.find((score: any) => score.intervention.id === intervention.id) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">Your Score</h4>
                        {(() => {
                          const score = studentScores.scores?.find((s: any) => s.intervention.id === intervention.id);
                          return score ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                {score.overall_score.percentage.toFixed(1)}%
                              </Badge>
                              <span className="text-xs text-gray-600">
                                {score.overall_score.obtained_score}/{score.overall_score.max_score}
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterventionsPage;
