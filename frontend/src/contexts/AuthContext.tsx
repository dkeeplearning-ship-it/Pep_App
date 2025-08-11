
import React, { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";
import { authService } from "@/lib/auth";

type UserRole = "student" | "admin" | "teacher" | null;

interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: string;
  // Role-specific profile data
  profile?: {
    // Teacher profile
    name?: string;
    employee_id?: string;
    department?: string;
    specialization?: string;
    // Student profile
    registration_no?: string;
    course?: string;
    batch?: string;
    section?: string;
    // Admin profile
    full_name?: string;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithSSO: (ssoData: any) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing session on load
  React.useEffect(() => {
    const savedToken = authService.getToken();
    const savedUser = authService.getUser();
    
    if (savedToken && savedUser) {
      setIsAuthenticated(true);
      setUserRole(savedUser.role);
      setUserId(savedUser.id);
      setUser(savedUser);
      setToken(savedToken);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(username, password);
      
      if (response.success) {
        const { user: userData, token: authToken, refreshToken } = response.data;

        // Store in localStorage
        authService.setToken(authToken);
        authService.setUser(userData);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Update state
        setIsAuthenticated(true);
        setUserRole(userData.role);
        setUserId(userData.id);
        setUser(userData);
        setToken(authToken);

        toast.success(`Logged in as ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}`);
        return true;
      } else {
        toast.error(response.message || "Invalid credentials");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
      return false;
    }
  };

  const loginWithSSO = async (ssoData: any): Promise<boolean> => {
    try {
      console.log('🔐 AuthContext: Processing SSO login', ssoData);

      if (ssoData.success && ssoData.data) {
        const { user: userData, token: authToken, refreshToken } = ssoData.data;

        // Store in localStorage
        authService.setToken(authToken);
        authService.setUser(userData);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Update state
        setIsAuthenticated(true);
        setUserRole(userData.role);
        setUserId(userData.id);
        setUser(userData);
        setToken(authToken);

        toast.success(`Welcome, ${userData.name}!`);
        return true;
      } else {
        toast.error(ssoData.message || "SSO authentication failed");
        return false;
      }
    } catch (error) {
      console.error("SSO login error:", error);
      toast.error("SSO authentication failed. Please try again.");
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setUser(null);
    setToken(null);
    toast.info("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, user, token, login, loginWithSSO, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
