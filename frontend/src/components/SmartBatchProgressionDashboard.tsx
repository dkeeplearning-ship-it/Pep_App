import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  GraduationCap,
  Calendar,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface BatchProgressionData {
  batch: {
    id: string;
    name: string;
    current_term_number: number;
    max_terms: number;
    batch_status: string;
    student_count: number;
  };
  progressions: Array<{
    term_number: number;
    status: string;
    students_enrolled: number;
    students_completed: number;
    students_failed: number;
    start_date: string;
    end_date: string;
  }>;
  currentTermStats: {
    enrolled: number;
    active: number;
    completed: number;
    failed: number;
  };
}

interface SmartBatchProgressionDashboardProps {
  batchId: string;
  userRole: string;
}

const SmartBatchProgressionDashboard: React.FC<SmartBatchProgressionDashboardProps> = ({
  batchId,
  userRole
}) => {
  const [progressionData, setProgressionData] = useState<BatchProgressionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressionData();
  }, [batchId]);

  const fetchProgressionData = async () => {
    try {
      setLoading(true);
      const { batchProgressionAPI } = await import('@/lib/api');
      const response = await batchProgressionAPI.getBatchProgressionStatus(batchId);
      setProgressionData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTerm = async (termNumber: number) => {
    try {
      setActionLoading(`complete-${termNumber}`);
      const { batchProgressionAPI } = await import('@/lib/api');
      await batchProgressionAPI.completeBatchTerm(batchId, termNumber);
      await fetchProgressionData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete term');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'graduated': return 'text-blue-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!progressionData) {
    return (
      <Alert>
        <AlertDescription>No progression data available</AlertDescription>
      </Alert>
    );
  }

  const { batch, progressions, currentTermStats } = progressionData;
  const currentProgression = progressions.find(p => p.term_number === batch.current_term_number);
  const completionPercentage = (batch.current_term_number / batch.max_terms) * 100;

  return (
    <div className="space-y-6">
      {/* Batch Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-6 h-6" />
              <span>{batch.name}</span>
            </div>
            <Badge className={getBatchStatusColor(batch.batch_status)}>
              {batch.batch_status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{batch.student_count}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{batch.current_term_number}</div>
              <div className="text-sm text-gray-600">Current Term</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{batch.max_terms}</div>
              <div className="text-sm text-gray-600">Total Terms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(completionPercentage)}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Batch Progression</span>
              <span>Term {batch.current_term_number} of {batch.max_terms}</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Current Term Status */}
      {currentProgression && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Term Status</span>
              <Badge className={getStatusColor(currentProgression.status)}>
                {getStatusIcon(currentProgression.status)}
                <span className="ml-1 capitalize">{currentProgression.status}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{currentProgression.students_enrolled}</div>
                <div className="text-sm text-gray-600">Enrolled</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{currentProgression.students_completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">{currentProgression.students_failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {currentProgression.students_enrolled - currentProgression.students_completed - currentProgression.students_failed}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>

            {userRole === 'admin' && currentProgression.status === 'active' && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => handleCompleteTerm(batch.current_term_number)}
                  disabled={actionLoading === `complete-${batch.current_term_number}`}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === `complete-${batch.current_term_number}` ? (
                    'Completing...'
                  ) : (
                    <>
                      Complete Term {batch.current_term_number}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Term Progression Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Term Progression Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progressions.map((progression, index) => (
              <div key={progression.term_number} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  progression.status === 'completed' ? 'bg-green-100 text-green-600' :
                  progression.status === 'active' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {progression.term_number}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Term {progression.term_number}</h4>
                    <Badge className={getStatusColor(progression.status)}>
                      {getStatusIcon(progression.status)}
                      <span className="ml-1 capitalize">{progression.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    {progression.start_date && progression.end_date && (
                      <span>
                        {new Date(progression.start_date).toLocaleDateString()} - {new Date(progression.end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  {progression.status !== 'upcoming' && (
                    <div className="flex space-x-4 text-sm mt-2">
                      <span className="text-blue-600">Enrolled: {progression.students_enrolled}</span>
                      {progression.students_completed > 0 && (
                        <span className="text-green-600">Completed: {progression.students_completed}</span>
                      )}
                      {progression.students_failed > 0 && (
                        <span className="text-red-600">Failed: {progression.students_failed}</span>
                      )}
                    </div>
                  )}
                </div>

                {userRole === 'admin' && progression.status === 'active' && progression.term_number !== batch.current_term_number && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTerm(progression.term_number)}
                    disabled={actionLoading === `complete-${progression.term_number}`}
                  >
                    {actionLoading === `complete-${progression.term_number}` ? 'Completing...' : 'Complete'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Batch Completion Prediction */}
      {batch.batch_status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Batch Completion Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {batch.max_terms - batch.current_term_number + 1}
                </div>
                <div className="text-sm text-gray-600">Terms Remaining</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {Math.round((currentProgression?.students_completed || 0) / (currentProgression?.students_enrolled || 1) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Current Success Rate</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {new Date(Date.now() + (batch.max_terms - batch.current_term_number) * 6 * 30 * 24 * 60 * 60 * 1000).getFullYear()}
                </div>
                <div className="text-sm text-gray-600">Expected Graduation</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { SmartBatchProgressionDashboard };
export default SmartBatchProgressionDashboard;
