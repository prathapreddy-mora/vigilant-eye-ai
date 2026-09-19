import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ScanLine, Bell, Search, History, LogOut, Shield, Languages, Database, MapPin, Upload, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, type ReactNode } from "react";
import { setLang, useLang, t, initLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("constable");
  const [stationId, setStationId] = useState<string>("central");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: alertCount = 0 } = useQuery({
    queryKey: ["alertsCount", email, stationId],
    queryFn: async () => {
      const allowedEmails = [
        "taluka@ongole.com",
        "onetown@ongole.com",
        "twotown@ongole.com",
        "threetown@ongole.com",
        "chimakurthy@ongole.com",
        "kandukur@ongole.com"
      ];
      const isStation = stationId && stationId !== "central" && allowedEmails.includes(email);
      let q = supabase.from("alerts").select("*", { count: "exact", head: true }).in("state", ["active", "assigned"]);
      if (isStation) {
        q = q.eq("routed_station_id", stationId);
      }
      const { count } = await q;
      return count || 0;
    },
    refetchInterval: 2000
  });

  const lang = useLang();
  useEffect(() => { initLang(); }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      if (data.user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
        if (p) {
          setRole(p.role || "constable");
          setStationId(p.station_id || "");
        }
      }
    });
  }, []);

  // Global socket listener
  useEffect(() => {
    const socket = io(typeof window !== "undefined" ? `http://${window.location.hostname}:5000` : "http://127.0.0.1:5000");
    
    async function joinRoom() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile && profile.station_id) {
        socket.emit("join", `station:${profile.station_id}`);
        console.log(`Global Socket joined: station:${profile.station_id}`);
      } else {
        socket.emit("join", "central");
        console.log(`Global Socket joined: central`);
      }
    }
    joinRoom();

    socket.on("new_alert", (newAlert: any) => {
      qc.invalidateQueries({ queryKey: ["alertsCount"] });
      
      // Browser speech synthesis voice notification
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const text = `Attention. New alert for vehicle ${newAlert.plate}. Reason: ${newAlert.summary}`;
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
      
      toast.error(`🚨 ALERT ROUTED: ${newAlert.plate}`, {
        description: `Routed to ${newAlert.routed_station_name || 'Station'} (${newAlert.distance_km || 0} km). Reason: ${newAlert.summary}`,
        duration: 8000,
      });
    });

    socket.on("update_alert", (updatedAlert: any) => {
      qc.invalidateQueries({ queryKey: ["alertsCount"] });
      toast.info(`Alert ${updatedAlert.plate} status updated to: ${updatedAlert.station_alert_status}`, {
        duration: 4000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  const allowedEmails = [
    "taluka@ongole.com",
    "onetown@ongole.com",
    "twotown@ongole.com",
    "threetown@ongole.com",
    "chimakurthy@ongole.com",
    "kandukur@ongole.com"
  ];
  const isStationOfficer = stationId && stationId !== "central" && allowedEmails.includes(email);

  const nav = isStationOfficer
    ? [
        { to: "/station-dashboard", icon: Radio, label: "Station Dashboard" },
        { to: "/alerts", icon: Bell, label: t("alerts"), badge: alertCount },
      ]
    : [
        { to: "/", icon: LayoutDashboard, label: t("dashboard") },
        { to: "/scanner", icon: ScanLine, label: t("scanner") },
        { to: "/upload", icon: Upload, label: "Image Upload" },
        { to: "/alerts", icon: Bell, label: t("alerts"), badge: alertCount },
        { to: "/search", icon: Search, label: t("search") },
        { to: "/history", icon: History, label: t("history") },
        { to: "/database", icon: Database, label: "Database" },
        { to: "/checkpoints", icon: MapPin, label: "Checkpoints" },
        { to: "/police-stations", icon: Shield, label: "Police Stations" },
      ];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Tricolor National Stripe */}
      <div className="h-1.5 w-full flex shrink-0 z-50">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-[#FFFFFF]" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Centered Top Fixed Header with Officer Images */}
      <header className="h-20 w-full bg-surface/80 backdrop-blur border-b border-border flex items-center justify-between px-6 shrink-0 relative z-40 shadow-sm select-none">
        {/* Left Officer Portrait */}
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/30 bg-muted drop-shadow-sm">
            <img src="/officer_1.png" alt="Superintendent of Police" className="h-full w-full object-cover" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Superintendent of Police</div>
            <div className="text-xs font-bold text-foreground mt-1">Prakasam District</div>
          </div>
        </div>

        {/* Centered Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="font-display font-bold text-xl md:text-2xl leading-none text-foreground tracking-wide uppercase">
            PRAKASAM POLICE
          </div>
          <div className="text-[10px] md:text-[11px] text-primary font-bold uppercase tracking-widest mt-1.5">
            Central Command Dashboard
          </div>
        </div>

        {/* Right Officer Portrait */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Deputy Superintendent of Police</div>
            <div className="text-xs font-bold text-foreground mt-1">Prakasam District</div>
          </div>
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/30 bg-muted drop-shadow-sm">
            <img src="/officer_2.png" alt="Deputy Superintendent of Police" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-60 shrink-0 border-r border-border bg-surface/60 backdrop-blur flex flex-col sticky top-0 h-[calc(100vh-86px)] overflow-y-auto">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <img src="/prakasam_police_badge.png" alt="Prakasam Police Logo" className="h-10 w-10 object-contain drop-shadow" />
              <div>
                <div className="font-display font-bold text-sm leading-tight text-foreground uppercase tracking-wider">Prakasam Police</div>
                <div className="text-[9px] text-primary font-bold uppercase tracking-wider">Vigilant AI</div>
              </div>
            </div>
          </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/15 text-primary glow-cyan" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}>
                <n.icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {n.badge ? (
                  <span className="rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 font-semibold">{n.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">

          <Link to="/profile" className="w-full flex flex-col items-start rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors group">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary group-hover:text-primary/80">Logged in as</span>
            <span className="truncate w-full text-left">{email}</span>
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" /> {t("signout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden relative">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
          <img src="/prakasam_police_badge.png" alt="Prakasam Police Crest" className="w-[600px] h-[600px] object-contain" />
        </div>
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </main>
      </div>
    </div>
  );
}
