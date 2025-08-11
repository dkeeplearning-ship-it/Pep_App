import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Settings,
  Clock,
  Bell,
  Shield,
  FileText,
  Save,
  ArrowLeft,
  Calendar,
  Users,
  AlertTriangle,
  Trash2,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { interventionAPI } from '@/lib/api';
import { useTerm } from '@/contexts/TermContext';

interface InterventionSettings {
  id: string;
  name: string;
  status: string;
  scoring_deadline?: string;
  is_scoring_open: boolean;
  late_submission_allowed: boolean;
  late_penalty_percentage: number;
  auto_grade_enabled: boolean;
  notification_settings: {
    email_reminders: boolean;
    deadline_alerts: boolean;
    grade_notifications: boolean;
    reminder_days_before: number;
  };
  access_settings: {
    student_can_view_scores: boolean;
    teacher_can_modify_deadlines: boolean;
    require_approval_for_changes: boolean;
  };
  assessment_rules: {
    min_score: number;
    max_score: number;
    passing_score: number;
    allow_resubmission: boolean;
    max_attempts: number;
  };
}

const InterventionSettings: React.FC = () => {
  const { interventionId } = useParams<{ interventionId: string }>();
  const navigate = useNavigate();
  const { selectedTerm } = useTerm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intervention, setIntervention] = useState<any>(null);
  const [settings, setSettings] = useState<InterventionSettings | null>(null);

  useEffect(() => {
    if (interventionId) {
      fetchInterventionSettings();
    }
  }, [interventionId]);

  const fetchInterventionSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await interventionAPI.getInterventionById(interventionId!);
      const interventionData = response.data;

      setIntervention(interventionData);

      // Helper function to convert ISO string to datetime-local format
      const convertToLocalDateTime = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        try {
          const date = new Date(isoString);
          // Format for datetime-local input (YYYY-MM-DDTHH:MM)
          return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        } catch (error) {
          console.error('Error converting date:', error);
          return '';
        }
      };

      // Initialize settings with defaults if not present
      setSettings({
        id: interventionData.id,
        name: interventionData.name,
        status: interventionData.status,
        scoring_deadline: convertToLocalDateTime((interventionData as any).scoring_deadline),
        is_scoring_open: (interventionData as any).is_scoring_open || false,
        late_submission_allowed: (interventionData as any).late_submission_allowed || false,
        late_penalty_percentage: (interventionData as any).late_penalty_percentage || 10,
        auto_grade_enabled: (interventionData as any).auto_grade_enabled || false,
        notification_settings: (interventionData as any).notification_settings || {
          email_reminders: true,
          deadline_alerts: true,
          grade_notifications: true,
          reminder_days_before: 3
        },
        access_settings: (interventionData as any).access_settings || {
          student_can_view_scores: true,
          teacher_can_modify_deadlines: false,
          require_approval_for_changes: true
        },
        assessment_rules: (interventionData as any).assessment_rules || {
          min_score: 0,
          max_score: 10,
          passing_score: 6,
          allow_resubmission: false,
          max_attempts: 1
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch intervention settings:', error);

      if (error.message?.includes('not found') || error.status === 404) {
        setError('Intervention not found. It may have been deleted or the ID is incorrect.');
      } else {
        setError('Failed to load intervention settings. Please try again.');
      }

      toast({
        title: "Error",
        description: error.message?.includes('not found')
          ? "Intervention not found"
          : "Failed to load intervention settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      // Helper function to convert datetime-local format to ISO string
      const convertToISOString = (localDateTime: string) => {
        if (!localDateTime) return null;
        try {
          // Create date from local datetime input
          const date = new Date(localDateTime);
          return date.toISOString();
        } catch (error) {
          console.error('Error converting local datetime to ISO:', error);
          return null;
        }
      };

      // Convert scoring deadline properly
      const deadlineValue = convertToISOString(settings.scoring_deadline);

      // Update intervention with new settings (only fields that exist in database)
      await interventionAPI.updateIntervention(interventionId!, {
        scoring_deadline: deadlineValue,
        is_scoring_open: settings.is_scoring_open
        // Note: The following fields don't exist in the database yet:
        // late_submission_allowed, late_penalty_percentage, auto_grade_enabled,
        // notification_settings, access_settings, assessment_rules
      });

      toast({
        title: "Success",
        description: "Intervention settings updated successfully",
      });

      // Refresh the data to ensure consistency
      await fetchInterventionSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save intervention settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!settings) return;

    try {
      setChangingStatus(true);

      await interventionAPI.updateInterventionStatus(interventionId!, newStatus);

      // Update local state
      setSettings(prev => prev ? { ...prev, status: newStatus } : prev);
      setIntervention(prev => prev ? { ...prev, status: newStatus } : prev);

      toast({
        title: "Success",
        description: `Intervention status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to change status:', error);
      toast({
        title: "Error",
        description: "Failed to change intervention status",
        variant: "destructive",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDeleteIntervention = async () => {
    if (!settings) return;

    try {
      setDeleting(true);

      await interventionAPI.deleteIntervention(interventionId!);

      toast({
        title: "Success",
        description: "Intervention deleted successfully",
      });

      // Navigate back to interventions list
      navigate('/admin/interventions');
    } catch (error) {
      console.error('Failed to delete intervention:', error);
      toast({
        title: "Error",
        description: "Failed to delete intervention",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => {
      if (!prev) return prev;
      
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading intervention settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Intervention</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-x-4">
              <Button onClick={() => navigate('/admin/interventions')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Interventions
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Settings Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load intervention settings.</p>
          <Button onClick={() => navigate('/admin/interventions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interventions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/interventions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Intervention Settings
            </h1>
            <p className="text-gray-600">
              Configure settings for "{settings.name}"
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {selectedTerm?.name || 'Current Term'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={settings.status === 'Active' ? 'default' : 'secondary'}>
            {settings.status}
          </Badge>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scoring" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Assessment Rules
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Management
          </TabsTrigger>
        </TabsList>

        {/* Scoring Settings */}
        <TabsContent value="scoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scoring Configuration
              </CardTitle>
              <CardDescription>
                Configure scoring deadlines and submission policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="scoring-deadline">Scoring Deadline</Label>
                  <Input
                    id="scoring-deadline"
                    type="datetime-local"
                    value={settings.scoring_deadline || ''}
                    onChange={(e) => updateSettings('scoring_deadline', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="late-penalty">Late Penalty (%)</Label>
                  <Input
                    id="late-penalty"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.late_penalty_percentage}
                    onChange={(e) => updateSettings('late_penalty_percentage', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scoring Window Open</Label>
                    <p className="text-sm text-gray-600">Allow teachers to submit scores</p>
                  </div>
                  <Switch
                    checked={settings.is_scoring_open}
                    onCheckedChange={(checked) => updateSettings('is_scoring_open', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Late Submissions</Label>
                    <p className="text-sm text-gray-600">Permit submissions after deadline</p>
                  </div>
                  <Switch
                    checked={settings.late_submission_allowed}
                    onCheckedChange={(checked) => updateSettings('late_submission_allowed', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Grade Enabled</Label>
                    <p className="text-sm text-gray-600">Automatically calculate final grades</p>
                  </div>
                  <Switch
                    checked={settings.auto_grade_enabled}
                    onCheckedChange={(checked) => updateSettings('auto_grade_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure email alerts and reminders for this intervention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Reminders</Label>
                    <p className="text-sm text-gray-600">Send reminder emails to teachers and students</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.email_reminders}
                    onCheckedChange={(checked) => updateSettings('notification_settings.email_reminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Deadline Alerts</Label>
                    <p className="text-sm text-gray-600">Alert users about approaching deadlines</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.deadline_alerts}
                    onCheckedChange={(checked) => updateSettings('notification_settings.deadline_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Grade Notifications</Label>
                    <p className="text-sm text-gray-600">Notify students when grades are published</p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.grade_notifications}
                    onCheckedChange={(checked) => updateSettings('notification_settings.grade_notifications', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="reminder-days">Reminder Days Before Deadline</Label>
                <Input
                  id="reminder-days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.notification_settings.reminder_days_before}
                  onChange={(e) => updateSettings('notification_settings.reminder_days_before', parseInt(e.target.value) || 3)}
                />
                <p className="text-sm text-gray-600">
                  Send reminders this many days before the deadline
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Settings */}
        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Control
              </CardTitle>
              <CardDescription>
                Configure permissions and access levels for this intervention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Students Can View Scores</Label>
                    <p className="text-sm text-gray-600">Allow students to see their intervention scores</p>
                  </div>
                  <Switch
                    checked={settings.access_settings.student_can_view_scores}
                    onCheckedChange={(checked) => updateSettings('access_settings.student_can_view_scores', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Teachers Can Modify Deadlines</Label>
                    <p className="text-sm text-gray-600">Allow assigned teachers to adjust deadlines</p>
                  </div>
                  <Switch
                    checked={settings.access_settings.teacher_can_modify_deadlines}
                    onCheckedChange={(checked) => updateSettings('access_settings.teacher_can_modify_deadlines', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval for Changes</Label>
                    <p className="text-sm text-gray-600">Admin approval required for major changes</p>
                  </div>
                  <Switch
                    checked={settings.access_settings.require_approval_for_changes}
                    onCheckedChange={(checked) => updateSettings('access_settings.require_approval_for_changes', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment Rules Settings */}
        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assessment Rules
              </CardTitle>
              <CardDescription>
                Configure scoring rules and assessment criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min-score">Minimum Score</Label>
                  <Input
                    id="min-score"
                    type="number"
                    min="0"
                    value={settings.assessment_rules.min_score}
                    onChange={(e) => updateSettings('assessment_rules.min_score', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-score">Maximum Score</Label>
                  <Input
                    id="max-score"
                    type="number"
                    min="1"
                    value={settings.assessment_rules.max_score}
                    onChange={(e) => updateSettings('assessment_rules.max_score', parseFloat(e.target.value) || 10)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passing-score">Passing Score</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    min="0"
                    value={settings.assessment_rules.passing_score}
                    onChange={(e) => updateSettings('assessment_rules.passing_score', parseFloat(e.target.value) || 6)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Resubmission</Label>
                    <p className="text-sm text-gray-600">Allow students to resubmit assessments</p>
                  </div>
                  <Switch
                    checked={settings.assessment_rules.allow_resubmission}
                    onCheckedChange={(checked) => updateSettings('assessment_rules.allow_resubmission', checked)}
                  />
                </div>

                {settings.assessment_rules.allow_resubmission && (
                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">Maximum Attempts</Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.assessment_rules.max_attempts}
                      onChange={(e) => updateSettings('assessment_rules.max_attempts', parseInt(e.target.value) || 1)}
                    />
                    <p className="text-sm text-gray-600">
                      Maximum number of submission attempts allowed
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Settings */}
        <TabsContent value="management">
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Status Management
                </CardTitle>
                <CardDescription>
                  Change the intervention status and manage its lifecycle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Current Status</Label>
                    <p className="text-sm text-gray-600">
                      Change the intervention status to control access and functionality
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={settings.status === 'Active' ? 'default' : 'secondary'}>
                      {settings.status}
                    </Badge>
                    <Select
                      value={settings.status}
                      onValueChange={handleStatusChange}
                      disabled={changingStatus}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-blue-900">Status Information</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Draft:</strong> Intervention is being configured and not visible to teachers/students</p>
                        <p><strong>Active:</strong> Intervention is live and accessible to assigned users</p>
                        <p><strong>Completed:</strong> Intervention has ended, scores are finalized</p>
                        <p><strong>Archived:</strong> Intervention is archived for historical reference</p>
                        <p><strong>Cancelled:</strong> Intervention was cancelled and is no longer active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  Irreversible actions that will permanently affect this intervention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium text-red-900">Delete Intervention</h4>
                      <p className="text-sm text-red-700">
                        Permanently delete this intervention and all associated data including scores, enrollments, and assignments.
                        This action cannot be undone.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleting ? 'Deleting...' : 'Delete Intervention'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Intervention
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <div>
                              Are you sure you want to delete the intervention <strong>"{settings.name}"</strong>?
                            </div>
                            <div className="text-red-600 font-medium">
                              This will permanently delete:
                            </div>
                            <div className="text-sm space-y-1 text-red-600">
                              <div>• All student enrollments and scores</div>
                              <div>• All teacher assignments</div>
                              <div>• All microcompetency configurations</div>
                              <div>• All intervention settings and data</div>
                            </div>
                            <div className="font-medium text-red-700">
                              This action cannot be undone.
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteIntervention}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Yes, Delete Intervention
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterventionSettings;
