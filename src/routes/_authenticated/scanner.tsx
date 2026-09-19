import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, AlertTriangle, ScanLine, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanFrame } from "@/lib/vision.functions";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "./index";

export const Route = createFileRoute("/_authenticated/scanner")({
  head: () => ({ meta: [{ title: "Live Scanner — TruePlate AI" }] }),
  component: Scanner,
});

type Result = Awaited<ReturnType<typeof scanFrame>>;

function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Extract<Result, { found: true }>[]>([]);
  const [checkpoints, setCheckpoints] = useState<{ id: string; name: string }[]>([]);
  const [checkpoint, setCheckpoint] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scanFn = useServerFn(scanFrame);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check authorization guard
    supabase.auth.getUser().then(({ data: { user } }) => {
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
        }
      }
    });

    supabase.from("checkpoints").select("id,name").then(({ data }) => setCheckpoints(data ?? []));
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setCoords({ lat: 17.385, lng: 78.4867 }),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
  }, []);

  async function startCamera() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API is not supported in this browser context (requires HTTPS or localhost).");
      }

      let stream: MediaStream;
      try {
        // Try with ideal constraints first (ideal for mobile rear-camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        console.warn("Failed with ideal environment constraints, trying basic video constraints...", err);
        // Fallback to basic video request (works on desktops, laptops, and virtual webcams)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      setIsSimulationMode(false);
      startLoop(false);
    } catch (e: any) {
      console.error("Camera access error:", e);
      toast.error(e.message || "Camera access denied. Grant permission and try again.");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setIsSimulationMode(false);
  }

  function startLoop(simulation: boolean) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(simulation ? runSimulationStep : captureAndScan, 5000);
  }

  function startSimulationMode() {
    setRunning(true);
    setIsSimulationMode(true);
    startLoop(true);
  }

  async function runSimulationStep() {
    if (busy) return;
    setBusy(true);
    try {
      const demoPlates = [
        { plate: "TG29B9772", confidence: 98, brand: "Yamaha", type: "Two Wheeler", color: "Black" },
        { plate: "KA32EM3809", confidence: 95, brand: "Bajaj", type: "Two Wheeler", color: "Red" },
        { plate: "AP27BB2359", confidence: 97, brand: "Hero", type: "Two Wheeler", color: "Red" },
        { plate: "AP29SU7815", confidence: 99, brand: "Ola", type: "Two Wheeler", color: "White" },
        { plate: "AP40AE1109", confidence: 96, brand: "Hero", type: "Two Wheeler", color: "Blue" },
        { plate: "TG07K2373", confidence: 94, brand: "Suzuki", type: "Two Wheeler", color: "Blue" }
      ];
      
      const selected = demoPlates[Math.floor(Math.random() * demoPlates.length)];
      const r = await scanFn({ data: {
        imageDataUrl: "SIMULATED_FRAME",
        lat: coords?.lat ?? 15.5032,
        lng: coords?.lng ?? 80.0455,
        checkpointId: checkpoint || null,
        checkpointName: checkpoints.find((c) => c.id === checkpoint)?.name || "Mangamuru Junction",
        simulatedPlate: selected.plate,
        simulatedConfidence: selected.confidence,
        simulatedBrand: selected.brand,
        simulatedType: selected.type,
        simulatedColor: selected.color
      } as any });

      if (r.found) {
        setResults((prev) => {
          const now = Date.now();
          const dedup = prev.filter((p: any) => now - new Date((p as any).__ts ?? 0).getTime() > 10000 || p.plate !== r.plate);
          return [{ ...r, __ts: new Date().toISOString() } as any, ...dedup].slice(0, 8);
        });
        if (r.reasons.length > 0 && r.matched) {
          toast.error(`ALERT: ${r.plate} — ${r.reasons.join(", ")}`, { duration: 6000 });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function captureAndScan() {
    if (busy || !videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    if (!v.videoWidth) return;
    const scale = 600 / v.videoWidth;
    c.width = 600; c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.65);
    setBusy(true);
    try {
      const r = await scanFn({ data: {
        imageDataUrl: dataUrl,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        checkpointId: checkpoint || null,
        checkpointName: checkpoints.find((c) => c.id === checkpoint)?.name ?? null,
      } });
      if (r.found) {
        setResults((prev) => {
          // dedupe by plate within last 10s
          const now = Date.now();
          const dedup = prev.filter((p: any) => now - new Date((p as any).__ts ?? 0).getTime() > 10000 || p.plate !== r.plate);
          return [{ ...r, __ts: new Date().toISOString() } as any, ...dedup].slice(0, 8);
        });
        if (r.reasons.length > 0 && r.matched) {
          toast.error(`ALERT: ${r.plate} — ${r.reasons.join(", ")}`, { duration: 6000 });
        }
      }
    } catch (e) {
      console.error(e);
    } finally { setBusy(false); }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2"><ScanLine className="h-6 w-6 text-primary" /> Live Scanner</h1>
          <p className="text-sm text-muted-foreground">Point your mobile camera at vehicles. Frames auto-scan every 5s.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2 text-sm">
            <option value="">Select checkpoint…</option>
            {checkpoints.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!running ? (
            <button onClick={startCamera} className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-semibold glow-cyan flex items-center gap-2">
              <Camera className="h-4 w-4" /> Start Camera
            </button>
          ) : (
            <button onClick={stopCamera} className="rounded-md bg-destructive text-destructive-foreground px-4 py-2 font-semibold flex items-center gap-2">
              Stop
            </button>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface overflow-hidden relative aspect-video shadow-inner">
          {isSimulationMode ? (
            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center select-none overflow-hidden">
              <div className="absolute top-4 left-4 flex items-center gap-2 text-xs bg-surface/90 border border-border rounded-full px-3 py-1 shadow-sm font-semibold text-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF9933] animate-pulse" />
                <span className="uppercase tracking-wider">Demo Simulation Mode</span>
              </div>
              <div className="text-center p-6 space-y-3">
                <ScanLine className="h-14 w-14 mx-auto text-primary animate-pulse" />
                <div>
                  <h3 className="font-bold text-foreground">Simulating Vehicle Scans</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">Generating mock reads at the checkpoint. Scanning vehicles from watchlist in real-time...</p>
                </div>
              </div>
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center scan-grid text-muted-foreground p-6">
              <div className="text-center max-w-sm space-y-4">
                <Camera className="h-12 w-12 mx-auto text-primary opacity-60 animate-pulse" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Live Camera Scanner</p>
                  <p className="text-xs text-muted-foreground mt-1">Point your camera at vehicle plates to start automatic scanning. Frames auto-scan every 5 seconds.</p>
                </div>
                <div className="flex justify-center">
                  <button onClick={startCamera} className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:opacity-90 transition-opacity flex items-center gap-2 justify-center glow-cyan">
                    <Camera className="h-4 w-4" /> Start Camera
                  </button>
                </div>
              </div>
            </div>
          )}
          {running && !isSimulationMode && (
            <div className="absolute top-3 left-3 flex items-center gap-2 text-xs bg-surface/90 border border-border rounded-full px-3 py-1 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${busy ? "bg-[color:var(--warn)] animate-pulse" : "bg-[color:var(--ok)]"}`} />
              <span className="text-mono uppercase tracking-widest">{busy ? "AI Processing" : "Scanning"}</span>
              {coords && <span className="ml-2 flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}</span>}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-4 max-h-[70vh] overflow-y-auto space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">Recent Reads {busy && <Loader2 className="h-3 w-3 animate-spin text-primary" />}</h3>
          {results.length === 0 && <p className="text-sm text-muted-foreground">Detected vehicles will appear here.</p>}
          {results.map((r, i) => (
            <div key={i} className={`rounded-md border p-3 ${r.reasons.length ? "border-destructive/50 glow-alert" : "border-border"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-mono font-bold text-lg">{r.plate}</div>
                {r.matched ? <RiskBadge risk={r.risk} /> : <span className="text-[10px] uppercase font-bold text-muted-foreground border border-border rounded px-2 py-1">NOT IN DB</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.matched ? `${r.matched.owner_name} · ${r.matched.brand} ${r.matched.model} · ${r.matched.color}` : `Detected: ${r.brand || "?"} · ${r.color || "?"}`}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="text-muted-foreground">OCR {r.confidence}%</span>
                {r.reasons.length > 0 && <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{r.reasons.join(", ")}</span>}
                {r.matched && r.reasons.length === 0 && <span className="text-[color:var(--ok)] flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Clean</span>}
              </div>
              {r.matched && (
                <Link to="/vehicles/$plate" params={{ plate: r.plate }} className="mt-2 inline-block text-xs text-primary hover:underline">View details →</Link>
              )}
              {!r.matched && r.candidates.length > 0 && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Closest matches: {r.candidates.map((c) => (
                    <Link key={c.plate} to="/vehicles/$plate" params={{ plate: c.plate }} className="text-primary hover:underline mr-2">{c.plate} ({c.sim}%)</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
