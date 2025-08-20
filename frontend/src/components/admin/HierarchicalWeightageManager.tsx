import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Target,
  BarChart3,
  Settings,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  WeightageConfiguration,
  QuadrantWeightage,
  SubCategoryWeightage,
  ComponentWeightage,
  MicrocompetencyWeightage
} from '@/services/batchTermWeightageService';
import { batchTermWeightageService } from '@/services/batchTermWeightageService';

interface HierarchyStats {
  quadrants: number;
  subcategories: number;
  components: number;
  microcompetencies: number;
}

interface HierarchicalWeightageManagerProps {
  selectedConfig: WeightageConfiguration;
  onConfigUpdate?: () => void;
}

const HierarchicalWeightageManager: React.FC<HierarchicalWeightageManagerProps> = ({
  selectedConfig,
  onConfigUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingWeightage, setEditingWeightage] = useState<string | null>(null);
  const [tempWeightage, setTempWeightage] = useState<number>(0);

  // Group edit mode: edit all peer weightages that must sum to 100%
  const [groupEdit, setGroupEdit] = useState<{
    level: 'quadrant' | 'subcategory' | 'component' | 'microcompetency' | null;
    parentId?: string;
  }>({ level: null });
  const [groupWeights, setGroupWeights] = useState<Record<string, number>>({});
  const [groupItems, setGroupItems] = useState<Array<{ id: string; name: string }>>([]);
  const groupTotal = Object.values(groupWeights).reduce((sum, w) => sum + (Number.isFinite(w) ? w : 0), 0);

  // Add/Remove dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState<'quadrant' | 'subcategory' | 'component' | 'microcompetency'>('quadrant');
  const [addDialogParentId, setAddDialogParentId] = useState<string>('');

  // Available entities for adding
  const [availableQuadrants, setAvailableQuadrants] = useState<any[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
  const [availableMicrocompetencies, setAvailableMicrocompetencies] = useState<any[]>([]);
  
  // Hierarchy data
  const [quadrantWeightages, setQuadrantWeightages] = useState<QuadrantWeightage[]>([]);
  const [subcategoryWeightages, setSubcategoryWeightages] = useState<SubCategoryWeightage[]>([]);
  const [componentWeightages, setComponentWeightages] = useState<ComponentWeightage[]>([]);
  const [microcompetencyWeightages, setMicrocompetencyWeightages] = useState<MicrocompetencyWeightage[]>([]);
  
  // Stats
  const [stats, setStats] = useState<HierarchyStats>({
    quadrants: 0,
    subcategories: 0,
    components: 0,
    microcompetencies: 0
  });

  useEffect(() => {
    if (selectedConfig) {
      loadHierarchyData();
    }
  }, [selectedConfig]);

  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      // Load all hierarchy levels
      const [quadrantsData, subcategoriesData, componentsData, microcompetenciesData] = await Promise.all([
        batchTermWeightageService.getConfigurationDetails(selectedConfig.id),
        batchTermWeightageService.getSubcategoryWeightages(selectedConfig.id),
        batchTermWeightageService.getComponentWeightages(selectedConfig.id),
        batchTermWeightageService.getMicrocompetencyWeightages(selectedConfig.id)
      ]);

      console.log('Loaded hierarchy data:', {
        quadrants: quadrantsData,
        subcategories: subcategoriesData,
        components: componentsData,
        microcompetencies: microcompetenciesData
      });

      setQuadrantWeightages(quadrantsData.quadrant_weightages || []);
      setSubcategoryWeightages(subcategoriesData.subcategoryWeightages || []);
      setComponentWeightages(componentsData.componentWeightages || []);
      setMicrocompetencyWeightages(microcompetenciesData.microcompetencyWeightages || []);

      // Update stats
      setStats({
        quadrants: quadrantsData.quadrant_weightages?.length || 0,
        subcategories: subcategoriesData.subcategoryWeightages?.length || 0,
        components: componentsData.componentWeightages?.length || 0,
        microcompetencies: microcompetenciesData.microcompetencyWeightages?.length || 0
      });

    } catch (error) {
      console.error('Error loading hierarchy data:', error);
      toast.error(`Failed to load hierarchy data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const startEditingWeightage = (itemId: string, currentWeightage: number) => {
    setEditingWeightage(itemId);
    setTempWeightage(currentWeightage);
  };

  const enterGroupEdit = (
    level: 'quadrant' | 'subcategory' | 'component' | 'microcompetency',
    parentId?: string
  ) => {
    let items: Array<{ id: string; name: string; weight: number }> = [];
    switch (level) {
      case 'quadrant':
        items = quadrantWeightages.map(q => ({
          id: q.quadrant_id,
          name: q.quadrants?.name || q.quadrant_id,
          weight: q.weightage || 0
        }));
        break;
      case 'subcategory':
        items = subcategoryWeightages
          .filter(s => s.sub_categories?.quadrant_id === parentId)
          .map(s => ({
            id: s.subcategory_id,
            name: s.sub_categories?.name || s.subcategory_id,
            weight: s.weightage || 0
          }));
        break;
      case 'component':
        items = componentWeightages
          .filter(c => c.components?.sub_category_id === parentId)
          .map(c => ({
            id: c.component_id,
            name: c.components?.name || c.component_id,
            weight: c.weightage || 0
          }));
        break;
      case 'microcompetency':
        items = microcompetencyWeightages
          .filter(m => m.microcompetencies?.component_id === parentId)
          .map(m => ({
            id: m.microcompetency_id,
            name: m.microcompetencies?.name || m.microcompetency_id,
            weight: m.weightage || 0
          }));
        break;
    }

    setGroupEdit({ level, parentId });
    setGroupItems(items.map(i => ({ id: i.id, name: i.name })));
    setGroupWeights(Object.fromEntries(items.map(i => [i.id, i.weight])));
    setEditingWeightage(null);
  };

  const cancelGroupEdit = () => {
    setGroupEdit({ level: null });
    setGroupItems([]);
    setGroupWeights({});
  };

  const saveGroupEdit = async () => {
    if (!groupEdit.level) return;
    setSaving(true);
    try {
      if (Math.round(groupTotal) !== 100) {
        toast.error(`Total weightage must equal 100%. Current total: ${groupTotal}%`);
        setSaving(false);
        return;
      }
      switch (groupEdit.level) {
        case 'quadrant': {
          const updated = quadrantWeightages.map(q => ({
            ...q,
            weightage: Number(groupWeights[q.quadrant_id] ?? q.weightage)
          }));
          await batchTermWeightageService.updateConfiguration(selectedConfig.id, {
            quadrant_weightages: updated
          });
          setQuadrantWeightages(updated);
          break;
        }
        case 'subcategory': {
          const updated = subcategoryWeightages.map(s =>
            s.sub_categories?.quadrant_id === groupEdit.parentId
              ? { ...s, weightage: Number(groupWeights[s.subcategory_id] ?? s.weightage) }
              : s
          );
          await batchTermWeightageService.updateSubcategoryWeightages(selectedConfig.id, updated);
          setSubcategoryWeightages(updated);
          break;
        }
        case 'component': {
          const updated = componentWeightages.map(c =>
            c.components?.sub_category_id === groupEdit.parentId
              ? { ...c, weightage: Number(groupWeights[c.component_id] ?? c.weightage) }
              : c
          );
          await batchTermWeightageService.updateComponentWeightages(selectedConfig.id, updated);
          setComponentWeightages(updated);
          break;
        }
        case 'microcompetency': {
          const updated = microcompetencyWeightages.map(m =>
            m.microcompetencies?.component_id === groupEdit.parentId
              ? { ...m, weightage: Number(groupWeights[m.microcompetency_id] ?? m.weightage) }
              : m
          );
          await batchTermWeightageService.updateMicrocompetencyWeightages(selectedConfig.id, updated);
          setMicrocompetencyWeightages(updated);
          break;
        }
      }

      toast.success('Weightages saved successfully');
      cancelGroupEdit();
      if (onConfigUpdate) onConfigUpdate();
    } catch (error) {
      console.error('Error saving group weightages:', error);
      toast.error(`Failed to save weightages: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveWeightage = async (itemId: string, level: 'quadrant' | 'subcategory' | 'component' | 'microcompetency') => {
    setSaving(true);
    try {
      let updatedWeightages;

      // Update the appropriate weightage based on level and call API
      switch (level) {
        case 'quadrant':
          updatedWeightages = quadrantWeightages.map(q =>
            q.quadrant_id === itemId ? { ...q, weightage: tempWeightage } : q
          );

          // Call API to save quadrant weightages
          await batchTermWeightageService.updateConfiguration(selectedConfig.id, {
            quadrant_weightages: updatedWeightages
          });

          setQuadrantWeightages(updatedWeightages);
          break;

        case 'subcategory':
          updatedWeightages = subcategoryWeightages.map(s =>
            s.subcategory_id === itemId ? { ...s, weightage: tempWeightage } : s
          );

          // Call API to save subcategory weightages
          await batchTermWeightageService.updateSubcategoryWeightages(selectedConfig.id, updatedWeightages);

          setSubcategoryWeightages(updatedWeightages);
          break;

        case 'component':
          updatedWeightages = componentWeightages.map(c =>
            c.component_id === itemId ? { ...c, weightage: tempWeightage } : c
          );

          // Call API to save component weightages
          await batchTermWeightageService.updateComponentWeightages(selectedConfig.id, updatedWeightages);

          setComponentWeightages(updatedWeightages);
          break;

        case 'microcompetency':
          updatedWeightages = microcompetencyWeightages.map(m =>
            m.microcompetency_id === itemId ? { ...m, weightage: tempWeightage } : m
          );

          // Call API to save microcompetency weightages
          await batchTermWeightageService.updateMicrocompetencyWeightages(selectedConfig.id, updatedWeightages);

          setMicrocompetencyWeightages(updatedWeightages);
          break;
      }

      setEditingWeightage(null);
      toast.success(`${level.charAt(0).toUpperCase() + level.slice(1)} weightage updated successfully`);

      if (onConfigUpdate) {
        onConfigUpdate();
      }

    } catch (error) {
      console.error('Error saving weightage:', error);
      toast.error(`Failed to save ${level} weightage: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditingWeightage(null);
    setTempWeightage(0);
  };

  const loadAvailableEntities = async () => {
    try {
      const [quadrants, subcategories, components, microcompetencies] = await Promise.all([
        batchTermWeightageService.getQuadrants(),
        batchTermWeightageService.getSubCategories(),
        batchTermWeightageService.getComponents(),
        batchTermWeightageService.getMicrocompetencies()
      ]);

      setAvailableQuadrants(quadrants);
      setAvailableSubcategories(subcategories);
      setAvailableComponents(components);
      setAvailableMicrocompetencies(microcompetencies);
    } catch (error) {
      console.error('Error loading available entities:', error);
      toast.error('Failed to load available entities');
    }
  };

  const handleAddEntity = (type: 'quadrant' | 'subcategory' | 'component' | 'microcompetency', parentId?: string) => {
    setAddDialogType(type);
    setAddDialogParentId(parentId || '');
    setShowAddDialog(true);
    loadAvailableEntities();
  };

  const handleRemoveEntity = async (type: 'quadrant' | 'subcategory' | 'component' | 'microcompetency', entityId: string) => {
    if (!confirm(`Are you sure you want to remove this ${type}?`)) {
      return;
    }

    try {
      switch (type) {
        case 'quadrant':
          await batchTermWeightageService.removeQuadrantWeightage(selectedConfig.id, entityId);
          break;
        case 'subcategory':
          await batchTermWeightageService.removeSubcategoryWeightage(selectedConfig.id, entityId);
          break;
        case 'component':
          await batchTermWeightageService.removeComponentWeightage(selectedConfig.id, entityId);
          break;
        case 'microcompetency':
          await batchTermWeightageService.removeMicrocompetencyWeightage(selectedConfig.id, entityId);
          break;
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`);
      loadHierarchyData();

      if (onConfigUpdate) {
        onConfigUpdate();
      }
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      toast.error(`Failed to remove ${type}: ${error.message}`);
    }
  };

  const handleAddSubmit = async (entityId: string, weightage: number) => {
    try {
      switch (addDialogType) {
        case 'quadrant':
          await batchTermWeightageService.addQuadrantWeightage(selectedConfig.id, entityId, weightage);
          break;
        case 'subcategory':
          await batchTermWeightageService.addSubcategoryWeightage(selectedConfig.id, entityId, weightage);
          break;
        case 'component':
          await batchTermWeightageService.addComponentWeightage(selectedConfig.id, entityId, weightage);
          break;
        case 'microcompetency':
          await batchTermWeightageService.addMicrocompetencyWeightage(selectedConfig.id, entityId, weightage);
          break;
      }

      toast.success(`${addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1)} added successfully`);
      setShowAddDialog(false);
      loadHierarchyData();

      if (onConfigUpdate) {
        onConfigUpdate();
      }
    } catch (error) {
      console.error(`Error adding ${addDialogType}:`, error);
      toast.error(`Failed to add ${addDialogType}: ${error.message}`);
    }
  };

  const getWeightageColor = (weightage: number) => {
    if (weightage === 0) return 'text-gray-500';
    if (weightage < 10) return 'text-red-600';
    if (weightage < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const renderWeightageInput = (
    itemId: string,
    currentWeightage: number,
    level: string,
    onEdit?: () => void
  ) => {
    if (editingWeightage === itemId) {
      return (
        <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-2">
          <Label className="text-xs text-gray-600 whitespace-nowrap">Weight:</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={tempWeightage}
            onChange={(e) => setTempWeightage(parseFloat(e.target.value) || 0)}
            className="w-20 h-8 text-sm"
            autoFocus
          />
          <span className="text-xs text-gray-500">%</span>
          <Button
            size="sm"
            onClick={() => saveWeightage(itemId, level as any)}
            disabled={saving}
            className="h-8 px-2 bg-green-600 hover:bg-green-700"
          >
            {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={cancelEditing}
            className="h-8 px-2"
          >
            ×
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className={`font-semibold text-lg ${getWeightageColor(currentWeightage)}`}>
            {currentWeightage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Weight</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (onEdit ? onEdit() : startEditingWeightage(itemId, currentWeightage))}
          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const renderQuadrantItem = (quadrant: QuadrantWeightage) => {
    const isExpanded = expandedItems.has(quadrant.quadrant_id);
    const quadrantSubcategories = subcategoryWeightages.filter(
      sc => sc.sub_categories?.quadrant_id === quadrant.quadrant_id
    );

    // Get quadrant name from the quadrant object or use the ID
    const quadrantName = quadrant.quadrants?.name || quadrant.quadrant_id;

    return (
      <div key={quadrant.quadrant_id} className="group border border-gray-200 rounded-lg bg-white hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(quadrant.quadrant_id)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {quadrantName.charAt(0).toUpperCase() + quadrantName.slice(1)}
                </h3>
                <p className="text-sm text-gray-500">
                  {quadrant.quadrants?.description || 'SHL Competencies and Professional Readiness'}
                </p>
              </div>
            </div>

            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {renderWeightageInput(
              quadrant.quadrant_id,
              quadrant.weightage,
              'quadrant',
              () => enterGroupEdit('quadrant')
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => handleAddEntity('subcategory', quadrant.quadrant_id)}
                title="Add Sub-category"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-50">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleRemoveEntity('quadrant', quadrant.quadrant_id)}
                title="Remove Quadrant"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-4">
            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <BarChart3 className="h-4 w-4" />
                <span>Sub-categories and components within this quadrant</span>
              </div>
              {quadrantSubcategories.length > 0 ? (
                quadrantSubcategories.map(subcategory => renderSubcategoryItem(subcategory))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sub-categories found for this quadrant</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubcategoryItem = (subcategory: SubCategoryWeightage) => {
    const isExpanded = expandedItems.has(subcategory.subcategory_id);
    const subcategoryComponents = componentWeightages.filter(
      c => c.components?.sub_category_id === subcategory.subcategory_id
    );

    return (
      <div key={subcategory.subcategory_id} className="group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all duration-200 ml-4">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(subcategory.subcategory_id)}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">
                  {subcategory.sub_categories?.name || 'Unknown Sub-category'}
                </h4>
                <p className="text-xs text-gray-500">
                  {subcategory.sub_categories?.description || 'Physical, Mental, and Social Wellness'}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {renderWeightageInput(
              subcategory.subcategory_id,
              subcategory.weightage,
              'subcategory',
              () => enterGroupEdit('subcategory', subcategory.sub_categories?.quadrant_id)
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                onClick={() => handleAddEntity('component', subcategory.subcategory_id)}
                title="Add Component"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleRemoveEntity('subcategory', subcategory.subcategory_id)}
                title="Remove Sub-category"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/30 p-3">
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <Settings className="h-3 w-3" />
                <span>Components within this sub-category</span>
              </div>
              {subcategoryComponents.length > 0 ? (
                subcategoryComponents.map(component => renderComponentItem(component))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Settings className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No components found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComponentItem = (component: ComponentWeightage) => {
    const isExpanded = expandedItems.has(component.component_id);
    const componentMicrocompetencies = microcompetencyWeightages.filter(
      m => m.microcompetencies?.component_id === component.component_id
    );

    return (
      <div key={component.component_id} className="group border border-gray-200 rounded-md bg-white hover:shadow-sm transition-all duration-200 ml-4">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(component.component_id)}
              className="h-5 w-5 p-0 hover:bg-gray-100"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                <Settings className="h-3 w-3 text-purple-600" />
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-900">
                  {component.components?.name || 'Unknown Component'}
                </h5>
                <p className="text-xs text-gray-500">
                  {component.components?.description || 'Professional Conduct, Interpersonal Skills, and Personal Development'}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {renderWeightageInput(
              component.component_id,
              component.weightage,
              'component',
              () => enterGroupEdit('component', component.components?.sub_category_id)
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-purple-50 hover:text-purple-600"
                onClick={() => handleAddEntity('microcompetency', component.component_id)}
                title="Add Microcompetency"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleRemoveEntity('component', component.component_id)}
                title="Remove Component"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/20 p-2">
            <div className="ml-6 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Microcompetencies within this component</span>
              </div>
              {componentMicrocompetencies.length > 0 ? (
                componentMicrocompetencies.map(micro => renderMicrocompetencyItem(micro))
              ) : (
                <div className="text-center py-3 text-gray-500">
                  <div className="w-4 h-4 bg-orange-500 rounded-full mx-auto mb-1 opacity-50"></div>
                  <p className="text-xs">No microcompetencies found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMicrocompetencyItem = (microcompetency: MicrocompetencyWeightage) => {
    return (
      <div key={microcompetency.microcompetency_id} className="group border border-gray-200 rounded-md bg-white hover:shadow-sm transition-all duration-200 ml-4">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <div>
              <h6 className="text-xs font-medium text-gray-900">
                {microcompetency.microcompetencies?.name || 'Unknown Microcompetency'}
              </h6>
              <p className="text-xs text-gray-500">
                {microcompetency.microcompetencies?.description || 'Attendance, Code of Conduct, and Academic Discipline'}
              </p>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {renderWeightageInput(
              microcompetency.microcompetency_id,
              microcompetency.weightage,
              'microcompetency',
              () => enterGroupEdit('microcompetency', microcompetency.microcompetencies?.component_id)
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-orange-50 hover:text-orange-600"
                onClick={() => startEditingWeightage(microcompetency.microcompetency_id, microcompetency.weightage)}
                title="Edit Weightage"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleRemoveEntity('microcompetency', microcompetency.microcompetency_id)}
                title="Remove Microcompetency"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading hierarchy data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hierarchical Weightage Management</h1>
          <p className="text-gray-600 mt-1">
            Manage the complete PEP hierarchy: Quadrants → Sub-categories → Components → Microcompetencies
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedConfig.config_name}
            </Badge>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-600">
              {selectedConfig.batches?.name} - {selectedConfig.terms?.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowInactive(!showInactive)}
            className="border-gray-300 hover:bg-gray-50"
          >
            {showInactive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button
            onClick={loadHierarchyData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleAddEntity('quadrant')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Quadrant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quadrants</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.quadrants}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.quadrants} active</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sub-categories</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.subcategories}</p>
              <p className="text-sm text-gray-500 mt-1">Across all quadrants</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Components</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.components}</p>
              <p className="text-sm text-gray-500 mt-1">Total components</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Microcompetencies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.microcompetencies}</p>
              <p className="text-sm text-gray-500 mt-1">Total microcompetencies</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* PEP Hierarchy */}
      <div className="bg-white rounded-lg border border-gray-200">
        {groupEdit.level && (
          <div className="border-b border-gray-200 p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">
                  Group edit: {groupEdit.level.charAt(0).toUpperCase() + groupEdit.level.slice(1)}
                </h3>
                <p className={`text-sm ${Math.round(groupTotal) === 100 ? 'text-green-700' : 'text-red-700'}`}>
                  Total: {groupTotal}% {Math.round(groupTotal) === 100 ? '(OK)' : '(Must equal 100%)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelGroupEdit} className="border-blue-300">
                  Cancel
                </Button>
                <Button onClick={saveGroupEdit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'Saving...' : 'Save All'}
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {groupItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white border border-blue-200 rounded-md p-2">
                  <div className="text-sm font-medium text-gray-700 mr-2 truncate" title={item.name}>{item.name}</div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-24 h-8 text-sm"
                      value={groupWeights[item.id] ?? 0}
                      onChange={(e) =>
                        setGroupWeights(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))
                      }
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">PEP Hierarchy</h2>
          <p className="text-gray-600 mt-1">
            Manage the complete structure with inline editing and hierarchical organization
          </p>
        </div>
        <div className="p-6 space-y-4">
          {quadrantWeightages.length > 0 ? (
            quadrantWeightages.map(quadrant => renderQuadrantItem(quadrant))
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Quadrants Found</h3>
              <p className="text-gray-600 mb-4">
                Get started by adding your first quadrant to the hierarchy.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add First Quadrant
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Entity Dialog */}
      <AddEntityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        type={addDialogType}
        parentId={addDialogParentId}
        availableEntities={
          addDialogType === 'quadrant' ? availableQuadrants :
          addDialogType === 'subcategory' ? availableSubcategories :
          addDialogType === 'component' ? availableComponents :
          availableMicrocompetencies
        }
        onSubmit={handleAddSubmit}
      />
    </div>
  );
};

// Add Entity Dialog Component
interface AddEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'quadrant' | 'subcategory' | 'component' | 'microcompetency';
  parentId: string;
  availableEntities: any[];
  onSubmit: (entityId: string, weightage: number) => void;
}

const AddEntityDialog: React.FC<AddEntityDialogProps> = ({
  open,
  onOpenChange,
  type,
  parentId,
  availableEntities,
  onSubmit
}) => {
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [weightage, setWeightage] = useState(0);

  const handleSubmit = () => {
    if (!selectedEntityId || weightage <= 0) {
      return;
    }
    onSubmit(selectedEntityId, weightage);
    setSelectedEntityId('');
    setWeightage(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
          <DialogDescription>
            Select a {type} to add to the configuration and set its weightage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="entity-select">Select {type}</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger>
                <SelectValue placeholder={`Choose a ${type}...`} />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="weightage-input">Weightage (%)</Label>
            <Input
              id="weightage-input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={weightage}
              onChange={(e) => setWeightage(parseFloat(e.target.value) || 0)}
              placeholder="Enter weightage percentage"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEntityId || weightage <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Add {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HierarchicalWeightageManager;
