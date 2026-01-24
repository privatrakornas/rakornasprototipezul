import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExamSession, AuditLog, FilterState } from '@/components/admin/types';

const AUDIT_LOG_PAGE_SIZE = 50;

export const useAdminData = (isAuthenticated: boolean) => {
  const [disqualifiedSessions, setDisqualifiedSessions] = useState<ExamSession[]>([]);
  const [ongoingSessions, setOngoingSessions] = useState<ExamSession[]>([]);
  const [deletedSessions, setDeletedSessions] = useState<ExamSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogPage, setAuditLogPage] = useState(0);
  const [auditLogTotalCount, setAuditLogTotalCount] = useState(0);
  const [hasMoreAuditLogs, setHasMoreAuditLogs] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    statusFilter: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const filterSessions = useCallback((sessions: ExamSession[]) => {
    return sessions.filter(session => {
      const matchesSearch = filters.searchQuery === '' || 
        session.name.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesStatus = filters.statusFilter === 'all' || session.status === filters.statusFilter;
      const sessionDate = new Date(session.created_at);
      const matchesDateFrom = !filters.dateFrom || sessionDate >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || sessionDate <= new Date(filters.dateTo + 'T23:59:59');
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [filters]);

  const filteredOngoingSessions = useMemo(() => 
    filterSessions(ongoingSessions), 
    [ongoingSessions, filterSessions]
  );
  
  const filteredDisqualifiedSessions = useMemo(() => 
    filterSessions(disqualifiedSessions), 
    [disqualifiedSessions, filterSessions]
  );
  
  const filteredDeletedSessions = useMemo(() => 
    filterSessions(deletedSessions), 
    [deletedSessions, filterSessions]
  );

  const hasActiveFilters = filters.searchQuery !== '' || 
    filters.statusFilter !== 'all' || 
    filters.dateFrom !== '' || 
    filters.dateTo !== '';

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      statusFilter: 'all',
      dateFrom: '',
      dateTo: '',
    });
  }, []);

  const fetchAllSessions = useCallback(async () => {
    setIsFetching(true);
    try {
      const [disqualifiedResult, ongoingResult, deletedResult] = await Promise.all([
        supabase
          .from('exam_sessions')
          .select('*')
          .in('status', ['aborted', 'abandoned'])
          .is('deleted_at', null)
          .order('finished_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('exam_sessions')
          .select('*')
          .eq('status', 'ongoing')
          .is('deleted_at', null)
          .order('started_at', { ascending: false }),
        supabase
          .from('exam_sessions')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
      ]);

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

      setDisqualifiedSessions((disqualifiedResult.data || []).map(mapSession));
      setOngoingSessions((ongoingResult.data || []).map(mapSession));
      setDeletedSessions((deletedResult.data || []).map(mapSession));
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page: number = 0, append: boolean = false) => {
    setIsFetchingLogs(true);
    try {
      // First get total count
      const { count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      setAuditLogTotalCount(count || 0);

      // Then fetch paginated data
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * AUDIT_LOG_PAGE_SIZE, (page + 1) * AUDIT_LOG_PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return;
      }

      const newLogs = data || [];
      setHasMoreAuditLogs(newLogs.length === AUDIT_LOG_PAGE_SIZE);
      
      if (append) {
        setAuditLogs(prev => [...prev, ...newLogs]);
      } else {
        setAuditLogs(newLogs);
      }
      setAuditLogPage(page);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsFetchingLogs(false);
    }
  }, []);

  const loadMoreAuditLogs = useCallback(() => {
    if (!isFetchingLogs && hasMoreAuditLogs) {
      fetchAuditLogs(auditLogPage + 1, true);
    }
  }, [auditLogPage, fetchAuditLogs, hasMoreAuditLogs, isFetchingLogs]);

  const refreshAuditLogs = useCallback(() => {
    setAuditLogPage(0);
    fetchAuditLogs(0, false);
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllSessions();
      fetchAuditLogs(0, false);
    }
  }, [isAuthenticated, fetchAllSessions, fetchAuditLogs]);

  return {
    // Raw data
    ongoingSessions,
    disqualifiedSessions,
    deletedSessions,
    auditLogs,
    
    // Filtered data
    filteredOngoingSessions,
    filteredDisqualifiedSessions,
    filteredDeletedSessions,
    
    // Filter state
    filters,
    setFilters,
    hasActiveFilters,
    clearFilters,
    
    // Loading states
    isFetching,
    isFetchingLogs,
    
    // Audit log pagination
    auditLogPage,
    auditLogTotalCount,
    hasMoreAuditLogs,
    loadMoreAuditLogs,
    refreshAuditLogs,
    
    // Actions
    fetchAllSessions,
    fetchAuditLogs,
  };
};
