import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Upload as UploadIcon, Image as ImageIcon, Loader2, AlertTriangle, CheckCircle2, MapPin, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanFrame } from "@/lib/vision.functions";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "./index";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload Scanner — TruePlate AI" }] }),
  component: UploadScanner,
});

type Result = Awaited<ReturnType<typeof scanFrame>>;

function UploadScanner() {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<Result, { found: true }> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [checkpoints, setCheckpoints] = useState<{ id: string; name: string }[]>([]);
  const [checkpoint, setCheckpoint] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scanFn = useServerFn(scanFrame);

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
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setCoords({ lat: 17.385, lng: 78.4867 }),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL("image/jpeg", 0.65));
        } else {
          setImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!image) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await scanFn({ data: {
        imageDataUrl: image,
        lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        checkpointId: checkpoint || null,
        checkpointName: checkpoints.find((c) => c.id === checkpoint)?.name ?? null,
      } });
      
      if (r.found) {
        setResult(r as Extract<Result, { found: true }>);
        if (r.reasons.length > 0 && r.matched) {
          toast.error(`ALERT: ${r.plate} — ${r.reasons.join(", ")}`, { duration: 6000 });
        } else {
          toast.success(`Scanned: ${r.plate}`);
        }
      } else {
        toast.error("No clear number plate found in this image.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to process the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2 text-primary">
            <UploadIcon className="h-7 w-7" /> Upload Image Scanner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Upload a vehicle photo to run it through the AI verification pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors">
            <option value="">Select checkpoint…</option>
            {checkpoints.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-border rounded-xl bg-surface hover:bg-surface-2 transition-colors aspect-video flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <img src={image} alt="Upload preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-foreground">Click to upload an image</p>
                <p className="text-xs mt-1">JPG, PNG up to 10MB</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          
          <div className="flex justify-between items-center">
            {coords && (
               <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Location tracked</span>
            )}
            <button 
              onClick={handleScan}
              disabled={!image || busy}
              className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-md shadow hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ml-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {busy ? "Processing AI..." : "Scan Image"}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="font-display font-semibold text-lg border-b border-border pb-2">Verification Results</h3>
          
          {!result && !busy && (
            <div className="text-sm text-muted-foreground text-center py-12">
              Upload an image and click scan to see results here.
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm animate-pulse">Running AI pipeline...</p>
            </div>
          )}

          {result && !busy && (
            <div className={`rounded-lg border p-4 ${result.reasons.length ? "border-destructive/50 bg-destructive/5" : "border-ok/30 bg-ok/5"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div className="text-mono font-bold text-3xl text-foreground">{result.plate}</div>
                {result.matched ? (
                  <RiskBadge risk={result.risk} />
                ) : (
                  <span className="text-xs uppercase font-bold text-muted-foreground border border-border rounded px-2 py-1 bg-surface">NOT IN DB</span>
                )}
              </div>
              
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono font-medium">{result.confidence}%</span>
                </div>
                
                {result.matched ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Owner Name</span>
                        <span className="font-medium text-right">{result.matched.owner_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Ownership</span>
                        <span className="text-right">{result.matched.ownership || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Vehicle</span>
                        <span className="text-right">{result.matched.brand} {result.matched.model}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Color & Type</span>
                        <span className="text-right">{result.matched.color} ({result.matched.vehicle_type})</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Fuel Type</span>
                        <span className="text-right">{result.matched.fuel_type || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">RTO Office</span>
                        <span className="text-right">{result.matched.rto_office || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Engine No.</span>
                        <span className="text-right font-mono text-xs pt-1">{result.matched.engine_no || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Chassis No.</span>
                        <span className="text-right font-mono text-xs pt-1">{result.matched.chassis_no || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Registration Valid</span>
                        <span className="text-right">{result.matched.registration_validity ? new Date(result.matched.registration_validity).toLocaleDateString() : "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Pending Challans</span>
                        <span className="text-right text-destructive font-bold">{result.matched.pending_challans > 0 ? `${result.matched.pending_challans} (₹${result.matched.challan_amount})` : "None"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1">
                        <span className="text-muted-foreground">Complaint Status</span>
                        <span className={`text-right font-bold uppercase ${
                          result.matched.status === 'stolen' || result.matched.status === 'under_investigation' || (result.matched.criminal_cases?.length ?? 0) > 0
                            ? "text-destructive animate-pulse" 
                            : "text-ok"
                        }`}>
                          {result.matched.status === 'stolen' ? "STOLEN VEHICLE" :
                           result.matched.status === 'under_investigation' ? "UNDER INVESTIGATION" :
                           (result.matched.criminal_cases?.length ?? 0) > 0 ? "CRIMINAL CASE FILED" : "NO ACTIVE COMPLAINTS"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-1 col-span-1 md:col-span-2">
                        <span className="text-muted-foreground">Compliance Status</span>
                        <div className="flex gap-2 text-xs">
                          <span className={result.matched.insurance_valid ? "text-ok" : "text-destructive"}>Insurance {result.matched.insurance_valid ? "✔" : "✖"}</span>
                          <span className={result.matched.puc_valid ? "text-ok" : "text-destructive"}>PUC {result.matched.puc_valid ? "✔" : "✖"}</span>
                          <span className={result.matched.fitness_valid ? "text-ok" : "text-destructive"}>Fitness {result.matched.fitness_valid ? "✔" : "✖"}</span>
                          <span className={result.matched.road_tax_paid ? "text-ok" : "text-destructive"}>Road Tax {result.matched.road_tax_paid ? "✔" : "✖"}</span>
                        </div>
                      </div>
                      <div className="flex justify-between pb-1 col-span-1 md:col-span-2">
                        <span className="text-muted-foreground">System Flags</span>
                        <div className="flex gap-2 text-xs flex-wrap justify-end">
                          <span className={!result.matched.fake_plate ? "text-ok" : "text-destructive"}>Fake Plate: {result.matched.fake_plate ? "YES" : "NO"}</span>
                          <span className={!result.matched.duplicate_plate ? "text-ok" : "text-destructive"}>Duplicate: {result.matched.duplicate_plate ? "YES" : "NO"}</span>
                          <span className={!result.matched.suspicious ? "text-ok" : "text-destructive"}>Suspicious: {result.matched.suspicious ? "YES" : "NO"}</span>
                          <span className={result.matched.status === 'active' ? "text-ok" : "text-destructive"}>Status: {result.matched.status.toUpperCase()}</span>
                          <span className={result.matched.criminal_cases?.length === 0 ? "text-ok" : "text-destructive"}>Criminal: {result.matched.criminal_cases?.length > 0 ? "YES" : "NO"}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Detected Type</span>
                      <span>{result.vehicle_type || "?"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground">Detected Brand</span>
                      <span>{result.brand || "?"}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-muted-foreground">Detected Color</span>
                      <span>{result.color || "?"}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-5">
                {result.reasons.length > 0 ? (
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md">
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      <AlertTriangle className="h-4 w-4" /> Flags Detected
                    </div>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                ) : result.matched ? (
                  <div className="bg-ok/10 text-ok border border-ok/20 p-3 rounded-md flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Vehicle Verified Clean
                  </div>
                ) : null}
              </div>

              {result.matched && (
                <div className="mt-4 text-right">
                  <Link to="/vehicles/$plate" params={{ plate: result.plate }} className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                    View full profile →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
