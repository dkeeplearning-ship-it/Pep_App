import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const SSOCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSSO } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState('Processing SSO authentication...');

  useEffect(() => {
    const processSSOCallback = async () => {
      try {
        // Get parameters from URL - Microsoft OAuth callback
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const sessionState = searchParams.get('session_state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('🔄 Microsoft OAuth Callback: Processing parameters', {
          code: code ? 'present' : 'missing',
          state,
          sessionState,
          error,
          errorDescription,
          fullUrl: window.location.href
        });

        // Check for OAuth errors
        if (error) {
          throw new Error(`Microsoft OAuth Error: ${error} - ${errorDescription || 'Unknown error'}`);
        }

        // Validate required parameters
        if (!code) {
          throw new Error('Missing authorization code from Microsoft OAuth');
        }

        setStatus('Exchanging code for access token...');

        // Exchange authorization code for access token with Microsoft
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: '1c36d723-8bc0-42b5-9d35-ddc2528dcf52',
            client_secret: 'AIq8Q~2WMOtq8sidpRZKk-6tsjylm4-zCS3AzahE',
            code: code,
            redirect_uri: 'http://localhost:8080/auth/sso-callback',
            grant_type: 'authorization_code',
            scope: 'User.Read'
          })
        });

        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.text();
          throw new Error(`Microsoft token exchange failed: ${tokenResponse.status} - ${tokenError}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Microsoft Token Exchange: Success');

        setStatus('Getting user information...');

        // Get user information from Microsoft Graph
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json'
          }
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to get user information: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        console.log('✅ Microsoft User Data: Retrieved', userData);

        setStatus('Creating user session...');

        // Send Microsoft user data to our backend for user creation/validation
        const backendResponse = await fetch('http://localhost:3001/api/v1/auth/microsoft-direct/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            microsoftUser: userData,
            tokens: tokenData,
            authParams: {
              code,
              state,
              sessionState
            }
          }),
        });

        const backendResult = await backendResponse.json();

        if (!backendResult.success) {
          throw new Error(backendResult.message || 'Backend validation failed');
        }

        console.log('✅ SSO Callback: Backend validation successful');

        setStatus('Logging in...');

        // Use the SSO login method from auth context
        if (loginWithSSO) {
          await loginWithSSO(backendResult);
        } else {
          // Fallback: manually set auth state
          localStorage.setItem('token', backendResult.data.token);
          localStorage.setItem('user', JSON.stringify(backendResult.data.user));
        }

        toast.success(`Welcome, ${backendResult.data.user.first_name || backendResult.data.user.username}!`);

        // Redirect based on user role
        const user = backendResult.data.user;
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

      } catch (error: any) {
        console.error('❌ SSO Callback Error:', error);
        
        setStatus('Authentication failed');
        setIsProcessing(false);
        
        let errorMessage = 'SSO authentication failed';
        
        if (error.message?.includes('Missing required')) {
          errorMessage = 'Invalid SSO response from Microsoft';
        } else if (error.message?.includes('KOS-Core')) {
          errorMessage = 'College authentication system error';
        } else if (error.message?.includes('Backend')) {
          errorMessage = 'Application authentication error';
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);

        // Redirect to login page with error
        setTimeout(() => {
          navigate('/login?error=sso_failed&message=' + encodeURIComponent(errorMessage));
        }, 3000);
      }
    };

    processSSOCallback();
  }, [searchParams, navigate, loginWithSSO]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Microsoft SSO Authentication
          </h2>
          
          <p className="text-muted-foreground mb-4">
            {status}
          </p>
          
          {!isProcessing && (
            <p className="text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SSOCallback;
