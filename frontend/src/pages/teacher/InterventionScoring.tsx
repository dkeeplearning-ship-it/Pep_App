import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Send,
  User,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Paperclip,
  Loader2
} from "lucide-react";
import { componentAPI, interventionAPI, shlCompetencyAPI, termAPI } from "@/lib/api";
import { Component, Student, Term } from "@/types/api";

interface ComponentScore {
  componentId: string;
  obtainedScore: number;
  feedback: string;
}

interface ScoringState {
  [componentId: string]: ComponentScore;
}

const InterventionScoring: React.FC = () => {
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const interventionId = searchParams.get('interventionId');
  const microcompetencyId = searchParams.get('microcompetencyId');

  // State management
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [scores, setScores] = useState<ScoringState>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate required parameters
        if (!studentId) {
          throw new Error('Student ID is required');
        }

        // Fetch student data, terms, and components in parallel
        const [studentResponse, termsResponse] = await Promise.all([
          fetch(`/api/v1/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
          }),
          termAPI.getAllTerms()
        ]);

        if (!studentResponse.ok) {
          throw new Error('Failed to fetch student data');
        }

        const studentData = await studentResponse.json();
        setStudent(studentData.data);

        const termsData = termsResponse.data;
        setTerms(termsData);

        // Set current term as default
        const currentTerm = termsData.find(t => t.is_current) || termsData[0];
        if (currentTerm) {
          setSelectedTermId(currentTerm.id);
        }

        // Fetch components based on the scoring context
        await fetchComponents();

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);
  
  // Fetch components based on context (SHL, Physical, etc.)
  const fetchComponents = async () => {
    try {
      let componentsData: Component[] = [];

      if (microcompetencyId) {
        // If we have a specific microcompetency, get its component
        const microcompetencyResponse = await fetch(`/api/v1/microcompetencies/${microcompetencyId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (microcompetencyResponse.ok) {
          const microcompetencyData = await microcompetencyResponse.json();
          const componentId = microcompetencyData.data.component_id;

          const componentResponse = await componentAPI.getComponentById(componentId);
          componentsData = [componentResponse.data];
        }
      } else {
        // Default to Physical components (wellness assessment)
        const physicalComponentsResponse = await componentAPI.getAllComponents({
          quadrant_id: undefined, // We'll filter by category instead
          include_inactive: false
        });

        // Filter for Physical category components
        componentsData = physicalComponentsResponse.data.filter(c => c.category === 'Physical');
      }

      setComponents(componentsData);

      // Initialize scores state
      const initialScores: ScoringState = {};
      componentsData.forEach(component => {
        initialScores[component.id] = {
          componentId: component.id,
          obtainedScore: 0,
          feedback: ""
        };
      });
      setScores(initialScores);

    } catch (err) {
      console.error('Error fetching components:', err);
      toast.error('Failed to load components');
    }
  };

  // Calculate total score
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score.obtainedScore, 0);
  const maxPossibleScore = components.reduce((sum, component) => sum + component.max_score, 0);
  const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  // Handle score change
  const handleScoreChange = (componentId: string, value: number[]) => {
    setScores(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        obtainedScore: value[0]
      }
    }));
  };

  // Handle feedback change
  const handleFeedbackChange = (componentId: string, feedback: string) => {
    setScores(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        feedback
      }
    }));
  };
  
  // Handle save as draft
  const handleSaveDraft = async () => {
    if (!student || !selectedTermId) {
      toast.error("Missing required data");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save scores for each component
      const savePromises = Object.values(scores).map(async (score) => {
        const component = components.find(c => c.id === score.componentId);
        if (!component || score.obtainedScore === 0) return;

        // Use SHL competency API for SHL components, regular scoring for others
        if (component.category === 'SHL') {
          return shlCompetencyAPI.submitSHLCompetencyScore(
            student.id,
            component.id,
            {
              obtainedScore: score.obtainedScore,
              maxScore: component.max_score,
              termId: selectedTermId,
              notes: score.feedback
            }
          );
        } else {
          // Use regular component scoring API
          return fetch(`/api/v1/scores/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              student_id: student.id,
              component_id: component.id,
              obtained_score: score.obtainedScore,
              max_score: component.max_score,
              term_id: selectedTermId,
              notes: score.feedback,
              is_draft: true
            })
          });
        }
      });

      await Promise.all(savePromises.filter(Boolean));
      toast.success("Assessment saved as draft");

    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error("Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!student || !selectedTermId) {
      toast.error("Missing required data");
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate if all components have scores
      const hasAllScores = Object.values(scores).every(score => score.obtainedScore > 0);

      if (!hasAllScores) {
        toast.error("Please provide scores for all components");
        setIsSubmitting(false);
        return;
      }

      // Submit scores for each component
      const submitPromises = Object.values(scores).map(async (score) => {
        const component = components.find(c => c.id === score.componentId);
        if (!component) return;

        // Use SHL competency API for SHL components, regular scoring for others
        if (component.category === 'SHL') {
          return shlCompetencyAPI.submitSHLCompetencyScore(
            student.id,
            component.id,
            {
              obtainedScore: score.obtainedScore,
              maxScore: component.max_score,
              termId: selectedTermId,
              notes: score.feedback
            }
          );
        } else {
          // Use regular component scoring API
          return fetch(`/api/v1/scores/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              student_id: student.id,
              component_id: component.id,
              obtained_score: score.obtainedScore,
              max_score: component.max_score,
              term_id: selectedTermId,
              notes: score.feedback,
              is_draft: false
            })
          });
        }
      });

      await Promise.all(submitPromises);
      toast.success("Assessment submitted successfully");
      navigate("/teacher/students");

    } catch (err) {
      console.error('Error submitting scores:', err);
      toast.error("Failed to submit assessment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading assessment data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher/students")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Assessment Error</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error || 'Student not found'}</span>
            </div>
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
          onClick={() => navigate("/teacher/students")}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {components.length > 0 && components[0].category === 'SHL'
              ? 'SHL Competency Assessment'
              : 'Component Assessment'}
          </h1>
          <p className="text-muted-foreground">
            Score and provide feedback for {student.name} ({student.registration_no})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">Registration: {student.registration_no}</p>
                  <p className="text-sm text-muted-foreground">Course: {student.course}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Assessment Term</p>
                  <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select Term" />
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
              </div>

              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Components to Score</p>
                  <p className="text-sm text-muted-foreground">
                    {components.length} component{components.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Assessment Date</p>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Total Score</span>
                  <span className="text-sm font-medium">{totalScore}/{maxPossibleScore}</span>
                </div>
                <Progress value={scorePercentage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                {components.map(component => (
                  <div key={component.id} className="flex justify-between items-center">
                    <span className="text-sm">{component.name}</span>
                    <Badge variant={scores[component.id]?.obtainedScore > 0 ? "outline" : "secondary"}>
                      {scores[component.id]?.obtainedScore || 0}/{component.max_score}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Component Scoring</CardTitle>
              <CardDescription>
                Score each component and provide specific feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {components.map(component => (
                  <div key={component.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <Label htmlFor={`score-${component.id}`} className="text-base font-medium">
                          {component.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">{component.description}</p>
                        <Badge variant="secondary" className="text-xs">
                          {component.category} • Max: {component.max_score}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {scores[component.id]?.obtainedScore || 0}/{component.max_score}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Slider
                          id={`score-${component.id}`}
                          value={[scores[component.id]?.obtainedScore || 0]}
                          max={component.max_score}
                          step={0.5}
                          onValueChange={(value) => handleScoreChange(component.id, value)}
                        />
                      </div>
                      <div className="w-16 text-center">
                        <Input
                          type="number"
                          value={scores[component.id]?.obtainedScore || 0}
                          min={0}
                          max={component.max_score}
                          step={0.5}
                          onChange={(e) => handleScoreChange(component.id, [parseFloat(e.target.value) || 0])}
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`feedback-${component.id}`} className="text-sm">
                        Component Feedback
                      </Label>
                      <Textarea
                        id={`feedback-${component.id}`}
                        placeholder={`Provide specific feedback for ${component.name.toLowerCase()}...`}
                        value={scores[component.id]?.feedback || ""}
                        onChange={(e) => handleFeedbackChange(component.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <Separator />
                  </div>
                ))}
                
                <div className="space-y-3">
                  <Label htmlFor="overall-feedback" className="text-base font-medium">
                    Overall Feedback
                  </Label>
                  <Textarea
                    id="overall-feedback"
                    placeholder="Provide overall feedback and recommendations..."
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Attach supporting documents (optional)</span>
                  <Button variant="outline" size="sm">
                    Upload
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterventionScoring;
