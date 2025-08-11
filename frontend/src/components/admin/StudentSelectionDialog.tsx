import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, X, Filter, ChevronLeft, ChevronRight, UserCheck, UserPlus } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { toast } from 'sonner';

interface StudentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudents: string[];
  onStudentsSelected: (studentIds: string[]) => void;
  maxStudents: number;
  interventionId?: string; // For excluding already enrolled students
}

interface FilterOptions {
  batches: Array<{
    id: string;
    name: string;
    year: number;
  }>;
  courses: string[];
  sections: Array<{
    id: string;
    name: string;
    batch_name: string;
    batch_year: number;
  }>;
  houses: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  years: number[];
}

interface Student {
  id: string;
  registration_no: string;
  name: string;
  course: string;
  batch_name?: string;
  batch_year?: number;
  section_name?: string;
  house_name?: string;
  house_color?: string;
  batch_id: string;
  section_id: string;
  house_id?: string;
}

export const StudentSelectionDialog: React.FC<StudentSelectionDialogProps> = ({
  open,
  onOpenChange,
  selectedStudents,
  onStudentsSelected,
  maxStudents,
  interventionId,
}) => {
  // Basic state
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedStudents, setTempSelectedStudents] = useState<string[]>(selectedStudents);
  const [activeTab, setActiveTab] = useState<'individual' | 'batch' | 'criteria'>('individual');

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const studentsPerPage = 20;

  // Filter state
  const [filters, setFilters] = useState({
    batch_ids: [] as string[],
    batch_years: [] as number[],
    courses: [] as string[],
    sections: [] as string[],
    houses: [] as string[],
  });

  // Batch selection state
  const [batchFilters, setBatchFilters] = useState({
    batch_ids: [] as string[],
    section_ids: [] as string[],
    course_filters: [] as string[],
  });

  // Criteria selection state
  const [criteriaFilters, setCriteriaFilters] = useState({
    batch_years: [] as number[],
    courses: [] as string[],
    sections: [] as string[],
    houses: [] as string[],
  });

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const response = await adminAPI.getStudentFilterOptions();
      if (response.success) {
        setFilterOptions(response.data);
      } else {
        toast.error('Failed to load filter options');
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      toast.error('Failed to load filter options');
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  // Load students with current filters
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: studentsPerPage,
        search: searchTerm,
        exclude_enrolled: interventionId,
        ...filters,
      };

      const response = await adminAPI.getAllStudents(params);
      if (response.success) {
        setStudents(response.data.students || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalStudents(response.data.pagination?.total || 0);
      } else {
        toast.error('Failed to load students');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters, interventionId]);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadFilterOptions();
      loadStudents();
    }
  }, [open, loadFilterOptions, loadStudents]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadStudents();
    }
  }, [filters, searchTerm]);

  // Load students when page changes
  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [currentPage]);

  // Student selection handlers
  const handleStudentToggle = (studentId: string) => {
    setTempSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        if (prev.length >= maxStudents) {
          toast.warning(`Maximum capacity of ${maxStudents} students reached`);
          return prev;
        }
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAllVisible = () => {
    const visibleStudentIds = students.map(s => s.id);
    const availableSlots = maxStudents - tempSelectedStudents.length;
    const newStudents = visibleStudentIds.filter(id => !tempSelectedStudents.includes(id));
    const studentsToAdd = newStudents.slice(0, availableSlots);

    if (newStudents.length > availableSlots) {
      toast.warning(`Only ${availableSlots} slots available. Selected first ${studentsToAdd.length} students.`);
    }

    setTempSelectedStudents(prev => [...prev, ...studentsToAdd]);
  };

  const handleDeselectAllVisible = () => {
    const visibleStudentIds = students.map(s => s.id);
    setTempSelectedStudents(prev => prev.filter(id => !visibleStudentIds.includes(id)));
  };

  const handleSelectAllInBatch = (batchId: string) => {
    if (!filterOptions) return;

    const batch = filterOptions.batches.find(b => b.id === batchId);
    if (!batch) return;

    // This would require a separate API call to get all students in the batch
    toast.info(`Selecting all students in ${batch.name} - ${batch.year}`);
    // Implementation would go here
  };

  const handleSelectAllInYear = (year: number) => {
    toast.info(`Selecting all students from ${year}`);
    // Implementation would go here
  };

  // Batch enrollment handler
  const handleBatchEnrollment = async () => {
    if (!interventionId) {
      toast.error('Intervention ID is required for batch enrollment');
      return;
    }

    if (batchFilters.batch_ids.length === 0) {
      toast.error('Please select at least one batch');
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.enrollStudentsByBatch(interventionId, {
        batch_ids: batchFilters.batch_ids,
        section_ids: batchFilters.section_ids,
        course_filters: batchFilters.course_filters,
        enrollmentType: 'Optional'
      });

      if (response.success) {
        toast.success(response.message);
        onOpenChange(false);
        // Optionally refresh parent component
      } else {
        toast.error(response.message || 'Failed to enroll students by batch');
      }
    } catch (error) {
      console.error('Error enrolling students by batch:', error);
      toast.error('Failed to enroll students by batch');
    } finally {
      setLoading(false);
    }
  };

  // Criteria enrollment handler
  const handleCriteriaEnrollment = async () => {
    if (!interventionId) {
      toast.error('Intervention ID is required for criteria enrollment');
      return;
    }

    const hasAnyCriteria = Object.values(criteriaFilters).some(arr => arr.length > 0);
    if (!hasAnyCriteria) {
      toast.error('Please select at least one criteria');
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.enrollStudentsByCriteria(interventionId, {
        criteria: criteriaFilters,
        enrollmentType: 'Optional'
      });

      if (response.success) {
        toast.success(response.message);
        onOpenChange(false);
        // Optionally refresh parent component
      } else {
        toast.error(response.message || 'Failed to enroll students by criteria');
      }
    } catch (error) {
      console.error('Error enrolling students by criteria:', error);
      toast.error('Failed to enroll students by criteria');
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleSave = () => {
    if (activeTab === 'individual') {
      onStudentsSelected(tempSelectedStudents);
      onOpenChange(false);
    } else if (activeTab === 'batch') {
      handleBatchEnrollment();
    } else if (activeTab === 'criteria') {
      handleCriteriaEnrollment();
    }
  };

  const handleCancel = () => {
    setTempSelectedStudents(selectedStudents);
    setActiveTab('individual');
    setCurrentPage(1);
    setSearchTerm('');
    setFilters({
      batch_ids: [],
      batch_years: [],
      courses: [],
      sections: [],
      houses: [],
    });
    setBatchFilters({
      batch_ids: [],
      section_ids: [],
      course_filters: [],
    });
    setCriteriaFilters({
      batch_years: [],
      courses: [],
      sections: [],
      houses: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enroll Students in Intervention</DialogTitle>
          <DialogDescription>
            Choose how to enroll students. Maximum capacity: {maxStudents} students.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Individual Selection
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Batch Enrollment
            </TabsTrigger>
            <TabsTrigger value="criteria" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Criteria-Based
            </TabsTrigger>
          </TabsList>

          {/* Individual Selection Tab */}
          <TabsContent value="individual" className="flex-1 flex flex-col space-y-4 mt-4 min-h-0">
            {/* Advanced Filters */}
            <Card className="p-4 flex-shrink-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Batch Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Batch</label>
                  <Select
                    key={`batch-${filterOptions ? 'loaded' : 'loading'}`}
                    value={filters.batch_ids[0] || 'all'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      batch_ids: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {filterOptions?.batches?.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name} - {batch.year}
                        </SelectItem>
                      ))}
                      {!filterOptions?.batches && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Course</label>
                  <Select
                    key={`course-${filterOptions ? 'loaded' : 'loading'}`}
                    value={filters.courses[0] || 'all'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      courses: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {filterOptions?.courses?.map(course => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                      {!filterOptions?.courses && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Section</label>
                  <Select
                    key={`section-${filterOptions ? 'loaded' : 'loading'}`}
                    value={filters.sections[0] || 'all'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      sections: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {filterOptions?.sections?.map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name} ({section.batch_name})
                        </SelectItem>
                      ))}
                      {!filterOptions?.sections && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* House Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">House</label>
                  <Select
                    key={`house-${filterOptions ? 'loaded' : 'loading'}`}
                    value={filters.houses[0] || 'all'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      houses: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Houses</SelectItem>
                      {filterOptions?.houses?.map(house => (
                        <SelectItem key={house.id} value={house.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: house.color }}
                            />
                            {house.name}
                          </div>
                        </SelectItem>
                      ))}
                      {!filterOptions?.houses && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Search and Controls */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name, registration number, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {tempSelectedStudents.length} / {maxStudents} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllVisible}
                  disabled={loading || students.length === 0}
                >
                  Select All Visible
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllVisible}
                  disabled={loading || students.length === 0}
                >
                  Deselect All Visible
                </Button>
              </div>
            </div>

            {/* Selected Students Summary */}
            {tempSelectedStudents.length > 0 && (
              <Card className="bg-blue-50 border-blue-200 flex-shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {tempSelectedStudents.length} students selected
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTempSelectedStudents([])}
                    >
                      <X className="h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Students List */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto border rounded-lg max-h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500">Loading students...</p>
                    </div>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No students found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {students.map((student) => {
                      const isSelected = tempSelectedStudents.includes(student.id);
                      const isDisabled = !isSelected && tempSelectedStudents.length >= maxStudents;

                      return (
                        <div
                          key={student.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200'
                              : isDisabled
                              ? 'bg-gray-50 border-gray-200 opacity-50'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleStudentToggle(student.id)}
                            disabled={isDisabled}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-4">
                              <span>Reg: {student.registration_no}</span>
                              <span>Course: {student.course}</span>
                              {student.batch_name && <span>Batch: {student.batch_name} ({student.batch_year})</span>}
                              {student.section_name && <span>Section: {student.section_name}</span>}
                              {student.house_name && (
                                <span className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: student.house_color }}
                                  />
                                  {student.house_name}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, totalStudents)} of {totalStudents} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Batch Enrollment Tab */}
          <TabsContent value="batch" className="flex-1 flex flex-col space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Enroll Students by Batch</h3>
              <div className="space-y-4">
                {/* Batch Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Batches *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filterOptions?.batches?.map(batch => (
                      <div key={batch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`batch-${batch.id}`}
                          checked={batchFilters.batch_ids.includes(batch.id)}
                          onCheckedChange={(checked) => {
                            setBatchFilters(prev => ({
                              ...prev,
                              batch_ids: checked
                                ? [...prev.batch_ids, batch.id]
                                : prev.batch_ids.filter(id => id !== batch.id)
                            }));
                          }}
                        />
                        <label htmlFor={`batch-${batch.id}`} className="text-sm">
                          {batch.name} - {batch.year}
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.batches && (
                      <div className="text-sm text-gray-500">Loading batches...</div>
                    )}
                  </div>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Sections (Optional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filterOptions?.sections?.map(section => (
                      <div key={section.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`section-${section.id}`}
                          checked={batchFilters.section_ids.includes(section.id)}
                          onCheckedChange={(checked) => {
                            setBatchFilters(prev => ({
                              ...prev,
                              section_ids: checked
                                ? [...prev.section_ids, section.id]
                                : prev.section_ids.filter(id => id !== section.id)
                            }));
                          }}
                        />
                        <label htmlFor={`section-${section.id}`} className="text-sm">
                          {section.name} ({section.batch_name})
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.sections && (
                      <div className="text-sm text-gray-500">Loading sections...</div>
                    )}
                  </div>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Courses (Optional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filterOptions?.courses?.map(course => (
                      <div key={course} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course}`}
                          checked={batchFilters.course_filters.includes(course)}
                          onCheckedChange={(checked) => {
                            setBatchFilters(prev => ({
                              ...prev,
                              course_filters: checked
                                ? [...prev.course_filters, course]
                                : prev.course_filters.filter(c => c !== course)
                            }));
                          }}
                        />
                        <label htmlFor={`course-${course}`} className="text-sm">
                          {course}
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.courses && (
                      <div className="text-sm text-gray-500">Loading courses...</div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {batchFilters.batch_ids.length > 0 && (
                  <Card className="bg-green-50 border-green-200 p-3">
                    <div className="text-sm">
                      <strong>Preview:</strong> This will enroll students from{' '}
                      <strong>{batchFilters.batch_ids.length}</strong> batch(es)
                      {batchFilters.section_ids.length > 0 && (
                        <>, filtered by <strong>{batchFilters.section_ids.length}</strong> section(s)</>
                      )}
                      {batchFilters.course_filters.length > 0 && (
                        <>, filtered by <strong>{batchFilters.course_filters.length}</strong> course(s)</>
                      )}
                      .
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Criteria-Based Enrollment Tab */}
          <TabsContent value="criteria" className="flex-1 flex flex-col space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Enroll Students by Criteria</h3>
              <div className="space-y-4">
                {/* Year Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Years</label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions?.years?.map(year => (
                      <div key={year} className="flex items-center space-x-2">
                        <Checkbox
                          id={`year-${year}`}
                          checked={criteriaFilters.batch_years.includes(year)}
                          onCheckedChange={(checked) => {
                            setCriteriaFilters(prev => ({
                              ...prev,
                              batch_years: checked
                                ? [...prev.batch_years, year]
                                : prev.batch_years.filter(y => y !== year)
                            }));
                          }}
                        />
                        <label htmlFor={`year-${year}`} className="text-sm">
                          {year}
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.years && (
                      <div className="text-sm text-gray-500">Loading years...</div>
                    )}
                  </div>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Courses</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filterOptions?.courses?.map(course => (
                      <div key={course} className="flex items-center space-x-2">
                        <Checkbox
                          id={`criteria-course-${course}`}
                          checked={criteriaFilters.courses.includes(course)}
                          onCheckedChange={(checked) => {
                            setCriteriaFilters(prev => ({
                              ...prev,
                              courses: checked
                                ? [...prev.courses, course]
                                : prev.courses.filter(c => c !== course)
                            }));
                          }}
                        />
                        <label htmlFor={`criteria-course-${course}`} className="text-sm">
                          {course}
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.courses && (
                      <div className="text-sm text-gray-500">Loading courses...</div>
                    )}
                  </div>
                </div>

                {/* House Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Houses</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filterOptions?.houses?.map(house => (
                      <div key={house.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`criteria-house-${house.id}`}
                          checked={criteriaFilters.houses.includes(house.id)}
                          onCheckedChange={(checked) => {
                            setCriteriaFilters(prev => ({
                              ...prev,
                              houses: checked
                                ? [...prev.houses, house.id]
                                : prev.houses.filter(h => h !== house.id)
                            }));
                          }}
                        />
                        <label htmlFor={`criteria-house-${house.id}`} className="text-sm flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: house.color }}
                          />
                          {house.name}
                        </label>
                      </div>
                    ))}
                    {!filterOptions?.houses && (
                      <div className="text-sm text-gray-500">Loading houses...</div>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {Object.values(criteriaFilters).some(arr => arr.length > 0) && (
                  <Card className="bg-green-50 border-green-200 p-3">
                    <div className="text-sm">
                      <strong>Preview:</strong> This will enroll students matching the selected criteria.
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || (activeTab === 'individual' && tempSelectedStudents.length === 0)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                {activeTab === 'individual' && `Save Selection (${tempSelectedStudents.length})`}
                {activeTab === 'batch' && 'Enroll by Batch'}
                {activeTab === 'criteria' && 'Enroll by Criteria'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
