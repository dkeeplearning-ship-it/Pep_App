
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect based on user role
      if (userRole === "student") {
        navigate("/student");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else if (userRole === "teacher") {
        navigate("/teacher");
      }
    } else {
      // Redirect to login page if not authenticated
      navigate("/");
    }
  }, [navigate, isAuthenticated, userRole]);

  return null;
};

export default Index;
