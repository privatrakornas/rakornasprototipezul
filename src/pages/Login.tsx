import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn } from "lucide-react";

function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.href = next;
    });
    supabase.auth.getSession().then(({ data: sess }) => {
      if (sess.session) window.location.href = next;
    });
    return () => data.subscription.unsubscribe();
  }, [next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });
        if (error) throw error;
        setMessage("Cek email Anda untuk konfirmasi akun sebelum masuk.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${next}`,
      });
      if (result.error) {
        setError("Gagal masuk dengan Google.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
    } catch {
      setError("Gagal masuk dengan Google.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
      <header className="py-8">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="p-4 rounded-full bg-white/10 mb-4">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Masuk Akun</h1>
          <p className="text-white/70 text-sm mt-1">CPNS CAT Simulator</p>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4">
        <Card className="w-full max-w-md p-6 md:p-8 bg-white shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Kata Sandi</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={busy}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "signup" ? "Daftar" : "Masuk"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Masuk dengan Google
          </Button>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            disabled={busy}
          >
            {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </Button>

          <Button variant="ghost" className="w-full" onClick={() => navigate("/")} disabled={busy}>
            Kembali ke Halaman Utama
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default Login;
