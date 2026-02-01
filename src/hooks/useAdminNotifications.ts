import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { analyzeNavigationAnomalies, type NavigationEvent } from '@/utils/anomalyDetection';

export interface NotificationItem {
  id: string;
  type: 'start' | 'finish' | 'disqualify' | 'anomaly';
  name: string;
  message: string;
  description?: string;
  isLulus?: boolean;
  riskLevel?: 'high' | 'critical';
  riskScore?: number;
  timestamp: Date;
}

interface NotificationOptions {
  enabled?: boolean;
  emailAlertEnabled?: boolean;
  adminEmail?: string;
  onNewParticipant?: (name: string) => void;
  onParticipantFinished?: (name: string, isLulus: boolean) => void;
}

// Store profile name map cache for quick lookups
let profileNameCache = new Map<string, string>();

// Passing grades
const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

export const useAdminNotifications = (options: NotificationOptions = {}) => {
  const { enabled = true, emailAlertEnabled = false, adminEmail, onNewParticipant, onParticipantFinished } = options;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const processedSessionsRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Add notification to history
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const newNotif: NotificationItem = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Send email alert for high-risk anomalies
  const sendEmailAlert = useCallback(async (
    participantName: string,
    participantId: string,
    riskScore: number,
    riskLevel: string,
    anomalies: string[]
  ) => {
    if (!emailAlertEnabled || !adminEmail) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-anomaly-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          participantName,
          participantId,
          riskScore,
          riskLevel,
          anomalies,
          adminEmail,
          examDate: new Date().toLocaleString('id-ID', { 
            dateStyle: 'full', 
            timeStyle: 'short' 
          }),
        }),
      });
      
      if (response.ok) {
        console.log('Email alert sent successfully');
      } else {
        console.error('Failed to send email alert:', await response.text());
      }
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  }, [emailAlertEnabled, adminEmail]);

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
      const message = `${name} mulai mengerjakan ujian`;
      
      // Show toast notification
      toast.info(`🆕 ${message}`, {
        duration: 4000,
        position: 'top-right',
      });
      
      // Add to history
      addNotification({
        type: 'start',
        name,
        message,
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
        
        const message = `${name} menyelesaikan ujian`;
        const description = `Skor: ${newRecord.total_score || 0} - ${isLulus ? 'LULUS' : 'Tidak Lulus'}`;
        
        // Show toast notification with appropriate styling
        if (isLulus) {
          toast.success(`✅ ${message} - LULUS!`, {
            duration: 5000,
            position: 'top-right',
            description: `Skor: ${newRecord.total_score || 0}`,
          });
        } else {
          toast(`❌ ${message}`, {
            duration: 5000,
            position: 'top-right',
            description: `Skor: ${newRecord.total_score || 0} - Tidak Lulus`,
          });
        }
        
        // Add to history
        addNotification({
          type: 'finish',
          name,
          message,
          description,
          isLulus,
        });
        
        // Call callback if provided
        onParticipantFinished?.(name, isLulus);
        
        // Check for anomaly if navigation_log exists
        if (newRecord.navigation_log && Array.isArray(newRecord.navigation_log) && newRecord.navigation_log.length > 0) {
          try {
            const analysis = analyzeNavigationAnomalies(newRecord.navigation_log as NavigationEvent[]);
            
            if (analysis.overallRisk === 'high' || analysis.overallRisk === 'critical') {
              // Avoid duplicate anomaly notifications
              if (processedSessionsRef.current.has(`anomaly-${newRecord.id}`)) return;
              processedSessionsRef.current.add(`anomaly-${newRecord.id}`);
              
              const anomalyMessage = `${name} - Pola Mencurigakan Terdeteksi`;
              const anomalyDescription = `Risiko ${analysis.overallRisk === 'critical' ? 'KRITIS' : 'TINGGI'} (${analysis.riskScore}/100)`;
              
              // Show anomaly toast
              if (analysis.overallRisk === 'critical') {
                toast.error(`🛡️ ANOMALI KRITIS: ${name}`, {
                  duration: 8000,
                  position: 'top-right',
                  description: `Skor risiko: ${analysis.riskScore}/100 - ${analysis.flags.length} temuan`,
                });
              } else {
                toast.warning(`⚠️ ANOMALI TINGGI: ${name}`, {
                  duration: 6000,
                  position: 'top-right',
                  description: `Skor risiko: ${analysis.riskScore}/100 - ${analysis.flags.length} temuan`,
                });
              }
              
              // Add anomaly notification to history
              addNotification({
                type: 'anomaly',
                name,
                message: anomalyMessage,
                description: anomalyDescription,
                riskLevel: analysis.overallRisk as 'high' | 'critical',
                riskScore: analysis.riskScore,
              });
              
              // Send email alert for high/critical risk
              sendEmailAlert(
                name,
                newRecord.id,
                analysis.riskScore,
                analysis.overallRisk === 'critical' ? 'Critical' : 'High',
                analysis.flags.map(f => f.description)
              );
            }
          } catch (error) {
            console.error('Error analyzing navigation anomalies:', error);
          }
        }
      }
      
      // Check if disqualified/aborted
      if (newRecord.status === 'aborted' && oldRecord?.status === 'ongoing') {
        if (processedSessionsRef.current.has(`abort-${newRecord.id}`)) return;
        processedSessionsRef.current.add(`abort-${newRecord.id}`);
        
        const name = await getParticipantName(newRecord.device_fingerprint, newRecord.name);
        const message = `${name} didiskualifikasi`;
        const description = newRecord.disqualification_reason || 'Melanggar aturan ujian';
        
        toast.warning(`⚠️ ${message}`, {
          duration: 5000,
          position: 'top-right',
          description,
        });
        
        // Add to history
        addNotification({
          type: 'disqualify',
          name,
          message,
          description,
        });
      }
    }
  }, [enabled, getParticipantName, onNewParticipant, onParticipantFinished, addNotification, sendEmailAlert]);

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
    notifications,
    clearNotifications,
    notificationCount: notifications.length,
  };
};
