import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize name by removing dangerous characters
function sanitizeName(name: string): string {
  let cleaned = name;
  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  // Remove zero-width characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove right-to-left and left-to-right marks
  cleaned = cleaned.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  // Normalize unicode
  cleaned = cleaned.normalize('NFKC');
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  return cleaned.trim().slice(0, 100);
}

// Generate a simple session token with expiry
function generateSessionToken(name: string): string {
  const payload = {
    name: sanitizeName(name),
    exp: Date.now() + (2 * 60 * 60 * 1000), // 2 hours expiry
    iat: Date.now(),
  };
  // Simple base64 encoding - in production, use proper JWT signing
  return btoa(JSON.stringify(payload));
}

// Validate session token
function validateSessionToken(token: string): { valid: boolean; name?: string } {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp > Date.now()) {
      return { valid: true, name: payload.name };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, pin, name, token } = await req.json();
    const VALID_PIN = Deno.env.get('EXAM_PIN');

    if (!VALID_PIN) {
      console.error('EXAM_PIN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate existing session
    if (action === 'validate') {
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = validateSessionToken(token);
      console.log('Session validation:', result.valid ? 'valid' : 'invalid');
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN and create session
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ authorized: false, error: 'Nama harus minimal 2 karakter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pin || pin !== VALID_PIN) {
      console.log('Invalid PIN attempt for name:', sanitizeName(name));
      return new Response(
        JSON.stringify({ authorized: false, error: 'PIN tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session token
    const sanitizedName = sanitizeName(name);
    const sessionToken = generateSessionToken(sanitizedName);
    
    console.log('Login successful for:', sanitizedName);
    
    return new Response(
      JSON.stringify({ 
        authorized: true, 
        session: sessionToken,
        name: sanitizedName 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-pin:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
