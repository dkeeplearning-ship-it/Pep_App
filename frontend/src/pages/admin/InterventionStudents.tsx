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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  Trash2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { interventionAPI, adminAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';

interface Student {
  id: string;
  name: string;
  registration_no: string;
  course: string;
  batch?: { name: string };
  section?: { name: string };
  batch_name?: string; // For compatibility
  section_name?: string; // For compatibility
  overall_score: number;
  grade: string;
  status: string;
}

interface EnrolledStudent extends Student {
  enrollment_status: string;
  enrollment_date: string;
  enrollment_type: string;
  current_score: number;
  completion_percentage: number;
}

interface Intervention {
  id: string;
  name: string;
  description: string;
  status: string;
  max_students: number;
  enrolled_count: number;
}

const InterventionStudents: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrollmentType, setEnrollmentType] = useState<string>('Mandatory');
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
      const [interventionResponse, studentsResponse] = await Promise.all([
        interventionAPI.getInterventionById(interventionId!),
        adminAPI.getAllStudents(1, 1000), // Get more students for enrollment
      ]);

      setIntervention(interventionResponse.data);

      // Filter enrolled vs available students
      const enrollments = interventionResponse.data.intervention_enrollments || [];
      // Transform enrollments to match expected interface
      const enrolled = enrollments.map((enrollment: any) => ({
        id: enrollment.student_id,
        name: enrollment.students?.name || '',
        registration_no: enrollment.students?.registration_no || '',
        course: '', // Will need to get from student details if needed
        batch_name: '', // Will need to get from student details if needed
        section_name: '', // Will need to get from student details if needed
        overall_score: 0,
        grade: '',
        status: 'Active',
        enrollment_status: enrollment.enrollment_status,
        enrollment_date: enrollment.enrollment_date,
        enrollment_type: enrollment.enrollment_type,
        current_score: enrollment.current_score,
        completion_percentage: enrollment.completion_percentage
      }));

      // Fix: studentsResponse.data.students is the array of students
      const allStudents = studentsResponse.data?.students || [];

      // Transform students to match expected interface
      const transformedStudents = allStudents.map((student: any) => ({
        ...student,
        batch_name: student.batch?.name || '',
        section_name: student.section?.name || ''
      }));

      const enrolledIds = new Set(enrolled.map((s: any) => s.id));
      const available = transformedStudents.filter((s: any) => !enrolledIds.has(s.id));

      setEnrolledStudents(enrolled);
      setAvailableStudents(available);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setIsSubmitting(true);
      await interventionAPI.enrollStudents(interventionId!, selectedStudents, enrollmentType);
      toast.success(`${selectedStudents.length} student(s) enrolled successfully`);
      setShowEnrollDialog(false);
      setSelectedStudents([]);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enroll students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAvailableStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registration_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Intervention Students</h1>
          <p className="text-gray-600 mt-1">
            Manage student enrollment for {intervention?.name}
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-sm">
              {selectedTerm?.name || 'Current Term'}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowEnrollDialog(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Enroll Students
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrolledStudents.length}</div>
            <p className="text-xs text-gray-600">
              of {intervention?.max_students} maximum
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {intervention?.max_students ? 
                Math.round((enrolledStudents.length / intervention.max_students) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-600">utilization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableStudents.length}</div>
            <p className="text-xs text-gray-600">students to enroll</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students ({enrolledStudents.length})</CardTitle>
          <CardDescription>
            Students currently enrolled in this intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrolledStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No students enrolled</h3>
              <p className="text-gray-600 mb-4">
                Start by enrolling students in this intervention.
              </p>
              <Button onClick={() => setShowEnrollDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll First Student
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Registration No</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrollment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-600">
                          {student.batch_name} • {student.section_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.registration_no}</TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>
                      <Badge variant={student.enrollment_type === 'Mandatory' ? 'default' : 'secondary'}>
                        {student.enrollment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.enrollment_status === 'Enrolled' ? 'default' : 'secondary'}>
                        {student.enrollment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${student.completion_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {student.completion_percentage || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enroll Students Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Students</DialogTitle>
            <DialogDescription>
              Select students to enroll in this intervention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Students</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or registration number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="enrollmentType">Enrollment Type</Label>
                <Select value={enrollmentType} onValueChange={setEnrollmentType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mandatory">Mandatory</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
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
                        checked={selectedStudents.length === filteredAvailableStudents.length && filteredAvailableStudents.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(filteredAvailableStudents.map(s => s.id));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Registration No</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Current Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailableStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-600">
                            {student.batch_name} • {student.section_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.registration_no}</TableCell>
                      <TableCell>{student.course}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.grade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-gray-600">
              {selectedStudents.length} student(s) selected
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnrollStudents} disabled={isSubmitting || selectedStudents.length === 0}>
              {isSubmitting ? 'Enrolling...' : `Enroll ${selectedStudents.length} Student(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterventionStudents;
