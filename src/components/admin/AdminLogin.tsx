import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Shield } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface AdminLoginProps {
  onLoginSuccess: () => void;
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

export const AdminLogin = ({ onLoginSuccess, logAuditAction }: AdminLoginProps) => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'verify-admin',
          pin: pin.trim(),
          type: 'admin'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.authorized) {
        await logAuditAction('ADMIN_LOGIN_FAILED', null, null, 'Invalid PIN attempt');
        setError(data.error || 'PIN admin tidak valid');
        setIsLoading(false);
        return;
      }

      await logAuditAction('ADMIN_LOGIN', null, null, 'Admin login successful');
      sessionStorage.setItem('adminAuth', 'true');
      onLoginSuccess();
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Gagal memverifikasi PIN. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      <header className="py-6 md:py-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="p-4 rounded-full bg-white/10 mb-4">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wider">Admin Panel</h1>
          <p className="text-white/70 text-sm md:text-base mt-1">Monitoring Sesi Ujian</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md p-5 md:p-8 shadow-2xl bg-white">
          <h2 className="text-xl md:text-2xl font-bold text-center text-foreground mb-5 md:mb-7">
            Login Admin
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">PIN Admin</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN admin"
                className="w-full"
                disabled={isLoading}
                maxLength={20}
              />
            </div>

            {error && <p className="text-destructive text-sm font-medium">{error}</p>}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => navigate('/')}
          >
            Kembali ke Halaman Utama
          </Button>
        </Card>
      </main>
    </div>
  );
};
