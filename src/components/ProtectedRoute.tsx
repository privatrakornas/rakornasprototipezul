import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('examSession');
    sessionStorage.removeItem('userName');
    setIsAuthorized(false);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('examSession');
    const userName = sessionStorage.getItem('userName');

    const ok = Boolean(token && userName);
    if (!ok) clearSession();

    setIsAuthorized(ok);
    setIsChecking(false);
  }, [clearSession]);

  if (isChecking) {
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
