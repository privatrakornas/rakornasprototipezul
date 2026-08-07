import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verifikasi identitas Anda",
  email: "Membaca alamat email Anda",
  profile: "Membaca profil dasar Anda",
};

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Permintaan otorisasi tidak valid (authorization_id tidak ada).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }
      if (!active) return;
      setAccount(sess.session.user.email ?? sess.session.user.id);

      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Server otorisasi tidak mengembalikan alamat pengalihan.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "Aplikasi ini";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md p-6 md:p-8 bg-white shadow-2xl">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Permintaan tidak dapat dimuat</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Memuat permintaan otorisasi…
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="p-3 rounded-full bg-primary/10 mb-3">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Hubungkan {clientName} ke CPNS CAT Simulator
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {clientName} akan dapat memanggil tools aplikasi ini sebagai Anda.
              </p>
            </div>

            <div className="space-y-2 text-sm text-foreground border rounded-lg p-4 mb-4">
              <p>
                <span className="text-muted-foreground">Akun: </span>
                {account}
              </p>
              {details.client?.redirect_uri && (
                <p className="break-all">
                  <span className="text-muted-foreground">Alamat pengalihan: </span>
                  {details.client.redirect_uri}
                </p>
              )}
              {scopes.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Izin yang diminta:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {scopes.map((scope) => (
                      <li key={scope}>{SCOPE_LABELS[scope] ?? `Izin tambahan: ${scope}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-5">
              Ini tidak melewati izin atau kebijakan keamanan aplikasi ini.
            </p>

            <div className="flex flex-col gap-2">
              <Button onClick={() => decide(true)} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Setujui
              </Button>
              <Button variant="outline" onClick={() => decide(false)} disabled={busy}>
                Batalkan koneksi
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default OAuthConsent;
