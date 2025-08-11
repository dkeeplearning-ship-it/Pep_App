import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Target,
  BarChart3,
  TrendingUp,
  Settings,
  Calculator,
  Users,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface WeightageSummary {
  configId: string;
  configName: string;
  batchName: string;
  termName: string;
  overallValid: boolean;
  levels: {
    quadrants: { valid: boolean; total: number; count: number };
    subcategories: { valid: boolean; total: number; count: number };
    components: { valid: boolean; total: number; count: number };
    microcompetencies: { valid: boolean; total: number; count: number };
  };
  lastUpdated: string;
  studentsAffected: number;
}

interface WeightageSummaryDashboardProps {
  configId: string;
  onRecalculateScores?: () => void;
}

const WeightageSummaryDashboard: React.FC<WeightageSummaryDashboardProps> = ({
  configId,
  onRecalculateScores
}) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<WeightageSummary | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (configId) {
      loadSummary();
    }
  }, [configId]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/batch-term-weightages/${configId}/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load summary');
      }

      const data = await response.json();
      setSummary(data);

    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Failed to load weightage summary');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateScores = async () => {
    if (!summary) return;

    setRecalculating(true);
    try {
      const response = await fetch(`/api/v1/admin/batch-term-weightages/${summary.configId}/recalculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate scores');
      }

      toast.success('Score recalculation started successfully');
      
      if (onRecalculateScores) {
        onRecalculateScores();
      }

    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast.error('Failed to start score recalculation');
    } finally {
      setRecalculating(false);
    }
  };

  const getValidationIcon = (isValid: boolean) => {
    if (isValid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getValidationBadge = (isValid: boolean) => {
    if (isValid) {
      return <Badge variant="default" className="bg-green-500">Valid</Badge>;
    }
    return <Badge variant="destructive">Invalid</Badge>;
  };

  const getWeightageColor = (total: number) => {
    const diff = Math.abs(total - 100);
    if (diff <= 0.01) return 'text-green-600';
    if (diff <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading summary...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No summary data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getValidationIcon(summary.overallValid)}
                Weightage Configuration Summary
              </CardTitle>
              <CardDescription>
                {summary.configName} - {summary.batchName} ({summary.termName})
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getValidationBadge(summary.overallValid)}
              <Button onClick={loadSummary} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Students Affected</p>
                <p className="text-2xl font-bold">{summary.studentsAffected}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(summary.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-500" />
              <div>
                <Button 
                  onClick={handleRecalculateScores}
                  disabled={recalculating || !summary.overallValid}
                  size="sm"
                >
                  {recalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Recalculate Scores
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(summary.levels).map(([level, data]) => (
          <Card key={level}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">{level}</CardTitle>
                {getValidationIcon(data.valid)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Weightage</span>
                  <span className={`font-bold ${getWeightageColor(data.total)}`}>
                    {data.total.toFixed(1)}%
                  </span>
                </div>
                <Progress value={data.total} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Items</span>
                  <span className="text-sm font-medium">{data.count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Validation Issues */}
      {!summary.overallValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Validation Issues Detected</p>
              <p>Some weightage levels have validation issues. Please review and fix the following:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {Object.entries(summary.levels)
                  .filter(([_, data]) => !data.valid)
                  .map(([level, data]) => (
                    <li key={level} className="capitalize">
                      {level}: Total weightage is {data.total.toFixed(1)}% (should be 100%)
                    </li>
                  ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {summary.overallValid && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">All Weightages Valid</p>
              <p>All hierarchy levels have valid weightage configurations. You can now recalculate student scores to apply these weightages.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default WeightageSummaryDashboard;
