import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, LogOut, RefreshCw, AlertTriangle, UserX, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Admin PIN - should match the one in edge function if using server validation
const ADMIN_PIN = 'admin123';

interface DisqualifiedSession {
  id: string;
  name: string;
  status: string;
  disqualification_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number | null;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  answered_count: number;
  total_questions: number;
  device_fingerprint: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<DisqualifiedSession[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch disqualified sessions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDisqualifiedSessions();
    }
  }, [isAuthenticated]);

  const fetchDisqualifiedSessions = async () => {
    setIsFetching(true);
    try {
      // Fetch sessions with status 'aborted' or 'abandoned'
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .in('status', ['aborted', 'abandoned'])
        .order('finished_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      // Map to include name from the session itself
      const sessionsWithNames: DisqualifiedSession[] = (data || []).map(session => ({
        id: session.id,
        name: session.name,
        status: session.status,
        disqualification_reason: (session as unknown as { disqualification_reason: string | null }).disqualification_reason,
        started_at: session.started_at,
        finished_at: session.finished_at,
        duration_minutes: session.duration_minutes,
        twk_score: session.twk_score,
        tiu_score: session.tiu_score,
        tkp_score: session.tkp_score,
        total_score: session.total_score,
        answered_count: session.answered_count,
        total_questions: session.total_questions,
        device_fingerprint: session.device_fingerprint,
        created_at: session.created_at,
      }));

      setSessions(sessionsWithNames);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simple PIN validation
    if (pin.trim() !== ADMIN_PIN) {
      setError('PIN admin tidak valid');
      setIsLoading(false);
      return;
    }

    sessionStorage.setItem('adminAuth', 'true');
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    navigate('/');
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aborted':
        return <Badge variant="destructive" className="gap-1"><UserX className="w-3 h-3" /> Diskualifikasi</Badge>;
      case 'abandoned':
        return <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-300"><Clock className="w-3 h-3" /> Ditinggalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonDisplay = (reason: string | null, status: string) => {
    if (reason) return reason;
    
    // Default reasons based on status
    switch (status) {
      case 'aborted':
        return 'Pelanggaran terdeteksi (tab switch/blur)';
      case 'abandoned':
        return 'Session expired (> 24 jam tidak aktif)';
      default:
        return 'Tidak ada informasi';
    }
  };

  // Login form
  if (!isAuthenticated) {
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
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-white/70">Monitoring Sesi Diskualifikasi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDisqualifiedSessions}
              disabled={isFetching}
              className="text-white border-white/30 hover:bg-white/10"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600/70">Diskualifikasi</p>
                <p className="text-2xl font-bold text-red-700">
                  {sessions.filter(s => s.status === 'aborted').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-600/70">Ditinggalkan</p>
                <p className="text-2xl font-bold text-orange-700">
                  {sessions.filter(s => s.status === 'abandoned').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-slate-100">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600/70">Total</p>
                <p className="text-2xl font-bold text-slate-700">{sessions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Daftar Sesi Diskualifikasi
            </h2>
          </div>
          
          {isFetching ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Tidak ada sesi yang didiskualifikasi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Nama</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Alasan</TableHead>
                    <TableHead className="font-semibold text-center">Progress</TableHead>
                    <TableHead className="font-semibold text-center">Skor</TableHead>
                    <TableHead className="font-semibold">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Waktu
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{session.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={session.device_fingerprint}>
                            {session.device_fingerprint.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getReasonDisplay(session.disqualification_reason, session.status)}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">
                          {session.answered_count}/{session.total_questions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm">
                          <p className="font-semibold">{session.total_score}</p>
                          <p className="text-xs text-muted-foreground">
                            TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>Mulai: {formatDateTime(session.started_at)}</p>
                          <p>Selesai: {formatDateTime(session.finished_at)}</p>
                          {session.duration_minutes && (
                            <p className="text-muted-foreground">{session.duration_minutes} menit</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Admin;