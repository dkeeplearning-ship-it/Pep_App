
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { studentAPI } from "@/lib/api";

const Settings: React.FC = () => {
  const [studentData, setStudentData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyScores, setNotifyScores] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load student profile data
  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        const currentStudentResponse = await studentAPI.getCurrentStudent();
        const studentId = currentStudentResponse.data.id;

        const profileResponse = await studentAPI.getStudentProfile(studentId);
        const profile = profileResponse.data;

        setStudentData(profile);
        setEmail(profile.email || "");
        setPhone(profile.phone || "");

        // Load preferences if available
        if (profile.preferences) {
          setNotifyScores(profile.preferences.notifyScores ?? true);
          setNotifyUpdates(profile.preferences.notifyUpdates ?? false);
        }
      } catch (error) {
        console.error('Failed to load student profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadStudentProfile();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentData) {
      toast.error("Student data not available");
      return;
    }

    setIsLoading(true);

    try {
      await studentAPI.updateStudentProfile(studentData.id, {
        email,
        phone,
        preferences: {
          notifyScores,
          notifyUpdates
        }
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load student data</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notification settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={studentData.name || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration">Registration No.</Label>
                  <Input id="registration" value={studentData.registrationNo || ""} disabled />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input id="batch" value={studentData.batch || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input id="course" value={studentData.course || ""} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-scores" className="flex-1">
                  Score Updates
                </Label>
                <Switch
                  id="notify-scores"
                  checked={notifyScores}
                  onCheckedChange={setNotifyScores}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-updates" className="flex-1">
                  System Notifications
                </Label>
                <Switch
                  id="notify-updates"
                  checked={notifyUpdates}
                  onCheckedChange={setNotifyUpdates}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info("Password reset feature coming soon")}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>App Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="flex-1">
                  Dark Mode
                </Label>
                <Switch id="darkMode" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
