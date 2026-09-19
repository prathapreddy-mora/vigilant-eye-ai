import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { addAlertNote, setAlertState } from "@/lib/alerts.functions";
import { generateVehicleReport } from "@/lib/pdf";
import { toast } from "sonner";
import { MapView } from "@/components/MapView";
import { RiskBadge } from "./index";
import { ArrowLeft, FileDown, CheckCircle2, XCircle, MessageSquarePlus, Shield, Clock, Compass, HelpCircle } from "lucide-react";
import { io } from "socket.io-client";

export const Route = createFileRoute("/_authenticated/alerts/$id")({
  head: () => ({ meta: [{ title: "Alert Detail — TruePlate AI" }] }),
  component: AlertDetail,
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function AlertDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const addNote = useServerFn(addAlertNote);
  const changeState = useServerFn(setAlertState);
  const [officerName, setOfficerName] = useState("");
  
  // Real-time control center additions
  const [station, setStation] = useState<any>(null);
  const [patrolPos, setPatrolPos] = useState<{ lat: number; lng: number } | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [prediction, setPrediction] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOfficerName(data.user?.email ?? ""));
    
    async function load() {
      const { data: a } = await supabase.from("alerts").select("*").eq("id", id).maybeSingle();
      setAlert(a);
      if (a?.vehicle_id) {
        const { data: v } = await supabase.from("vehicles").select("*").eq("id", a.vehicle_id).maybeSingle();
        setVehicle(v);
      }
      const { data: log } = await supabase.from("alert_audit_log").select("*").eq("alert_id", id).order("created_at");
      setAudit(log ?? []);

      // Load station coordinates if routed
      if (a?.routed_station_id) {
        const { data: s } = await supabase.from("police_stations").select("*").eq("station_id", a.routed_station_id).maybeSingle();
        setStation(s);
      }
      // Load patrol unit coordinates if assigned
      if (a?.assigned_patrol_id) {
        const { data: p } = await supabase.from("patrol_units").select("*").eq("patrol_id", a.assigned_patrol_id).maybeSingle();
        if (p) {
          setPatrolPos({ lat: p.live_latitude, lng: p.live_longitude });
        }
      }

      // Load vehicle tracking trail history
      if (a?.plate) {
        const { data: tracking } = await supabase.from("vehicle_tracking_history")
          .select("*")
          .eq("plate", a.plate)
          .order("timestamp", { ascending: false })
          .limit(10);
        
        if (tracking && tracking.length > 0) {
          const trailPoints = tracking.map((t: any) => ({ lat: t.latitude, lng: t.longitude }));
          setTrail(trailPoints);

          if (tracking.length >= 2) {
            const p1 = tracking[0];
            const p2 = tracking[1];
            const dLat = p1.latitude - p2.latitude;
            const dLng = p1.longitude - p2.longitude;
            if (Math.abs(dLat) > 0.0001 || Math.abs(dLng) > 0.0001) {
              const length = Math.sqrt(dLat * dLat + dLng * dLng);
              const projLat = p1.latitude + (dLat / length) * 0.03; // project ~3km ahead
              const projLng = p1.longitude + (dLng / length) * 0.03;
              
              const { data: stations } = await supabase.from("police_stations").select("*").eq("active", true);
              if (stations && stations.length > 0) {
                const sorted = stations.map((s: any) => {
                  const dist = haversineKm(projLat, projLng, s.lat, s.lng);
                  return { name: s.name, dist };
                }).sort((x: any, y: any) => x.dist - y.dist);
                setPrediction(`${sorted[0].name} (approx. ${sorted[0].dist.toFixed(1)} km ahead)`);
              }
            } else {
              setPrediction("Stationary / Undetermined");
            }
          } else {
            setPrediction("Insufficient trail history to predict heading");
          }
        }
      }
    }
    load();

    // Listen to real-time events via Socket.io
    const socket = io(typeof window !== "undefined" ? `http://${window.location.hostname}:5000` : "http://127.0.0.1:5000");
    
    socket.emit("join", "central");
    if (alert?.routed_station_id) {
      socket.emit("join", `station:${alert.routed_station_id}`);
    }

    socket.on("update_alert", (updated) => {
      if (updated.id === id) {
        setAlert(updated);
        // Reload audit logs to keep timeline synced
        supabase.from("alert_audit_log").select("*").eq("alert_id", id).order("created_at")
          .then(({ data }) => setAudit(data ?? []));
      }
    });

    socket.on("patrol_update", (data) => {
      if (data.alert_id === id) {
        setPatrolPos({ lat: data.lat, lng: data.lng });
      }
    });

    // Traditional supabase channel fallback
    const ch = supabase.channel(`alert-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alert_audit_log", filter: `alert_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `id=eq.${id}` }, load)
      .subscribe();

    return () => {
      socket.disconnect();
      supabase.removeChannel(ch);
    };
  }, [id, alert?.routed_station_id]);

  async function submitNote() {
    if (!note.trim()) return;
    try {
      await addNote({ data: { alertId: id, note } });
      setNote(""); toast.success("Note added");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function changeStateAction(state: "resolved" | "closed") {
    try {
      await changeState({ data: { alertId: id, state } });
      
      // Update local status so Socket will broadcast it as well
      await supabase.from("alerts").update({ station_alert_status: state === "closed" ? "Closed" : "Resolved" }).eq("id", id);
      
      toast.success(`Alert ${state}`);
      if (state === "closed") navigate({ to: "/alerts" });
    } catch (e) { toast.error((e as Error).message); }
  }

  if (!alert) return <div className="p-6 text-muted-foreground">Loading…</div>;

  // Build the list of map markers dynamically
  const mapMarkers = [];
  if (alert.lat && alert.lng) {
    mapMarkers.push({
      lat: alert.lat,
      lng: alert.lng,
      label: `DETECTED: ${alert.plate}`,
      tone: "alert" as const
    });
  }
  if (station && station.lat && station.lng) {
    mapMarkers.push({
      lat: station.lat,
      lng: station.lng,
      label: `STATION: ${station.name}`,
      tone: "ok" as const
    });
  }
  if (patrolPos && alert.assigned_patrol_id) {
    mapMarkers.push({
      lat: patrolPos.lat,
      lng: patrolPos.lng,
      label: `PATROL UNIT: ${alert.assigned_patrol_id}`,
      tone: "default" as const
    });
  }

  // Build incident timeline status array
  const timelineStages = [
    { label: "Detected & Alert Generated", status: "Sent", timestamp: alert.created_at, desc: "AI identified flagged plate." },
    { label: "Station Acknowledged", status: "Acknowledged", timestamp: audit.find(l => l.note?.toLowerCase().includes("accepted") || l.note?.toLowerCase().includes("acknowledged") || alert.station_alert_status !== 'Sent')?.created_at, desc: "Mission accepted by duty officer." },
    { label: "Patrol Dispatched / Moving", status: "Patrol Dispatched", timestamp: audit.find(l => l.action === "dispatched")?.created_at, desc: `Patrol unit ${alert.assigned_patrol_id || ""} sent to coordinate.` },
    { label: "Vehicle Intercepted / Located", status: "Vehicle Located", timestamp: audit.find(l => l.action === "intercepted")?.created_at, desc: "Vehicle located by patrol team." },
    { label: "Incident Resolved & Closed", status: "Closed", timestamp: alert.closed_at, desc: "Case resolved and archived." }
  ];

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <Link to="/alerts" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Alerts</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display font-bold text-3xl text-mono">{alert.plate}</h1>
        <RiskBadge risk={alert.risk} />
        <span className="text-[10px] uppercase font-bold tracking-widest border border-border rounded px-2 py-1 text-muted-foreground">{alert.state}</span>
        <span className="text-sm text-muted-foreground">Risk score {alert.risk_score}/100</span>
      </div>
      <p className="text-destructive text-sm font-semibold">{alert.summary}</p>

      {/* Control Room Routing Details */}
      {alert.routed_station_id && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Routed Police Station</div>
              <div className="text-sm font-bold text-foreground">{alert.routed_station_name} ({alert.distance_km} km away)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Live Station Status:</span>
            <span className="inline-flex rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              {alert.station_alert_status}
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {vehicle && (
            <div className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">Registered Vehicle</h3>
                <button onClick={() => generateVehicleReport(vehicle, { officer: officerName, remarks: alert.summary })}
                  className="text-sm rounded-md bg-primary text-primary-foreground px-3 py-1.5 flex items-center gap-2 font-semibold cursor-pointer">
                  <FileDown className="h-4 w-4" /> PDF Report
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field k="Owner" v={vehicle.owner_name} />
                <Field k="Contact" v={vehicle.owner_contact} />
                <Field k="Brand / Model" v={`${vehicle.brand} ${vehicle.model}`} />
                <Field k="Color / Type" v={`${vehicle.color} · ${vehicle.vehicle_type}`} />
                <Field k="Status" v={vehicle.status.toUpperCase()} tone={vehicle.status !== "active" ? "alert" : undefined} />
                <Field k="Pending Challans" v={`${vehicle.pending_challans} (₹${vehicle.challan_amount})`} />
                <Field k="Insurance" v={vehicle.insurance_valid ? "Valid" : "EXPIRED"} tone={vehicle.insurance_valid ? undefined : "alert"} />
                <Field k="PUC" v={vehicle.puc_valid ? "Valid" : "EXPIRED"} tone={vehicle.puc_valid ? undefined : "alert"} />
                <Field k="Fitness" v={vehicle.fitness_valid !== false ? "Valid" : "EXPIRED"} tone={vehicle.fitness_valid !== false ? undefined : "alert"} />
                <Field k="Road Tax" v={vehicle.road_tax_paid !== false ? "Paid" : "UNPAID"} tone={vehicle.road_tax_paid !== false ? undefined : "alert"} />
                <Field k="Criminal Cases" v={vehicle.criminal_cases?.length ? vehicle.criminal_cases.join(", ") : "None"} />
                <Field k="Flags" v={[vehicle.fake_plate ? "Fake Plate" : "", vehicle.duplicate_plate ? "Duplicate" : "", vehicle.suspicious ? "Suspicious" : ""].filter(Boolean).join(", ") || "None"} tone={(vehicle.fake_plate || vehicle.duplicate_plate || vehicle.suspicious) ? "alert" : undefined} />
                <Field k="RC Number" v={vehicle.rc_number} />
              </dl>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><MessageSquarePlus className="h-4 w-4" /> Investigation Log <span className="text-xs text-muted-foreground">(append-only)</span></h3>
            <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
              {audit.map((l) => (
                <div key={l.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                  <div className="text-muted-foreground">{new Date(l.created_at).toLocaleString()} · <b className="text-foreground uppercase">{l.action}</b></div>
                  {l.note && <div className="mt-0.5">{l.note}</div>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add investigation note…"
                className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={submitNote} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold cursor-pointer">Add</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Map showing live tracking */}
          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
            <h3 className="font-display font-semibold">Live Tracking Map</h3>
            {alert.lat && alert.lng ? (
              <MapView markers={mapMarkers} height={220} zoom={13} trail={trail} />
            ) : <p className="text-sm text-muted-foreground">No GPS captured.</p>}
            
            {prediction && (
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary animate-pulse shrink-0" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Estimated Heading: </span>
                  <span className="font-bold text-foreground">{prediction}</span>
                </div>
              </div>
            )}
          </div>

          {/* Incident Response Timeline */}
          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" /> Incident Timeline
            </h3>
            
            <div className="relative border-l border-border/80 pl-4 ml-2 space-y-5">
              {timelineStages.map((stage, idx) => {
                const isCompleted = !!stage.timestamp || 
                  (stage.status === "Acknowledged" && alert.station_alert_status !== "Sent" && alert.station_alert_status !== "Auto-Forwarded") ||
                  (stage.status === "Patrol Dispatched" && (alert.station_alert_status === "Patrol Dispatched" || alert.station_alert_status === "Vehicle Located" || alert.station_alert_status === "Closed")) ||
                  (stage.status === "Vehicle Located" && (alert.station_alert_status === "Vehicle Located" || alert.station_alert_status === "Closed"));
                
                return (
                  <div key={idx} className="relative group">
                    {/* Bullet */}
                    <div className={`absolute -left-[21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-background transition-colors ${
                      isCompleted ? "border-emerald-400 bg-emerald-500/10" : "border-border bg-surface-2"
                    }`} />
                    
                    <div className="text-xs">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{stage.label}</span>
                        {stage.timestamp && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(stage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-2">
            <h3 className="font-display font-semibold">Actions</h3>
            <button onClick={() => changeStateAction("resolved")} disabled={alert.state === "resolved" || alert.state === "closed"}
              className="w-full rounded-md bg-[color:var(--ok)]/15 border border-[color:var(--ok)]/40 text-[color:var(--ok)] px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              <CheckCircle2 className="h-4 w-4" /> Mark Resolved
            </button>
            <button onClick={() => changeStateAction("closed")} disabled={alert.state === "closed"}
              className="w-full rounded-md bg-destructive/15 border border-destructive/40 text-destructive px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              <XCircle className="h-4 w-4" /> Close Alert
            </button>
            <p className="text-[10px] text-muted-foreground">Only SHO/Admin can update alert state.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "alert" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className={`mt-0.5 ${tone === "alert" ? "text-destructive font-semibold" : ""}`}>{v ?? "—"}</div>
    </div>
  );
}
