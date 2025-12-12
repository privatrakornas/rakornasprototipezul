import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import logoRakornas from '@/assets/logo-rakornas.jpg';

const Index = () => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama lengkap harus diisi');
      return;
    }
    if (pin !== '123456') {
      setError('PIN tidak valid');
      return;
    }
    localStorage.setItem('userName', name);
    navigate('/rules');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="metallic-maroon py-8">
        <div className="container mx-auto flex flex-col items-center">
          <div className="logo-frame w-32 h-32 mb-4">
            <img src={logoRakornas} alt="Logo RAKORNAS" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider">RAKORNAS</h1>
          <p className="text-white/80 text-sm mt-1">By Zulkarnain Sinaga</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-secondary to-background">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-6">
            Simulasi CAT SKD
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Lengkap</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full"
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Masuk
            </Button>
          </form>

          <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <p className="text-destructive text-xs leading-relaxed">
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
