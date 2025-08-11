import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  TrendingUp, 
  Settings,
  Play,
  Square,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SmartBatchProgressionDashboard from '../SmartBatchProgressionDashboard';
import { batchProgressionAPI, termManagementAPI, termAPI } from '@/lib/api';

interface Batch {
  id: string;
  name: string;
  current_term_number: number;
  max_terms: number;
  batch_status: string;
  student_count: number;
  academic_year: string;
}

interface Term {
  id: string;
  name: string;
  term_number: number;
  term_status: string;
  level_name: string;
  start_date: string;
  end_date: string;
  attendance_threshold: number;
}

const BatchProgressionManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Load real batches from API
      const batchesResponse = await batchProgressionAPI.getAllBatchesWithProgression();

      if (batchesResponse.success && batchesResponse.data) {
        // Transform the API response to match our interface
        const transformedBatches: Batch[] = batchesResponse.data.map((batch: any) => ({
          id: batch.id,
          name: batch.name,
          current_term_number: batch.current_term_number || 1,
          max_terms: batch.max_terms || 4,
          batch_status: batch.batch_status || 'active',
          student_count: batch.student_count || 0,
          academic_year: batch.academic_year || '2024-25'
        }));
        setBatches(transformedBatches);
      } else {
        // Fallback to empty array if API fails
        setBatches([]);
      }

      // Load real terms from API
      const termsResponse = await termAPI.getAllTerms();

      if (termsResponse.success && termsResponse.data) {
        // Transform the API response to match our interface
        const transformedTerms: Term[] = termsResponse.data.map((term: any, index: number) => ({
          id: term.id,
          name: term.name,
          term_number: term.term_number || index + 1,
          term_status: term.term_status || 'upcoming', // Use actual term_status from database
          level_name: `Level ${index} (${term.name})`,
          start_date: term.start_date,
          end_date: term.end_date,
          attendance_threshold: term.attendance_threshold || 75
        }));
        setTerms(transformedTerms);
      } else {
        // Fallback to empty array if API fails
        setTerms([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      // Set empty arrays on error
      setBatches([]);
      setTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTermAction = async (termId: string, action: 'activate' | 'complete' | 'archive') => {
    try {
      setActionLoading(`${action}-${termId}`);
      
      switch (action) {
        case 'activate':
          await termManagementAPI.activateTerm(termId, 'admin');
          break;
        case 'complete':
          await termManagementAPI.completeTerm(termId, 'admin');
          break;
        case 'archive':
          await termManagementAPI.archiveTerm(termId, 'admin');
          break;
      }
      
      await fetchData(); // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} term`;

      // Provide more user-friendly error messages
      if (errorMessage.includes('Cannot complete term with status: completed')) {
        setError('This term is already completed. You can archive it if needed.');
      } else if (errorMessage.includes('Cannot complete term with status: archived')) {
        setError('This term is archived and cannot be completed.');
      } else if (errorMessage.includes('Cannot activate term with status: active')) {
        setError('This term is already active.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoTransition = async () => {
    try {
      setActionLoading('auto-transition');
      await termManagementAPI.autoTransitionTerms();
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-transition terms');
    } finally {
      setActionLoading(null);
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'graduated': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTermStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTermActionButton = (term: Term) => {
    const isLoading = actionLoading?.includes(term.id);
    
    switch (term.term_status) {
      case 'upcoming':
        return (
          <Button
            size="sm"
            onClick={() => handleTermAction(term.id, 'activate')}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isLoading ? 'Activating...' : 'Activate'}
          </Button>
        );
      case 'active':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTermAction(term.id, 'complete')}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            {isLoading ? 'Completing...' : 'Complete'}
          </Button>
        );
      case 'completed':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTermAction(term.id, 'archive')}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            {isLoading ? 'Archiving...' : 'Archive'}
          </Button>
        );
      default:
        return null;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Progression Management</h1>
          <p className="text-gray-600 mt-1">Manage multi-batch term progression and lifecycle</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleAutoTransition}
            disabled={actionLoading === 'auto-transition'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {actionLoading === 'auto-transition' ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            {actionLoading === 'auto-transition' ? 'Processing...' : 'Auto Transition'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Batch Management</TabsTrigger>
          <TabsTrigger value="terms">Term Lifecycle</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{batches.length}</div>
                    <div className="text-sm text-gray-600">Active Batches</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {batches.reduce((sum, batch) => sum + batch.student_count, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {terms.filter(t => t.term_status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-600">Active Terms</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(batches.reduce((sum, batch) => sum + (batch.current_term_number / batch.max_terms), 0) / batches.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Progress</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Batch Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches.map(batch => (
                  <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium">{batch.name}</h4>
                        <p className="text-sm text-gray-600">
                          Term {batch.current_term_number} of {batch.max_terms} • {batch.student_count} students
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getBatchStatusColor(batch.batch_status)}>
                        {batch.batch_status.toUpperCase()}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBatch(batch.id)}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          {selectedBatch ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Batch Details</h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedBatch(null)}
                >
                  Back to Overview
                </Button>
              </div>
              <SmartBatchProgressionDashboard 
                batchId={selectedBatch} 
                userRole="admin" 
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map(batch => (
                <Card key={batch.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6" onClick={() => setSelectedBatch(batch.id)}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{batch.name}</h3>
                        <Badge className={getBatchStatusColor(batch.batch_status)}>
                          {batch.batch_status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            Term {batch.current_term_number} of {batch.max_terms}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(batch.current_term_number / batch.max_terms) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students</span>
                        <span className="font-medium">{batch.student_count}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Academic Year</span>
                        <span className="font-medium">{batch.academic_year}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Term Lifecycle Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {terms.map(term => (
                  <div key={term.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        term.term_status === 'completed' ? 'bg-green-100 text-green-600' :
                        term.term_status === 'active' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {term.term_number}
                      </div>
                      <div>
                        <h4 className="font-medium">{term.name}</h4>
                        <p className="text-sm text-gray-600">
                          {term.level_name} • Attendance: {term.attendance_threshold}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getTermStatusColor(term.term_status)}>
                        {term.term_status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {term.term_status.toUpperCase()}
                      </Badge>
                      {getTermActionButton(term)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Batch Progression Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.round(batches.reduce((sum, batch) => sum + (batch.current_term_number / batch.max_terms), 0) / batches.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Average Batch Progress</div>
                  </div>
                  
                  <div className="space-y-3">
                    {batches.map(batch => (
                      <div key={batch.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{batch.name}</span>
                        <span className="text-sm text-gray-600">
                          {Math.round((batch.current_term_number / batch.max_terms) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Term Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['upcoming', 'active', 'completed', 'archived'].map(status => {
                    const count = terms.filter(t => t.term_status === status).length;
                    const percentage = (count / terms.length) * 100;
                    
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium">{status}</span>
                          <span className="text-gray-600">{count} terms</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              status === 'active' ? 'bg-green-500' :
                              status === 'completed' ? 'bg-blue-500' :
                              status === 'upcoming' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { BatchProgressionManagement };
export default BatchProgressionManagement;
