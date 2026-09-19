import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Scan History — TruePlate AI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    async function load() {
      // Check authorization guard
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

      let q = supabase.from("scans").select("*").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") q = q.eq("verification_status", status);
      const { data } = await q;
      setScans(data ?? []);
    }
    load();
  }, [status]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2"><History className="h-6 w-6 text-primary" /> Scan History</h1>
          <p className="text-sm text-muted-foreground">Every plate read logged with GPS, checkpoint, and verification status.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-input border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="flagged">Flagged</option>
          <option value="not_found">Not Found</option>
        </select>
      </header>

      <div className="rounded-lg border border-border bg-surface/60 divide-y divide-border overflow-hidden">
        <div className="grid grid-cols-7 gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground bg-surface-2">
          <div>Time</div><div>Plate</div><div className="col-span-2">Checkpoint</div><div>GPS</div><div>OCR</div><div>Status</div>
        </div>
        {scans.length === 0 && <div className="p-4 text-sm text-muted-foreground">No scans yet.</div>}
        {scans.map((s) => (
          <Link key={s.id} to="/vehicles/$plate" params={{ plate: s.plate }} className="grid grid-cols-7 gap-3 px-4 py-2 hover:bg-surface-2 items-center text-sm">
            <div className="text-mono text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
            <div className="text-mono font-semibold">{s.plate}</div>
            <div className="col-span-2 truncate">{s.checkpoint_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{s.lat?.toFixed(3) ?? "—"}, {s.lng?.toFixed(3) ?? "—"}</div>
            <div className="text-xs">{s.ocr_confidence ?? "—"}%</div>
            <div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                s.verification_status === "flagged" ? "text-destructive border-destructive/40" :
                s.verification_status === "verified" ? "text-[color:var(--ok)] border-[color:var(--ok)]/40" :
                "text-muted-foreground border-border"
              }`}>{s.verification_status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
