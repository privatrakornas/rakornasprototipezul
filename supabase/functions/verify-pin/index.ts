import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Allowed origins for CORS - restrict to legitimate sources
const allowedOrigins = [
  Deno.env.get('SITE_URL') || '',
  'https://lovable.dev',
  'https://id.lovable.app',
].filter(Boolean);

// Check if origin matches allowed patterns (including lovableproject.com subdomains)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Allow all lovableproject.com subdomains
  if (origin.endsWith('.lovableproject.com')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Rate limiting for PIN brute-force protection
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 PIN attempts per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

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

// Get or create the HMAC key for JWT signing
async function getJwtKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Generate a cryptographically signed JWT session token
async function generateSessionToken(name: string): Promise<string> {
  const key = await getJwtKey();
  
  const payload = {
    sub: sanitizeName(name),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours expiry
    iss: 'rakornas-exam',
    aud: 'exam-participants'
  };
  
  return await create(
    { alg: 'HS256', typ: 'JWT' },
    payload,
    key
  );
}

// Validate JWT session token with signature verification
async function validateSessionToken(token: string): Promise<{ valid: boolean; name?: string }> {
  try {
    const key = await getJwtKey();
    const payload = await verify(token, key);
    
    // Additional validation for issuer and audience
    if (payload.iss !== 'rakornas-exam' || payload.aud !== 'exam-participants') {
      console.log('JWT validation failed: invalid issuer or audience');
      return { valid: false };
    }
    
    return { 
      valid: true, 
      name: payload.sub as string 
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return { valid: false };
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    // Validate existing session (no rate limiting for validation)
    if (action === 'validate') {
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await validateSessionToken(token);
      console.log('Session validation:', result.valid ? 'valid' : 'invalid');
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting for PIN verification attempts
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      console.log('Rate limit exceeded for IP:', clientIp);
      return new Response(
        JSON.stringify({ authorized: false, error: 'Terlalu banyak percobaan. Silakan tunggu 1 menit.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } 
        }
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
      console.log('Invalid PIN attempt for name:', sanitizeName(name), 'from IP:', clientIp);
      return new Response(
        JSON.stringify({ authorized: false, error: 'PIN tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed JWT session token
    const sanitizedName = sanitizeName(name);
    const sessionToken = await generateSessionToken(sanitizedName);
    
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
