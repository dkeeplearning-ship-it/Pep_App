
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { studentAPI } from "@/lib/api";

const Feedback: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string>("");

  // Get current student ID
  useEffect(() => {
    const getCurrentStudent = async () => {
      try {
        const response = await studentAPI.getCurrentStudent();
        setStudentId(response.data.id);
      } catch (error) {
        console.error('Failed to get current student:', error);
        toast.error('Failed to load student information');
      }
    };

    getCurrentStudent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !category || !message) {
      toast.error("Please fill out all fields");
      return;
    }

    if (!studentId) {
      toast.error("Student information not available");
      return;
    }

    setIsSubmitting(true);

    try {
      await studentAPI.submitFeedback(studentId, {
        subject,
        category,
        message
      });

      toast.success("Feedback submitted successfully");
      setSubject("");
      setCategory("");
      setMessage("");
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Feedback</h1>
        <p className="text-muted-foreground">
          Share your thoughts, suggestions or report issues with the PEP program.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input
                  id="subject"
                  placeholder="Brief description of your feedback"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="issue">Technical Issue</SelectItem>
                    <SelectItem value="scoring">Scoring Question</SelectItem>
                    <SelectItem value="improvement">Improvement Idea</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Describe your feedback in detail"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <MessageSquare className="h-12 w-12 mb-4" />
                <h3 className="text-lg font-bold mb-2">We Value Your Input</h3>
                <p className="text-sm">
                  Your feedback helps us improve the PEP program and provide better support for your development.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">PEP Program Coordinator</h4>
                  <p className="text-sm text-muted-foreground">
                    Dr. Aisha Sharma
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Email</h4>
                  <p className="text-sm text-muted-foreground">
                    pep.support@university.edu
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Office Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Monday - Friday: 9:00 AM - 5:00 PM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
