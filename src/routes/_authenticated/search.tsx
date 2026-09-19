import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Vehicle Search — TruePlate AI" }] }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

    const t = setTimeout(async () => {
      setLoading(true);
      let query = supabase.from("vehicles").select("*").order("created_at", { ascending: false }).limit(200);
      const { data, error } = await query;
      if (error) console.error("Search fetch error:", error);
      
      let res = data ?? [];
      if (q.trim()) {
        const term = q.trim().toLowerCase();
        const plateTerm = term.replace(/\s+/g, '');
        res = res.filter(v => 
          (v.plate || '').toLowerCase().includes(plateTerm) ||
          (v.owner_name || '').toLowerCase().includes(term) ||
          (v.brand || '').toLowerCase().includes(term) ||
          (v.model || '').toLowerCase().includes(term)
        );

        // If no matches found and input looks like a valid plate number, fetch/generate dynamically from DB
        if (res.length === 0 && /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(plateTerm.toUpperCase())) {
          const { data: dynamicVal } = await supabase.from("vehicles").select("*").eq("plate", plateTerm.toUpperCase()).maybeSingle();
          if (dynamicVal) {
            res = [dynamicVal];
          }
        }
      }
      
      setResults(res); setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="font-display font-bold text-2xl flex items-center gap-2"><Search className="h-6 w-6 text-primary" /> Vehicle Search</h1>
        <p className="text-sm text-muted-foreground">Search by plate number, owner name, brand, or model.</p>
      </header>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. TS08AB1234, Rajesh, Creta…"
        className="w-full bg-input border border-border rounded-md px-4 py-3 text-mono outline-none focus:border-primary" />

      <div className="rounded-lg border border-border bg-surface/60 divide-y divide-border">
        {loading && <div className="p-4 text-sm text-muted-foreground">Searching…</div>}
        {!loading && results.length === 0 && <div className="p-4 text-sm text-muted-foreground">No matches.</div>}
        {results.map((v) => (
          <Link key={v.id} to="/vehicles/$plate" params={{ plate: v.plate }} className="grid grid-cols-6 gap-3 px-4 py-3 hover:bg-surface-2 items-center text-sm">
            <div className="text-mono font-semibold">{v.plate}</div>
            <div className="col-span-2 truncate">{v.owner_name}</div>
            <div className="truncate">{v.brand} {v.model}</div>
            <div className="text-muted-foreground">{v.color}</div>
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-widest border rounded px-2 py-1 ${
                v.status === "stolen" || v.status === "blacklisted" ? "text-destructive border-destructive/40" :
                v.status === "under_investigation" ? "text-[color:var(--warn)] border-[color:var(--warn)]/40" :
                "text-[color:var(--ok)] border-[color:var(--ok)]/40"
              }`}>{v.status.replace("_"," ")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
