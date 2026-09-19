import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { MapView } from "@/components/MapView";
import { ScanLine, ShieldCheck, AlertTriangle, Car, FileWarning, Gavel, Bell, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Command Dashboard — TruePlate AI" }] }),
  component: Dashboard,
});

interface Stats {
  scanned: number;
  verified: number;
  suspicious: number;
  stolen: number;
  challans: number;
  criminal: number;
  activeAlerts: number;
}

interface RecentAlert {
  id: string;
  plate: string;
  summary: string | null;
  risk: string | null;
  created_at: string;
  state: string;
}

interface AlertLocation {
  lat: number;
  lng: number;
  label: string;
  tone: "alert";
}

interface TrendItem {
  day: string;
  scans: number;
  alerts: number;
}

interface PieItem {
  name: string;
  v: number;
  c: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ scanned: 0, verified: 0, suspicious: 0, stolen: 0, challans: 0, criminal: 0, activeAlerts: 0 });
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [alertLocations, setAlertLocations] = useState<AlertLocation[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const allowedEmails = [
            "taluka@ongole.com",
            "onetown@ongole.com",
            "twotown@ongole.com",
            "threetown@ongole.com",
            "chimakurthy@ongole.com",
            "kandukur@ongole.com"
          ];
          if (allowedEmails.includes(user.email ?? "")) {
            navigate({ to: "/station-dashboard", replace: true });
            return;
          }
        }

        const [scans, verified, alertsAll, alertsActive, stolenV, challanV, crimV, alertsRecent, alertsGeo, scans7] = await Promise.all([
          supabase.from("scans").select("*", { count: "exact", head: true }),
          supabase.from("scans").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
          supabase.from("scans").select("*", { count: "exact", head: true }).eq("verification_status", "flagged"),
          supabase.from("alerts").select("*", { count: "exact", head: true }).in("state", ["active", "assigned"]),
          supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "stolen"),
          supabase.from("vehicles").select("*", { count: "exact", head: true }).gt("pending_challans", 2),
          supabase.from("vehicles").select("*", { count: "exact", head: true }).not("criminal_cases", "eq", "{}"),
          supabase.from("alerts").select("id,plate,summary,risk,created_at,state").order("created_at", { ascending: false }).limit(6),
          supabase.from("alerts").select("lat,lng,plate,summary").not("lat", "is", null).limit(50),
          supabase.from("scans").select("created_at,verification_status").gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
        ]);

        if (scans.error) throw scans.error;
        if (verified.error) throw verified.error;
        if (alertsAll.error) throw alertsAll.error;
        if (alertsActive.error) throw alertsActive.error;
        if (stolenV.error) throw stolenV.error;
        if (challanV.error) throw challanV.error;
        if (crimV.error) throw crimV.error;
        if (alertsRecent.error) throw alertsRecent.error;
        if (alertsGeo.error) throw alertsGeo.error;
        if (scans7.error) throw scans7.error;

        setStats({
          scanned: scans.count ?? 0,
          verified: verified.count ?? 0,
          suspicious: alertsAll.count ?? 0,
          stolen: stolenV.count ?? 0,
          challans: challanV.count ?? 0,
          criminal: crimV.count ?? 0,
          activeAlerts: alertsActive.count ?? 0,
        });

        const recentData = (alertsRecent.data || []) as RecentAlert[];
        setRecentAlerts(recentData);

        const geoData = (alertsGeo.data || []) as { lat: number | null; lng: number | null; plate: string; summary: string | null }[];
        const locations: AlertLocation[] = geoData
          .filter((a): a is { lat: number; lng: number; plate: string; summary: string | null } => a.lat !== null && a.lng !== null)
          .map((a) => ({
            lat: a.lat,
            lng: a.lng,
            label: `${a.plate} · ${a.summary ?? ""}`,
            tone: "alert" as const
          }));
        setAlertLocations(locations);

        // trend
        const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const getTrendKey = (date: Date) => {
          const day = date.getDate();
          const month = monthsList[date.getMonth()];
          return `${day} ${month}`;
        };

        const days: Record<string, { scans: number; alerts: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 864e5);
          const key = getTrendKey(d);
          days[key] = { scans: 0, alerts: 0 };
        }
        
        const scans7Data = (scans7.data || []) as { created_at: string; verification_status: string }[];
        scans7Data.forEach((s) => {
          const key = getTrendKey(new Date(s.created_at));
          if (days[key]) {
            days[key].scans++;
            if (s.verification_status === "flagged") days[key].alerts++;
          }
        });
        setTrend(Object.entries(days).map(([day, v]) => ({ day, ...v })));

      } catch (err) {
        console.error("Dashboard failed to retrieve live metrics:", err);
      }
    }

    load();
    const ch = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "scans" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const pie: PieItem[] = [
    { name: "Verified", v: stats.verified, c: "oklch(0.78 0.18 150)" },
    { name: "Flagged", v: stats.suspicious, c: "oklch(0.65 0.24 25)" },
    { name: "Other", v: Math.max(0, stats.scanned - stats.verified - stats.suspicious), c: "oklch(0.7 0.05 260)" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Operational Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Live metrics and checkpoints monitoring · {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
        <Link to="/scanner" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold glow-cyan flex items-center gap-2">
          <ScanLine className="h-4 w-4" /> Start Live Scan
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vehicles Scanned" value={stats.scanned} icon={ScanLine} />
        <StatCard label="Verified" value={stats.verified} icon={ShieldCheck} tone="ok" />
        <StatCard label="Suspicious" value={stats.suspicious} icon={AlertTriangle} tone="warn" />
        <StatCard label="Active Alerts" value={stats.activeAlerts} icon={Bell} tone="alert" hint="Awaiting officer action" />
        <StatCard label="Stolen Vehicles" value={stats.stolen} icon={Car} tone="alert" />
        <StatCard label="Pending Challans" value={stats.challans} icon={FileWarning} tone="warn" />
        <StatCard label="Criminal Cases" value={stats.criminal} icon={Gavel} tone="alert" />
        <StatCard label="System Status" value="ONLINE" icon={Activity} tone="ok" hint="AI · DB · Realtime OK" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface/60 p-4">
          <h3 className="font-display font-semibold mb-3">Scans & Alerts — Last 7 Days</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="day" stroke="oklch(0.72 0.03 250)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.03 250)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.045 260)", border: "1px solid oklch(0.32 0.04 260)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="scans" stroke="oklch(0.78 0.16 210)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="alerts" stroke="oklch(0.65 0.24 25)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <h3 className="font-display font-semibold mb-3">Verification Split</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="v" nameKey="name" innerRadius={45} outerRadius={80} stroke="none">
                  {pie.map((p, i) => <Cell key={i} fill={p.c} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Recent Alerts</h3>
          <div className="space-y-2">
            {recentAlerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet. Start scanning at a checkpoint.</p>}
            {recentAlerts.map((a) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Link to="/alerts/$id" params={{ id: a.id }} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 hover:border-primary/40">
                  <div>
                    <div className="text-mono font-semibold">{a.plate}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{a.summary ?? "—"}</div>
                  </div>
                  <RiskBadge risk={a.risk} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <h3 className="font-display font-semibold mb-3">Alert Heatmap</h3>
          <MapView markers={alertLocations} height={280} />
        </div>
      </div>
    </div>
  );
}

export function RiskBadge({ risk }: { risk: string | null | undefined }) {
  const normalizedRisk = risk ?? "unknown";
  const cls = (
    {
      critical: "bg-destructive/20 text-destructive border-destructive/50",
      high: "bg-destructive/10 text-destructive border-destructive/40",
      medium: "bg-[color:var(--warn)]/15 text-[color:var(--warn)] border-[color:var(--warn)]/40",
      low: "bg-[color:var(--ok)]/15 text-[color:var(--ok)] border-[color:var(--ok)]/40",
    } as Record<string, string>
  )[normalizedRisk] ?? "bg-muted text-muted-foreground border-border";
  return <span className={`text-[10px] uppercase font-bold tracking-widest border rounded px-2 py-1 ${cls}`}>{normalizedRisk}</span>;
}
