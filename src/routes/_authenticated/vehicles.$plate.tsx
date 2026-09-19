import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapView } from "@/components/MapView";
import { generateVehicleReport } from "@/lib/pdf";
import { FileDown, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vehicles/$plate")({
  head: () => ({ meta: [{ title: "Vehicle Details — TruePlate AI" }] }),
  component: VehicleDetail,
});

function VehicleDetail() {
  const { plate } = Route.useParams();
  const [v, setV] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [officer, setOfficer] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOfficer(data.user?.email ?? ""));
    supabase.from("vehicles").select("*").eq("plate", plate.toUpperCase()).maybeSingle().then(({ data }) => setV(data));
    supabase.from("scans").select("*").eq("plate", plate.toUpperCase()).order("created_at", { ascending: false }).limit(50).then(({ data }) => setScans(data ?? []));
  }, [plate]);

  if (!v) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <Link to="/search" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-mono">{v.plate}</h1>
          <p className="text-sm text-muted-foreground">{v.brand} {v.model} · {v.color} · {v.vehicle_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs uppercase font-bold tracking-widest border rounded px-3 py-1.5 ${
            v.status === "stolen" || v.status === "blacklisted" ? "text-destructive border-destructive/40 glow-alert" :
            v.status === "under_investigation" ? "text-[color:var(--warn)] border-[color:var(--warn)]/40" :
            "text-[color:var(--ok)] border-[color:var(--ok)]/40"
          }`}>{v.status.replace("_"," ")}</span>
          <button onClick={() => generateVehicleReport(v, { officer })}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Download PDF Report
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface/60 p-5 space-y-4">
          <Section title="Owner">
            <Field k="Name" v={v.owner_name} />
            <Field k="Contact" v={v.owner_contact} />
            <Field k="Address" v={v.owner_address} />
            <Field k="RC Number" v={v.rc_number} />
          </Section>
          <Section title="Registration">
            <Field k="Registered" v={v.registration_date} />
            <Field k="Valid Until" v={v.registration_validity} />
            <Field k="Insurance" v={`${v.insurance_valid ? "Valid" : "EXPIRED"} · ${v.insurance_expiry}`} tone={v.insurance_valid ? undefined : "alert"} />
            <Field k="PUC" v={`${v.puc_valid ? "Valid" : "EXPIRED"} · ${v.puc_expiry}`} tone={v.puc_valid ? undefined : "alert"} />
          </Section>
          <Section title="Enforcement">
            <Field k="Pending Challans" v={`${v.pending_challans}`} tone={v.pending_challans >= 3 ? "alert" : undefined} />
            <Field k="Challan Amount" v={`₹${v.challan_amount}`} />
            <Field k="Criminal Cases" v={v.criminal_cases?.length ? v.criminal_cases.join(", ") : "None"} tone={v.criminal_cases?.length ? "alert" : undefined} />
            <Field k="Complaint Status" v={
              v.status === 'stolen' ? "STOLEN VEHICLE" :
              v.status === 'under_investigation' ? "UNDER INVESTIGATION" :
              v.criminal_cases?.length ? "CRIMINAL CASE FILED" : "NO ACTIVE COMPLAINTS"
            } tone={v.status === 'stolen' || v.status === 'under_investigation' || v.criminal_cases?.length ? "alert" : undefined} />
          </Section>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <h3 className="font-display font-semibold mb-3">Last Known Location</h3>
            {v.last_known_lat && v.last_known_lng ? (
              <MapView markers={[{ lat: v.last_known_lat, lng: v.last_known_lng, label: v.plate }]} height={200} zoom={12} />
            ) : <p className="text-sm text-muted-foreground">Not seen yet.</p>}
            {v.last_seen_at && <p className="mt-2 text-xs text-muted-foreground">Last seen: {new Date(v.last_seen_at).toLocaleString()}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-5">
        <h3 className="font-display font-semibold mb-3">Scan History</h3>
        <div className="divide-y divide-border">
          {scans.length === 0 && <p className="text-sm text-muted-foreground">No scans recorded for this vehicle.</p>}
          {scans.map((s) => (
            <div key={s.id} className="py-2 grid grid-cols-6 gap-3 text-sm items-center">
              <div className="text-mono text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              <div className="col-span-2 truncate">{s.checkpoint_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{s.lat?.toFixed(3)}, {s.lng?.toFixed(3)}</div>
              <div className="text-xs">OCR {s.ocr_confidence}%</div>
              <div className="text-xs">
                <span className={`uppercase font-bold px-2 py-0.5 rounded border ${
                  s.verification_status === "flagged" ? "text-destructive border-destructive/40" :
                  s.verification_status === "verified" ? "text-[color:var(--ok)] border-[color:var(--ok)]/40" :
                  "text-muted-foreground border-border"
                }`}>{s.verification_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</h4>
      <dl className="grid grid-cols-2 gap-3">{children}</dl>
    </div>
  );
}
function Field({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "alert" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className={`mt-0.5 text-sm ${tone === "alert" ? "text-destructive font-semibold" : ""}`}>{v ?? "—"}</div>
    </div>
  );
}
