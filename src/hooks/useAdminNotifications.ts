import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationOptions {
  enabled?: boolean;
  onNewParticipant?: (name: string) => void;
  onParticipantFinished?: (name: string, isLulus: boolean) => void;
}

// Store profile name map cache for quick lookups
let profileNameCache = new Map<string, string>();

// Passing grades
const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

export const useAdminNotifications = (options: NotificationOptions = {}) => {
  const { enabled = true, onNewParticipant, onParticipantFinished } = options;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedSessionsRef = useRef<Set<string>>(new Set());

  // Fetch profiles for name lookup
  const fetchProfiles = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('device_fingerprint, name');
    
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.device_fingerprint && p.name) {
          profileNameCache.set(p.device_fingerprint, p.name);
        }
      });
    }
  }, []);

  // Get name from cache or fingerprint
  const getParticipantName = useCallback(async (deviceFingerprint: string | null, sessionName?: string): Promise<string> => {
    if (sessionName) return sessionName;
    if (!deviceFingerprint) return 'Peserta Baru';
    
    // Check cache first
    if (profileNameCache.has(deviceFingerprint)) {
      return profileNameCache.get(deviceFingerprint)!;
    }
    
    // Fetch from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('device_fingerprint', deviceFingerprint)
      .single();
    
    if (profile?.name) {
      profileNameCache.set(deviceFingerprint, profile.name);
      return profile.name;
    }
    
    return `Peserta (${deviceFingerprint.slice(0, 8)})`;
  }, []);

  // Handle session changes
  const handleSessionChange = useCallback(async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Skip if notifications are disabled
    if (!enabled) return;
    
    if (eventType === 'INSERT' && newRecord.status === 'ongoing') {
      // New participant started exam
      // Avoid duplicate notifications
      if (processedSessionsRef.current.has(`start-${newRecord.id}`)) return;
      processedSessionsRef.current.add(`start-${newRecord.id}`);
      
      const name = await getParticipantName(newRecord.device_fingerprint, newRecord.name);
      
      // Show toast notification
      toast.info(`🆕 ${name} mulai mengerjakan ujian`, {
        duration: 4000,
        position: 'top-right',
      });
      
      // Call callback if provided
      onNewParticipant?.(name);
    }
    
    if (eventType === 'UPDATE') {
      // Check if status changed to finished
      const wasOngoing = oldRecord?.status === 'ongoing' || !oldRecord?.status;
      const isNowFinished = newRecord.status === 'finished';
      
      if (wasOngoing && isNowFinished) {
        // Avoid duplicate notifications
        if (processedSessionsRef.current.has(`finish-${newRecord.id}`)) return;
        processedSessionsRef.current.add(`finish-${newRecord.id}`);
        
        const name = await getParticipantName(newRecord.device_fingerprint, newRecord.name);
        
        // Check if passed
        const isLulus = (
          (newRecord.twk_score || 0) >= PASSING_GRADES.TWK &&
          (newRecord.tiu_score || 0) >= PASSING_GRADES.TIU &&
          (newRecord.tkp_score || 0) >= PASSING_GRADES.TKP
        );
        
        // Show toast notification with appropriate styling
        if (isLulus) {
          toast.success(`✅ ${name} menyelesaikan ujian - LULUS!`, {
            duration: 5000,
            position: 'top-right',
            description: `Skor: ${newRecord.total_score || 0}`,
          });
        } else {
          toast(`❌ ${name} menyelesaikan ujian`, {
            duration: 5000,
            position: 'top-right',
            description: `Skor: ${newRecord.total_score || 0} - Tidak Lulus`,
          });
        }
        
        // Call callback if provided
        onParticipantFinished?.(name, isLulus);
      }
      
      // Check if disqualified/aborted
      if (newRecord.status === 'aborted' && oldRecord?.status === 'ongoing') {
        if (processedSessionsRef.current.has(`abort-${newRecord.id}`)) return;
        processedSessionsRef.current.add(`abort-${newRecord.id}`);
        
        const name = await getParticipantName(newRecord.device_fingerprint, newRecord.name);
        
        toast.warning(`⚠️ ${name} didiskualifikasi`, {
          duration: 5000,
          position: 'top-right',
          description: newRecord.disqualification_reason || 'Melanggar aturan ujian',
        });
      }
    }
  }, [enabled, getParticipantName, onNewParticipant, onParticipantFinished]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled) return;
    
    // Fetch profiles for name lookup
    fetchProfiles();
    
    // Subscribe to exam_sessions changes
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_sessions',
        },
        handleSessionChange
      )
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, fetchProfiles, handleSessionChange]);

  // Cleanup processed sessions periodically (prevent memory leak)
  useEffect(() => {
    const interval = setInterval(() => {
      // Keep only last 100 processed sessions
      if (processedSessionsRef.current.size > 100) {
        const entries = Array.from(processedSessionsRef.current);
        processedSessionsRef.current = new Set(entries.slice(-50));
      }
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  return {
    // Can be extended with additional notification controls
  };
};
