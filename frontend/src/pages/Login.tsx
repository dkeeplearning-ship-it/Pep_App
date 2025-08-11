
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Lock, User, AlertCircle, Shield, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import MicrosoftSSOButton from "@/components/auth/MicrosoftSSOButton";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'auto' | 'super' | 'local'>('auto');
  const { login, loginWithSSO, isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle SSO errors from URL parameters
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      const errorMessage = message ? decodeURIComponent(message) : 'Authentication failed';
      toast.error(errorMessage);

      // Clear error parameters from URL
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && userRole) {
      switch (userRole) {
        case 'admin':
          navigate("/admin");
          break;
        case 'teacher':
          navigate("/teacher");
          break;
        case 'student':
          navigate("/student");
          break;
      }
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username, password);
      // Redirection will be handled by the useEffect hook
      // once the auth context is updated with the user role
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSSOSuccess = async (result: any) => {
    console.log('✅ Microsoft SSO Success:', result);

    try {
      const success = await loginWithSSO(result);
      if (success) {
        // Redirection will be handled by the useEffect hook
        // once the auth context is updated with the user role
        console.log('✅ SSO login successful, waiting for redirect...');
      }
    } catch (error) {
      console.error('❌ SSO login processing error:', error);
      toast.error('Failed to process SSO login');
    }
  };

  const handleMicrosoftSSOError = (error: any) => {
    console.error('❌ Microsoft SSO Error:', error);
    // Error is already handled by the MicrosoftSSOButton component
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">PEP Score Nexus</CardTitle>
          <p className="text-muted-foreground">Personality Enhancement Program</p>
        </CardHeader>
        <CardContent>
          {/* Login Type Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Login Type</label>
            <Select value={loginType} onValueChange={(value: 'auto' | 'super' | 'local') => setLoginType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Auto-detect (KOS/Local)
                  </div>
                </SelectItem>
                <SelectItem value="super">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    Super Admin
                  </div>
                </SelectItem>
                <SelectItem value="local">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Local Account
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {loginType === 'super' && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium">Super Admin Login</span>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Use this for system administration access
                </p>
              </div>
            )}
            {loginType === 'local' && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">Local Account Login</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  For local test accounts and non-KOS users
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    loginType === 'super' ? 'superadmin' :
                    loginType === 'local' ? 'Username' :
                    'Username or Email'
                  }
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Super Admin Help */}
          {loginType === 'super' && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Super Admin Access</span>
              </div>
              <div className="text-xs text-purple-600 space-y-1">
                <p><strong>Username:</strong> superadmin</p>
                <p><strong>Default Password:</strong> PEP@Admin2024!</p>
                <p className="text-purple-500">⚠️ Change password after first login</p>
              </div>
            </div>
          )}

          {/* Microsoft SSO Section - Hidden for Super Admin */}
          {loginType !== 'super' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <MicrosoftSSOButton
                onSuccess={handleMicrosoftSSOSuccess}
                onError={handleMicrosoftSSOError}
                disabled={isLoading}
                className="mb-4"
              />

              <div className="text-center text-xs text-muted-foreground mb-4">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Use your @vijaybhoomi.edu.in email for SSO login</span>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo Credentials:</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-muted p-2 rounded-md">
                <p className="font-medium">Student</p>
                <p>Username: student1</p>
                <p>Password: password123</p>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <p className="font-medium">Teacher</p>
                <p>Username: teacher1</p>
                <p>Password: password123</p>
              </div>
              <div className="bg-muted p-2 rounded-md">
                <p className="font-medium">Admin</p>
                <p>Username: admin1</p>
                <p>Password: password123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
