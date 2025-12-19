import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('examSession');
      const userName = sessionStorage.getItem('userName');

      if (!token || !userName) {
        setIsAuthorized(false);
        setIsValidating(false);
        return;
      }

      try {
        // Validate session token via edge function
        const { data, error } = await supabase.functions.invoke('verify-pin', {
          body: { action: 'validate', token }
        });

        if (error || !data?.valid) {
          // Clear invalid session
          sessionStorage.removeItem('examSession');
          sessionStorage.removeItem('userName');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error('Session validation error:', err);
        setIsAuthorized(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, []);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
