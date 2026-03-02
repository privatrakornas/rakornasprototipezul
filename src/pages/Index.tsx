import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoRakornas from '@/assets/logo-rakornas.jpg';
import SocialMediaWidget from '@/components/SocialMediaWidget';
import { usePageConfig } from '@/hooks/useEditableConfig';

const Index = () => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { get } = usePageConfig([
    'login_title', 'login_subtitle', 'login_form_title',
    'login_name_label', 'login_pin_label', 'login_button_text', 'login_warning_text',
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedName = name.trim();
    const normalizedPin = pin.trim();

    if (!normalizedName) {
      setError('Nama lengkap harus diisi');
      return;
    }

    if (normalizedName.length < 2) {
      setError('Nama minimal 2 karakter');
      return;
    }

    if (!normalizedPin) {
      setError('PIN harus diisi');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-pin', {
        body: { pin: normalizedPin, name: normalizedName }
      });

      if (fnError || !data?.authorized) {
        setError(data?.error || 'PIN tidak valid');
        setIsLoading(false);
        return;
      }

      const deviceFingerprint =
        globalThis.crypto?.randomUUID?.() ??
        `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      sessionStorage.setItem('examSession', data.session);
      sessionStorage.setItem('userName', data.name || normalizedName.slice(0, 100));
      sessionStorage.setItem('deviceFingerprint', deviceFingerprint);

      setIsLoading(false);
      navigate('/rules');
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat verifikasi');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-maroon-full">
      <header className="py-6 md:py-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="logo-frame w-24 h-24 md:w-36 md:h-36 mb-3 md:mb-5">
            <img src={logoRakornas} alt="Logo RAKORNAS" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wider">{get('login_title')}</h1>
          <p className="text-white/70 text-sm md:text-base mt-1">{get('login_subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md p-5 md:p-8 shadow-2xl bg-white">
          <h2 className="text-xl md:text-2xl font-bold text-center text-foreground mb-5 md:mb-7">
            {get('login_form_title')}
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">{get('login_name_label')}</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full border-muted focus:border-primary focus:ring-primary"
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">{get('login_pin_label')}</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full border-muted focus:border-primary focus:ring-primary"
                disabled={isLoading}
                maxLength={20}
              />
            </div>

            {error && <p className="text-destructive text-sm font-medium">{error}</p>}

            <Button 
              type="submit" 
              className="w-full btn-gold text-base py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                get('login_button_text')
              )}
            </Button>
          </form>

          <div className="mt-5 md:mt-6 p-3 md:p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <p className="text-destructive text-[10px] md:text-xs leading-relaxed">
              <strong>PERINGATAN:</strong> {get('login_warning_text')}
            </p>
          </div>

          <div className="mt-4">
            <SocialMediaWidget />
          </div>
        </Card>
      </main>

      <footer className="py-4 text-center">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Shield className="w-3 h-3" />
          Admin Panel
        </Link>
      </footer>
    </div>
  );
};

export default Index;
