import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { normalizePlate, similarity, isFuzzyMatchCandidate } from "./fuzzy";

const InputSchema = z.object({
  imageDataUrl: z.string().min(20),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  checkpointId: z.string().uuid().nullable().optional(),
  checkpointName: z.string().nullable().optional(),
  source: z.enum(["upload", "scanner"]).optional(),
});

const ExtractSchema = z.object({
  plate: z.string(),
  confidence: z.number(),
  color: z.string(),
  vehicle_type: z.string(),
  brand: z.string(),
  found: z.boolean(),
});

// Cache the Tesseract worker globally to prevent slow spin-ups on every frame!
let globalWorker: any = null;
async function getTesseractWorker() {
  if (!globalWorker) {
    const tesseract = await import("tesseract.js");
    globalWorker = await tesseract.createWorker("eng");
    await globalWorker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
    });
  }
  return globalWorker;
}

export const scanFrame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;

    let extract: z.infer<typeof ExtractSchema> = {
      plate: "", confidence: 0, color: "", vehicle_type: "", brand: "", found: false,
    };

    if (!apiKey) {
      // Local Offline OCR Pipeline (Optimized for Speed)
      try {
        let text = "";
        
        // Stage 1: Try Cloud OCR Space (Highly accurate for natural images)
        try {
          const formData = new FormData();
          formData.append('base64Image', data.imageDataUrl);
          formData.append('apikey', 'K85502014888957'); // Active OCR Space key
          formData.append('language', 'eng');
          formData.append('OCREngine', '2'); // Engine 2 is specialized for alphanumerics/plates

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout so scanner doesn't hang forever
          const res = await fetch('https://api.ocr.space/parse/image', { 
            method: 'POST', body: formData as any, signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          const ocrData = await res.json();
          if (ocrData && !ocrData.IsErroredOnProcessing) {
            text = ocrData.ParsedResults?.[0]?.ParsedText || "";
          }
        } catch (ocrErr) {
          console.error("OCR Space Failed or Timed out:", ocrErr);
        }

        // Stage 2: Fallback to local Tesseract if cloud OCR failed or returned empty
        if (!text || text.length < 3) {
          try {
            const worker = await getTesseractWorker();
            const { data: { text: tessText } } = await worker.recognize(data.imageDataUrl);
            text = tessText;
          } catch (tessErr: any) {
            console.error("Tesseract failed:", tessErr);
          }
        }

        let textClean = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        
        let bestPlateMatch = "";
        let bestScore = 0;
        
        const { data: platesData } = await supabase.from("vehicles").select("plate");
        const allPlates = (platesData || []).map(p => p.plate);
        
        const plateMatch = textClean.match(/[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{3,4}/);
        
        if (plateMatch && plateMatch[0].length >= 8) {
            bestPlateMatch = plateMatch[0];
            bestScore = 100;
        } else {
            const fixedText = textClean
                .replace(/O/g, "0").replace(/I/g, "1").replace(/Z/g, "2")
                .replace(/S/g, "5").replace(/B/g, "8").replace(/G/g, "6").replace(/A/g, "4");

            // Improved fuzzy matcher
            for (const dbPlate of allPlates) {
                let maxSubSim = similarity(dbPlate, textClean);
                maxSubSim = Math.max(maxSubSim, similarity(dbPlate, fixedText));
                
                if (textClean.length >= dbPlate.length) {
                    for(let i=0; i <= textClean.length - dbPlate.length; i++) {
                        maxSubSim = Math.max(maxSubSim, similarity(dbPlate, textClean.substring(i, i + dbPlate.length)));
                        maxSubSim = Math.max(maxSubSim, similarity(dbPlate, fixedText.substring(i, i + dbPlate.length)));
                    }
                } 
                if (dbPlate.length > textClean.length && textClean.length >= 4) {
                    for(let i=0; i <= dbPlate.length - textClean.length; i++) {
                        maxSubSim = Math.max(maxSubSim, similarity(dbPlate.substring(i, i + textClean.length), textClean));
                        maxSubSim = Math.max(maxSubSim, similarity(dbPlate.substring(i, i + fixedText.length), fixedText));
                    }
                }
                if (maxSubSim > bestScore) { bestScore = maxSubSim; bestPlateMatch = dbPlate; }
            }
        }
        
        let extractedPlate = textClean.substring(Math.max(0, textClean.length - 15));
        
        // Strictly fetch from the database only if there is a reasonable OCR match.
        if (bestScore >= 45 && bestPlateMatch) {
            extractedPlate = bestPlateMatch;
        }

        // Only discard if we couldn't extract ANY text
        let isGarbage = !extractedPlate || extractedPlate.length < 4;

        extract = {
          plate: isGarbage ? "" : (extractedPlate || "UNKNOWN"),
          confidence: bestScore > 0 ? Math.min(bestScore, 95) : 50,
          color: "", vehicle_type: "", brand: "", found: !isGarbage && !!extractedPlate,
        };
      } catch (err: any) {
        console.error("OCR API Fallback Error:", err);
        extract = { plate: `ERROR: ${err.message || err}`, confidence: 0, color: "", vehicle_type: "", brand: "", found: false };
      }
    } else {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-2.5-flash");

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
    }

    if (!extract.found || !extract.plate || extract.plate.startsWith("ERROR")) {
      return { found: false as const, error: extract.plate };
    }

    const plate = normalizePlate(extract.plate);

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
      if (candidates[0] && candidates[0].sim >= 88 && extract.confidence >= 70 && isFuzzyMatchCandidate(plate, candidates[0].plate)) {
        const { data: best } = await supabase.from("vehicles").select("*").eq("plate", candidates[0].plate).maybeSingle();
        matched = best ?? null;
      }
    }

    // Full Alert Logic Verification
    const reasons: string[] = [];
    let risk_score = 0;
    let risk: "low" | "medium" | "high" | "critical" = "low";

    // 1. Plate Not Found
    if (!matched) {
      reasons.push("Unregistered / Fake Plate");
      risk_score += 60; // High severity
    } else {
      // Watchlist check
      const { data: watchlist } = await supabase.from("watchlists").select("*").eq("plate", plate).gte("expiry_date", new Date().toISOString()).maybeSingle();
      if (watchlist) {
        reasons.push(`Watchlist Match: ${watchlist.reason}`);
        risk_score += 60; // High severity by default
      }

      // Explicit status flags
      if (matched.status === "stolen") { reasons.push("Stolen Vehicle"); risk_score += 100; }
      if (matched.status === "blacklisted") { reasons.push("Blacklisted Vehicle"); risk_score += 100; }
      if (matched.status === "under_investigation") { reasons.push("Vehicle Under Criminal Investigation"); risk_score += 100; }
      if ((matched.criminal_cases?.length ?? 0) > 0) { reasons.push("Vehicle Under Criminal Investigation"); risk_score += 100; }
      
      // Additional boolean flags
      if (matched.fake_plate) { reasons.push("Fake Number Plate"); risk_score += 60; }
      if (matched.duplicate_plate) { reasons.push("Duplicate/Cloned Plate Detected"); risk_score += 60; }
      if (matched.suspicious) { reasons.push("Flagged as Suspicious"); risk_score += 30; }

      // Compliance Violations
      const expired: string[] = [];
      const today = new Date().toISOString().split("T")[0];
      if (matched.registration_validity && matched.registration_validity < today) expired.push("Registration");
      if (matched.insurance_valid === false || (matched.insurance_expiry && matched.insurance_expiry < today)) expired.push("Insurance");
      if (matched.puc_valid === false || (matched.puc_expiry && matched.puc_expiry < today)) expired.push("PUC");
      if (matched.fitness_valid === false || (matched.fitness_expiry && matched.fitness_expiry < today)) expired.push("Fitness");
      if (matched.road_tax_paid === false) expired.push("Road Tax");

      if (expired.length > 0) {
        reasons.push(`Compliance Violation (${expired.join(", ")})`);
        risk_score += (10 * expired.length);
      }

      // Pending Challans
      if ((matched.pending_challans ?? 0) > 0) { 
        reasons.push(`Pending Challans (Count: ${matched.pending_challans})`); 
        risk_score += (5 * matched.pending_challans); 
      }

      // Attribute Mismatch
      const mismatches: string[] = [];
      if (extract.color && matched.color && extract.color.toLowerCase() !== matched.color.toLowerCase()) mismatches.push("color");
      if (extract.brand && matched.brand && !matched.brand.toLowerCase().includes(extract.brand.toLowerCase()) && !extract.brand.toLowerCase().includes(matched.brand.toLowerCase())) mismatches.push("brand");
      if (mismatches.length > 0) { 
        reasons.push(`Vehicle Attribute Mismatch (${mismatches.join(", ")})`); 
        risk_score += 60; // High severity
      }

      // Cloned-plate check: same plate scanned at distant location in last 30 min
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
            if (km > 50) { 
              if (!reasons.includes("Duplicate/Cloned Plate Detected")) {
                reasons.push("Duplicate/Cloned Plate Detected");
                risk_score += 60;
              }
              break; 
            }
          }
        }
      }

      // Restricted Zone Detection
      if ((matched.status === "stolen" || matched.status === "blacklisted" || matched.status === "under_investigation") && data.lat != null && data.lng != null) {
        const { data: zones } = await supabase.from("restricted_zones").select("*").eq("active", true);
        if (zones) {
          for (const zone of zones) {
            const km = haversineKm(data.lat, data.lng, zone.lat, zone.lng);
            if (km * 1000 <= zone.radius_meters) {
              reasons.push(`Detected inside restricted zone: ${zone.name}`);
              risk_score = 100; // Forces Critical
              break;
            }
          }
        }
      }
    }

    if (extract.confidence < 70 && !reasons.includes("Unregistered / Fake Plate")) { 
      reasons.push("Low OCR confidence"); 
      risk_score += 15; 
    }

    risk_score = Math.min(100, risk_score);
    if (risk_score >= 70) risk = "critical";
    else if (risk_score >= 40) risk = "high";
    else if (risk_score >= 15) risk = "medium";
    else risk = "low";

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
    if (reasons.length > 0 && risk_score >= 15) {
      const { data: alert } = await supabase.from("alerts").insert({
        scan_id: scan?.id,
        vehicle_id: matched?.id ?? null,
        plate,
        reasons: reasons as never,
        risk,
        risk_score,
        state: "active",
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        summary: reasons.join(" · "),
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

// removed labelReason since reasons are now raw strings

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}