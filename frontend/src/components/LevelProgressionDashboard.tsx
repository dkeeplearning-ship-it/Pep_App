import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { levelProgressionAPI, adminAPI, termAPI } from '@/lib/api';

interface LevelProgressionData {
  current_level: number;
  level_name: string;
  eligibility_status: 'eligible' | 'ict' | 'not_cleared' | 'conditional';
  attendance_percentage: number;
  attendance_threshold: number;
  quadrant_clearance: {
    persona: boolean;
    wellness: boolean;
    behavior: boolean;
    discipline: boolean;
  };
  next_level_requirements: {
    attendance_required: number;
    quadrant_thresholds: Record<string, number>;
  };
  progression_history: Array<{
    level: number;
    completed_date: string;
    status: string;
  }>;
}

interface LevelProgressionDashboardProps {
  studentId?: string;
  termId?: string;
}

const LevelProgressionDashboard: React.FC<LevelProgressionDashboardProps> = ({
  studentId: propStudentId,
  termId: propTermId
}) => {
  const [progressionData, setProgressionData] = useState<LevelProgressionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudentId || '');
  const [selectedTermId, setSelectedTermId] = useState<string>(propTermId || '');
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedStudentId && selectedTermId) {
      fetchProgressionData();
    }
  }, [selectedStudentId, selectedTermId]);

  const loadInitialData = async () => {
    try {
      const [studentsResponse, termsResponse] = await Promise.all([
        adminAPI.getAllStudents({ page: 1, limit: 100 }),
        termAPI.getAllTerms()
      ]);

      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students || []);
        if (!selectedStudentId && studentsResponse.data.students.length > 0) {
          setSelectedStudentId(studentsResponse.data.students[0].id);
        }
      }

      if (termsResponse.success) {
        setTerms(termsResponse.data || []);
        const currentTerm = termsResponse.data.find((term: any) => term.is_current);
        if (!selectedTermId && currentTerm) {
          setSelectedTermId(currentTerm.id);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load initial data');
    }
  };

  const fetchProgressionData = async () => {
    if (!selectedStudentId || !selectedTermId) {
      setError('Please select both student and term');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await levelProgressionAPI.getStudentLevelProgression(selectedStudentId, selectedTermId);
      setProgressionData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getEligibilityStatusColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800 border-green-200';
      case 'ict': return 'bg-red-100 text-red-800 border-red-200';
      case 'conditional': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEligibilityIcon = (status: string) => {
    switch (status) {
      case 'eligible': return <CheckCircle className="w-4 h-4" />;
      case 'ict': return <XCircle className="w-4 h-4" />;
      case 'conditional': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getAttendanceStatus = (percentage: number, threshold: number) => {
    if (percentage >= threshold) return 'Eligible';
    if (percentage >= threshold - 5) return 'Warning';
    return 'ICT';
  };

  const getAttendanceColor = (percentage: number, threshold: number) => {
    if (percentage >= threshold) return 'text-green-600';
    if (percentage >= threshold - 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Level Progression Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.registration_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Term</label>
              <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.is_current && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                onClick={fetchProgressionData}
                disabled={!selectedStudentId || !selectedTermId || loading}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Load Progression
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && !progressionData && (
        <Alert>
          <AlertDescription>No progression data available. Please select a student and term.</AlertDescription>
        </Alert>
      )}

      {!loading && !error && progressionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Level Progression Status</span>
              <Badge className={getEligibilityStatusColor(progressionData.eligibility_status)}>
                {getEligibilityIcon(progressionData.eligibility_status)}
                <span className="ml-1 capitalize">{progressionData.eligibility_status}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Current: {progressionData.level_name}</h3>
                <p className="text-sm text-gray-600">Level {progressionData.current_level}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Attendance Status</h4>
                <div className="flex items-center space-x-2">
                  <Progress value={progressionData.attendance_percentage} className="flex-1" />
                  <span className={`text-sm font-medium ${getAttendanceColor(progressionData.attendance_percentage, progressionData.attendance_threshold)}`}>
                    {progressionData.attendance_percentage}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required: {progressionData.attendance_threshold}% |
                  Status: {getAttendanceStatus(progressionData.attendance_percentage, progressionData.attendance_threshold)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { LevelProgressionDashboard };
export default LevelProgressionDashboard;
