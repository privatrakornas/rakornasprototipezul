import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, LogOut, RefreshCw, AlertTriangle, UserX, Clock, Calendar, Ban, Users, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

// Admin PIN - should match the one in edge function if using server validation
const ADMIN_PIN = 'admin123';

interface ExamSession {
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
  deleted_at: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [disqualifiedSessions, setDisqualifiedSessions] = useState<ExamSession[]>([]);
  const [ongoingSessions, setOngoingSessions] = useState<ExamSession[]>([]);
  const [deletedSessions, setDeletedSessions] = useState<ExamSession[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  
  // Manual disqualification state
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  // Soft delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ExamSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore confirmation dialog
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [sessionToRestore, setSessionToRestore] = useState<ExamSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const adminAuth = sessionStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch sessions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllSessions();
    }
  }, [isAuthenticated]);

  const fetchAllSessions = async () => {
    setIsFetching(true);
    try {
      // Fetch disqualified sessions (aborted/abandoned) - exclude soft deleted
      const { data: disqualifiedData, error: disqualifiedError } = await supabase
        .from('exam_sessions')
        .select('*')
        .in('status', ['aborted', 'abandoned'])
        .is('deleted_at', null)
        .order('finished_at', { ascending: false, nullsFirst: false });

      // Fetch ongoing sessions for manual disqualification - exclude soft deleted
      const { data: ongoingData, error: ongoingError } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('status', 'ongoing')
        .is('deleted_at', null)
        .order('started_at', { ascending: false });

      // Fetch soft deleted sessions for trash bin
      const { data: deletedData, error: deletedError } = await supabase
        .from('exam_sessions')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (disqualifiedError) {
        console.error('Error fetching disqualified sessions:', disqualifiedError);
      }
      if (ongoingError) {
        console.error('Error fetching ongoing sessions:', ongoingError);
      }
      if (deletedError) {
        console.error('Error fetching deleted sessions:', deletedError);
      }

      const mapSession = (session: any): ExamSession => ({
        id: session.id,
        name: session.name,
        status: session.status,
        disqualification_reason: session.disqualification_reason,
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
        deleted_at: session.deleted_at,
      });

      setDisqualifiedSessions((disqualifiedData || []).map(mapSession));
      setOngoingSessions((ongoingData || []).map(mapSession));
      setDeletedSessions((deletedData || []).map(mapSession));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualDisqualify = (session: ExamSession) => {
    setSelectedSession(session);
    setDisqualifyReason('');
    setDisqualifyDialogOpen(true);
  };

  const confirmDisqualify = async () => {
    if (!selectedSession || !disqualifyReason.trim()) {
      toast.error('Alasan diskualifikasi harus diisi');
      return;
    }

    setIsDisqualifying(true);
    try {
      const now = new Date().toISOString();
      const startedAt = new Date(selectedSession.started_at || now);
      const durationMinutes = Math.min(
        Math.round((new Date(now).getTime() - startedAt.getTime()) / (1000 * 60)),
        100
      );

      const { error } = await supabase
        .from('exam_sessions')
        .update({
          status: 'aborted',
          disqualification_reason: `[Admin] ${disqualifyReason.trim()}`,
          finished_at: now,
          duration_minutes: durationMinutes,
        })
        .eq('id', selectedSession.id);

      if (error) {
        console.error('Error disqualifying session:', error);
        toast.error('Gagal mendiskualifikasi peserta');
        return;
      }

      toast.success(`${selectedSession.name} berhasil didiskualifikasi`);
      setDisqualifyDialogOpen(false);
      setSelectedSession(null);
      fetchAllSessions();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsDisqualifying(false);
    }
  };

  // Soft Delete handlers
  const handleSoftDelete = (session: ExamSession) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionToDelete.id);

      if (error) {
        console.error('Error soft deleting session:', error);
        toast.error('Gagal menghapus data');
        return;
      }

      toast.success(`Data ${sessionToDelete.name} berhasil dipindahkan ke Sampah`);
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      fetchAllSessions();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore handlers
  const handleRestore = (session: ExamSession) => {
    setSessionToRestore(session);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!sessionToRestore) return;

    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ deleted_at: null })
        .eq('id', sessionToRestore.id);

      if (error) {
        console.error('Error restoring session:', error);
        toast.error('Gagal memulihkan data');
        return;
      }

      toast.success(`Data ${sessionToRestore.name} berhasil dipulihkan`);
      setRestoreDialogOpen(false);
      setSessionToRestore(null);
      fetchAllSessions();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsRestoring(false);
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
      case 'ongoing':
        return <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-300"><Users className="w-3 h-3" /> Sedang Ujian</Badge>;
      case 'finished':
        return <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-green-300">Selesai</Badge>;
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
              <p className="text-xs text-white/70">Monitoring Sesi Ujian</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllSessions}
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
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600/70">Sedang Ujian</p>
                <p className="text-2xl font-bold text-blue-700">{ongoingSessions.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600/70">Diskualifikasi</p>
                <p className="text-2xl font-bold text-red-700">
                  {disqualifiedSessions.filter(s => s.status === 'aborted').length}
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
                  {disqualifiedSessions.filter(s => s.status === 'abandoned').length}
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
                <p className="text-sm text-slate-600/70">Total Issue</p>
                <p className="text-2xl font-bold text-slate-700">{disqualifiedSessions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Trash2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600/70">Di Sampah</p>
                <p className="text-2xl font-bold text-amber-700">{deletedSessions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="monitoring" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="monitoring" className="gap-2">
              <Users className="w-4 h-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Sampah ({deletedSessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            {/* Ongoing Sessions - For Manual Disqualification */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-blue-50">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Peserta Sedang Ujian ({ongoingSessions.length})
                  <span className="text-xs font-normal text-muted-foreground ml-2">Klik tombol untuk diskualifikasi manual</span>
                </h2>
              </div>
              
              {isFetching ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : ongoingSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Tidak ada peserta yang sedang ujian</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold">Nama</TableHead>
                        <TableHead className="font-semibold text-center">Progress</TableHead>
                        <TableHead className="font-semibold text-center">Skor Sementara</TableHead>
                        <TableHead className="font-semibold">Mulai</TableHead>
                        <TableHead className="font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ongoingSessions.map((session) => (
                        <TableRow key={session.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{session.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={session.device_fingerprint}>
                                {session.device_fingerprint.slice(0, 8)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium">
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
                            <span className="text-sm">{formatDateTime(session.started_at)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleManualDisqualify(session)}
                                className="gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                Diskualifikasi
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSoftDelete(session)}
                                className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            {/* Disqualified Sessions Table */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-red-50">
                <h2 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Daftar Sesi Diskualifikasi ({disqualifiedSessions.length})
                </h2>
              </div>
              
              {isFetching ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : disqualifiedSessions.length === 0 ? (
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
                        <TableHead className="font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {disqualifiedSessions.map((session) => (
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
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSoftDelete(session)}
                              className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash">
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-amber-50">
                <h2 className="font-semibold flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-amber-500" />
                  Data Terhapus ({deletedSessions.length})
                  <span className="text-xs font-normal text-muted-foreground ml-2">Klik "Pulihkan" untuk mengembalikan data</span>
                </h2>
              </div>
              
              {isFetching ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : deletedSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Trash2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Tidak ada data di tempat sampah</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold">Nama</TableHead>
                        <TableHead className="font-semibold">Status Asli</TableHead>
                        <TableHead className="font-semibold text-center">Skor</TableHead>
                        <TableHead className="font-semibold">Dihapus Pada</TableHead>
                        <TableHead className="font-semibold text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedSessions.map((session) => (
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
                          <TableCell className="text-center">
                            <div className="text-sm">
                              <p className="font-semibold">{session.total_score}</p>
                              <p className="text-xs text-muted-foreground">
                                TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDateTime(session.deleted_at)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(session)}
                              className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Pulihkan
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Manual Disqualification Dialog */}
      <Dialog open={disqualifyDialogOpen} onOpenChange={setDisqualifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Diskualifikasi Peserta
            </DialogTitle>
            <DialogDescription>
              Anda akan mendiskualifikasi <strong>{selectedSession?.name}</strong>. 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">Alasan Diskualifikasi *</label>
              <Textarea
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                placeholder="Masukkan alasan diskualifikasi..."
                rows={3}
              />
            </div>
            
            {selectedSession && (
              <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
                <p><strong>Progress:</strong> {selectedSession.answered_count}/{selectedSession.total_questions}</p>
                <p><strong>Skor:</strong> TWK:{selectedSession.twk_score} TIU:{selectedSession.tiu_score} TKP:{selectedSession.tkp_score}</p>
                <p><strong>Mulai:</strong> {formatDateTime(selectedSession.started_at)}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisqualifyDialogOpen(false)} disabled={isDisqualifying}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDisqualify} disabled={isDisqualifying || !disqualifyReason.trim()}>
              {isDisqualifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Diskualifikasi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Trash2 className="w-5 h-5" />
              Hapus Data
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus data <strong>{sessionToDelete?.name}</strong>. 
              Data akan dipindahkan ke Sampah dan dapat dipulihkan kembali.
            </DialogDescription>
          </DialogHeader>
          
          {sessionToDelete && (
            <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
              <p><strong>Status:</strong> {sessionToDelete.status}</p>
              <p><strong>Skor:</strong> TWK:{sessionToDelete.twk_score} TIU:{sessionToDelete.tiu_score} TKP:{sessionToDelete.tkp_score}</p>
              <p><strong>Total:</strong> {sessionToDelete.total_score}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button 
              onClick={confirmSoftDelete} 
              disabled={isDeleting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus ke Sampah
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RotateCcw className="w-5 h-5" />
              Pulihkan Data
            </DialogTitle>
            <DialogDescription>
              Anda akan memulihkan data <strong>{sessionToRestore?.name}</strong>. 
              Data akan dikembalikan ke tabel sesuai status aslinya.
            </DialogDescription>
          </DialogHeader>
          
          {sessionToRestore && (
            <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
              <p><strong>Status:</strong> {sessionToRestore.status}</p>
              <p><strong>Skor:</strong> TWK:{sessionToRestore.twk_score} TIU:{sessionToRestore.tiu_score} TKP:{sessionToRestore.tkp_score}</p>
              <p><strong>Total:</strong> {sessionToRestore.total_score}</p>
              <p><strong>Dihapus pada:</strong> {formatDateTime(sessionToRestore.deleted_at)}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={isRestoring}>
              Batal
            </Button>
            <Button 
              onClick={confirmRestore} 
              disabled={isRestoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memulihkan...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Pulihkan Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
