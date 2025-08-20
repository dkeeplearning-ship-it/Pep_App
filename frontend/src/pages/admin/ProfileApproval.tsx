import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  User,
  Calendar,
  MessageSquare,
  Filter,
  Users,
  UserCheck,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface ProfileRequest {
  id: string;
  student_id: string;
  requested_changes: Record<string, any>;
  current_values: Record<string, any>;
  request_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  review_reason?: string;
  student: {
    id: string;
    name: string;
    registration_no: string;
    course: string;
  };
  requested_by_user: {
    username: string;
    email: string;
  };
  reviewed_by_user?: {
    username: string;
    email: string;
  };
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const ProfileApproval: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ProfileRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Review modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProfileRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Details modal state
  const [detailsModal, setDetailsModal] = useState(false);

  const getAuthToken = () => token;

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/student/profile/admin/requests?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        toast.error('Failed to load profile requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Error loading profile requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest || !reviewReason.trim()) {
      toast.error('Please provide a reason for your decision');
      return;
    }

    try {
      setReviewLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/student/profile/admin/requests/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewReason
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Profile update request ${reviewAction}d successfully`);
        setReviewModal(false);
        setSelectedRequest(null);
        setReviewReason('');
        loadRequests();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${reviewAction} request`);
      }
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error(`Error ${reviewAction}ing request`);
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = (request: ProfileRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewModal(true);
  };

  const openDetailsModal = (request: ProfileRequest) => {
    setSelectedRequest(request);
    setDetailsModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      batch_id: 'Batch',
      section_id: 'Section',
      house_id: 'House',
      gender: 'Gender',
      phone: 'Phone',
      preferences: 'Personal Information'
    };
    return fieldNames[field] || field;
  };

  const formatFieldValue = (field: string, value: any) => {
    if (field === 'preferences' && typeof value === 'object') {
      return Object.entries(value).map(([key, val]) => `${key}: ${val}`).join(', ');
    }
    return String(value);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profile Approval</h1>
          <p className="text-muted-foreground">Review and approve student profile update requests</p>
        </div>
        <Button onClick={loadRequests} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Update Requests</CardTitle>
          <CardDescription>Review and manage student profile update requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No profile update requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Requested Changes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.student.name}</p>
                          <p className="text-sm text-muted-foreground">{request.student.registration_no}</p>
                          <p className="text-sm text-muted-foreground">{request.student.course}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Object.keys(request.requested_changes).map(field => (
                            <Badge key={field} variant="outline" className="mr-1">
                              {formatFieldName(field)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(request.created_at).toLocaleDateString()}</p>
                          <p className="text-muted-foreground">{new Date(request.created_at).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsModal(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReviewModal(request, 'approve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReviewModal(request, 'reject')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModal} onOpenChange={setReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Profile Update Request
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Approve this profile update request and apply the changes to the student profile.'
                : 'Reject this profile update request and provide a reason for the rejection.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <p className="text-sm">{selectedRequest.student.name} ({selectedRequest.student.registration_no})</p>
              </div>
              
              <div>
                <Label>Requested Changes</Label>
                <div className="space-y-2 mt-1">
                  {Object.entries(selectedRequest.requested_changes).map(([field, value]) => (
                    <div key={field} className="text-sm border rounded p-2">
                      <strong>{formatFieldName(field)}:</strong> {formatFieldValue(field, value)}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Student's Reason</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.request_reason}</p>
              </div>
              
              <div>
                <Label htmlFor="reviewReason">
                  {reviewAction === 'approve' ? 'Approval' : 'Rejection'} Reason *
                </Label>
                <Textarea
                  id="reviewReason"
                  placeholder={`Enter reason for ${reviewAction}ing this request...`}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReview} 
              disabled={reviewLoading}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {reviewLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : reviewAction === 'approve' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModal} onOpenChange={setDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Update Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Student</Label>
                  <p className="text-sm">{selectedRequest.student.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.student.registration_no}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-1 capitalize">{selectedRequest.status}</span>
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Requested Changes</Label>
                <div className="space-y-2 mt-1">
                  {Object.entries(selectedRequest.requested_changes).map(([field, value]) => (
                    <div key={field} className="text-sm border rounded p-2">
                      <strong>{formatFieldName(field)}:</strong> {formatFieldValue(field, value)}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Student's Reason</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.request_reason}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Submitted</Label>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">By: {selectedRequest.requested_by_user.username}</p>
                </div>
                {selectedRequest.reviewed_at && (
                  <div>
                    <Label>Reviewed</Label>
                    <p className="text-sm">{new Date(selectedRequest.reviewed_at).toLocaleString()}</p>
                    {selectedRequest.reviewed_by_user && (
                      <p className="text-sm text-muted-foreground">By: {selectedRequest.reviewed_by_user.username}</p>
                    )}
                  </div>
                )}
              </div>
              
              {selectedRequest.review_reason && (
                <div>
                  <Label>Admin Response</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedRequest.review_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileApproval;
