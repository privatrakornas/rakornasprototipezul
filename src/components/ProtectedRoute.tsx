import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const VALIDATION_INTERVAL = 60000; // Validate every minute

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('examSession');
    sessionStorage.removeItem('userName');
    setIsAuthorized(false);
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const token = sessionStorage.getItem('examSession');
    const userName = sessionStorage.getItem('userName');

    if (!token || !userName) {
      return false;
    }

    try {
      // Validate session token via edge function
      const { data, error } = await supabase.functions.invoke('verify-pin', {
        body: { action: 'validate', token }
      });

      if (error || !data?.valid) {
        clearSession();
        return false;
      }
      return true;
    } catch (err) {
      console.error('Session validation error:', err);
      return false;
    }
  }, [clearSession]);

  // Initial validation
  useEffect(() => {
    const initialValidation = async () => {
      const valid = await validateSession();
      setIsAuthorized(valid);
      setIsValidating(false);
    };

    initialValidation();
  }, [validateSession]);

  // Periodic token validation to prevent stale sessions
  useEffect(() => {
    if (!isAuthorized) return;

    const intervalId = setInterval(async () => {
      const valid = await validateSession();
      if (!valid) {
        navigate('/', { replace: true });
      }
    }, VALIDATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isAuthorized, validateSession, navigate]);

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
