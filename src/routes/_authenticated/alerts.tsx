import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Filter, Trash2, Share2, CheckSquare, Shield } from "lucide-react";
import { toast } from "sonner";
import { RiskBadge } from "./index";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — TruePlate AI" }] }),
  component: AlertsList,
});

function AlertsList() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      let q = supabase.from("alerts").select("*, vehicles(owner_name,brand,model,color)").order("created_at", { ascending: false }).limit(100);
      if (filter === "active") q = q.in("state", ["active", "assigned"]);

      // Filter alerts if logged in as a station officer
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
          const { data: profile } = await supabase.from("profiles").select("station_id").eq("id", user.id).single();
          if (profile && profile.station_id) {
            q = q.eq("routed_station_id", profile.station_id);
          }
        }
      }

      const { data } = await q;
      setAlerts(data ?? []);
    }
    load();
    const ch = supabase.channel("alerts-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const handleDeleteAlert = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this alert?")) return;
    try {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw error;
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success("Alert deleted");
    } catch (err: any) {
      console.error(err);
      toast.error("Error deleting alert");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedAlerts.length} alerts?`)) return;
    try {
      const { error } = await supabase.from("alerts").delete().in("id", selectedAlerts);
      if (error) throw error;
      setAlerts(alerts.filter(a => !selectedAlerts.includes(a.id)));
      setSelectedAlerts([]);
      toast.success(`Deleted ${selectedAlerts.length} alerts`);
    } catch (err: any) {
      toast.error("Error deleting alerts");
    }
  };

  const handleBulkShare = () => {
    const selected = alerts.filter(a => selectedAlerts.includes(a.id));
    const text = selected.map(a => `[URGENT] Alert for ${a.plate}\nRisk: ${a.risk.toUpperCase()}\nFlags: ${a.summary}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Alert details copied to clipboard!");
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2"><Bell className="h-6 w-6 text-destructive" /> Alerts</h1>
          <p className="text-sm text-muted-foreground">Flagged vehicles awaiting officer action. Alerts stay active until closed.</p>
        </div>
        {selectedAlerts.length > 0 ? (
          <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-border shadow-sm">
            <span className="text-sm font-semibold px-2">{selectedAlerts.length} selected</span>
            <button onClick={() => setSelectedAlerts(alerts.map(a => a.id))} className="px-3 py-1.5 text-sm text-primary hover:bg-surface-2 rounded-md font-medium">Select All</button>
            <button onClick={handleBulkShare} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm font-medium">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button onClick={() => setSelectedAlerts([])} className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2 rounded-md">Cancel</button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            {alerts.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                  onChange={(e) => setSelectedAlerts(e.target.checked ? alerts.map(a => a.id) : [])}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Select All
              </label>
            )}
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <button onClick={() => setFilter("active")} className={`px-3 py-1.5 rounded-md ${filter === "active" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Active</button>
              <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-md ${filter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>All</button>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-3">
        {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts.</p>}
        {alerts.map((a) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <input 
              type="checkbox"
              checked={selectedAlerts.includes(a.id)}
              onChange={(e) => {
                if (e.target.checked) setSelectedAlerts([...selectedAlerts, a.id]);
                else setSelectedAlerts(selectedAlerts.filter(id => id !== a.id));
              }}
              className="h-5 w-5 rounded border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer shrink-0"
            />
            <Link to="/alerts/$id" params={{ id: a.id }}
              className={`flex-1 block rounded-lg border p-4 hover:border-primary/40 transition-colors ${a.state === "closed" || a.state === "resolved" ? "border-border bg-surface/40 opacity-70" : "border-destructive/40 bg-surface/60 glow-alert"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-mono font-bold text-xl">{a.plate}</div>
                    <RiskBadge risk={a.risk} />
                    <span className="text-[10px] uppercase font-bold tracking-widest border border-border rounded px-2 py-1 text-muted-foreground">{a.state}</span>
                  </div>
                  <div className="mt-1 text-sm">{a.vehicles?.owner_name ?? "—"} · {a.vehicles?.brand} {a.vehicles?.model} · {a.vehicles?.color}</div>
                  <div className="mt-1 text-xs text-destructive">{a.summary}</div>
                  {a.routed_station_name && (
                    <div className="mt-2 text-xs flex items-center gap-1.5 text-cyan-400">
                      <Shield className="h-3.5 w-3.5" /> Routed to: <span className="font-semibold">{a.routed_station_name}</span> ({a.distance_km} km) · <span className="uppercase font-bold tracking-wider">{a.station_alert_status}</span>
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground flex flex-col items-end justify-between">
                  <div>
                    {new Date(a.created_at).toLocaleString()}
                    {a.lat && a.lng && <div className="mt-1">{a.lat.toFixed(3)}, {a.lng.toFixed(3)}</div>}
                  </div>
                  <button onClick={(e) => handleDeleteAlert(e, a.id)} className="mt-4 p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Delete Alert">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
