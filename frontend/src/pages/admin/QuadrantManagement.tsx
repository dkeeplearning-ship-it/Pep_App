import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle,
  Target,
  Layers,
  Component,
  Zap,
} from 'lucide-react';
import { quadrantAPI, subCategoryAPI, componentAPI, microcompetencyAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';

interface Microcompetency {
  id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Component {
  id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  category: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  microcompetencies: Microcompetency[];
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  weightage: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  components: Component[];
}

interface Quadrant {
  id: string;
  name: string;
  description: string;
  weightage: number;
  minimum_attendance: number;
  business_rules: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  sub_categories: SubCategory[];
}

const QuadrantManagement: React.FC = () => {
  const { selectedTerm } = useTerm();
  const [quadrants, setQuadrants] = useState<Quadrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{
    type: 'quadrant' | 'sub_category' | 'component' | 'microcompetency';
    id: string;
    data: any;
  } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'quadrant' | 'sub_category' | 'component' | 'microcompetency'>('quadrant');
  const [createParentId, setCreateParentId] = useState<string>('');

  useEffect(() => {
    fetchQuadrants();
  }, [showInactive]);

  const fetchQuadrants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all quadrants with their hierarchies
      const quadrantsResponse = await quadrantAPI.getAllQuadrants();
      const quadrantsWithHierarchy = await Promise.all(
        quadrantsResponse.data.map(async (quadrant) => {
          try {
            const hierarchyResponse = await quadrantAPI.getQuadrantHierarchy(quadrant.id, showInactive);
            return hierarchyResponse.data;
          } catch (err) {
            console.error(`Failed to fetch hierarchy for quadrant ${quadrant.id}:`, err);
            return { ...quadrant, sub_categories: [] };
          }
        })
      );

      setQuadrants(quadrantsWithHierarchy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quadrants');
      toast.error('Failed to load quadrant data');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleEdit = (type: 'quadrant' | 'sub_category' | 'component' | 'microcompetency', id: string, data: any) => {
    setEditingItem({ type, id, data: { ...data } });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const { type, id, data } = editingItem;
      
      switch (type) {
        case 'quadrant':
          await quadrantAPI.updateQuadrant(id, data);
          break;
        case 'sub_category':
          await subCategoryAPI.updateSubCategory(id, data);
          break;
        case 'component':
          await componentAPI.updateComponent(id, data);
          break;
        case 'microcompetency':
          await microcompetencyAPI.updateMicrocompetency(id, data);
          break;
      }

      toast.success(`${type.replace('_', ' ')} updated successfully`);
      setEditingItem(null);
      fetchQuadrants();
    } catch (err) {
      toast.error(`Failed to update ${editingItem.type.replace('_', ' ')}`);
    }
  };

  const handleDelete = async (type: 'quadrant' | 'sub_category' | 'component' | 'microcompetency', id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      switch (type) {
        case 'quadrant':
          await quadrantAPI.deleteQuadrant(id);
          break;
        case 'sub_category':
          await subCategoryAPI.deleteSubCategory(id);
          break;
        case 'component':
          await componentAPI.deleteComponent(id);
          break;
        case 'microcompetency':
          await microcompetencyAPI.deleteMicrocompetency(id);
          break;
      }

      toast.success(`${type.replace('_', ' ')} deleted successfully`);
      fetchQuadrants();
    } catch (err) {
      toast.error(`Failed to delete ${type.replace('_', ' ')}`);
    }
  };

  const openCreateDialog = (type: 'quadrant' | 'sub_category' | 'component' | 'microcompetency', parentId = '') => {
    setCreateType(type);
    setCreateParentId(parentId);
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quadrant':
        return <Target className="h-4 w-4" />;
      case 'sub_category':
        return <Layers className="h-4 w-4" />;
      case 'component':
        return <Component className="h-4 w-4" />;
      case 'microcompetency':
        return <Zap className="h-4 w-4" />;
      default:
        return null;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Quadrant Management</h1>
          <p className="text-muted-foreground">
            Manage the complete PEP hierarchy: Quadrants → Sub-categories → Components → Microcompetencies
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowInactive(!showInactive)}
            className="gap-2"
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button onClick={() => openCreateDialog('quadrant')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Quadrant
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quadrants</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quadrants.length}</div>
            <p className="text-xs text-muted-foreground">
              {quadrants.filter(q => q.is_active).length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-categories</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quadrants.reduce((sum, q) => sum + q.sub_categories.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all quadrants
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Component className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quadrants.reduce((sum, q) => 
                sum + q.sub_categories.reduce((subSum, sc) => subSum + sc.components.length, 0), 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total components
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Microcompetencies</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quadrants.reduce((sum, q) => 
                sum + q.sub_categories.reduce((subSum, sc) => 
                  subSum + sc.components.reduce((compSum, c) => compSum + c.microcompetencies.length, 0), 0
                ), 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total microcompetencies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchical Tree View */}
      <Card>
        <CardHeader>
          <CardTitle>PEP Hierarchy</CardTitle>
          <CardDescription>
            Manage the complete structure with inline editing and hierarchical organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quadrants.map((quadrant) => (
              <div key={quadrant.id} className="border rounded-lg p-4">
                {/* Quadrant Level */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(quadrant.id)}
                      className="p-1"
                    >
                      {expandedItems.has(quadrant.id) ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </Button>
                    {getTypeIcon('quadrant')}
                    <div>
                      <h3 className="font-semibold">{quadrant.name}</h3>
                      <p className="text-sm text-muted-foreground">{quadrant.description}</p>
                    </div>
                    {getStatusBadge(quadrant.is_active)}
                    <Badge variant="outline">Weight: {quadrant.weightage}%</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCreateDialog('sub_category', quadrant.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit('quadrant', quadrant.id, quadrant)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete('quadrant', quadrant.id, quadrant.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Sub-categories */}
                <Collapsible open={expandedItems.has(quadrant.id)}>
                  <CollapsibleContent className="mt-4 ml-6 space-y-3">
                    {quadrant.sub_categories.map((subCategory) => (
                      <div key={subCategory.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(subCategory.id)}
                              className="p-1"
                            >
                              {expandedItems.has(subCategory.id) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                            {getTypeIcon('sub_category')}
                            <div>
                              <h4 className="font-medium">{subCategory.name}</h4>
                              <p className="text-sm text-muted-foreground">{subCategory.description}</p>
                            </div>
                            {getStatusBadge(subCategory.is_active)}
                            <Badge variant="outline">Weight: {subCategory.weightage}%</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCreateDialog('component', subCategory.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit('sub_category', subCategory.id, subCategory)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('sub_category', subCategory.id, subCategory.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Components */}
                        <Collapsible open={expandedItems.has(subCategory.id)}>
                          <CollapsibleContent className="mt-3 ml-6 space-y-2">
                            {subCategory.components.map((component) => (
                              <div key={component.id} className="border-l-2 border-gray-200 pl-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpanded(component.id)}
                                      className="p-1"
                                    >
                                      {expandedItems.has(component.id) ? 
                                        <ChevronDown className="h-4 w-4" /> : 
                                        <ChevronRight className="h-4 w-4" />
                                      }
                                    </Button>
                                    {getTypeIcon('component')}
                                    <div>
                                      <h5 className="font-medium">{component.name}</h5>
                                      <p className="text-sm text-muted-foreground">{component.description}</p>
                                    </div>
                                    {getStatusBadge(component.is_active)}
                                    <Badge variant="outline">Weight: {component.weightage}%</Badge>
                                    <Badge variant="outline">Max: {component.max_score}</Badge>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openCreateDialog('microcompetency', component.id)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit('component', component.id, component)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDelete('component', component.id, component.name)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Microcompetencies */}
                                <Collapsible open={expandedItems.has(component.id)}>
                                  <CollapsibleContent className="mt-2 ml-6 space-y-1">
                                    {component.microcompetencies.map((microcompetency) => (
                                      <div key={microcompetency.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                                        <div className="flex items-center gap-2">
                                          {getTypeIcon('microcompetency')}
                                          <div>
                                            <h6 className="font-medium text-sm">{microcompetency.name}</h6>
                                            <p className="text-xs text-muted-foreground">{microcompetency.description}</p>
                                          </div>
                                          {getStatusBadge(microcompetency.is_active)}
                                          <Badge variant="outline" className="text-xs">Weight: {microcompetency.weightage}%</Badge>
                                          <Badge variant="outline" className="text-xs">Max: {microcompetency.max_score}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit('microcompetency', microcompetency.id, microcompetency)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete('microcompetency', microcompetency.id, microcompetency.name)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {editingItem.type.replace('_', ' ')}</DialogTitle>
              <DialogDescription>
                Update the details for this {editingItem.type.replace('_', ' ')}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingItem.data.name || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, name: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.data.description || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, description: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-weightage">Weightage (%)</Label>
                <Input
                  id="edit-weightage"
                  type="number"
                  min="0"
                  max="100"
                  value={editingItem.data.weightage || 0}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, weightage: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              {(editingItem.type === 'component' || editingItem.type === 'microcompetency') && (
                <div>
                  <Label htmlFor="edit-max-score">Max Score</Label>
                  <Input
                    id="edit-max-score"
                    type="number"
                    min="1"
                    value={editingItem.data.max_score || 10}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      data: { ...editingItem.data, max_score: parseFloat(e.target.value) || 10 }
                    })}
                  />
                </div>
              )}
              {editingItem.type === 'component' && (
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editingItem.data.category || 'Professional'}
                    onValueChange={(value) => setEditingItem({
                      ...editingItem,
                      data: { ...editingItem.data, category: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Conduct">Conduct</SelectItem>
                      <SelectItem value="Mental">Mental</SelectItem>
                      <SelectItem value="Physical">Physical</SelectItem>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="SHL">SHL</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="edit-display-order">Display Order</Label>
                <Input
                  id="edit-display-order"
                  type="number"
                  min="0"
                  value={editingItem.data.display_order || 0}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, display_order: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <CreateItemDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        type={createType}
        parentId={createParentId}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          fetchQuadrants();
        }}
        quadrants={quadrants}
      />
    </div>
  );
};

// Create Item Dialog Component
interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'quadrant' | 'sub_category' | 'component' | 'microcompetency';
  parentId: string;
  onSuccess: () => void;
  quadrants: Quadrant[];
}

const CreateItemDialog: React.FC<CreateItemDialogProps> = ({
  open,
  onOpenChange,
  type,
  parentId,
  onSuccess,
  quadrants
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weightage: 0,
    max_score: 10,
    category: 'Professional',
    display_order: 0,
    quadrant_id: '',
    sub_category_id: '',
    component_id: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form and set parent IDs
      setFormData({
        name: '',
        description: '',
        weightage: 0,
        max_score: 10,
        category: 'Professional',
        display_order: 0,
        quadrant_id: type === 'sub_category' ? parentId : '',
        sub_category_id: type === 'component' ? parentId : '',
        component_id: type === 'microcompetency' ? parentId : ''
      });
    }
  }, [open, type, parentId]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setLoading(true);

      switch (type) {
        case 'quadrant':
          await quadrantAPI.createQuadrant({
            name: formData.name,
            description: formData.description,
            weightage: formData.weightage,
            display_order: formData.display_order
          });
          break;
        case 'sub_category':
          await subCategoryAPI.createSubCategory({
            quadrant_id: formData.quadrant_id,
            name: formData.name,
            description: formData.description,
            weightage: formData.weightage,
            display_order: formData.display_order
          });
          break;
        case 'component':
          await componentAPI.createComponent({
            sub_category_id: formData.sub_category_id,
            name: formData.name,
            description: formData.description,
            weightage: formData.weightage,
            max_score: formData.max_score,
            category: formData.category,
            display_order: formData.display_order
          });
          break;
        case 'microcompetency':
          await microcompetencyAPI.createMicrocompetency({
            component_id: formData.component_id,
            name: formData.name,
            description: formData.description,
            weightage: formData.weightage,
            max_score: formData.max_score,
            display_order: formData.display_order
          });
          break;
      }

      toast.success(`${type.replace('_', ' ')} created successfully`);
      onSuccess();
    } catch (err) {
      toast.error(`Failed to create ${type.replace('_', ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create {type.replace('_', ' ')}</DialogTitle>
          <DialogDescription>
            Add a new {type.replace('_', ' ')} to the PEP hierarchy.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="create-name">Name *</Label>
            <Input
              id="create-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${type.replace('_', ' ')} name`}
            />
          </div>
          <div>
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={`Enter ${type.replace('_', ' ')} description`}
            />
          </div>
          <div>
            <Label htmlFor="create-weightage">Weightage (%)</Label>
            <Input
              id="create-weightage"
              type="number"
              min="0"
              max="100"
              value={formData.weightage}
              onChange={(e) => setFormData({ ...formData, weightage: parseFloat(e.target.value) || 0 })}
            />
          </div>
          {(type === 'component' || type === 'microcompetency') && (
            <div>
              <Label htmlFor="create-max-score">Max Score</Label>
              <Input
                id="create-max-score"
                type="number"
                min="1"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: parseFloat(e.target.value) || 10 })}
              />
            </div>
          )}
          {type === 'component' && (
            <div>
              <Label htmlFor="create-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Conduct">Conduct</SelectItem>
                  <SelectItem value="Mental">Mental</SelectItem>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="SHL">SHL</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="create-display-order">Display Order</Label>
            <Input
              id="create-display-order"
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuadrantManagement;
