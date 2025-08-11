import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Target,
  BarChart3,
  TrendingUp,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface ValidationResult {
  level: string;
  isValid: boolean;
  totalWeightage: number;
  expectedTotal: number;
  items: Array<{
    id: string;
    name: string;
    weightage: number;
    isActive: boolean;
    parent?: string;
  }>;
  issues: string[];
}

interface MultiLevelValidationProps {
  configId: string;
  configName: string;
  onValidationComplete?: (isValid: boolean) => void;
}

const MultiLevelWeightageValidation: React.FC<MultiLevelValidationProps> = ({
  configId,
  configName,
  onValidationComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [overallValid, setOverallValid] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (configId) {
      validateAllLevels();
    }
  }, [configId]);

  const validateAllLevels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/batch-term-weightages/${configId}/validate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate weightages');
      }

      const data = await response.json();
      setValidationResults(data.results || []);
      setOverallValid(data.isValid || false);
      
      if (onValidationComplete) {
        onValidationComplete(data.isValid);
      }

      if (data.isValid) {
        toast.success('All weightages are valid');
      } else {
        toast.error('Weightage validation issues found');
      }

    } catch (error) {
      console.error('Error validating weightages:', error);
      toast.error('Failed to validate weightages');
    } finally {
      setLoading(false);
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

  const getWeightageColor = (weightage: number, expected: number = 100) => {
    const diff = Math.abs(weightage - expected);
    if (diff <= 0.01) return 'text-green-600';
    if (diff <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getValidationIcon(overallValid)}
                Multi-Level Weightage Validation
              </CardTitle>
              <CardDescription>
                Validation status for {configName}
              </CardDescription>
            </div>
            {getValidationBadge(overallValid)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {validationResults.map((result) => (
                <Card key={result.level}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">{result.level}</p>
                        <p className={`text-2xl font-bold ${getWeightageColor(result.totalWeightage)}`}>
                          {result.totalWeightage.toFixed(1)}%
                        </p>
                      </div>
                      {getValidationIcon(result.isValid)}
                    </div>
                    <Progress 
                      value={result.totalWeightage} 
                      className="mt-2"
                      max={result.expectedTotal}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {!overallValid && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some weightage levels have validation issues. Please review each level for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLevelDetails = (result: ValidationResult) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 capitalize">
              <Target className="h-5 w-5" />
              {result.level} Weightages
            </CardTitle>
            <CardDescription>
              Total: {result.totalWeightage.toFixed(2)}% / Expected: {result.expectedTotal}%
            </CardDescription>
          </div>
          {getValidationBadge(result.isValid)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {result.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {result.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {result.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.parent && (
                    <p className="text-sm text-muted-foreground">Parent: {item.parent}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className={`font-bold ${getWeightageColor(item.weightage, 0)}`}>
                    {item.weightage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Weightage Validation</h3>
          <p className="text-sm text-muted-foreground">
            Validate weightages across all hierarchy levels
          </p>
        </div>
        <Button onClick={validateAllLevels} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Validating...' : 'Refresh Validation'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {validationResults.map((result) => (
            <TabsTrigger key={result.level} value={result.level} className="capitalize">
              {result.level}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>

        {validationResults.map((result) => (
          <TabsContent key={result.level} value={result.level} className="space-y-4">
            {renderLevelDetails(result)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MultiLevelWeightageValidation;
