import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  Filter,
  MoreHorizontal,
  PenTool
} from "lucide-react";
import { adminAPI } from "@/lib/api";
import { useTerm } from "@/contexts/TermContext";
import { ErrorHandler, FormErrors } from "@/utils/errorHandling";

// Teacher interface
interface Teacher {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  specialization: string;
  assigned_quadrants: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    username: string;
  };
}

// Quadrants for assignment
const quadrants = [
  { id: "persona", name: "Persona" },
  { id: "wellness", name: "Wellness" },
  { id: "behavior", name: "Behavior" },
  { id: "discipline", name: "Discipline" }
];

const ManageTeachers: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Assignment management state
  const [interventions, setInterventions] = useState<any[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<string>("");
  const [availableMicrocompetencies, setAvailableMicrocompetencies] = useState<any[]>([]);
  const [selectedMicrocompetencies, setSelectedMicrocompetencies] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // New teacher form state
  const [newTeacherFirstName, setNewTeacherFirstName] = useState("");
  const [newTeacherLastName, setNewTeacherLastName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");

  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [newTeacherEmployeeId, setNewTeacherEmployeeId] = useState("");
  const [newTeacherSpecialization, setNewTeacherSpecialization] = useState("");
  const [newTeacherDepartment, setNewTeacherDepartment] = useState("");
  
  // Fetch teachers data
  useEffect(() => {
    fetchTeachers();
  }, [currentPage, pageSize]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllTeachers({
        page: currentPage,
        limit: pageSize
      });
      const teachersData = response.data?.teachers || [];
      const pagination = response.data?.pagination || {};

      setTeachers(teachersData);
      setTotalTeachers(pagination.total || 0);
      setTotalPages(pagination.totalPages || 0);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchTeachers();
  };
  
  // Handle adding a new teacher
  const handleAddTeacher = async () => {
    if (!newTeacherFirstName.trim()) {
      toast.error("Please enter first name");
      return;
    }

    if (!newTeacherLastName.trim()) {
      toast.error("Please enter last name");
      return;
    }

    if (!newTeacherEmail.trim()) {
      toast.error("Please enter teacher email");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTeacherEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }



    if (!newTeacherPassword.trim()) {
      toast.error("Please enter password");
      return;
    }

    if (!newTeacherEmployeeId.trim()) {
      toast.error("Please enter employee ID");
      return;
    }

    // Check for duplicate employee ID
    const existingTeacher = teachers.find(t => t.employee_id === newTeacherEmployeeId.trim());
    if (existingTeacher) {
      toast.error("A teacher with this employee ID already exists");
      return;
    }

    if (!newTeacherSpecialization) {
      toast.error("Please select a specialization");
      return;
    }

    try {
      setIsSubmitting(true);

      // Create teacher using the API
      await adminAPI.addTeacher({
        email: newTeacherEmail,
        password: newTeacherPassword,
        firstName: newTeacherFirstName,
        lastName: newTeacherLastName,
        qualification: 'Not specified',
        specialization: newTeacherSpecialization,
        department: newTeacherDepartment,
        employeeId: newTeacherEmployeeId,
        phone: '',
        experience: 0,
        assignedQuadrants: [newTeacherSpecialization]
      });

      toast.success("Teacher added successfully");
      setIsAddTeacherDialogOpen(false);

      // Reset form
      setNewTeacherFirstName("");
      setNewTeacherLastName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");
      setNewTeacherEmployeeId("");
      setNewTeacherSpecialization("");
      setNewTeacherDepartment("");

      // Refresh teachers list
      fetchTeachers();
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Failed to add teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsAssignDialogOpen(true);
    fetchInterventions();
  };

  const fetchInterventions = async () => {
    try {
      // This would fetch active interventions for assignment
      const response = await adminAPI.getAllInterventions();
      if (response.success) {
        setInterventions(response.data.filter((i: any) => i.status === 'Active'));
      }
    } catch (error) {
      console.error('Error fetching interventions:', error);
      toast.error('Failed to load interventions');
    }
  };

  const fetchMicrocompetencies = async (interventionId: string) => {
    try {
      // This would fetch microcompetencies for the selected intervention
      const response = await adminAPI.getInterventionMicrocompetencies(interventionId);
      if (response.success) {
        setAvailableMicrocompetencies(response.data.microcompetencies || []);
      }
    } catch (error) {
      console.error('Error fetching microcompetencies:', error);
      toast.error('Failed to load microcompetencies');
    }
  };

  const handleAssignMicrocompetencies = async () => {
    if (!selectedTeacher || !selectedIntervention || selectedMicrocompetencies.length === 0) {
      toast.error('Please select intervention and microcompetencies');
      return;
    }

    setIsAssigning(true);
    try {
      // This would assign microcompetencies to the teacher
      const assignments = selectedMicrocompetencies.map(microcompetencyId => ({
        teacher_id: selectedTeacher.id,
        microcompetency_id: microcompetencyId,
        can_score: true,
        can_create_tasks: true
      }));

      toast.success('Microcompetencies assigned successfully');
      setIsAssignDialogOpen(false);
      setSelectedMicrocompetencies([]);
      setSelectedIntervention("");
    } catch (error) {
      console.error('Error assigning microcompetencies:', error);
      toast.error('Failed to assign microcompetencies');
    } finally {
      setIsAssigning(false);
    }
  };
  


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Teachers</h1>
        <p className="text-muted-foreground">
          Add, edit, and assign teachers to students and quadrants
        </p>
        <div className="mt-2">
          <Badge variant="outline" className="text-sm">
            {selectedTerm?.name || 'Current Term'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teachers..."
              className="pl-8 w-full sm:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <UserPlus className="h-4 w-4" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
                <DialogDescription>
                  Enter the details of the new teacher to add them to the system.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      value={newTeacherFirstName}
                      onChange={(e) => setNewTeacherFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      value={newTeacherLastName}
                      onChange={(e) => setNewTeacherLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter teacher's email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                  />
                </div>



                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password for login"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    placeholder="Enter employee ID"
                    value={newTeacherEmployeeId}
                    onChange={(e) => setNewTeacherEmployeeId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select value={newTeacherSpecialization} onValueChange={setNewTeacherSpecialization}>
                    <SelectTrigger id="specialization">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {quadrants.map(quadrant => (
                        <SelectItem key={quadrant.id} value={quadrant.id}>
                          {quadrant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Enter department (optional)"
                    value={newTeacherDepartment}
                    onChange={(e) => setNewTeacherDepartment(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTeacherDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleAddTeacher} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Teacher'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="rounded-md">
              <div className="grid grid-cols-7 p-4 text-sm font-medium bg-muted/50">
                <div className="col-span-2">Teacher</div>
                <div>Specialization</div>
                <div>Employee ID</div>
                <div>Status</div>
                <div>Department</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading teachers...</span>
                    </div>
                  </div>
                ) : teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <div key={teacher.id} className="grid grid-cols-7 p-4 text-sm items-center">
                      <div className="col-span-2">
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-xs text-muted-foreground">{teacher.user?.email || 'No email'}</div>
                      </div>
                      <div>
                        <Badge variant="outline" className="capitalize">
                          {teacher.specialization || 'Not specified'}
                        </Badge>
                      </div>
                      <div>{teacher.employee_id}</div>
                      <div>
                        {teacher.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                      </div>
                      <div>{teacher.department || 'Not specified'}</div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignTeacher(teacher)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <PenTool className="h-3.5 w-3.5" />
                        </Button>

                        <Button variant="outline" size="sm" disabled>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        <Button variant="outline" size="sm" className="text-destructive" disabled>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No teachers found matching your search criteria
                </div>
              )}
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTeachers)} of {totalTeachers} teachers
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

      {/* Teacher Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Microcompetencies</DialogTitle>
            <DialogDescription>
              Assign microcompetencies to {selectedTeacher?.name} for intervention-based scoring
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Select Intervention</Label>
              <Select value={selectedIntervention} onValueChange={(value) => {
                setSelectedIntervention(value);
                fetchMicrocompetencies(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose intervention..." />
                </SelectTrigger>
                <SelectContent>
                  {interventions.map((intervention) => (
                    <SelectItem key={intervention.id} value={intervention.id}>
                      {intervention.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableMicrocompetencies.length > 0 && (
              <div className="space-y-3">
                <Label>Select Microcompetencies to Assign</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-3">
                    {availableMicrocompetencies.map((microcompetency) => (
                      <div key={microcompetency.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={microcompetency.id}
                          checked={selectedMicrocompetencies.includes(microcompetency.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMicrocompetencies(prev => [...prev, microcompetency.id]);
                            } else {
                              setSelectedMicrocompetencies(prev => prev.filter(id => id !== microcompetency.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={microcompetency.id} className="text-sm font-medium cursor-pointer">
                            {microcompetency.name}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {microcompetency.description}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {microcompetency.quadrant}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {microcompetency.component}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMicrocompetencies.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <strong>{selectedMicrocompetencies.length}</strong> microcompetencies selected for assignment
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignMicrocompetencies}
              disabled={isAssigning || selectedMicrocompetencies.length === 0}
            >
              {isAssigning ? 'Assigning...' : 'Assign Microcompetencies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTeachers;
