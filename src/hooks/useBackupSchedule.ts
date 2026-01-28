import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BackupScheduleConfig {
  enabled: boolean;
  interval: 'hourly' | 'daily' | 'disabled';
  lastRun: string | null;
  nextRun: string | null;
}

interface BackupHistoryItem {
  id: string;
  filename: string;
  file_size: number;
  sessions_count: number;
  answers_count: number;
  profiles_count: number;
  audit_logs_count: number;
  backup_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const BACKUP_CONFIG_KEY = 'backup_schedule_config';

export const useBackupSchedule = () => {
  const [config, setConfig] = useState<BackupScheduleConfig>(() => {
    const saved = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      enabled: false,
      interval: 'disabled',
      lastRun: null,
      nextRun: null,
    };
  });

  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Fetch backup history
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory((data as BackupHistoryItem[]) || []);
    } catch (error) {
      console.error('Error fetching backup history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Run backup manually or scheduled
  const runBackup = useCallback(async (backupType: string = 'manual') => {
    setIsRunning(true);
    try {
      const response = await supabase.functions.invoke('scheduled-backup', {
        body: { backup_type: backupType },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.success) {
        toast.success(`Backup ${backupType} berhasil!`, {
          description: `${result.metadata.totalSessions} sesi, ${result.metadata.totalAnswers} jawaban`,
        });

        setConfig(prev => ({
          ...prev,
          lastRun: new Date().toISOString(),
          nextRun: calculateNextRun(prev.interval),
        }));

        // Refresh history
        await fetchHistory();
      } else {
        throw new Error(result.error || 'Backup gagal');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Backup gagal', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  }, [fetchHistory]);

  // Calculate next run time based on interval
  const calculateNextRun = (interval: string): string | null => {
    if (interval === 'disabled') return null;
    
    const now = new Date();
    if (interval === 'hourly') {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      now.setSeconds(0);
    } else if (interval === 'daily') {
      now.setDate(now.getDate() + 1);
      now.setHours(0);
      now.setMinutes(0);
      now.setSeconds(0);
    }
    return now.toISOString();
  };

  // Update schedule configuration
  const updateConfig = useCallback((newConfig: Partial<BackupScheduleConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      // Calculate next run if enabling
      if (newConfig.interval && newConfig.interval !== 'disabled') {
        updated.nextRun = calculateNextRun(newConfig.interval);
        updated.enabled = true;
      } else if (newConfig.interval === 'disabled') {
        updated.nextRun = null;
        updated.enabled = false;
      }

      return updated;
    });
  }, []);

  // Check if backup should run (client-side scheduler)
  useEffect(() => {
    if (!config.enabled || config.interval === 'disabled') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Check every minute if backup should run
    const checkAndRun = () => {
      if (!config.nextRun) return;
      
      const now = new Date();
      const nextRun = new Date(config.nextRun);
      
      if (now >= nextRun && !isRunning) {
        runBackup(`scheduled_${config.interval}`);
      }
    };

    // Initial check
    checkAndRun();

    // Set up interval (check every minute)
    intervalRef.current = setInterval(checkAndRun, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.enabled, config.interval, config.nextRun, isRunning, runBackup]);

  // Initial history fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Subscribe to realtime updates on backup_history
  useEffect(() => {
    const channel = supabase
      .channel('backup-history-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'backup_history' },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory]);

  // Download a backup file
  const downloadBackup = useCallback(async (filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('exam-backups')
        .download(filename);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('File backup berhasil diunduh');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal mengunduh file backup');
    }
  }, []);

  return {
    config,
    updateConfig,
    isRunning,
    runBackup,
    history,
    isLoadingHistory,
    fetchHistory,
    downloadBackup,
  };
};
