import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpDown,
  Calendar,
  Plus,
  RefreshCw,
  Mail
} from "lucide-react";
import { teacherAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// Types for feedback data
interface FeedbackItem {
  id: string;
  student_id: string;
  student_name: string;
  registration_no: string;
  subject: string;
  message: string;
  category: 'Academic' | 'Behavioral' | 'General';
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  submitted_at: string;
  read_at?: string;
}

interface FeedbackData {
  feedback: FeedbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface NewFeedbackForm {
  studentId: string;
  subject: string;
  message: string;
  category: 'Academic' | 'Behavioral' | 'General';
  priority: 'Low' | 'Medium' | 'High';
}

const TeacherFeedback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isNewFeedbackOpen, setIsNewFeedbackOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New feedback form
  const [newFeedback, setNewFeedback] = useState<NewFeedbackForm>({
    studentId: "",
    subject: "",
    message: "",
    category: "General",
    priority: "Medium"
  });

  // Fetch feedback data
  useEffect(() => {
    if (user?.id) {
      fetchFeedback();
    }
  }, [user, currentPage, pageSize, selectedTab]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await teacherAPI.getFeedback(user.id, {
        page: currentPage,
        limit: pageSize,
        status: selectedTab === 'all' ? undefined : selectedTab,
      });

      setFeedbackData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    fetchFeedback();
  };
  
  // Handle sending new feedback
  const handleSendNewFeedback = async () => {
    try {
      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }

      if (!newFeedback.studentId) {
        toast.error("Please select a student");
        return;
      }

      if (!newFeedback.subject.trim()) {
        toast.error("Please enter a subject");
        return;
      }

      if (!newFeedback.message.trim()) {
        toast.error("Please enter a message");
        return;
      }

      setIsSubmitting(true);

      await teacherAPI.sendFeedback(user.id, {
        studentId: newFeedback.studentId,
        subject: newFeedback.subject,
        message: newFeedback.message,
        category: newFeedback.category,
        priority: newFeedback.priority,
      });

      toast.success("Feedback sent successfully");

      // Reset form
      setNewFeedback({
        studentId: "",
        subject: "",
        message: "",
        category: "General",
        priority: "Medium"
      });
      setIsNewFeedbackOpen(false);

      // Refresh feedback list
      fetchFeedback();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">Loading your feedback...</p>
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
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">Manage and send feedback to your students</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={fetchFeedback}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!feedbackData || feedbackData.feedback.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Feedback Management</h1>
            <p className="text-muted-foreground">No feedback messages yet</p>
          </div>
          <Dialog open={isNewFeedbackOpen} onOpenChange={setIsNewFeedbackOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Send Feedback
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Feedback Messages</h3>
            <p className="text-muted-foreground text-center">
              You haven't sent or received any feedback messages yet. Start by sending feedback to your students.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback Management</h1>
        <p className="text-muted-foreground">
          Manage and send feedback to your students
        </p>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="compose">Compose New</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inbox" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Messages</CardTitle>
                    <Badge>{feedbackData?.feedback.filter(f => f.status === "unread").length || 0} Unread</Badge>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search messages..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="sent">Sent</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="h-[calc(100%-130px)] overflow-auto">
                  <div className="space-y-2">
                    {feedbackData?.feedback && feedbackData.feedback.length > 0 ? (
                      feedbackData.feedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedFeedback?.id === feedback.id
                              ? 'bg-primary text-primary-foreground'
                              : feedback.status === 'unread'
                                ? 'bg-muted hover:bg-muted/80'
                                : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedFeedback(feedback)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium">{feedback.student_name}</div>
                            <div className="text-xs">
                              {new Date(feedback.submitted_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm truncate">{feedback.subject}</div>
                          <div className="text-xs truncate mt-1">
                            {feedback.message.substring(0, 60)}...
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <Badge variant={feedback.priority === 'High' ? 'destructive' : feedback.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                              {feedback.priority}
                            </Badge>
                            {feedback.status === "unread" && (
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No messages found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card className="h-full">
                {selectedFeedback ? (
                  <>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{selectedFeedback.subject}</CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <span className="font-medium">{selectedFeedback.studentName}</span>
                            <span className="mx-2">•</span>
                            <span>{selectedFeedback.registrationNo}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(selectedFeedback.date).toLocaleDateString()}</span>
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{selectedFeedback.quadrant}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p>{selectedFeedback.message}</p>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label htmlFor="reply">Reply</Label>
                          <Textarea
                            id="reply"
                            placeholder="Type your reply here..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="min-h-[120px]"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button onClick={handleSendReply}>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reply
                      </Button>
                    </CardFooter>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No message selected</h3>
                      <p className="text-muted-foreground">
                        Select a message from the list to view its contents
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose New Feedback</CardTitle>
              <CardDescription>
                Send feedback or assessment notes to a student
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Select value={newFeedback.studentId} onValueChange={(value) => setNewFeedback(prev => ({ ...prev, studentId: value }))}>
                    <SelectTrigger id="student">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {feedbackData?.feedback.map(feedback => (
                        <SelectItem key={feedback.student_id} value={feedback.student_id}>
                          {feedback.student_name} ({feedback.registration_no})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newFeedback.category} onValueChange={(value: 'Academic' | 'Behavioral' | 'General') => setNewFeedback(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Behavioral">Behavioral</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter subject"
                    value={newFeedback.subject}
                    onChange={(e) => setNewFeedback(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newFeedback.priority} onValueChange={(value: 'Low' | 'Medium' | 'High') => setNewFeedback(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your feedback message here..."
                  value={newFeedback.message}
                  onChange={(e) => setNewFeedback(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[200px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setNewFeedback({
                  studentId: "",
                  subject: "",
                  message: "",
                  category: "General",
                  priority: "Medium"
                });
              }}>
                Clear
              </Button>
              <Button onClick={handleSendNewFeedback} disabled={isSubmitting}>
                {isSubmitting ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherFeedback;
