import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trash2, FileText, BarChart3, Monitor, Bell, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useAdminData } from '@/hooks/useAdminData';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useExamConfig } from '@/components/admin/ExamConfigPanel';
import {
  ExamSession,
  AdminLogin,
  AdminHeader,
  AdminStatsCards,
  AdminFilters,
  AdminSessionTable,
  AdminAuditLog,
  AdminDashboard,
  AdminLeaderboardMirror,
  DisqualifyDialog,
  DeleteDialog,
  RestoreDialog,
  NotificationHistoryPanel,
  ExamConfigPanel,
  BackupRestorePanel,
  BackupSchedulePanel,
  ScheduledExportPanel,
} from '@/components/admin';
import { BatchActionsPanel } from '@/components/admin/BatchActionsPanel';

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  
  // Get exam config for email alerts
  const examConfig = useExamConfig();
  
  // Enable admin notifications when authenticated
  const { notifications, clearNotifications, notificationCount } = useAdminNotifications({ 
    enabled: isAuthenticated,
    emailAlertEnabled: examConfig.security.emailAlertEnabled,
    adminEmail: examConfig.security.adminEmail,
  });

  // Admin data hook
  const {
    ongoingSessions,
    disqualifiedSessions,
    deletedSessions,
    auditLogs,
    filteredOngoingSessions,
    filteredDisqualifiedSessions,
    filteredDeletedSessions,
    filters,
    setFilters,
    hasActiveFilters,
    clearFilters,
    isFetching,
    isFetchingLogs,
    fetchAllSessions,
    auditLogTotalCount,
    hasMoreAuditLogs,
    loadMoreAuditLogs,
    refreshAuditLogs,
  } = useAdminData(isAuthenticated);

  // Admin stats hook for dashboard
  const { scoreStats, passingStats, dailyTrends, scoreDistribution, isLoading: isLoadingStats } = useAdminStats(isAuthenticated);

  // Dialog states
  const [disqualifyDialogOpen, setDisqualifyDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ExamSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Helper function to log admin actions
  const logAuditAction = async (
    action: string, 
    targetId: string | null, 
    targetName: string | null, 
    details: string
  ) => {
    try {
      await supabase.from('audit_logs').insert({
        action,
        target_id: targetId,
        target_name: targetName,
        details,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error('Failed to log audit action:', err);
    }
  };

  // Handlers
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    toast.success('Berhasil login sebagai admin');
  };

  const handleLogout = async () => {
    await logAuditAction('ADMIN_LOGOUT', null, null, 'Admin logged out');
    sessionStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    navigate('/');
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

      await logAuditAction(
        'DISQUALIFY',
        selectedSession.id,
        selectedSession.name,
        `Alasan: ${disqualifyReason.trim()}, Skor: TWK=${selectedSession.twk_score} TIU=${selectedSession.tiu_score} TKP=${selectedSession.tkp_score}`
      );

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

      await logAuditAction(
        'SOFT_DELETE',
        sessionToDelete.id,
        sessionToDelete.name,
        `Status: ${sessionToDelete.status}, Skor: ${sessionToDelete.total_score}`
      );

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

      await logAuditAction(
        'RESTORE',
        sessionToRestore.id,
        sessionToRestore.name,
        `Status: ${sessionToRestore.status}, Skor: ${sessionToRestore.total_score}`
      );

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

  // Login form
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} logAuditAction={logAuditAction} />;
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <AdminHeader 
        onRefresh={fetchAllSessions} 
        onLogout={handleLogout} 
        isFetching={isFetching}
        sessions={[...ongoingSessions, ...disqualifiedSessions, ...deletedSessions]}
        auditLogs={auditLogs}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <AdminStatsCards
          ongoingSessions={ongoingSessions}
          disqualifiedSessions={disqualifiedSessions}
          deletedSessions={deletedSessions}
        />

        <AdminFilters
          filters={filters}
          onSearchChange={(value) => setFilters(prev => ({ ...prev, searchQuery: value }))}
          onStatusChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}
          onDateFromChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
          onDateToChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
          onClearFilters={clearFilters}
          filteredCounts={{
            ongoing: filteredOngoingSessions.length,
            disqualified: filteredDisqualifiedSessions.length,
            deleted: filteredDeletedSessions.length,
          }}
        />

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 lg:w-[1200px]">
            <TabsTrigger value="leaderboard" className="gap-2">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Sesi Aktif</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 relative">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifikasi</span>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Pengaturan</span>
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Sampah</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <AdminLeaderboardMirror />
          </TabsContent>

          <TabsContent value="dashboard">
            <AdminDashboard
              scoreStats={scoreStats}
              passingStats={passingStats}
              dailyTrends={dailyTrends}
              scoreDistribution={scoreDistribution}
              isLoading={isLoadingStats}
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            {/* Batch Actions Panel */}
            <BatchActionsPanel
              sessions={filteredOngoingSessions}
              selectedIds={selectedSessionIds}
              onSelectionChange={setSelectedSessionIds}
              onActionComplete={fetchAllSessions}
            />

            <AdminSessionTable
              sessions={filteredOngoingSessions}
              type="ongoing"
              isFetching={isFetching}
              hasActiveFilters={hasActiveFilters}
              onDisqualify={handleManualDisqualify}
              onDelete={handleSoftDelete}
            />

            <AdminSessionTable
              sessions={filteredDisqualifiedSessions}
              type="disqualified"
              isFetching={isFetching}
              hasActiveFilters={hasActiveFilters}
              onDelete={handleSoftDelete}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="max-w-2xl mx-auto">
              <NotificationHistoryPanel
                notifications={notifications}
                onClearAll={clearNotifications}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-2xl mx-auto space-y-4">
              <ExamConfigPanel logAuditAction={logAuditAction} />
              <ScheduledExportPanel logAuditAction={logAuditAction} />
              <BackupRestorePanel />
              <BackupSchedulePanel />
            </div>
          </TabsContent>

          <TabsContent value="trash">
            <AdminSessionTable
              sessions={filteredDeletedSessions}
              type="deleted"
              isFetching={isFetching}
              hasActiveFilters={hasActiveFilters}
              onRestore={handleRestore}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditLog
              logs={auditLogs}
              isFetching={isFetchingLogs}
              onRefresh={refreshAuditLogs}
              totalCount={auditLogTotalCount}
              hasMore={hasMoreAuditLogs}
              onLoadMore={loadMoreAuditLogs}
            />
          </TabsContent>
        </Tabs>
      </main>

      <DisqualifyDialog
        open={disqualifyDialogOpen}
        onOpenChange={setDisqualifyDialogOpen}
        session={selectedSession}
        reason={disqualifyReason}
        onReasonChange={setDisqualifyReason}
        onConfirm={confirmDisqualify}
        isLoading={isDisqualifying}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        session={sessionToDelete}
        onConfirm={confirmSoftDelete}
        isLoading={isDeleting}
      />

      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        session={sessionToRestore}
        onConfirm={confirmRestore}
        isLoading={isRestoring}
      />
    </div>
  );
};

export default Admin;
