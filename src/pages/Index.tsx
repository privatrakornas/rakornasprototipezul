import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import logoRakornas from '@/assets/logo-rakornas.jpg';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Nama lengkap harus diisi');
      return;
    }
    
    if (name.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      return;
    }
    
    if (!pin) {
      setError('PIN harus diisi');
      return;
    }

    setIsLoading(true);
    
    try {
      // Verify PIN via edge function (server-side)
      const { data, error: fnError } = await supabase.functions.invoke('verify-pin', {
        body: { pin, name: name.trim() }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('Terjadi kesalahan, silakan coba lagi');
        setIsLoading(false);
        return;
      }

      if (!data?.authorized) {
        setError(data?.error || 'PIN tidak valid');
        setIsLoading(false);
        return;
      }

      // Store session token (not just the name)
      sessionStorage.setItem('examSession', data.session);
      sessionStorage.setItem('userName', data.name);
      
      navigate('/rules');
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan, silakan coba lagi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="metallic-maroon py-4 md:py-8">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="logo-frame w-20 h-20 md:w-32 md:h-32 mb-2 md:mb-4">
            <img src={logoRakornas} alt="Logo RAKORNAS" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-wider">RAKORNAS</h1>
          <p className="text-white/80 text-xs md:text-sm mt-1">By Zulkarnain Sinaga</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 bg-gradient-to-b from-secondary to-background">
        <Card className="w-full max-w-md p-4 md:p-8 shadow-2xl">
          <h2 className="text-xl md:text-2xl font-bold text-center text-foreground mb-4 md:mb-6">
            Simulasi CAT SKD
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 md:mb-2">Nama Lengkap</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full"
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5 md:mb-2">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full"
                disabled={isLoading}
                maxLength={20}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
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

          <div className="mt-4 md:mt-6 p-3 md:p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <p className="text-destructive text-[10px] md:text-xs leading-relaxed">
              <strong>PERINGATAN:</strong> Seluruh soal ini hasil jerih payah Privat RAKORNAS. 
              Hak Cipta Materi ini dilindungi Undang-Undang, tidak boleh diunduh atau digandakan 
              dan disebarluaskan melalui cara apapun tanpa izin tertulis dari Privat RAKORNAS.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Index;
