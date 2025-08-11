import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MicrosoftSSOButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
}

const MicrosoftSSOButton: React.FC<MicrosoftSSOButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 KOS-Core SSO: Redirecting to college SSO system...');

      // Based on the KOS response, it expects redirect to SSORedirect endpoint
      // The KOS system shows: REDIRECT_URL = "https://kos.vijaybhoumi.edu.in/SSORedirect?name=Microsoft%20SSO"
      // But we need to use our callback URL

      // The KOS system is showing the Microsoft OAuth URL directly, let's use that
      // From the response: redirect_url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=1c36d723-8bc0-42b5-9d35-ddc2528dcf52&response_type=code&redirect_uri=http://localhost:8080/auth/sso-callback&responsemode=query&scope=User.Read"

      // Let's redirect directly to Microsoft OAuth with the correct parameters
      const microsoftOAuthURL = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=1c36d723-8bc0-42b5-9d35-ddc2528dcf52&response_type=code&redirect_uri=${encodeURIComponent('http://localhost:8080/auth/sso-callback')}&response_mode=query&scope=User.Read&prompt=select_account`;

      console.log('🔗 Direct Microsoft OAuth URL:', microsoftOAuthURL);

      window.location.href = microsoftOAuthURL;

    } catch (error: any) {
      console.error('❌ KOS-Core SSO Error:', error);

      toast.error('Failed to initiate Microsoft SSO login');

      // Call error callback
      if (onError) {
        onError(error);
      }

      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={handleMicrosoftLogin}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 23 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11 11h11V0H11v11z" fill="#f25022" />
          <path d="M0 11h11V0H0v11z" fill="#00a4ef" />
          <path d="M11 22h11V11H11v11z" fill="#ffb900" />
          <path d="M0 22h11V11H0v11z" fill="#7fba00" />
        </svg>
      )}
      {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
    </Button>
  );
};

export default MicrosoftSSOButton;
