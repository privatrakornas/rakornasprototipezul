import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnomalyAlertRequest {
  participantName: string;
  participantId: string;
  riskScore: number;
  riskLevel: string;
  anomalies: string[];
  adminEmail: string;
  examDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { 
      participantName, 
      participantId, 
      riskScore, 
      riskLevel, 
      anomalies, 
      adminEmail,
      examDate 
    }: AnomalyAlertRequest = await req.json();

    // Validate required fields
    if (!participantName || !riskScore || !adminEmail) {
      throw new Error("Missing required fields: participantName, riskScore, or adminEmail");
    }

    // Build anomaly list HTML
    const anomalyListHtml = anomalies && anomalies.length > 0 
      ? `<ul style="margin: 0; padding-left: 20px;">
          ${anomalies.map(a => `<li style="color: #dc2626;">${a}</li>`).join('')}
        </ul>`
      : '<p style="color: #666;">Tidak ada detail spesifik</p>';

    // Determine risk color
    const riskColor = riskLevel === 'Critical' ? '#dc2626' 
      : riskLevel === 'High' ? '#ea580c' 
      : riskLevel === 'Medium' ? '#ca8a04' 
      : '#16a34a';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Anomaly Alert</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #5C0A0F 0%, #8B1538 100%); padding: 24px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">🛡️ RAKORNAS Security Alert</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Sistem Deteksi Anomali</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            <div style="background-color: #fef2f2; border-left: 4px solid ${riskColor}; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
              <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">
                Peserta dengan Risiko ${riskLevel} Terdeteksi
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Sistem mendeteksi pola mencurigakan pada sesi ujian berikut.
              </p>
            </div>
            
            <!-- Participant Info -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; width: 40%;">Nama Peserta</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${participantName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">ID Sesi</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${participantId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Skor Risiko</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                  <span style="background-color: ${riskColor}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600;">
                    ${riskScore}/100
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Tingkat Risiko</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">
                  <span style="color: ${riskColor}; font-weight: 600;">${riskLevel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Waktu Ujian</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${examDate}</td>
              </tr>
            </table>
            
            <!-- Anomalies -->
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px;">🔍 Anomali yang Terdeteksi:</h3>
              ${anomalyListHtml}
            </div>
            
            <!-- Action -->
            <div style="text-align: center; padding: 16px 0;">
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                Silakan periksa detail lengkap di Admin Panel untuk investigasi lebih lanjut.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              Email ini dikirim otomatis oleh sistem RAKORNAS.<br>
              © 2024 Privat RAKORNAS - Sistem Simulasi CAT SKD
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RAKORNAS Alert <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `⚠️ Anomali ${riskLevel} Terdeteksi - ${participantName}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Anomaly alert email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-anomaly-alert function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
