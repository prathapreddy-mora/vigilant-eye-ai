import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const addAlertNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alertId: z.string(), note: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alert_audit_log").insert({
      alert_id: data.alertId, officer_id: context.userId, action: "note", note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alertId: z.string(), officerId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alerts").update({
      assigned_to: data.officerId, state: "assigned",
    }).eq("id", data.alertId);
    if (error) throw new Error(error.message);
    await context.supabase.from("alert_audit_log").insert({
      alert_id: data.alertId, officer_id: context.userId, action: "assigned", note: `Assigned to ${data.officerId}`,
    });
    return { ok: true };
  });

export const setAlertState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    alertId: z.string(),
    state: z.enum(["active", "assigned", "resolved", "closed"]),
    note: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch = { state: data.state, ...(data.state === "closed" ? { closed_at: new Date().toISOString() } : {}) };
    const { error } = await context.supabase.from("alerts").update(patch).eq("id", data.alertId);
    if (error) throw new Error(error.message);
    await context.supabase.from("alert_audit_log").insert({
      alert_id: data.alertId, officer_id: context.userId, action: data.state, note: data.note ?? null,
    });
    return { ok: true };
  });
