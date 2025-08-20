import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Phone, 
  MapPin, 
  Users, 
  Home, 
  GraduationCap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface ReferenceData {
  batches: Array<{ id: string; name: string; year: string }>;
  sections: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string; color: string }>;
  genderOptions: string[];
}

interface ProfileRequest {
  id: string;
  requested_changes: Record<string, any>;
  current_values: Record<string, any>;
  request_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  review_reason?: string;
  reviewed_by_user?: {
    username: string;
    email: string;
  };
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const ProfileUpdate: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    batch_id: '',
    section_id: '',
    house_id: '',
    gender: '',
    phone: '',
    preferences: {
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    }
  });
  const [reason, setReason] = useState('');

  const getAuthToken = () => token;

  // Load reference data
  useEffect(() => {
    loadReferenceData();
    loadProfileRequests();
  }, []);

  const loadReferenceData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/student/profile/reference-data`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReferenceData(data.data);
      } else {
        toast.error('Failed to load reference data');
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
      toast.error('Error loading reference data');
    }
  };

  const loadProfileRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/student/profile/requests`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileRequests(data.requests);
      } else {
        toast.error('Failed to load profile requests');
      }
    } catch (error) {
      console.error('Error loading profile requests:', error);
      toast.error('Error loading profile requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for the profile update');
      return;
    }

    // Build requested changes object (only include non-empty values)
    const requestedChanges: Record<string, any> = {};

    if (formData.batch_id) requestedChanges.batch_id = formData.batch_id;
    if (formData.section_id) requestedChanges.section_id = formData.section_id;
    if (formData.house_id) requestedChanges.house_id = formData.house_id;
    if (formData.gender) requestedChanges.gender = formData.gender;
    if (formData.phone) requestedChanges.phone = formData.phone;

    // Handle preferences
    const preferences: Record<string, string> = {};
    if (formData.preferences.address) preferences.address = formData.preferences.address;
    if (formData.preferences.emergency_contact_name) preferences.emergency_contact_name = formData.preferences.emergency_contact_name;
    if (formData.preferences.emergency_contact_phone) preferences.emergency_contact_phone = formData.preferences.emergency_contact_phone;

    if (Object.keys(preferences).length > 0) {
      requestedChanges.preferences = preferences;
    }

    if (Object.keys(requestedChanges).length === 0) {
      toast.error('Please select at least one field to update');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/student/profile/update-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          requestedChanges,
          reason
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Profile update request submitted successfully!');
        
        // Reset form
        setFormData({
          batch_id: '',
          section_id: '',
          house_id: '',
          gender: '',
          phone: '',
          preferences: {
            address: '',
            emergency_contact_name: '',
            emergency_contact_phone: ''
          }
        });
        setReason('');
        
        // Reload requests
        loadProfileRequests();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit profile update request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Error submitting profile update request');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile Update</h1>
        <p className="text-muted-foreground">Request updates to your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Update Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Request Profile Update
            </CardTitle>
            <CardDescription>
              Submit a request to update your profile information. All changes require admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batch">Batch</Label>
                    <Select value={formData.batch_id} onValueChange={(value) => setFormData({...formData, batch_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData?.batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name} ({batch.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Select value={formData.section_id} onValueChange={(value) => setFormData({...formData, section_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData?.sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="house">House</Label>
                  <Select value={formData.house_id} onValueChange={(value) => setFormData({...formData, house_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceData?.houses.map((house) => (
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceData?.genderOptions.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your address"
                    value={formData.preferences.address}
                    onChange={(e) => setFormData({
                      ...formData, 
                      preferences: {...formData.preferences, address: e.target.value}
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      placeholder="Emergency contact name"
                      value={formData.preferences.emergency_contact_name}
                      onChange={(e) => setFormData({
                        ...formData, 
                        preferences: {...formData.preferences, emergency_contact_name: e.target.value}
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.preferences.emergency_contact_phone}
                      onChange={(e) => setFormData({
                        ...formData, 
                        preferences: {...formData.preferences, emergency_contact_phone: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reason */}
              <div>
                <Label htmlFor="reason">Reason for Update *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you need to update your profile..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Update Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Request History
            </CardTitle>
            <CardDescription>
              Track the status of your profile update requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : profileRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No profile update requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Requested Changes:</p>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(request.requested_changes).map(field => (
                            <span key={field} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                              {formatFieldName(field)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-muted-foreground">{request.request_reason}</p>
                      </div>

                      {request.status !== 'pending' && request.review_reason && (
                        <div>
                          <p className="text-sm font-medium">Admin Response:</p>
                          <p className="text-sm text-muted-foreground">{request.review_reason}</p>
                          {request.reviewed_by_user && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reviewed by: {request.reviewed_by_user.username}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileUpdate;
