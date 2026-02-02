import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExportSummary {
  totalSessions: number;
  finishedSessions: number;
  ongoingSessions: number;
  disqualifiedSessions: number;
  deletedSessions: number;
  totalAuditLogs: number;
  exportDate: string;
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  });
};

const generateEmailHtml = (summary: ExportSummary, adminEmail: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .danger { color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📊 Laporan Export Harian</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${summary.exportDate}</p>
        </div>
        <div class="content">
          <p>Halo Admin,</p>
          <p>Berikut adalah ringkasan data export otomatis harian untuk sistem ujian:</p>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Peserta</div>
              <div class="stat-value">${summary.totalSessions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Selesai</div>
              <div class="stat-value success">${summary.finishedSessions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Sedang Ujian</div>
              <div class="stat-value warning">${summary.ongoingSessions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Diskualifikasi</div>
              <div class="stat-value danger">${summary.disqualifiedSessions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Di Sampah</div>
              <div class="stat-value">${summary.deletedSessions}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Audit Logs</div>
              <div class="stat-value">${summary.totalAuditLogs}</div>
            </div>
          </div>

          <p style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            ℹ️ <strong>Catatan:</strong> File export lengkap tersedia di Supabase Storage bucket "exam-backups".
          </p>
        </div>
        <div class="footer">
          <p>Email ini dikirim otomatis oleh sistem Admin Panel.</p>
          <p>Dikirim ke: ${adminEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get admin email from config
    const { data: configData } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "admin_email")
      .single();

    const adminEmail = configData?.config_value;
    if (!adminEmail) {
      console.log("No admin email configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: false, error: "No admin email configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if scheduled export is enabled
    const { data: scheduleConfig } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "scheduled_export_enabled")
      .single();

    if (scheduleConfig?.config_value !== "true") {
      console.log("Scheduled export is disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Scheduled export is disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("exam_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Fetch all audit logs
    const { data: auditLogs, error: logsError } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (logsError) {
      throw new Error(`Failed to fetch audit logs: ${logsError.message}`);
    }

    // Calculate summary
    const now = new Date();
    const summary: ExportSummary = {
      totalSessions: sessions?.length || 0,
      finishedSessions: sessions?.filter(s => s.status === "finished").length || 0,
      ongoingSessions: sessions?.filter(s => s.status === "ongoing").length || 0,
      disqualifiedSessions: sessions?.filter(s => s.status === "disqualified" || s.status === "aborted").length || 0,
      deletedSessions: sessions?.filter(s => s.deleted_at !== null).length || 0,
      totalAuditLogs: auditLogs?.length || 0,
      exportDate: formatDateTime(now),
    };

    // Create backup record
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `scheduled-export-${timestamp}.json`;

    const backupData = {
      exportDate: now.toISOString(),
      summary,
      sessions: sessions || [],
      auditLogs: auditLogs || [],
    };

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("exam-backups")
      .upload(filename, JSON.stringify(backupData, null, 2), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload backup:", uploadError);
    }

    // Record in backup_history
    await supabase.from("backup_history").insert({
      filename,
      backup_type: "scheduled",
      status: "completed",
      file_size: JSON.stringify(backupData).length,
      sessions_count: summary.totalSessions,
      audit_logs_count: summary.totalAuditLogs,
      profiles_count: 0,
      answers_count: 0,
    });

    // Send email notification using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "Sistem Ujian <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `📊 Laporan Export Harian - ${formatDateTime(now)}`,
        html: generateEmailHtml(summary, adminEmail),
      }),
    });

    const emailData = await emailResponse.json();
    let emailSent = false;
    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailData);
    } else {
      console.log("Email sent successfully:", emailData);
      emailSent = true;
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      action: "SCHEDULED_EXPORT",
      details: `Export harian: ${summary.totalSessions} peserta, ${summary.totalAuditLogs} audit logs. Email dikirim ke ${adminEmail}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        emailSent,
        filename,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in scheduled-export function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
