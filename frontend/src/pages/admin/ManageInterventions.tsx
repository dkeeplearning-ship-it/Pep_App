import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Users,
  Calendar,
  Target,
  Settings,
  BookOpen,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  BarChart3,
  FileText,
  ChevronRight,
  Copy,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { interventionAPI, microcompetencyAPI, adminAPI, quadrantAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';
import { MultiStepInterventionForm } from '@/components/admin/MultiStepInterventionForm';
import { StudentSelectionDialog } from '@/components/admin/StudentSelectionDialog';
import { workflowValidationService, type WorkflowValidationResult, type InterventionWorkflowState } from '@/services/workflowValidationService';
import {
  Intervention,
  CreateInterventionForm,
  InterventionMicrocompetency,
  Microcompetency
} from '@/types/intervention';
import { ErrorHandler, FormErrors } from '@/utils/errorHandling';

const ManageInterventions: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalInterventions, setTotalInterventions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInterventionForm>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    maxStudents: 50,
    objectives: [],
    prerequisites: [],
  });

  // Enhanced form state for multi-step creation
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMicrocompetencies, setSelectedMicrocompetencies] = useState<Array<{
    id: string;
    name: string;
    description: string;
    weightage: number;
    maxScore: number;
    assignedTeacher: string | null;
    quadrant: { id: string; name: string; };
  }>>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [availableMicrocompetencies, setAvailableMicrocompetencies] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [showStudentSelectionDialog, setShowStudentSelectionDialog] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetchInterventions();
  }, [statusFilter, currentPage, pageSize, selectedTerm]); // Reload when term changes

  // Fetch data for enhanced form
  const fetchFormData = async () => {
    try {
      const [microcompetenciesResponse, teachersResponse, studentsResponse] = await Promise.all([
        microcompetencyAPI.getAllMicrocompetencies({ page: 1, limit: 1000, includeInactive: false }),
        adminAPI.getAllTeachers({ page: 1, limit: 1000 }),
        adminAPI.getAllStudents({ page: 1, limit: 1000 })
      ]);

      // Transform microcompetencies to include quadrant information
      const allMicrocompetencies = microcompetenciesResponse.data.map(mc => ({
        id: mc.id,
        name: mc.name,
        description: mc.description,
        max_score: mc.max_score,
        weightage: mc.weightage,
        quadrant: {
          id: mc.components.sub_categories.quadrants.id,
          name: mc.components.sub_categories.quadrants.name
        }
      }));

      setAvailableMicrocompetencies(allMicrocompetencies);
      setAvailableTeachers(teachersResponse.data.teachers);
      setAvailableStudents(studentsResponse.data.students);
    } catch (error) {
      console.error('Failed to fetch form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllInterventions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
        page: currentPage,
        limit: pageSize,
        termId: selectedTerm?.id, // Filter by selected term
      });
      const interventionsData = response.data?.interventions || [];
      const pagination = response.data?.pagination || {};

      setInterventions(interventionsData);
      setTotalInterventions(pagination.total || 0);
      setTotalPages(pagination.totalPages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch interventions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    fetchInterventions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <PlayCircle className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'Draft':
        return <Clock className="h-4 w-4" />;
      case 'Cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStatusChange = async (interventionId: string, newStatus: string) => {
    try {
      await interventionAPI.updateInterventionStatus(interventionId, newStatus);
      toast.success('Intervention status updated successfully');
      fetchInterventions(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const validateForm = (form: CreateInterventionForm): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Intervention name is required';
    } else if (form.name.length < 3) {
      errors.name = 'Intervention name must be at least 3 characters';
    } else if (form.name.length > 100) {
      errors.name = 'Intervention name must be less than 100 characters';
    }

    if (!form.description.trim()) {
      errors.description = 'Description is required';
    } else if (form.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (form.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    if (!form.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!form.endDate) {
      errors.endDate = 'End date is required';
    }

    if (form.startDate && form.endDate) {
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.startDate = 'Start date cannot be in the past';
      }

      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }

      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays < 1) {
        errors.endDate = 'Intervention must be at least 1 day long';
      }
      if (diffDays > 365) {
        errors.endDate = 'Intervention cannot be longer than 1 year';
      }
    }

    if (form.maxStudents < 1) {
      errors.maxStudents = 'Maximum students must be at least 1';
    } else if (form.maxStudents > 1000) {
      errors.maxStudents = 'Maximum students cannot exceed 1000';
    }

    if (form.objectives.length === 0) {
      errors.objectives = 'At least one learning objective is required';
    } else {
      const emptyObjectives = form.objectives.filter(obj => !obj.trim());
      if (emptyObjectives.length > 0) {
        errors.objectives = 'All objectives must have content';
      }
    }

    return errors;
  };

  const handleCreateIntervention = async () => {
    const errors = validateForm(createForm);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Create the intervention
      const interventionResponse = await interventionAPI.createIntervention(createForm);
      const interventionId = interventionResponse.data.id;

      // Step 2: Add microcompetencies if any selected
      if (selectedMicrocompetencies.length > 0) {
        const microcompetencyData = selectedMicrocompetencies.map(mc => ({
          microcompetency_id: mc.id,
          weightage: mc.weightage,
          max_score: mc.maxScore
        }));

        console.log('Adding microcompetencies to intervention:', { interventionId, microcompetencies: microcompetencyData });

        try {
          const addMicrocompetenciesResponse = await interventionAPI.addMicrocompetenciesToIntervention(interventionId, {
            microcompetencies: microcompetencyData
          });
          console.log('✅ Microcompetencies added successfully:', addMicrocompetenciesResponse);
        } catch (addMcError) {
          console.error('❌ Failed to add microcompetencies:', addMcError);
          throw new Error(`Failed to add microcompetencies: ${addMcError instanceof Error ? addMcError.message : 'Unknown error'}`);
        }

        // Small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 3: Assign teachers to microcompetencies (single API call for all assignments)
        const teacherAssignments = selectedMicrocompetencies
          .filter(mc => mc.assignedTeacher)
          .map(mc => ({
            teacher_id: mc.assignedTeacher!,
            microcompetency_id: mc.id,
            can_score: true,
            can_create_tasks: true
          }));

        if (teacherAssignments.length > 0) {
          console.log('Assigning teachers to microcompetencies:', { interventionId, assignments: teacherAssignments });

          try {
            const assignTeachersResponse = await interventionAPI.assignTeachersToMicrocompetencies(interventionId, {
              assignments: teacherAssignments
            });
            console.log('✅ Teachers assigned successfully:', assignTeachersResponse);
          } catch (assignError) {
            console.error('❌ Failed to assign teachers:', assignError);
            throw new Error(`Failed to assign teachers to microcompetencies: ${assignError instanceof Error ? assignError.message : 'Unknown error'}`);
          }
        }
      }

      // Step 4: Enroll students if any selected with validation
      if (selectedStudents.length > 0) {
        try {
          await interventionAPI.enrollStudents(interventionId, selectedStudents, 'Mandatory');
          console.log(`✅ ${selectedStudents.length} students enrolled successfully`);
        } catch (enrollError) {
          console.error('❌ Failed to enroll students:', enrollError);
          // Continue with intervention creation but warn about enrollment failure
          toast.warning('Students could not be enrolled automatically. Please enroll them manually.');
        }
      } else {
        console.warn('⚠️ No students selected for enrollment - intervention will have no students');
      }

      // Step 5: Update intervention status to Active with validation
      try {
        await interventionAPI.updateInterventionStatus(interventionId, 'Active');
        console.log('✅ Intervention status updated to Active');
      } catch (statusError) {
        console.error('❌ Failed to update intervention status:', statusError);
        toast.warning('Intervention created but status could not be updated to Active. Please update manually.');
      }

      toast.success('Intervention created successfully with all assignments!');
      setShowCreateDialog(false);
      resetCreateForm();
      fetchInterventions();

      // Navigate to the new intervention's detail page
      navigate(`/admin/interventions/${interventionId}/microcompetencies`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create intervention';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      maxStudents: 50,
      objectives: [],
      prerequisites: [],
    });
    setFormErrors({});
    setCurrentStep(1);
    setSelectedMicrocompetencies([]);
    setSelectedStudents([]);
  };

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 1) {
        fetchFormData(); // Fetch data when moving to step 2
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    if (step >= 2 && availableMicrocompetencies.length === 0) {
      fetchFormData();
    }
  };

  // Microcompetency selection functions
  const addMicrocompetency = (microcompetency: any) => {
    const newMc = {
      id: microcompetency.id,
      name: microcompetency.name,
      description: microcompetency.description,
      weightage: 10, // Default weightage
      maxScore: microcompetency.max_score || 100,
      assignedTeacher: null,
      quadrant: microcompetency.quadrant
    };
    setSelectedMicrocompetencies(prev => [...prev, newMc]);
  };

  const removeMicrocompetency = (id: string) => {
    setSelectedMicrocompetencies(prev => prev.filter(mc => mc.id !== id));
  };

  const updateMicrocompetencyWeightage = (id: string, weightage: number) => {
    setSelectedMicrocompetencies(prev =>
      prev.map(mc => mc.id === id ? { ...mc, weightage } : mc)
    );
  };

  const updateMicrocompetencyMaxScore = (id: string, maxScore: number) => {
    setSelectedMicrocompetencies(prev =>
      prev.map(mc => mc.id === id ? { ...mc, maxScore } : mc)
    );
  };

  const assignTeacherToMicrocompetency = (mcId: string, teacherId: string | null) => {
    setSelectedMicrocompetencies(prev =>
      prev.map(mc => mc.id === mcId ? { ...mc, assignedTeacher: teacherId } : mc)
    );
  };

  const handleEditIntervention = (intervention: Intervention) => {
    setEditingIntervention(intervention);
    setCreateForm({
      name: intervention.name || '',
      description: intervention.description || '',
      startDate: intervention.start_date || '',
      endDate: intervention.end_date || '',
      maxStudents: intervention.max_students || 50,
      objectives: intervention.objectives || [],
      prerequisites: intervention.prerequisites || [],
    });
    setFormErrors({});
    setShowEditDialog(true);
  };

  const handleUpdateIntervention = async () => {
    if (!editingIntervention) return;

    const errors = validateForm(createForm);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      await interventionAPI.updateIntervention(editingIntervention.id, createForm);
      toast.success('Intervention updated successfully');
      setShowEditDialog(false);
      setEditingIntervention(null);
      resetCreateForm();
      fetchInterventions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update intervention';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneIntervention = async (intervention: Intervention) => {
    setCreateForm({
      name: `${intervention.name} (Copy)`,
      description: intervention.description,
      startDate: '',
      endDate: '',
      maxStudents: intervention.max_students,
      objectives: [...(intervention.objectives || [])],
      prerequisites: [...(intervention.prerequisites || [])],
    });
    setFormErrors({});
    setShowCreateDialog(true);
  };

  const handleViewDetails = async (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setShowDetailsDialog(true);
  };

  const addObjective = () => {
    setCreateForm(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };

  const updateObjective = (index: number, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  const removeObjective = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const addPrerequisite = () => {
    setCreateForm(prev => ({
      ...prev,
      prerequisites: [...prev.prerequisites, '']
    }));
  };

  const updatePrerequisite = (index: number, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.map((prereq, i) => i === index ? value : prereq)
    }));
  };

  const removePrerequisite = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteIntervention = async (interventionId: string) => {
    if (!confirm('Are you sure you want to delete this intervention? This action cannot be undone.')) {
      return;
    }

    try {
      await interventionAPI.deleteIntervention(interventionId);
      toast.success('Intervention deleted successfully');
      fetchInterventions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete intervention';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleBulkStatusUpdate = async (interventionIds: string[], newStatus: string) => {
    try {
      await Promise.all(
        interventionIds.map(id => interventionAPI.updateInterventionStatus(id, newStatus))
      );
      toast.success(`${interventionIds.length} intervention(s) updated successfully`);
      fetchInterventions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update interventions';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Using server-side pagination, so no client-side filtering needed

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
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Interventions</h1>
            <p className="text-gray-600 mt-1">
              Create and manage skill development interventions
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {selectedTerm?.name || 'Current Term'}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Intervention
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search interventions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} variant="outline">
            Search
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Interventions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interventions ({totalInterventions})</CardTitle>
          <CardDescription>
            Manage all skill development interventions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading interventions...</span>
              </div>
            </div>
          ) : interventions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No interventions found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No interventions match your search criteria.' : 'Get started by creating your first intervention.'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Intervention
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Scoring</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{intervention.name}</div>
                        <div className="text-sm text-gray-600 line-clamp-1">
                          {intervention.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(intervention.status)}>
                        {getStatusIcon(intervention.status)}
                        <span className="ml-1">{intervention.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(intervention.start_date)}</div>
                        <div className="text-gray-600">to {formatDate(intervention.end_date)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {intervention.enrolled_count || 0}/{intervention.max_students}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {intervention.is_scoring_open ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </div>
                      {intervention.scoring_deadline && (
                        <div className="text-xs text-gray-600 mt-1">
                          Due: {formatDate(intervention.scoring_deadline)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {formatDate(intervention.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(intervention)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/interventions/${intervention.id}/microcompetencies`)}
                          title="Manage Microcompetencies"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/interventions/${intervention.id}/teachers`)}
                          title="Assign Teachers"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/interventions/${intervention.id}/analytics`)}
                          title="View Analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditIntervention(intervention)}
                          title="Edit Intervention"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloneIntervention(intervention)}
                          title="Clone Intervention"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/interventions/${intervention.id}/settings`)}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIntervention(intervention.id)}
                          title="Delete Intervention"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalInterventions)} of {totalInterventions} interventions
            </p>
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSize" className="text-sm">Rows per page:</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger id="pageSize" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNumber > totalPages) return null;

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNumber)}
                      className="w-8"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Intervention Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          resetCreateForm();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Intervention</DialogTitle>
            <DialogDescription>
              Create a comprehensive intervention program with microcompetencies, teacher assignments, and student enrollment.
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer ${
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  onClick={() => goToStep(step)}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                <div className="ml-2 text-sm">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Microcompetencies'}
                  {step === 3 && 'Teachers'}
                  {step === 4 && 'Students'}
                </div>
                {step < 4 && <div className="w-16 h-0.5 bg-gray-200 mx-4" />}
              </div>
            ))}
          </div>
          {/* Multi-Step Form Content */}
          <MultiStepInterventionForm
            currentStep={currentStep}
            createForm={createForm}
            setCreateForm={setCreateForm}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            selectedMicrocompetencies={selectedMicrocompetencies}
            setSelectedMicrocompetencies={setSelectedMicrocompetencies}
            selectedStudents={selectedStudents}
            setSelectedStudents={setSelectedStudents}
            availableMicrocompetencies={availableMicrocompetencies}
            availableTeachers={availableTeachers}
            availableStudents={availableStudents}
            addObjective={addObjective}
            updateObjective={updateObjective}
            removeObjective={removeObjective}
            addPrerequisite={addPrerequisite}
            updatePrerequisite={updatePrerequisite}
            removePrerequisite={removePrerequisite}
            addMicrocompetency={addMicrocompetency}
            removeMicrocompetency={removeMicrocompetency}
            updateMicrocompetencyWeightage={updateMicrocompetencyWeightage}
            updateMicrocompetencyMaxScore={updateMicrocompetencyMaxScore}
            assignTeacherToMicrocompetency={assignTeacherToMicrocompetency}
            setShowStudentSelectionDialog={setShowStudentSelectionDialog}
          />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
                Previous
              </Button>
            )}
            {currentStep < 4 ? (
              <Button onClick={nextStep} disabled={isSubmitting}>
                Next: {currentStep === 1 ? 'Microcompetencies' : currentStep === 2 ? 'Teachers' : 'Students'}
              </Button>
            ) : (
              <Button onClick={handleCreateIntervention} disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Intervention
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Selection Dialog */}
      <StudentSelectionDialog
        open={showStudentSelectionDialog}
        onOpenChange={setShowStudentSelectionDialog}
        selectedStudents={selectedStudents}
        onStudentsSelected={setSelectedStudents}
        maxStudents={createForm.maxStudents}
        interventionId={editingIntervention?.id}
      />

      {/* Edit Intervention Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditingIntervention(null);
          resetCreateForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Intervention</DialogTitle>
            <DialogDescription>
              Update the intervention details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Use the same form structure as create dialog */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Intervention Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter intervention name"
                  value={createForm.name}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe the intervention program, its goals, and expected outcomes"
                  value={createForm.description}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, description: e.target.value }));
                    if (formErrors.description) {
                      setFormErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  rows={4}
                  className={formErrors.description ? 'border-red-500' : ''}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formErrors.description && <span className="text-red-600">{formErrors.description}</span>}</span>
                  <span>{createForm.description.length}/1000</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => {
                      setCreateForm(prev => ({ ...prev, startDate: e.target.value }));
                      if (formErrors.startDate) {
                        setFormErrors(prev => ({ ...prev, startDate: '' }));
                      }
                    }}
                    className={formErrors.startDate ? 'border-red-500' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.startDate && (
                    <p className="text-sm text-red-600">{formErrors.startDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date *</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => {
                      setCreateForm(prev => ({ ...prev, endDate: e.target.value }));
                      if (formErrors.endDate) {
                        setFormErrors(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                    className={formErrors.endDate ? 'border-red-500' : ''}
                    min={createForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.endDate && (
                    <p className="text-sm text-red-600">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxStudents">Maximum Students *</Label>
                <Input
                  id="edit-maxStudents"
                  type="number"
                  min="1"
                  max="1000"
                  value={createForm.maxStudents}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setCreateForm(prev => ({ ...prev, maxStudents: value }));
                    if (formErrors.maxStudents) {
                      setFormErrors(prev => ({ ...prev, maxStudents: '' }));
                    }
                  }}
                  className={formErrors.maxStudents ? 'border-red-500' : ''}
                />
                {formErrors.maxStudents && (
                  <p className="text-sm text-red-600">{formErrors.maxStudents}</p>
                )}
                <p className="text-xs text-gray-500">Recommended: 20-50 students for optimal learning experience</p>
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Learning Objectives *</Label>
                  <p className="text-xs text-gray-500">Define what students will achieve by completing this intervention</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addObjective}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Objective
                </Button>
              </div>
              {createForm.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Learning objective ${index + 1} (e.g., "Students will be able to...")`}
                      value={objective}
                      onChange={(e) => {
                        updateObjective(index, e.target.value);
                        if (formErrors.objectives) {
                          setFormErrors(prev => ({ ...prev, objectives: '' }));
                        }
                      }}
                      className={formErrors.objectives ? 'border-red-500' : ''}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    disabled={createForm.objectives.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formErrors.objectives && (
                <p className="text-sm text-red-600">{formErrors.objectives}</p>
              )}
              {createForm.objectives.length === 0 && (
                <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">No objectives added yet</p>
                  <Button type="button" variant="outline" size="sm" onClick={addObjective}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Objective
                  </Button>
                </div>
              )}
            </div>

            {/* Prerequisites */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prerequisites (Optional)</Label>
                  <p className="text-xs text-gray-500">Skills or knowledge students should have before starting</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPrerequisite}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prerequisite
                </Button>
              </div>
              {createForm.prerequisites.map((prerequisite, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Prerequisite ${index + 1} (e.g., "Basic understanding of...")`}
                      value={prerequisite}
                      onChange={(e) => updatePrerequisite(index, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePrerequisite(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {createForm.prerequisites.length === 0 && (
                <div className="text-center py-3 border border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">No prerequisites specified</p>
                  <Button type="button" variant="ghost" size="sm" onClick={addPrerequisite}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Prerequisite
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIntervention} disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Intervention
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Intervention Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditingIntervention(null);
          resetCreateForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Intervention</DialogTitle>
            <DialogDescription>
              Update the intervention details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Use the same form structure as create dialog */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Intervention Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter intervention name"
                  value={createForm.name}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe the intervention program, its goals, and expected outcomes"
                  value={createForm.description}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, description: e.target.value }));
                    if (formErrors.description) {
                      setFormErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  rows={4}
                  className={formErrors.description ? 'border-red-500' : ''}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formErrors.description && <span className="text-red-600">{formErrors.description}</span>}</span>
                  <span>{createForm.description.length}/1000</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date *</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => {
                      setCreateForm(prev => ({ ...prev, startDate: e.target.value }));
                      if (formErrors.startDate) {
                        setFormErrors(prev => ({ ...prev, startDate: '' }));
                      }
                    }}
                    className={formErrors.startDate ? 'border-red-500' : ''}
                  />
                  {formErrors.startDate && (
                    <p className="text-sm text-red-600">{formErrors.startDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date *</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => {
                      setCreateForm(prev => ({ ...prev, endDate: e.target.value }));
                      if (formErrors.endDate) {
                        setFormErrors(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                    className={formErrors.endDate ? 'border-red-500' : ''}
                    min={createForm.startDate || new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.endDate && (
                    <p className="text-sm text-red-600">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxStudents">Maximum Students *</Label>
                <Input
                  id="edit-maxStudents"
                  type="number"
                  min="1"
                  max="1000"
                  value={createForm.maxStudents}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setCreateForm(prev => ({ ...prev, maxStudents: value }));
                    if (formErrors.maxStudents) {
                      setFormErrors(prev => ({ ...prev, maxStudents: '' }));
                    }
                  }}
                  className={formErrors.maxStudents ? 'border-red-500' : ''}
                />
                {formErrors.maxStudents && (
                  <p className="text-sm text-red-600">{formErrors.maxStudents}</p>
                )}
                <p className="text-xs text-gray-500">Recommended: 20-50 students for optimal learning experience</p>
              </div>
            </div>

            {/* Objectives - Same as create dialog */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Learning Objectives *</Label>
                  <p className="text-xs text-gray-500">Define what students will achieve by completing this intervention</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addObjective}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Objective
                </Button>
              </div>
              {createForm.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Learning objective ${index + 1} (e.g., "Students will be able to...")`}
                      value={objective}
                      onChange={(e) => {
                        updateObjective(index, e.target.value);
                        if (formErrors.objectives) {
                          setFormErrors(prev => ({ ...prev, objectives: '' }));
                        }
                      }}
                      className={formErrors.objectives ? 'border-red-500' : ''}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeObjective(index)}
                    disabled={createForm.objectives.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formErrors.objectives && (
                <p className="text-sm text-red-600">{formErrors.objectives}</p>
              )}
            </div>

            {/* Prerequisites - Same as create dialog */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prerequisites (Optional)</Label>
                  <p className="text-xs text-gray-500">Skills or knowledge students should have before starting</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPrerequisite}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prerequisite
                </Button>
              </div>
              {createForm.prerequisites.map((prerequisite, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Prerequisite ${index + 1} (e.g., "Basic understanding of...")`}
                      value={prerequisite}
                      onChange={(e) => updatePrerequisite(index, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePrerequisite(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIntervention} disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Intervention
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intervention Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedIntervention?.name}</DialogTitle>
            <DialogDescription>
              Intervention details and quick actions
            </DialogDescription>
          </DialogHeader>
          {selectedIntervention && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="microcompetencies">Microcompetencies</TabsTrigger>
                <TabsTrigger value="teachers">Teachers</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(selectedIntervention.status)}>
                            {getStatusIcon(selectedIntervention.status)}
                            <span className="ml-1">{selectedIntervention.status}</span>
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Duration</Label>
                        <p className="text-sm mt-1">
                          {formatDate(selectedIntervention.start_date)} - {formatDate(selectedIntervention.end_date)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Capacity</Label>
                        <p className="text-sm mt-1">
                          {selectedIntervention.enrolled_count || 0} / {selectedIntervention.max_students} students
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Scoring Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Scoring Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedIntervention.is_scoring_open ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Open
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Closed
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedIntervention.scoring_deadline && (
                        <div>
                          <Label className="text-xs text-gray-500">Scoring Deadline</Label>
                          <p className="text-sm mt-1">
                            {formatDate(selectedIntervention.scoring_deadline)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{selectedIntervention.description}</p>
                  </CardContent>
                </Card>

                {selectedIntervention.objectives && selectedIntervention.objectives.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Learning Objectives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {selectedIntervention.objectives.map((objective, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {objective}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/microcompetencies`)}
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Manage Microcompetencies
                  </Button>
                  <Button
                    onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/teachers`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Teachers
                  </Button>
                  <Button
                    onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/analytics`)}
                    variant="outline"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="microcompetencies">
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Microcompetencies Management</h3>
                  <p className="text-gray-600 mb-4">
                    Manage microcompetencies assigned to this intervention
                  </p>
                  <Button onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/microcompetencies`)}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Manage Microcompetencies
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="teachers">
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Teacher Assignments</h3>
                  <p className="text-gray-600 mb-4">
                    Assign teachers to specific microcompetencies for scoring
                  </p>
                  <Button onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/teachers`)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Teachers
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="students">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Student Enrollment</h3>
                  <p className="text-gray-600 mb-4">
                    Manage student enrollment and view progress
                  </p>
                  <Button onClick={() => navigate(`/admin/interventions/${selectedIntervention.id}/students`)}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Students
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageInterventions;
