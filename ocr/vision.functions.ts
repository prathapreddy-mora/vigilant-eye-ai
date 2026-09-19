import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { normalizePlate, similarity } from "@/lib/fuzzy";

const InputSchema = z.object({
  imageDataUrl: z.string().min(20),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  checkpointId: z.string().uuid().nullable().optional(),
  checkpointName: z.string().nullable().optional(),
});

const ExtractSchema = z.object({
  plate: z.string(),
  confidence: z.number(),
  color: z.string(),
  vehicle_type: z.string(),
  brand: z.string(),
  found: z.boolean(),
});

export const scanFrame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    let extract: z.infer<typeof ExtractSchema> = {
      plate: "", confidence: 0, color: "", vehicle_type: "", brand: "", found: false,
    };

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: ExtractSchema }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an ANPR (Automatic Number Plate Recognition) system for Indian police checkpoints. Analyze this image and extract the vehicle number plate.

Return JSON with:
- found: true if a clear vehicle number plate is visible, else false
- plate: the plate text as read, uppercase, no spaces or dashes (e.g. "TS08AB1234"). Empty if not found.
- confidence: 0-100 integer OCR confidence
- color: dominant vehicle color (White, Black, Silver, Red, Blue, etc.), empty if unclear
- vehicle_type: "Car", "Motorcycle", "Truck", "Bus", "Auto", or empty
- brand: best-guess brand (Maruti Suzuki, Hyundai, Tata, Honda, Toyota, Mahindra, Kia, Royal Enfield, Bajaj, Hero, etc.) or empty

Be strict: if no plate is readable, set found=false and return empty strings.`,
              },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });
      extract = output;
    } catch (e) {
      if (!NoObjectGeneratedError.isInstance(e)) throw e;
    }

    if (!extract.found || !extract.plate) {
      return { found: false as const };
    }

    const plate = normalizePlate(extract.plate);
    const { supabase, userId } = context;

    // exact match
    const { data: exact } = await supabase
      .from("vehicles").select("*").eq("plate", plate).maybeSingle();

    let matched = exact ?? null;
    let candidates: Array<{ plate: string; owner_name: string; sim: number }> = [];

    if (!matched) {
      // fuzzy: fetch all plates (small dataset), rank
      const { data: all } = await supabase.from("vehicles").select("plate,owner_name");
      candidates = (all ?? [])
        .map((v) => ({ plate: v.plate, owner_name: v.owner_name, sim: similarity(plate, v.plate) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 3);
      if (candidates[0] && candidates[0].sim >= 88 && extract.confidence >= 70) {
        const { data: best } = await supabase.from("vehicles").select("*").eq("plate", candidates[0].plate).maybeSingle();
        matched = best ?? null;
      }
    }

    // determine reasons
    const reasons: string[] = [];
    let risk_score = 10;
    let risk: "low" | "medium" | "high" | "critical" = "low";

    if (extract.confidence < 70) { reasons.push("low_confidence"); risk_score += 15; }

    if (matched) {
      if (matched.status === "stolen") { reasons.push("stolen"); risk_score += 60; }
      if (matched.status === "blacklisted") { reasons.push("blacklisted"); risk_score += 50; }
      if (matched.status === "under_investigation") { reasons.push("under_investigation"); risk_score += 30; }
      if ((matched.criminal_cases?.length ?? 0) > 0) { reasons.push("criminal_case"); risk_score += 40; }
      if ((matched.pending_challans ?? 0) >= 3) { reasons.push("pending_challan"); risk_score += 15; }

      // attribute mismatch
      const mismatches: string[] = [];
      if (extract.color && matched.color && extract.color.toLowerCase() !== matched.color.toLowerCase()) mismatches.push("color");
      if (extract.brand && matched.brand && !matched.brand.toLowerCase().includes(extract.brand.toLowerCase()) && !extract.brand.toLowerCase().includes(matched.brand.toLowerCase())) mismatches.push("brand");
      if (mismatches.length >= 2) { reasons.push("attribute_mismatch"); risk_score += 25; }

      // cloned-plate check: same plate scanned at distant location in last 30 min
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recent } = await supabase.from("scans")
        .select("lat,lng,created_at")
        .eq("plate", plate)
        .gte("created_at", thirtyMinAgo)
        .limit(20);
      if (recent && data.lat != null && data.lng != null) {
        for (const r of recent) {
          if (r.lat != null && r.lng != null) {
            const km = haversineKm(data.lat, data.lng, r.lat, r.lng);
            if (km > 50) { reasons.push("cloned_plate"); risk_score += 50; break; }
          }
        }
      }
    }

    risk_score = Math.min(100, risk_score);
    if (risk_score >= 80) risk = "critical";
    else if (risk_score >= 55) risk = "high";
    else if (risk_score >= 30) risk = "medium";

    // insert scan
    const { data: scan } = await supabase.from("scans").insert({
      plate,
      vehicle_id: matched?.id ?? null,
      officer_id: userId,
      checkpoint_id: data.checkpointId ?? null,
      checkpoint_name: data.checkpointName ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      ocr_confidence: extract.confidence,
      detected_color: extract.color,
      detected_type: extract.vehicle_type,
      detected_brand: extract.brand,
      verification_status: matched ? (reasons.length ? "flagged" : "verified") : "not_found",
      matched: !!matched,
    }).select("*").single();

    // update last known location
    if (matched && data.lat != null && data.lng != null) {
      await supabase.from("vehicles").update({
        last_known_lat: data.lat, last_known_lng: data.lng, last_seen_at: new Date().toISOString(),
      }).eq("id", matched.id);
    }

    // create alert if needed
    let alertId: string | null = null;
    if (matched && reasons.length > 0) {
      const { data: alert } = await supabase.from("alerts").insert({
        scan_id: scan?.id,
        vehicle_id: matched.id,
        plate,
        reasons: reasons as never,
        risk,
        risk_score,
        state: "active",
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        summary: reasons.map(labelReason).join(" · "),
      }).select("id").single();
      alertId = alert?.id ?? null;
      if (alertId) {
        await supabase.from("alert_audit_log").insert({
          alert_id: alertId, officer_id: userId, action: "created", note: `Auto-generated: ${reasons.join(", ")}`,
        });
      }
    }

    return {
      found: true as const,
      plate,
      confidence: extract.confidence,
      color: extract.color,
      brand: extract.brand,
      vehicle_type: extract.vehicle_type,
      matched,
      candidates,
      reasons,
      risk,
      risk_score,
      scan_id: scan?.id ?? null,
      alert_id: alertId,
    };
  });

function labelReason(r: string) {
  switch (r) {
    case "stolen": return "STOLEN VEHICLE";
    case "blacklisted": return "BLACKLISTED";
    case "criminal_case": return "Criminal case pending";
    case "pending_challan": return "Pending challans";
    case "attribute_mismatch": return "Attribute mismatch";
    case "cloned_plate": return "Possible cloned plate";
    case "under_investigation": return "Under investigation";
    case "low_confidence": return "Low OCR confidence";
    default: return r;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
