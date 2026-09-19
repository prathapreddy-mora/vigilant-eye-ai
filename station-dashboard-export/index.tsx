import { useEffect, useState } from "react";
import { Shield, Bell, Navigation, Navigation2, Check, CheckCircle2, Loader2, Radio, Car } from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { MapView } from "./components/MapView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./components/dialog";
import { cn } from "./utils";

interface StationDashboardProps {
  /**
   * Supabase client instance to perform database operations.
   * If not provided, it will attempt to fetch data using a fallback or throw.
   */
  supabaseClient: any;
  /**
   * The base URL for the backend Socket.io server.
   * Defaults to 'http://127.0.0.1:5000'.
   */
  socketUrl?: string;
  /**
   * Optional custom list of allowed email addresses for the access control check.
   * If not provided, it uses the default Prakasam/Ongole station emails.
   */
  allowedEmails?: string[];
  /**
   * Optional callback triggered when the user is unauthorized.
   */
  onUnauthorized?: () => void;
}

export function StationDashboard({
  supabaseClient,
  socketUrl = typeof window !== "undefined" ? `http://${window.location.hostname}:5000` : "http://127.0.0.1:5000",
  allowedEmails = [
    "taluka@ongole.com",
    "onetown@ongole.com",
    "twotown@ongole.com",
    "threetown@ongole.com",
    "chimakurthy@ongole.com",
    "kandukur@ongole.com"
  ],
  onUnauthorized
}: StationDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patrolUnits, setPatrolUnits] = useState<any[]>([]);
  
  // Patrol assignment dialog state
  const [assigningAlert, setAssigningAlert] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  
  // Map preview dialog state
  const [trackingAlert, setTrackingAlert] = useState<any>(null);
  const [livePatrolPos, setLivePatrolPos] = useState<Record<string, { lat: number; lng: number }>>({});
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
  const [capturingAlert, setCapturingAlert] = useState<any>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // 1. Fetch user profile, stations, and determine active station ID
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(profile);

        // Check authorization
        if (profile && !allowedEmails.includes(profile.email)) {
          if (onUnauthorized) {
            onUnauthorized();
          }
        }

        const { data: stationList } = await supabaseClient.from("police_stations").select("*").eq("active", true);
        const activeStations = stationList ?? [];
        setStations(activeStations);

        // If user has a station_id, bind them to it. Otherwise (admin), default to first station.
        const defaultStation = profile?.station_id || (activeStations[0]?.station_id || "");
        setSelectedStationId(defaultStation);
      } catch (err: any) {
        toast.error("Failed to load profile details: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabaseClient, allowedEmails, onUnauthorized]);

  // 2. Fetch alerts and patrol units for the selected station
  useEffect(() => {
    if (!selectedStationId) return;

    async function loadData() {
      try {
        // Fetch active alerts routed to this station (primary or secondary)
        const { data: alertList } = await supabaseClient
          .from("alerts")
          .select("*, vehicles(owner_name,brand,model,color)")
          .eq("routed_station_id", selectedStationId)
          .not("station_alert_status", "eq", "Closed")
          .order("created_at", { ascending: false });
        
        setAlerts(alertList ?? []);

        // Fetch patrol units for this station
        const { data: patrols } = await supabaseClient
          .from("patrol_units")
          .select("*")
          .eq("station_id", selectedStationId);
        
        setPatrolUnits(patrols ?? []);
      } catch (err: any) {
        console.error("Error loading station data:", err);
      }
    }
    loadData();

    // 3. Connect to WebSocket room for this station
    const socket = io(socketUrl);
    
    socket.emit("join", `station:${selectedStationId}`);
    console.log(`Joined socket room: station:${selectedStationId}`);

    socket.on("new_alert", (newAlert: any) => {
      // Avoid duplicates
      setAlerts(prev => {
        if (prev.some(a => a.id === newAlert.id)) return prev;
        
        // Voice alert announcement
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const text = `Attention. ${newAlert.risk} alert generated for vehicle ${newAlert.plate}. Reason: ${newAlert.summary}`;
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        }
        
        toast.error(`🚨 New Routed Alert: ${newAlert.plate} - ${newAlert.summary}`, {
          duration: 8000,
        });

        return [newAlert, ...prev];
      });
    });

    socket.on("update_alert", (updatedAlert: any) => {
      if (updatedAlert.station_alert_status === "Closed") {
        // Remove from list
        setAlerts(prev => prev.filter(a => a.id !== updatedAlert.id));
      } else {
        setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a));
      }
    });

    socket.on("patrol_update", (data: any) => {
      console.log("Patrol position update:", data);
      setLivePatrolPos(prev => ({
        ...prev,
        [data.alert_id]: { lat: data.lat, lng: data.lng }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedStationId, supabaseClient, socketUrl]);

  // Actions
  const handleAcceptMission = async (alertId: string) => {
    try {
      const { error } = await supabaseClient
        .from("alerts")
        .update({ station_alert_status: "Acknowledged" })
        .eq("id", alertId);
      
      if (error) throw error;
      toast.success("Mission Acknowledged");
    } catch (err: any) {
      toast.error("Failed to accept mission: " + err.message);
    }
  };

  const handleOpenDispatch = (alert: any) => {
    setAssigningAlert(alert);
  };

  const handleDispatchPatrol = async (patrolId: string) => {
    if (!assigningAlert) return;
    setDispatching(true);
    try {
      // 1. Update patrol unit status to On Duty
      await supabaseClient
        .from("patrol_units")
        .update({ availability: "On Duty" })
        .eq("patrol_id", patrolId);

      // 2. Update Alert status
      const { error } = await supabaseClient
        .from("alerts")
        .update({
          station_alert_status: "Patrol Dispatched",
          assigned_patrol_id: patrolId
        })
        .eq("id", assigningAlert.id);

      if (error) throw error;

      // Add audit log entry
      await supabaseClient.from("alert_audit_log").insert({
        alert_id: assigningAlert.id,
        action: "dispatched",
        note: `Patrol unit ${patrolId} dispatched to target.`
      });

      toast.success(`Patrol Unit ${patrolId} Dispatched successfully!`);
      setAssigningAlert(null);
    } catch (err: any) {
      toast.error("Failed to dispatch patrol: " + err.message);
    } finally {
      setDispatching(false);
    }
  };

  const handleUploadProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCapture = async () => {
    if (!capturingAlert) return;
    if (!proofImage) {
      toast.error("Please upload or capture a proof image first");
      return;
    }
    setSubmittingProof(true);
    try {
      const { error } = await supabaseClient
        .from("alerts")
        .update({
          station_alert_status: "Vehicle Located / Intercepted",
          proof_image_url: proofImage
        })
        .eq("id", capturingAlert.id);
      
      if (error) throw error;
      
      setAlerts(prev => prev.map(a => a.id === capturingAlert.id ? { ...a, station_alert_status: "Vehicle Located / Intercepted", proof_image_url: proofImage } : a));
      toast.success("Vehicle Captured! Proof image uploaded successfully.");
      setCapturingAlert(null);
      setProofImage(null);
    } catch (err: any) {
      toast.error("Failed to capture vehicle: " + err.message);
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleSaveDescription = async (alertId: string) => {
    const desc = caseNotes[alertId] ?? "";
    try {
      const { error } = await supabaseClient
        .from("alerts")
        .update({ description: desc })
        .eq("id", alertId);
      
      if (error) throw error;
      
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, description: desc } : a));
      toast.success("Case description saved!");
    } catch (err: any) {
      toast.error("Failed to save description: " + err.message);
    }
  };

  const handleCaseSolved = async (alertId: string) => {
    if (!window.confirm("Are you sure you want to mark this case solved? The alert will be archived and removed.")) return;
    try {
      const alertItem = alerts.find(a => a.id === alertId);
      if (alertItem && alertItem.assigned_patrol_id) {
        await supabaseClient
          .from("patrol_units")
          .update({ availability: "Available" })
          .eq("patrol_id", alertItem.assigned_patrol_id);
      }

      const { error } = await supabaseClient
        .from("alerts")
        .update({
          station_alert_status: "Closed",
          state: "resolved",
          closed_at: new Date().toISOString()
        })
        .eq("id", alertId);

      if (error) throw error;

      await supabaseClient.from("alert_audit_log").insert({
        alert_id: alertId,
        action: "resolved",
        note: "Case marked solved. Notes: " + (caseNotes[alertId] || alertItem?.description || "")
      });

      // Remove from the local state list immediately
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success("Case marked solved and alert resolved.");
    } catch (err: any) {
      toast.error("Failed to resolve case: " + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sent": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Acknowledged": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Assigned": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Patrol Dispatched":
      case "Patrol Dispatched / Moving":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse";
      case "Vehicle Located":
      case "Vehicle Located / Intercepted":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Auto-Forwarded":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20 border";
      default: return "bg-surface-2 text-muted-foreground";
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (userProfile && !allowedEmails.includes(userProfile.email)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center animate-bounce">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="font-display font-bold text-2xl text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          The Station Dashboard is only accessible under authorized station credentials.
          Please log out and sign in with the specific police station email.
        </p>
      </div>
    );
  }

  // Find coordinates for selected station (to plot on maps or show details)
  const activeStationDetails = stations.find(s => s.station_id === selectedStationId);

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* Title & Dropdown Filter (Admin only) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary animate-pulse" /> Station Control Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time feed of alerts routed to {activeStationDetails?.name || selectedStationId}.
          </p>
        </div>

        {/* Show station selector only for global admins (users without static station_id) */}
        {(!userProfile?.station_id || userProfile.role === "admin") && (
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-md border border-border">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Active PS:</span>
            <select
              value={selectedStationId}
              onChange={e => setSelectedStationId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-primary outline-none cursor-pointer"
            >
              {stations.map(s => (
                <option key={s.id} value={s.station_id} className="bg-surface text-foreground">
                  {s.name} ({s.station_id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid: Left - Feed, Right - Quick Stats & Patrol Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" /> Pending Action List ({alerts.length})
            </h2>
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-lg border border-border border-dashed p-12 text-center text-muted-foreground bg-surface/20">
              No active alerts routed to this station. Systems secure.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((a) => {
                return (
                  <div key={a.id} className="rounded-lg border border-border bg-surface/50 backdrop-blur p-5 space-y-4 glow-cyan/5 hover:border-primary/30 transition-colors">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
                      <div>
                        <span className={`inline-flex items-center border rounded px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusColor(a.station_alert_status)}`}>
                          {a.station_alert_status}
                        </span>
                        <h3 className="font-display font-bold text-xl text-primary mt-1.5">{a.plate}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Scanned At</span>
                        <div className="text-sm font-medium">{new Date(a.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Flags</span>
                        <p className="font-semibold text-destructive mt-0.5">{a.summary || "Suspicious"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Distance from PS</span>
                        <p className="font-semibold mt-0.5">{a.distance_km} km away</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Risk Level</span>
                        <p className={`font-semibold capitalize mt-0.5 ${a.risk === "critical" ? "text-rose-500" : a.risk === "high" ? "text-amber-500" : "text-cyan-400"}`}>
                          {a.risk} ({a.risk_score}%)
                        </p>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-border/40 pb-4">
                      <div className="flex items-center gap-2">
                        {/* 1. Accept/Acknowledge */}
                        {(a.station_alert_status === "Sent" || a.station_alert_status === "Auto-Forwarded") && (
                          <button
                            onClick={() => handleAcceptMission(a.id)}
                            className="flex items-center gap-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold px-3.5 py-1.5 text-xs hover:bg-amber-500/30 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" /> Accept Mission
                          </button>
                        )}

                        {/* 2. Dispatch Patrol */}
                        {a.station_alert_status === "Acknowledged" && (
                          <button
                            onClick={() => handleOpenDispatch(a)}
                            className="flex items-center gap-1.5 rounded bg-cyan-500 text-cyan-foreground font-semibold px-3.5 py-1.5 text-xs hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <Car className="h-3.5 w-3.5" /> Dispatch Patrol
                          </button>
                        )}



                        {/* 4. Navigate Directions Link */}
                        {a.lat && a.lng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded border border-border bg-surface-2 text-foreground font-semibold px-3.5 py-1.5 text-xs hover:bg-surface-3 transition-colors"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Navigate
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Case Status Section */}
                    <div className="pt-2 space-y-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Case Status</span>
                      
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {a.station_alert_status === "Vehicle Located / Intercepted" ? (
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 text-xs shadow-sm">
                              <Shield className="h-3.5 w-3.5 text-emerald-400" /> Vehicle Captured
                            </span>
                            {a.proof_image_url && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold">Proof of Capture</span>
                                <img
                                  src={a.proof_image_url}
                                  alt="Capture Proof"
                                  className="h-16 w-28 rounded object-cover border border-emerald-500/30 cursor-zoom-in hover:opacity-90"
                                  onClick={() => window.open(a.proof_image_url, '_blank')}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setCapturingAlert(a);
                              setProofImage(null);
                            }}
                            className="flex items-center gap-1.5 rounded px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 transform active:scale-95 cursor-pointer"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            Capture Vehicle
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleCaseSolved(a.id)}
                          className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs transition-all duration-200 transform active:scale-95 shadow-md shadow-emerald-900/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Case Solved
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase font-semibold">Case Notes / Description</label>
                        <div className="flex gap-2">
                          <textarea
                            value={caseNotes[a.id] ?? a.description ?? ""}
                            onChange={(e) => setCaseNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder="Add case description, suspect details, towed status..."
                            className="flex-1 bg-surface-2 border border-border rounded p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none h-12"
                          />
                          <button
                            onClick={() => handleSaveDescription(a.id)}
                            className="bg-primary hover:opacity-90 text-primary-foreground font-semibold px-3 rounded text-xs transition-opacity cursor-pointer h-12"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Patrol Units & Station Status */}
        <div className="space-y-6">
          {/* Patrol Units status list */}
          <div className="rounded-lg border border-border bg-surface/50 backdrop-blur p-5 space-y-4">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Active Patrol Fleet ({patrolUnits.length})
            </h3>
            
            <div className="divide-y divide-border/40">
              {patrolUnits.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No patrol units registered for this station.</p>
              ) : (
                patrolUnits.map(p => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-primary">{p.patrol_id}</p>
                      <p className="text-xs text-muted-foreground">{p.vehicle_details}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.availability === "Available" ? "bg-emerald-500/10 text-emerald-400" :
                      p.availability === "On Duty" ? "bg-amber-500/10 text-amber-400" :
                      "bg-surface-2 text-muted-foreground"
                    }`}>
                      {p.availability}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Station Details */}
          {activeStationDetails && (
            <div className="rounded-lg border border-border bg-surface/30 backdrop-blur p-5 space-y-3.5 text-sm">
              <h3 className="font-display font-bold text-base">Station Information</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground uppercase font-semibold">Station Name</span>
                  <p className="text-sm font-medium mt-0.5">{activeStationDetails.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase font-semibold">Jurisdiction Area</span>
                  <p className="text-sm font-medium mt-0.5">{activeStationDetails.radius_km} km radius</p>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase font-semibold">Contact Line</span>
                  <p className="text-sm font-medium text-primary mt-0.5">{activeStationDetails.contact_number || "N/A"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Patrol Dialog */}
      {assigningAlert && (
        <Dialog open={!!assigningAlert} onOpenChange={() => setAssigningAlert(null)}>
          <DialogContent className="max-w-md bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Dispatch Patrol to {assigningAlert.plate}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-xs text-muted-foreground">
                Select an available patrol vehicle to intercept the vehicle near <b>{assigningAlert.distance_km} km</b> from the station.
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {patrolUnits.filter(p => p.availability === "Available").length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-6">
                    No patrol units currently available. Clear active missions first or register new patrol units.
                  </p>
                ) : (
                  patrolUnits.filter(p => p.availability === "Available").map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleDispatchPatrol(p.patrol_id)}
                      className="border border-border rounded-md p-3 flex items-center justify-between cursor-pointer hover:border-primary/60 hover:bg-surface-2/40 transition-all"
                    >
                      <div>
                        <p className="font-bold text-primary">{p.patrol_id}</p>
                        <p className="text-xs text-muted-foreground">{p.vehicle_details}</p>
                      </div>
                      <button className="rounded bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 cursor-pointer">
                        Dispatch
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setAssigningAlert(null)}
                className="w-full rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Live Track Dialog */}
      {trackingAlert && (
        <Dialog open={!!trackingAlert} onOpenChange={() => setTrackingAlert(null)}>
          <DialogContent className="max-w-3xl bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Radio className="h-5 w-5 text-cyan-400 animate-pulse" /> Live Incident Tracking: {trackingAlert.plate}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-4">
              <div className="h-96 w-full rounded-lg overflow-hidden border border-border">
                {activeStationDetails && (
                  <MapView
                    center={[trackingAlert.lat, trackingAlert.lng]}
                    zoom={13}
                    height={384}
                    markers={[
                      // Target marker
                      {
                        lat: trackingAlert.lat,
                        lng: trackingAlert.lng,
                        label: `DETECTED: ${trackingAlert.plate} (${trackingAlert.summary})`,
                        tone: "alert"
                      },
                      // Police station marker
                      {
                        lat: activeStationDetails.lat,
                        lng: activeStationDetails.lng,
                        label: activeStationDetails.name,
                        tone: "ok"
                      },
                      // Live Patrol unit marker (if dispatched)
                      ...(trackingAlert.assigned_patrol_id ? [
                        {
                          lat: livePatrolPos[trackingAlert.id]?.lat || activeStationDetails.lat,
                          lng: livePatrolPos[trackingAlert.id]?.lng || activeStationDetails.lng,
                          label: `Patrol ${trackingAlert.assigned_patrol_id} (Dispatched)`,
                          tone: "default" as const
                        }
                      ] : [])
                    ]}
                  />
                )}
              </div>

              {/* Status footer */}
              <div className="flex justify-between items-center bg-surface-2/40 border border-border rounded-md px-4 py-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Incident Status</span>
                  <p className="font-semibold text-primary mt-0.5">{trackingAlert.station_alert_status}</p>
                </div>
                {trackingAlert.assigned_patrol_id && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Assigned Unit</span>
                    <p className="font-semibold mt-0.5">{trackingAlert.assigned_patrol_id}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setTrackingAlert(null)}
                className="w-full rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Close Tracking View
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Capture Proof Dialog */}
      {capturingAlert && (
        <Dialog open={!!capturingAlert} onOpenChange={() => { if (!submittingProof) setCapturingAlert(null); }}>
          <DialogContent className="max-w-md bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" /> Upload Capture Proof: {capturingAlert.plate}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-xs text-muted-foreground">
                Please upload or take a photo of the vehicle at the interception scene as proof of capture.
              </p>
              
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground uppercase font-semibold block">Select / Capture Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadProof}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
              </div>

              {proofImage && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Preview</span>
                  <div className="relative rounded overflow-hidden border border-border bg-surface-2 h-48 w-full flex items-center justify-center">
                    <img
                      src={proofImage}
                      alt="Capture proof preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <button
                type="button"
                disabled={submittingProof}
                onClick={() => setCapturingAlert(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingProof || !proofImage}
                onClick={handleConfirmCapture}
                className="rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingProof && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Capture
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
