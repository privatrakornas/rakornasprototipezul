import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupData {
  version: string;
  exportedAt: string;
  backupType: string;
  tables: {
    exam_sessions: any[];
    user_answers: any[];
    profiles: any[];
    audit_logs: any[];
  };
  metadata: {
    totalSessions: number;
    totalAnswers: number;
    totalProfiles: number;
    totalAuditLogs: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get backup type from request body or default to 'scheduled'
    let backupType = 'scheduled';
    try {
      const body = await req.json();
      backupType = body.backup_type || 'scheduled';
    } catch {
      // No body, use default
    }

    console.log(`Starting ${backupType} backup...`);

    // Fetch all data from tables
    const [sessionsResult, answersResult, profilesResult, auditResult] = await Promise.all([
      supabase.from('exam_sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('user_answers').select('*').order('answered_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000),
    ]);

    if (sessionsResult.error) throw new Error(`Sessions: ${sessionsResult.error.message}`);
    if (answersResult.error) throw new Error(`Answers: ${answersResult.error.message}`);
    if (profilesResult.error) throw new Error(`Profiles: ${profilesResult.error.message}`);
    if (auditResult.error) throw new Error(`Audit: ${auditResult.error.message}`);

    const backupData: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      backupType,
      tables: {
        exam_sessions: sessionsResult.data || [],
        user_answers: answersResult.data || [],
        profiles: profilesResult.data || [],
        audit_logs: auditResult.data || [],
      },
      metadata: {
        totalSessions: sessionsResult.data?.length || 0,
        totalAnswers: answersResult.data?.length || 0,
        totalProfiles: profilesResult.data?.length || 0,
        totalAuditLogs: auditResult.data?.length || 0,
      },
    };

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].substring(0, 5).replace(':', '-');
    const filename = `backup-${backupType}-${dateStr}-${timeStr}.json`;

    // Convert to JSON string
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileSize = new TextEncoder().encode(jsonString).length;

    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('exam-backups')
      .upload(filename, jsonString, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Log failed backup
      await supabase.from('backup_history').insert({
        filename,
        file_size: fileSize,
        sessions_count: backupData.metadata.totalSessions,
        answers_count: backupData.metadata.totalAnswers,
        profiles_count: backupData.metadata.totalProfiles,
        audit_logs_count: backupData.metadata.totalAuditLogs,
        backup_type: backupType,
        status: 'failed',
        error_message: uploadError.message,
      });

      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Log successful backup
    await supabase.from('backup_history').insert({
      filename,
      file_size: fileSize,
      sessions_count: backupData.metadata.totalSessions,
      answers_count: backupData.metadata.totalAnswers,
      profiles_count: backupData.metadata.totalProfiles,
      audit_logs_count: backupData.metadata.totalAuditLogs,
      backup_type: backupType,
      status: 'completed',
    });

    // Clean up old backups (keep last 30)
    const { data: allBackups } = await supabase.storage
      .from('exam-backups')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (allBackups && allBackups.length > 30) {
      const filesToDelete = allBackups.slice(30).map(f => f.name);
      if (filesToDelete.length > 0) {
        await supabase.storage.from('exam-backups').remove(filesToDelete);
        console.log(`Cleaned up ${filesToDelete.length} old backup files`);
      }
    }

    console.log(`Backup completed: ${filename}`);

    return new Response(
      JSON.stringify({
        success: true,
        filename,
        fileSize,
        metadata: backupData.metadata,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backup error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
