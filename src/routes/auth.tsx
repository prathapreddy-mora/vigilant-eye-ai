import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Officer Sign In — TruePlate AI" },
      { name: "description", content: "Secure sign in for police officers to access the TruePlate AI vehicle verification control room." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && data.session.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single();
        const allowedEmails = [
          "taluka@ongole.com",
          "onetown@ongole.com",
          "twotown@ongole.com",
          "threetown@ongole.com",
          "chimakurthy@ongole.com",
          "kandukur@ongole.com"
        ];
        if (profile && profile.station_id && allowedEmails.includes(data.session.user.email ?? "")) {
          navigate({ to: "/station-dashboard", replace: true });
        } else {
          navigate({ to: "/", replace: true });
        }
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          const allowedEmails = [
            "taluka@ongole.com",
            "onetown@ongole.com",
            "twotown@ongole.com",
            "threetown@ongole.com",
            "chimakurthy@ongole.com",
            "kandukur@ongole.com"
          ];
          if (profile && profile.station_id && allowedEmails.includes(user.email ?? "")) {
            navigate({ to: "/station-dashboard", replace: true });
            return;
          }
        }
        navigate({ to: "/", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created — signed in");
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          const allowedEmails = [
            "taluka@ongole.com",
            "onetown@ongole.com",
            "twotown@ongole.com",
            "threetown@ongole.com",
            "chimakurthy@ongole.com",
            "kandukur@ongole.com"
          ];
          if (profile && profile.station_id && allowedEmails.includes(user.email ?? "")) {
            navigate({ to: "/station-dashboard", replace: true });
            return;
          }
        }
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center scan-grid p-6 relative overflow-hidden bg-background">
      {/* Tricolor National Stripe */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex z-50">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-[#FFFFFF]" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none z-0">
        <img src="/prakasam_police_badge.png" alt="Prakasam Police Crest" className="w-[500px] h-[500px] object-contain" />
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-surface/80 backdrop-blur p-8 glow-cyan relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <img src="/prakasam_police_badge.png" alt="Prakasam Police Logo" className="h-16 w-16 object-contain drop-shadow" />
          <div>
            <h1 className="font-display font-bold text-xl leading-none text-foreground uppercase tracking-wide">PRAKASAM POLICE</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Vigilant AI Access</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "up" && (
            <input type="text" required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          )}
          <input type="email" required placeholder="Officer email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
          <button disabled={loading} type="submit"
            className="w-full rounded-md bg-primary text-primary-foreground font-semibold py-2.5 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "in" ? "New officer? Create an account" : "Already have an account? Sign in"}
        </button>

        <p className="mt-6 text-[10px] text-muted-foreground text-center">
          New accounts are provisioned as <b>Constable</b>. Contact your administrator for SHO/Admin roles.
        </p>
      </div>
    </div>
  );
}
