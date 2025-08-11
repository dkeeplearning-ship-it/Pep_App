import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Authentication Callback Page
 * Handles Microsoft SSO redirect and token processing
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get parameters from URL
        const token = searchParams.get('token');
        const userParam = searchParams.get('user');
        const error = searchParams.get('error');
        const errorMessage = searchParams.get('message');

        // Handle error cases
        if (error) {
          console.error('❌ Auth Callback Error:', error, errorMessage);
          setStatus('error');
          
          let displayMessage = 'Authentication failed';
          
          switch (error) {
            case 'oauth_error':
              displayMessage = errorMessage || 'Microsoft OAuth error occurred';
              break;
            case 'missing_code':
              displayMessage = 'Missing authorization code from Microsoft';
              break;
            case 'token_exchange_failed':
              displayMessage = 'Failed to exchange authorization code for tokens';
              break;
            case 'auth_failed':
              displayMessage = errorMessage || 'Authentication validation failed';
              break;
            case 'user_creation_failed':
              displayMessage = errorMessage || 'Failed to create or update user account';
              break;
            case 'callback_error':
              displayMessage = errorMessage || 'Authentication callback error';
              break;
            default:
              displayMessage = errorMessage || 'Unknown authentication error';
          }
          
          setMessage(displayMessage);
          toast.error(displayMessage);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          
          return;
        }

        // Handle success case
        if (token && userParam) {
          console.log('✅ Auth Callback: Processing successful authentication');
          setMessage('Authentication successful! Redirecting...');
          
          try {
            const user = JSON.parse(decodeURIComponent(userParam));
            
            // Store token and user data
            localStorage.setItem('authToken', token);
            localStorage.setItem('userData', JSON.stringify(user));
            
            setStatus('success');
            toast.success(`Welcome back, ${user.name}!`);
            
            // Redirect based on user role
            setTimeout(() => {
              switch (user.role) {
                case 'admin':
                  navigate('/admin');
                  break;
                case 'teacher':
                  navigate('/teacher');
                  break;
                case 'student':
                  navigate('/student');
                  break;
                default:
                  navigate('/');
              }
            }, 1500);
            
          } catch (parseError) {
            console.error('❌ Auth Callback: Failed to parse user data:', parseError);
            setStatus('error');
            setMessage('Failed to process user information');
            toast.error('Failed to process authentication data');
            
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
          
          return;
        }

        // No token or user data
        console.error('❌ Auth Callback: Missing token or user data');
        setStatus('error');
        setMessage('Missing authentication data');
        toast.error('Authentication data not received');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);

      } catch (error) {
        console.error('❌ Auth Callback: Unexpected error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication');
        toast.error('Authentication processing failed');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return (
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === 'processing' && 'Processing Authentication'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </h2>
          
          <p className={`mt-2 text-sm ${getStatusColor()}`}>
            {message}
          </p>
          
          {status === 'error' && (
            <div className="mt-4">
              <button
                onClick={() => navigate('/login')}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
