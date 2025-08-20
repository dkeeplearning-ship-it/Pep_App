import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  ArrowLeft,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Users,
  BookOpen,
  RefreshCw,
  Eye,
  GraduationCap,
  Target,
  Award
} from "lucide-react";
import { teacherAPI, interventionAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTerm } from "@/contexts/TermContext";
import { toast } from "sonner";

// Types for student data
interface AssignedStudent {
  id: string;
  name: string;
  registration_no: string;
  course: string;
  batch: string;
  section: string;
  status: string;
  last_assessment?: string;
  average_score?: number;
  interventions: Array<{
    id: string;
    name: string;
    status: string;
    progress_percentage: number;
  }>;
}

interface StudentsData {
  students: AssignedStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StudentDetailsData {
  student: {
    id: string;
    name: string;
    registration_no: string;
    course: string;
    batch: string;
    section: string;
    status: string;
  };
  interventions: Array<{
    id: string;
    name: string;
    status: string;
    enrolled_at: string;
    enrollment_status: string;
    microcompetencies: Array<{
      id: string;
      name: string;
      max_score: number;
      obtained_score?: number;
      percentage?: number;
      status: string;
      scored_at?: string;
      feedback?: string;
    }>;
    overall_progress: {
      total_microcompetencies: number;
      scored_microcompetencies: number;
      average_score: number;
      completion_percentage: number;
    };
  }>;
  summary: {
    total_interventions: number;
    active_interventions: number;
    completed_interventions: number;
    overall_average_score: number;
  };
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const TeacherStudents: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTerm } = useTerm();

  // State management
  const [studentsData, setStudentsData] = useState<StudentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedIntervention, setSelectedIntervention] = useState("all");

  // Student details dialog state
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [studentDetailsData, setStudentDetailsData] = useState<StudentDetailsData | null>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch students data - Remove selectedTab from dependencies to prevent new API calls for tab changes
  useEffect(() => {
    if (user?.id) {
      fetchStudents();
    }
  }, [user, currentPage, pageSize, selectedSection, selectedBatch, selectedIntervention]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Don't pass status to API - we'll filter client-side
      const response = await teacherAPI.getAssignedStudents(user.id, {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        // Remove status filtering from API call
        interventionId: selectedIntervention === 'all' ? undefined : selectedIntervention,
      });

      // Handle the response - backend returns students as an array in data property
      const responseData = response.data;
      const students = Array.isArray(responseData) ? responseData : (responseData.students || []);
      
      // Cast response to any to access pagination property safely
      const apiResponse = response as any;
      
      setStudentsData({
        students: students,
        pagination: responseData.pagination || apiResponse.pagination || {
          page: currentPage,
          limit: pageSize,
          total: students.length,
          totalPages: Math.ceil(students.length / pageSize)
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (student: AssignedStudent) => {
    try {
      setLoadingStudentDetails(true);
      setSelectedStudent(student);
      setShowStudentDialog(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Try the original API first, but handle 403 gracefully
      let detailedData: StudentDetailsData | null = null;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/teachers/${user.id}/students/${student.id}/assessment?termId=${selectedTerm?.id || ''}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const responseData = await response.json();
          detailedData = responseData.data; // Extract the data property from the API response
        }
      } catch (apiError) {
        console.log('API call failed, using fallback data:', apiError);
      }

      // If API failed or returned 403, create fallback data from existing student information
      if (!detailedData) {
        detailedData = {
          student: {
            id: student.id,
            name: student.name,
            registration_no: student.registration_no,
            course: student.course,
            batch: student.batch,
            section: student.section,
            status: student.status
          },
          interventions: (student.interventions || []).map(intervention => ({
            id: intervention.id,
            name: intervention.name,
            status: intervention.status,
            enrolled_at: new Date().toISOString(),
            enrollment_status: 'Enrolled',
            microcompetencies: [], // No detailed microcompetency data available
            overall_progress: {
              total_microcompetencies: 0,
              scored_microcompetencies: 0,
              average_score: student.average_score || 0,
              completion_percentage: intervention.progress_percentage || 0
            }
          })),
          summary: {
            total_interventions: student.interventions?.length || 0,
            active_interventions: student.interventions?.filter(i => i.status === 'Active').length || 0,
            completed_interventions: student.interventions?.filter(i => i.status === 'Completed').length || 0,
            overall_average_score: student.average_score || 0
          }
        };
      }

      setStudentDetailsData(detailedData);
    } catch (err) {
      toast.error('Failed to load student details');
      console.error('Error fetching student details:', err);
      
      // Still show dialog with basic data even if detailed fetch fails
      const fallbackData: StudentDetailsData = {
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          course: student.course,
          batch: student.batch,
          section: student.section,
          status: student.status
        },
        interventions: [],
        summary: {
          total_interventions: 0,
          active_interventions: 0,
          completed_interventions: 0,
          overall_average_score: student.average_score || 0
        }
      };
      setStudentDetailsData(fallbackData);
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    fetchStudents();
  };

  // Filter students based on search query, tab, and filters (client-side filtering)
  const filteredStudents = studentsData?.students?.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.registration_no.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSection = selectedSection === "all" || student.section === selectedSection;
    const matchesBatch = selectedBatch === "all" || student.batch === selectedBatch;

    // Client-side tab filtering
    let matchesTab = true;
    if (selectedTab !== 'all') {
      switch (selectedTab) {
        case 'pending':
          matchesTab = student.status === 'Pending';
          break;
        case 'completed':
          matchesTab = student.status === 'Completed';
          break;
        case 'incomplete': // Active students
          matchesTab = student.status === 'Active' || student.status === 'Enrolled';
          break;
        default:
          matchesTab = true;
      }
    }

    return matchesSearch && matchesSection && matchesBatch && matchesTab;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "Completed":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case "Active":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">Loading your assigned students...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">Manage your assigned students</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={fetchStudents}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state - only show if no students at all (not just for current filter)
  if (!studentsData || !studentsData.students || studentsData.students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-muted-foreground">No students assigned yet</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Students Assigned</h3>
            <p className="text-muted-foreground text-center">
              You don't have any students assigned to you yet. Contact your administrator for student assignments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/teacher")}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Students</h1>
          <p className="text-muted-foreground">
            Manage and assess your assigned students
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Assigned Students ({filteredStudents.length})</CardTitle>
              <CardDescription>
                Students assigned to you for assessment across all interventions
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search students..."
                    className="pl-8 w-full sm:w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} size="sm">
                  Search
                </Button>
              </div>
              <Button variant="outline" className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="all">All Students</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="incomplete">Active</TabsTrigger>
              </TabsList>
              
              <div className="flex flex-wrap gap-2">
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                    <SelectItem value="D">Section D</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    <SelectItem value="2024">Batch 2024</SelectItem>
                    <SelectItem value="2023">Batch 2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Unified content for all tabs */}
            {["all", "pending", "completed", "incomplete"].map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue} className="m-0">
                <div className="rounded-md border">
                  <div className="grid grid-cols-7 p-3 text-sm font-medium bg-muted/50">
                    <div className="col-span-2">Student</div>
                    <div>Reg. No</div>
                    <div>Section</div>
                    <div>Status</div>
                    <div>Progress</div>
                    <div className="text-right">Action</div>
                  </div>
                  <div className="divide-y">
                    {filteredStudents && filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <div key={student.id} className="grid grid-cols-7 p-3 text-sm items-center">
                          <div className="col-span-2">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.course}</div>
                          </div>
                          <div className="font-mono text-xs">{student.registration_no}</div>
                          <div>{student.section}</div>
                          <div>{getStatusBadge(student.status)}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress 
                                value={student.interventions?.[0]?.progress_percentage || 0} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {student.interventions?.[0]?.progress_percentage || 0}%
                            </span>
                          </div>
                          <div className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchStudentDetails(student)}
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        {selectedTab === 'all' 
                          ? "No students found matching your search criteria"
                          : `No ${selectedTab} students found matching your criteria`
                        }
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Student Details: {selectedStudent?.name}
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of student interventions, enrollments, and scoring progress
            </DialogDescription>
          </DialogHeader>
          
          {loadingStudentDetails ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading student details...
            </div>
          ) : studentDetailsData ? (
            <div className="space-y-6">
              {/* Student Info Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Student Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {studentDetailsData.student.name}</p>
                    <p><strong>Registration No:</strong> {studentDetailsData.student.registration_no}</p>
                    <p><strong>Course:</strong> {studentDetailsData.student.course}</p>
                    <p><strong>Batch:</strong> {studentDetailsData.student.batch}</p>
                    <p><strong>Section:</strong> {studentDetailsData.student.section}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Overview Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Total Interventions:</strong> {studentDetailsData.summary.total_interventions}</p>
                    <p><strong>Active Interventions:</strong> {studentDetailsData.summary.active_interventions}</p>
                    <p><strong>Completed:</strong> {studentDetailsData.summary.completed_interventions}</p>
                    <p><strong>Overall Average:</strong> {studentDetailsData.summary.overall_average_score.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Interventions List */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Intervention Enrollments ({studentDetailsData.interventions.length})
                </h3>
                
                {studentDetailsData.interventions.length > 0 ? (
                  <div className="space-y-3">
                    {studentDetailsData.interventions.map((intervention) => (
                      <Card key={intervention.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{intervention.name}</CardTitle>
                              <CardDescription>
                                Enrolled: {new Date(intervention.enrolled_at).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={intervention.status === 'Active' ? 'default' : 'secondary'}>
                                {intervention.status}
                              </Badge>
                              <Badge variant="outline">
                                {intervention.enrollment_status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2">Progress Overview</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Overall Progress:</span>
                                  <div className="flex-1">
                                    <Progress value={intervention.overall_progress.completion_percentage} className="h-2" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {intervention.overall_progress.completion_percentage}%
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {intervention.overall_progress.scored_microcompetencies} of {intervention.overall_progress.total_microcompetencies} microcompetencies scored
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm mb-2">Scoring Statistics</h4>
                              <div className="space-y-1 text-sm">
                                <p>Average Score: <span className="font-medium">{intervention.overall_progress.average_score.toFixed(1)}%</span></p>
                                <p>Completion: <span className="font-medium">{intervention.overall_progress.completion_percentage}%</span></p>
                              </div>
                            </div>
                          </div>
                          
                          {intervention.microcompetencies.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-sm mb-2">Microcompetency Scores</h4>
                              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                {intervention.microcompetencies.map((mc) => (
                                  <div key={mc.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                                    <div className="flex-1">
                                      <div className="font-medium">{mc.name}</div>
                                      {mc.feedback && (
                                        <div className="text-muted-foreground mt-1">{mc.feedback}</div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      {mc.obtained_score !== undefined ? (
                                        <>
                                          <div className="font-medium">
                                            {mc.obtained_score}/{mc.max_score}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {mc.percentage?.toFixed(1)}%
                                          </div>
                                          {mc.scored_at && (
                                            <div className="text-muted-foreground">
                                              {new Date(mc.scored_at).toLocaleDateString()}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">
                                          Not Scored
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No intervention enrollments found for this student</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load student details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination Controls */}
      {studentsData && studentsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Showing {((studentsData.pagination.page - 1) * studentsData.pagination.limit) + 1} to {Math.min(studentsData.pagination.page * studentsData.pagination.limit, studentsData.pagination.total)} of {studentsData.pagination.total} students
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="pageSize" className="text-sm">Rows per page:</label>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-20">
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
                disabled={studentsData.pagination.page === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(studentsData.pagination.page - 1)}
                disabled={studentsData.pagination.page === 1}
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, studentsData.pagination.totalPages) }, (_, i) => {
                  const pageNumber = Math.max(1, Math.min(studentsData.pagination.totalPages - 4, studentsData.pagination.page - 2)) + i;
                  if (pageNumber > studentsData.pagination.totalPages) return null;

                  return (
                    <Button
                      key={pageNumber}
                      variant={studentsData.pagination.page === pageNumber ? "default" : "outline"}
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
                onClick={() => setCurrentPage(studentsData.pagination.page + 1)}
                disabled={studentsData.pagination.page === studentsData.pagination.totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(studentsData.pagination.totalPages)}
                disabled={studentsData.pagination.page === studentsData.pagination.totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
