import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  Target,
  BarChart3
} from 'lucide-react';
import { batchTermWeightageService } from '@/services/batchTermWeightageService';
import type {
  Batch,
  Term,
  Quadrant,
  WeightageConfiguration,
  QuadrantWeightage,
  SubCategoryWeightage,
  ComponentWeightage,
  MicrocompetencyWeightage
} from '@/services/batchTermWeightageService';
import MultiLevelWeightageValidation from '@/components/admin/MultiLevelWeightageValidation';
import WeightageSummaryDashboard from '@/components/admin/WeightageSummaryDashboard';
import HierarchicalWeightageManager from '@/components/admin/HierarchicalWeightageManager';

// Interfaces are now imported from the service

const BatchTermWeightageManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [quadrants, setQuadrants] = useState<Quadrant[]>([]);
  const [configurations, setConfigurations] = useState<WeightageConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<WeightageConfiguration | null>(null);
  const [quadrantWeightages, setQuadrantWeightages] = useState<QuadrantWeightage[]>([]);
  const [subcategoryWeightages, setSubcategoryWeightages] = useState<SubCategoryWeightage[]>([]);
  const [componentWeightages, setComponentWeightages] = useState<ComponentWeightage[]>([]);
  const [microcompetencyWeightages, setMicrocompetencyWeightages] = useState<MicrocompetencyWeightage[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [newConfig, setNewConfig] = useState({
    batch_id: '',
    term_id: '',
    config_name: '',
    description: '',
    is_active: true
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadBatches(),
        loadTerms(),
        loadQuadrants(),
        loadConfigurations()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const batches = await batchTermWeightageService.getBatches();
      setBatches(batches);
    } catch (error) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const loadTerms = async () => {
    try {
      const terms = await batchTermWeightageService.getTerms();
      setTerms(terms);
    } catch (error) {
      console.error('Error loading terms:', error);
      toast.error('Failed to load terms');
    }
  };

  const loadQuadrants = async () => {
    try {
      const quadrants = await batchTermWeightageService.getQuadrants();
      setQuadrants(quadrants);
    } catch (error) {
      console.error('Error loading quadrants:', error);
      toast.error('Failed to load quadrants');
    }
  };

  const loadConfigurations = async () => {
    try {
      const configurations = await batchTermWeightageService.getConfigurations();
      setConfigurations(configurations);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load configurations');
    }
  };

  const loadConfigurationDetails = async (configId: string) => {
    try {
      const configDetails = await batchTermWeightageService.getConfigurationDetails(configId);
      setQuadrantWeightages(configDetails.quadrant_weightages || []);

      // Load multi-level weightages
      await Promise.all([
        loadSubcategoryWeightages(configId),
        loadComponentWeightages(configId),
        loadMicrocompetencyWeightages(configId)
      ]);
    } catch (error) {
      console.error('Error loading configuration details:', error);
      toast.error('Failed to load configuration details');
    }
  };

  const loadSubcategoryWeightages = async (configId: string) => {
    try {
      const data = await batchTermWeightageService.getSubcategoryWeightages(configId);
      setSubcategoryWeightages(data.subcategoryWeightages || []);
    } catch (error) {
      console.error('Error loading subcategory weightages:', error);
      toast.error('Failed to load subcategory weightages');
    }
  };

  const loadComponentWeightages = async (configId: string) => {
    try {
      const data = await batchTermWeightageService.getComponentWeightages(configId);
      setComponentWeightages(data.componentWeightages || []);
    } catch (error) {
      console.error('Error loading component weightages:', error);
      toast.error('Failed to load component weightages');
    }
  };

  const loadMicrocompetencyWeightages = async (configId: string) => {
    try {
      const data = await batchTermWeightageService.getMicrocompetencyWeightages(configId);
      setMicrocompetencyWeightages(data.microcompetencyWeightages || []);
    } catch (error) {
      console.error('Error loading microcompetency weightages:', error);
      toast.error('Failed to load microcompetency weightages');
    }
  };

  const handleCreateConfiguration = async () => {
    if (!newConfig.batch_id || !newConfig.term_id || !newConfig.config_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await batchTermWeightageService.createConfiguration(newConfig);
      toast.success('Configuration created successfully');
      setShowCreateDialog(false);
      setNewConfig({
        batch_id: '',
        term_id: '',
        config_name: '',
        description: '',
        is_active: true
      });
      await loadConfigurations();
    } catch (error: any) {
      console.error('Error creating configuration:', error);
      toast.error(error.message || 'Failed to create configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConfiguration = async (config: WeightageConfiguration) => {
    setSelectedConfig(config);
    await loadConfigurationDetails(config.id);
  };

  const handleUpdateWeightage = (quadrantId: string, field: string, value: number) => {
    setQuadrantWeightages(prev => {
      const existing = prev.find(w => w.quadrant_id === quadrantId);
      if (existing) {
        return prev.map(w => 
          w.quadrant_id === quadrantId 
            ? { ...w, [field]: value }
            : w
        );
      } else {
        return [...prev, {
          quadrant_id: quadrantId,
          weightage: field === 'weightage' ? value : 0,
          minimum_attendance: field === 'minimum_attendance' ? value : 80,
          business_rules: {}
        }];
      }
    });
  };

  const handleSaveWeightages = async () => {
    if (!selectedConfig) return;

    // Validate total weightage equals 100
    const totalWeightage = quadrantWeightages.reduce((sum, w) => sum + w.weightage, 0);
    if (totalWeightage !== 100) {
      toast.error(`Total weightage must equal 100%. Current total: ${totalWeightage}%`);
      return;
    }

    setIsLoading(true);
    try {
      await batchTermWeightageService.updateConfiguration(selectedConfig.id, {
        quadrant_weightages: quadrantWeightages
      });
      toast.success('Quadrant weightages saved successfully');
    } catch (error: any) {
      console.error('Error saving weightages:', error);
      toast.error(error.message || 'Failed to save weightages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSubcategoryWeightages = async () => {
    if (!selectedConfig) return;

    setIsLoading(true);
    try {
      await batchTermWeightageService.updateSubcategoryWeightages(selectedConfig.id, subcategoryWeightages);
      toast.success('Subcategory weightages saved successfully');
    } catch (error: any) {
      console.error('Error saving subcategory weightages:', error);
      toast.error(error.message || 'Failed to save subcategory weightages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveComponentWeightages = async () => {
    if (!selectedConfig) return;

    setIsLoading(true);
    try {
      await batchTermWeightageService.updateComponentWeightages(selectedConfig.id, componentWeightages);
      toast.success('Component weightages saved successfully');
    } catch (error: any) {
      console.error('Error saving component weightages:', error);
      toast.error(error.message || 'Failed to save component weightages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMicrocompetencyWeightages = async () => {
    if (!selectedConfig) return;

    setIsLoading(true);
    try {
      await batchTermWeightageService.updateMicrocompetencyWeightages(selectedConfig.id, microcompetencyWeightages);
      toast.success('Microcompetency weightages saved successfully');
    } catch (error: any) {
      console.error('Error saving microcompetency weightages:', error);
      toast.error(error.message || 'Failed to save microcompetency weightages');
    } finally {
      setIsLoading(false);
    }
  };

  const getWeightageForQuadrant = (quadrantId: string): QuadrantWeightage => {
    return quadrantWeightages.find(w => w.quadrant_id === quadrantId) || {
      quadrant_id: quadrantId,
      weightage: 0,
      minimum_attendance: 80,
      business_rules: {}
    };
  };

  const totalWeightage = quadrantWeightages.reduce((sum, w) => sum + w.weightage, 0);
  const isValidWeightage = totalWeightage === 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch-Term Weightage Management</h1>
          <p className="text-muted-foreground">
            Configure different weightages for different batches and terms
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadInitialData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Weightage Configuration</DialogTitle>
                <DialogDescription>
                  Create a new batch-term specific weightage configuration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="batch">Batch</Label>
                  <Select value={newConfig.batch_id} onValueChange={(value) => 
                    setNewConfig(prev => ({ ...prev, batch_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name} ({batch.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="term">Term</Label>
                  <Select value={newConfig.term_id} onValueChange={(value) => 
                    setNewConfig(prev => ({ ...prev, term_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map(term => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name} ({term.academic_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="config_name">Configuration Name</Label>
                  <Input
                    id="config_name"
                    value={newConfig.config_name}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, config_name: e.target.value }))}
                    placeholder="Enter configuration name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description (optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateConfiguration} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Configuration'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="configurations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="hierarchy" disabled={!selectedConfig}>
            <Target className="h-4 w-4 mr-2" />
            Hierarchy Manager
          </TabsTrigger>
          <TabsTrigger value="validation" disabled={!selectedConfig}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="legacy" disabled={!selectedConfig}>
            <Settings className="h-4 w-4 mr-2" />
            Legacy Tabs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-4">
          {/* Summary Dashboard */}
          {selectedConfig && (
            <WeightageSummaryDashboard
              configId={selectedConfig.id}
              onRecalculateScores={() => {
                toast.success('Score recalculation initiated');
              }}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Weightage Configurations
              </CardTitle>
              <CardDescription>
                Manage batch-term specific weightage configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow 
                      key={config.id}
                      className={selectedConfig?.id === config.id ? 'bg-muted' : ''}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.config_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {config.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{config.batches.name}</TableCell>
                      <TableCell>{config.terms.name}</TableCell>
                      <TableCell>
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(config.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectConfiguration(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          {selectedConfig && (
            <HierarchicalWeightageManager
              selectedConfig={selectedConfig}
              onConfigUpdate={() => {
                loadConfigurations();
                toast.success('Configuration updated successfully');
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="legacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Individual Tabs</CardTitle>
              <CardDescription>
                Individual tabs for each hierarchy level (legacy approach)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="quadrants" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="quadrants">Quadrants</TabsTrigger>
                  <TabsTrigger value="subcategories">Sub-Categories</TabsTrigger>
                  <TabsTrigger value="components">Components</TabsTrigger>
                  <TabsTrigger value="microcompetencies">Microcompetencies</TabsTrigger>
                </TabsList>

                <TabsContent value="quadrants" className="space-y-4">
                  {selectedConfig && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Quadrant Weightages
                          </CardTitle>
                          <CardDescription>
                            Configure weightages for {selectedConfig.batches.name} - {selectedConfig.terms.name}
                          </CardDescription>
                        </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <span className="font-medium">Total Weightage:</span>
                      <span className={`font-bold ${isValidWeightage ? 'text-green-600' : 'text-red-600'}`}>
                        {totalWeightage}%
                      </span>
                    </div>
                    {isValidWeightage ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Valid</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Must equal 100%</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4">
                    {quadrants.map((quadrant) => {
                      const weightage = getWeightageForQuadrant(quadrant.id);
                      return (
                        <Card key={quadrant.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{quadrant.name}</CardTitle>
                            <CardDescription>{quadrant.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`weightage-${quadrant.id}`}>
                                  Weightage (%)
                                </Label>
                                <Input
                                  id={`weightage-${quadrant.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={weightage.weightage}
                                  onChange={(e) => handleUpdateWeightage(
                                    quadrant.id, 
                                    'weightage', 
                                    parseInt(e.target.value) || 0
                                  )}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`attendance-${quadrant.id}`}>
                                  Minimum Attendance (%)
                                </Label>
                                <Input
                                  id={`attendance-${quadrant.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={weightage.minimum_attendance}
                                  onChange={(e) => handleUpdateWeightage(
                                    quadrant.id, 
                                    'minimum_attendance', 
                                    parseInt(e.target.value) || 0
                                  )}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      onClick={handleSaveWeightages}
                      disabled={!isValidWeightage || isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Weightages'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Sub-Categories Tab */}
        <TabsContent value="subcategories" className="space-y-4">
          {selectedConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Sub-Category Weightages
                </CardTitle>
                <CardDescription>
                  Configure sub-category weightages for {selectedConfig.batches.name} - {selectedConfig.terms.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {subcategoryWeightages.map((subcategory) => (
                    <Card key={subcategory.subcategory_id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {subcategory.sub_categories?.name || 'Unknown Sub-Category'}
                        </CardTitle>
                        <CardDescription>
                          Quadrant: {subcategory.sub_categories?.quadrants?.name || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`subcategory-weightage-${subcategory.subcategory_id}`}>
                              Weightage (%)
                            </Label>
                            <Input
                              id={`subcategory-weightage-${subcategory.subcategory_id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={subcategory.weightage}
                              onChange={(e) => {
                                const newWeightage = parseFloat(e.target.value) || 0;
                                setSubcategoryWeightages(prev =>
                                  prev.map(sc =>
                                    sc.subcategory_id === subcategory.subcategory_id
                                      ? { ...sc, weightage: newWeightage }
                                      : sc
                                  )
                                );
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`subcategory-active-${subcategory.subcategory_id}`}>
                              Status
                            </Label>
                            <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                              <span className="text-sm">Active</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSaveSubcategoryWeightages}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Sub-Category Weightages'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4">
          {selectedConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Component Weightages
                </CardTitle>
                <CardDescription>
                  Configure component weightages for {selectedConfig.batches.name} - {selectedConfig.terms.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {componentWeightages.map((component) => (
                    <Card key={component.component_id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {component.components?.name || 'Unknown Component'}
                        </CardTitle>
                        <CardDescription>
                          Sub-Category: {component.components?.sub_categories?.name || 'Unknown'} |
                          Quadrant: {component.components?.sub_categories?.quadrants?.name || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`component-weightage-${component.component_id}`}>
                              Weightage (%)
                            </Label>
                            <Input
                              id={`component-weightage-${component.component_id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={component.weightage}
                              onChange={(e) => {
                                const newWeightage = parseFloat(e.target.value) || 0;
                                setComponentWeightages(prev =>
                                  prev.map(c =>
                                    c.component_id === component.component_id
                                      ? { ...c, weightage: newWeightage }
                                      : c
                                  )
                                );
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`component-active-${component.component_id}`}>
                              Status
                            </Label>
                            <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                              <span className="text-sm">Active</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSaveComponentWeightages}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Component Weightages'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Microcompetencies Tab */}
        <TabsContent value="microcompetencies" className="space-y-4">
          {selectedConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Microcompetency Weightages
                </CardTitle>
                <CardDescription>
                  Configure microcompetency weightages for {selectedConfig.batches.name} - {selectedConfig.terms.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {microcompetencyWeightages.map((microcompetency) => (
                    <Card key={microcompetency.microcompetency_id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          {microcompetency.microcompetencies?.name || 'Unknown Microcompetency'}
                        </CardTitle>
                        <CardDescription>
                          Component: {microcompetency.microcompetencies?.components?.name || 'Unknown'} |
                          Sub-Category: {microcompetency.microcompetencies?.components?.sub_categories?.name || 'Unknown'} |
                          Quadrant: {microcompetency.microcompetencies?.components?.sub_categories?.quadrants?.name || 'Unknown'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`microcompetency-weightage-${microcompetency.microcompetency_id}`}>
                              Weightage (%)
                            </Label>
                            <Input
                              id={`microcompetency-weightage-${microcompetency.microcompetency_id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={microcompetency.weightage}
                              onChange={(e) => {
                                const newWeightage = parseFloat(e.target.value) || 0;
                                setMicrocompetencyWeightages(prev =>
                                  prev.map(m =>
                                    m.microcompetency_id === microcompetency.microcompetency_id
                                      ? { ...m, weightage: newWeightage }
                                      : m
                                  )
                                );
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`microcompetency-active-${microcompetency.microcompetency_id}`}>
                              Status
                            </Label>
                            <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                              <span className="text-sm">Active</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSaveMicrocompetencyWeightages}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Microcompetency Weightages'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          {selectedConfig && (
            <MultiLevelWeightageValidation
              configId={selectedConfig.id}
              configName={selectedConfig.config_name}
              onValidationComplete={(isValid) => {
                console.log('Validation complete:', isValid);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchTermWeightageManagement;
