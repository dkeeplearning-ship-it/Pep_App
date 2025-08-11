import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, Users, BookOpen, Target, AlertCircle, CheckCircle, Loader2, Save } from "lucide-react";
import { useTerm } from "@/contexts/TermContext";
import { adminAPI, interventionAPI } from "@/lib/api";

// Types for score management
interface Student {
  id: string;
  name: string;
  registration_no: string;
  course: string;
  batch_name: string;
  section_name: string;
  overall_score: number;
  grade: string;
  status: string;
}

interface Intervention {
  id: string;
  name: string;
  status: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface Microcompetency {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  component: string;
  subCategory: string;
  quadrant: string;
}

interface ScoreEntry {
  microcompetencyId: string;
  obtainedScore: number;
  feedback?: string;
}

interface Teacher {
  id: string;
  name: string;
  employee_id: string;
  specialization: string;
}

const InputScores: React.FC = () => {
  const { selectedTerm } = useTerm();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [microcompetencies, setMicrocompetencies] = useState<Microcompetency[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedIntervention, setSelectedIntervention] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [scoreEntries, setScoreEntries] = useState<Record<string, ScoreEntry>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingMicrocompetencies, setLoadingMicrocompetencies] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [selectedTerm]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [studentsResponse, interventionsResponse, teachersResponse] = await Promise.all([
        adminAPI.getAllStudents({ termId: selectedTerm?.id }),
        adminAPI.getAllInterventions(),
        adminAPI.getAllTeachers()
      ]);

      if (studentsResponse.success) {
        // Transform student data to match interface
        const transformedStudents = studentsResponse.data.students.map((student: any) => ({
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          course: student.course,
          batch_name: student.batch?.name || '',
          section_name: student.section?.name || '',
          overall_score: student.overall_score || 0,
          grade: student.grade || '',
          status: student.status || 'Active'
        }));
        setStudents(transformedStudents);
      }

      if (interventionsResponse.success) {
        // Fix: Access interventions from the correct nested property
        const interventionsList = interventionsResponse.data.interventions || [];
        setInterventions(interventionsList.filter((i: Intervention) => i.status === 'Active'));
      }

      if (teachersResponse.success) {
        setTeachers(teachersResponse.data.teachers);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load microcompetencies when intervention and teacher are selected
  useEffect(() => {
    if (selectedIntervention && selectedTeacher) {
      loadMicrocompetencies();
    } else {
      setMicrocompetencies([]);
    }
  }, [selectedIntervention, selectedTeacher]);

  const loadMicrocompetencies = async () => {
    setLoadingMicrocompetencies(true);
    try {
      const response = await interventionAPI.getTeacherInterventionMicrocompetencies(
        selectedTeacher,
        selectedIntervention
      );

      if (response.success) {
        // Transform microcompetency data to match interface
        const transformedMicrocompetencies = response.data.microcompetencies.map((mc: any) => ({
          id: mc.microcompetencies?.id || mc.id,
          name: mc.microcompetencies?.name || mc.name,
          description: mc.microcompetencies?.description || mc.description,
          maxScore: mc.max_score || mc.microcompetencies?.max_score || 10,
          component: mc.microcompetencies?.components?.name || '',
          subCategory: mc.microcompetencies?.components?.sub_categories?.name || '',
          quadrant: mc.microcompetencies?.components?.sub_categories?.quadrants?.name || ''
        }));
        setMicrocompetencies(transformedMicrocompetencies);
      }
    } catch (error) {
      console.error('Error loading microcompetencies:', error);
      toast.error('Failed to load microcompetencies');
    } finally {
      setLoadingMicrocompetencies(false);
    }
  };

  const handleScoreChange = (microcompetencyId: string, obtainedScore: number, feedback?: string) => {
    setScoreEntries(prev => ({
      ...prev,
      [microcompetencyId]: {
        microcompetencyId,
        obtainedScore,
        feedback
      }
    }));
  };

  const handleSubmitInterventionScores = async () => {
    if (!selectedStudent || !selectedIntervention || !selectedTeacher) {
      toast.error("Please select student, intervention, and teacher");
      return;
    }

    if (Object.keys(scoreEntries).length === 0) {
      toast.error("Please enter at least one score");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit scores for each microcompetency
      const scorePromises = Object.values(scoreEntries).map(entry =>
        interventionAPI.scoreStudentMicrocompetency(
          selectedTeacher,
          selectedIntervention,
          selectedStudent,
          entry.microcompetencyId,
          {
            obtained_score: entry.obtainedScore,
            feedback: entry.feedback
          }
        )
      );

      await Promise.all(scorePromises);
      
      toast.success("Intervention scores submitted successfully!");
      
      // Reset form
      setScoreEntries({});
      setSelectedStudent("");
      setSelectedIntervention("");
    } catch (error) {
      console.error('Error submitting scores:', error);
      toast.error("Failed to submit scores");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading score management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Score Management</h1>
          <p className="text-muted-foreground">
            Input and manage student scores for interventions and traditional assessments
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Term: {selectedTerm?.name || 'No term selected'}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Intervention-Based Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Intervention</Label>
              <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
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

            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.registration_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Microcompetencies Scoring */}
          {loadingMicrocompetencies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading microcompetencies...</span>
            </div>
          ) : microcompetencies.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Microcompetencies to Score</h3>
              <div className="space-y-4">
                {microcompetencies.map((microcompetency) => (
                  <Card key={microcompetency.id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{microcompetency.name}</h4>
                        <p className="text-sm text-muted-foreground">{microcompetency.description}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">{microcompetency.quadrant}</Badge>
                          <Badge variant="outline">{microcompetency.component}</Badge>
                          <Badge variant="outline">Max: {microcompetency.maxScore}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Score (0-{microcompetency.maxScore})</Label>
                          <Input
                            type="number"
                            min="0"
                            max={microcompetency.maxScore}
                            value={scoreEntries[microcompetency.id]?.obtainedScore || ""}
                            onChange={(e) => handleScoreChange(
                              microcompetency.id,
                              Number(e.target.value),
                              scoreEntries[microcompetency.id]?.feedback
                            )}
                            placeholder="Enter score"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Feedback (Optional)</Label>
                          <Textarea
                            value={scoreEntries[microcompetency.id]?.feedback || ""}
                            onChange={(e) => handleScoreChange(
                              microcompetency.id,
                              scoreEntries[microcompetency.id]?.obtainedScore || 0,
                              e.target.value
                            )}
                            placeholder="Enter feedback for student"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitInterventionScores}
                  disabled={isSubmitting || Object.keys(scoreEntries).length === 0}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Submitting..." : "Submit Scores"}
                </Button>
              </div>
            </div>
          ) : selectedTeacher && selectedIntervention ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No microcompetencies found for the selected teacher and intervention combination.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a teacher and intervention to view available microcompetencies for scoring.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InputScores;
