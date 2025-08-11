import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Search,
  Settings,
  Trash2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { interventionAPI, microcompetencyAPI, quadrantAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';

interface Microcompetency {
  id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  components: {
    id: string;
    name: string;
    category: string;
    sub_categories: {
      id: string;
      name: string;
      quadrants: {
        id: string;
        name: string;
      };
    };
  };
}

interface InterventionMicrocompetency {
  id: string;
  weightage: number;
  maxScore: number;
  isActive: boolean;
  createdAt: string;
  microcompetency: Microcompetency;
  quadrant: {
    id: string;
    name: string;
  };
}

interface Intervention {
  id: string;
  name: string;
  status: string;
}

interface Quadrant {
  id: string;
  name: string;
  description: string;
}

const InterventionMicrocompetencies: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [interventionMicrocompetencies, setInterventionMicrocompetencies] = useState<InterventionMicrocompetency[]>([]);
  const [availableMicrocompetencies, setAvailableMicrocompetencies] = useState<Microcompetency[]>([]);
  const [quadrants, setQuadrants] = useState<Quadrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('all');
  const [selectedMicrocompetencies, setSelectedMicrocompetencies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (interventionId) {
      fetchData();
    }
  }, [interventionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        interventionResponse,
        microcompetenciesResponse,
        allMicrocompetenciesResponse,
        quadrantsResponse
      ] = await Promise.all([
        interventionAPI.getInterventionById(interventionId!),
        interventionAPI.getInterventionMicrocompetencies(interventionId!),
        microcompetencyAPI.getAllMicrocompetencies(),
        quadrantAPI.getAllQuadrants(),
      ]);

      setIntervention(interventionResponse.data);
      setInterventionMicrocompetencies(microcompetenciesResponse.data.microcompetencies || []);
      setAvailableMicrocompetencies(allMicrocompetenciesResponse.data || []);
      setQuadrants(quadrantsResponse.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMicrocompetencies = async () => {
    if (selectedMicrocompetencies.length === 0) {
      toast.error('Please select at least one microcompetency');
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert selected microcompetencies to the format expected by the backend
      const microcompetencies = selectedMicrocompetencies.map(mcId => {
        const mc = availableMicrocompetencies.find(m => m.id === mcId);
        return {
          microcompetency_id: mcId,
          weightage: mc?.weightage || 25, // Default weightage
          max_score: mc?.max_score || 10, // Default max score
        };
      });

      await interventionAPI.addMicrocompetenciesToIntervention(interventionId!, {
        microcompetencies,
      });

      toast.success(`${selectedMicrocompetencies.length} microcompetency(ies) added successfully`);
      setShowAddDialog(false);
      setSelectedMicrocompetencies([]);
      setSelectedQuadrant('all');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add microcompetencies');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAvailableMicrocompetencies = availableMicrocompetencies.filter(mc => {
    const matchesSearch = mc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mc.description.toLowerCase().includes(searchTerm.toLowerCase());
    // Use safe quadrant access with fallback
    const quadrantId = mc.components?.sub_categories?.quadrants?.id || mc.quadrant?.id;
    const matchesQuadrant = !selectedQuadrant || selectedQuadrant === 'all' || quadrantId === selectedQuadrant;
    const notAlreadyAdded = !interventionMicrocompetencies.some(imc => imc.microcompetency.id === mc.id);

    return matchesSearch && matchesQuadrant && notAlreadyAdded;
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/interventions')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Intervention Microcompetencies</h1>
          <p className="text-gray-600 mt-1">
            Manage microcompetencies for {intervention?.name}
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Microcompetencies
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Microcompetencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interventionMicrocompetencies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {interventionMicrocompetencies.filter(mc => mc.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Weightage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {interventionMicrocompetencies.reduce((sum, mc) => sum + mc.weightage, 0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quadrants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(interventionMicrocompetencies.map(mc => mc.quadrant.id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Microcompetencies ({interventionMicrocompetencies.length})</CardTitle>
          <CardDescription>
            Microcompetencies currently assigned to this intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interventionMicrocompetencies.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No microcompetencies assigned</h3>
              <p className="text-gray-600 mb-4">
                Start by adding microcompetencies to this intervention.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Microcompetency
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Microcompetency</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Quadrant</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventionMicrocompetencies.map((mc) => (
                  <TableRow key={mc.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mc.microcompetency.name}</div>
                        <div className="text-sm text-gray-600">{mc.microcompetency.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mc.microcompetency.components.name}</div>
                        <div className="text-sm text-gray-600">{mc.microcompetency.components.category}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{mc.quadrant.name}</Badge>
                    </TableCell>
                    <TableCell>{mc.weightage}%</TableCell>
                    <TableCell>{mc.maxScore}</TableCell>
                    <TableCell>
                      <Badge variant={mc.isActive ? 'default' : 'secondary'}>
                        {mc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Microcompetencies Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Microcompetencies</DialogTitle>
            <DialogDescription>
              Select microcompetencies to add to this intervention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Microcompetencies</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="quadrant">Filter by Quadrant</Label>
                <Select value={selectedQuadrant} onValueChange={setSelectedQuadrant}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select quadrant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quadrants</SelectItem>
                    {quadrants.map((quadrant) => (
                      <SelectItem key={quadrant.id} value={quadrant.id}>
                        {quadrant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedMicrocompetencies.length === filteredAvailableMicrocompetencies.length && filteredAvailableMicrocompetencies.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMicrocompetencies(filteredAvailableMicrocompetencies.map(mc => mc.id));
                          } else {
                            setSelectedMicrocompetencies([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Microcompetency</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Quadrant</TableHead>
                    <TableHead>Weightage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailableMicrocompetencies.map((mc) => (
                    <TableRow key={mc.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMicrocompetencies.includes(mc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMicrocompetencies([...selectedMicrocompetencies, mc.id]);
                            } else {
                              setSelectedMicrocompetencies(selectedMicrocompetencies.filter(id => id !== mc.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mc.name}</div>
                          <div className="text-sm text-gray-600">{mc.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mc.components.name}</div>
                          <div className="text-sm text-gray-600">{mc.components.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {mc.components?.sub_categories?.quadrants?.name || mc.quadrant?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{mc.weightage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-gray-600">
              {selectedMicrocompetencies.length} microcompetency(ies) selected
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMicrocompetencies}
              disabled={isSubmitting || selectedMicrocompetencies.length === 0}
            >
              {isSubmitting ? 'Adding...' : `Add ${selectedMicrocompetencies.length} Microcompetency(ies)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterventionMicrocompetencies;