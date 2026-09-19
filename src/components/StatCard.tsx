import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, tone = "default", hint }: {
  label: string; value: number | string; icon: LucideIcon;
  tone?: "default" | "alert" | "warn" | "ok"; hint?: string;
}) {
  const toneClass = {
    default: "text-primary border-primary/30",
    alert: "text-destructive border-destructive/40 glow-alert",
    warn: "text-[color:var(--warn)] border-[color:var(--warn)]/40",
    ok: "text-[color:var(--ok)] border-[color:var(--ok)]/40",
  }[tone];
  return (
    <div className={cn("rounded-lg border bg-surface/60 p-4 backdrop-blur", toneClass)}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="mt-2 text-3xl font-display font-bold text-foreground text-mono">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
