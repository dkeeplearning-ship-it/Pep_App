import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Target,
  Layers,
  Component,
  Zap,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface WeightageValidationProps {
  onValidationComplete?: (isValid: boolean) => void;
}

interface ValidationResult {
  isValid: boolean;
  totalWeightage: number;
  expectedTotal: number;
  message: string;
  results?: any[];
}

interface ValidationSummary {
  isValid: boolean;
  summary: {
    quadrants: ValidationResult;
    subCategories: ValidationResult;
    components: ValidationResult;
    microcompetencies: ValidationResult;
  };
  issues: string[];
  message: string;
}

const WeightageValidation: React.FC<WeightageValidationProps> = ({ onValidationComplete }) => {
  const [loading, setLoading] = useState(false);
  const [validationData, setValidationData] = useState<ValidationSummary | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    validateAllWeightages();
  }, []);

  const validateAllWeightages = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/v1/admin/weightage-validation', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate weightages');
      }

      const data = await response.json();
      setValidationData(data);
      
      if (onValidationComplete) {
        onValidationComplete(data.isValid);
      }

      if (data.isValid) {
        toast.success('All weightages are valid');
      } else {
        toast.error(`Weightage issues found: ${data.issues.join(', ')}`);
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
                {validationData && getValidationIcon(validationData.isValid)}
                Overall Weightage Validation
              </CardTitle>
              <CardDescription>
                System-wide weightage validation status
              </CardDescription>
            </div>
            {validationData && getValidationBadge(validationData.isValid)}
          </div>
        </CardHeader>
        <CardContent>
          {validationData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {validationData.message}
              </p>
              
              {validationData.issues.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Issues found: {validationData.issues.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary Grid */}
      {validationData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Quadrants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getValidationIcon(validationData.summary.quadrants.isValid)}
                  <span className={`text-lg font-bold ${getWeightageColor(validationData.summary.quadrants.totalWeightage)}`}>
                    {validationData.summary.quadrants.totalWeightage}%
                  </span>
                </div>
                <Progress 
                  value={validationData.summary.quadrants.totalWeightage} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Expected: {validationData.summary.quadrants.expectedTotal}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Sub-Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getValidationIcon(validationData.summary.subCategories.isValid)}
                  <span className="text-lg font-bold">
                    {validationData.summary.subCategories.results?.filter(r => r.isValid).length || 0}/
                    {validationData.summary.subCategories.results?.length || 0}
                  </span>
                </div>
                <Progress 
                  value={validationData.summary.subCategories.results?.length > 0 
                    ? (validationData.summary.subCategories.results.filter(r => r.isValid).length / validationData.summary.subCategories.results.length) * 100 
                    : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Valid quadrants
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Component className="h-4 w-4" />
                Components
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getValidationIcon(validationData.summary.components.isValid)}
                  <span className="text-lg font-bold">
                    {validationData.summary.components.results?.filter(r => r.isValid).length || 0}/
                    {validationData.summary.components.results?.length || 0}
                  </span>
                </div>
                <Progress 
                  value={validationData.summary.components.results?.length > 0 
                    ? (validationData.summary.components.results.filter(r => r.isValid).length / validationData.summary.components.results.length) * 100 
                    : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Valid sub-categories
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Microcompetencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getValidationIcon(validationData.summary.microcompetencies.isValid)}
                  <span className="text-lg font-bold">
                    {validationData.summary.microcompetencies.results?.filter(r => r.isValid).length || 0}/
                    {validationData.summary.microcompetencies.results?.length || 0}
                  </span>
                </div>
                <Progress 
                  value={validationData.summary.microcompetencies.results?.length > 0 
                    ? (validationData.summary.microcompetencies.results.filter(r => r.isValid).length / validationData.summary.microcompetencies.results.length) * 100 
                    : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Valid components
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderDetailedResults = (results: any[], title: string, type: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title} Validation Details</CardTitle>
        <CardDescription>
          Detailed weightage validation for each {type}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getValidationIcon(result.isValid)}
                  <span className="font-medium">
                    {result.quadrantName || result.subCategoryName || result.componentName || 'Unknown'}
                  </span>
                  {!result.isValid && (
                    <Badge variant="destructive" className="text-xs">
                      Invalid
                    </Badge>
                  )}
                </div>
                {result.quadrantName && result.subCategoryName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.quadrantName} → {result.subCategoryName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getWeightageColor(result.totalWeightage)}`}>
                  {result.totalWeightage}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Expected: {result.expectedTotal}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Weightage Validation</h2>
          <p className="text-muted-foreground">
            Validate weightages across quadrants, sub-categories, components, and microcompetencies
          </p>
        </div>
        <Button 
          onClick={validateAllWeightages} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Validating...' : 'Refresh Validation'}
        </Button>
      </div>

      {/* Validation Results */}
      {validationData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quadrants">Quadrants</TabsTrigger>
            <TabsTrigger value="subcategories">Sub-Categories</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="microcompetencies">Microcompetencies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="quadrants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quadrant Weightages
                </CardTitle>
                <CardDescription>
                  All quadrants should total 100% weightage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-medium">Total Quadrant Weightage</span>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getWeightageColor(validationData.summary.quadrants.totalWeightage)}`}>
                        {validationData.summary.quadrants.totalWeightage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expected: 100%
                      </div>
                    </div>
                  </div>
                  
                  {validationData.summary.quadrants.results && (
                    <div className="space-y-2">
                      {validationData.summary.quadrants.map((quadrant: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span>{quadrant.name}</span>
                          <span className="font-medium">{quadrant.weightage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcategories" className="space-y-6">
            {validationData.summary.subCategories.results && 
              renderDetailedResults(validationData.summary.subCategories.results, 'Sub-Category', 'sub-category')}
          </TabsContent>

          <TabsContent value="components" className="space-y-6">
            {validationData.summary.components.results && 
              renderDetailedResults(validationData.summary.components.results, 'Component', 'component')}
          </TabsContent>

          <TabsContent value="microcompetencies" className="space-y-6">
            {validationData.summary.microcompetencies.results && 
              renderDetailedResults(validationData.summary.microcompetencies.results, 'Microcompetency', 'microcompetency')}
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {loading && !validationData && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Validating weightages...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeightageValidation;
