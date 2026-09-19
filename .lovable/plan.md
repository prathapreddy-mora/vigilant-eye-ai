## TruePlate AI — Scoped MVP Plan

Your spec targets a Node/Express/MongoDB + YOLOv11/PaddleOCR stack. Lovable runs on **TanStack Start + Lovable Cloud (Postgres)** on an edge runtime — we can't run YOLO/PyTorch/OpenCV servers here. I'll adapt the project to what Lovable can actually ship well, keeping the full UX and workflow intact.

### What changes vs. your spec
- **AI plate recognition**: instead of self-hosted YOLO+PaddleOCR, use the **browser camera + a vision LLM** (Lovable AI Gateway, Gemini) to detect plate text, vehicle color/type/brand from each frame. Returns OCR confidence. Works in fractions of a second, no GPU infra.
- **Backend**: TanStack Start server functions (not Express).
- **Database**: Lovable Cloud Postgres (not MongoDB) with RLS.
- **Notifications**: dashboard + in-app real-time (Twilio/WhatsApp can be added later via a secret — out of MVP unless you want it now).
- **Offline sync, heatmap, Telugu toggle, RBAC, audit trail**: included.

### Scope for v1 (single build)
1. **Auth + RBAC** — Constable / SHO / Admin roles via `user_roles` table + `has_role()`. Login page, role-gated routes.
2. **Schema + seed** — `vehicles` (100 seeded: clean, stolen, blacklisted, challan-pending, criminal), `scans`, `alerts`, `alert_audit_log`, `checkpoints`, `officers`, `profiles`, `user_roles`.
3. **Live scanner page** — mobile camera feed, continuous frame capture (~1–2 fps), sends frame to a server function that calls Lovable AI (Gemini vision) → returns `{plate, confidence, color, type, brand}`. Fuzzy-matches (Levenshtein) against DB, shows top-3 candidates if confidence < 85%. GPS captured per scan. Auto-creates alert if stolen/blacklisted/challan/criminal/attribute-mismatch/cloned-plate (same plate, distant checkpoints, short window).
4. **Dashboard** — stat cards (scanned, verified, suspicious, stolen, challans, criminal, active alerts), recent alerts, trend charts, Google Maps with markers + heatmap overlay.
5. **Alerts module** — list, filter, detail view, assign officer, add notes (append-only audit log), resolve, close. Alerts stay active until explicitly closed.
6. **Vehicle search + detail page** — search by plate/owner/model/brand; detail shows full RC + scan history + last known location on map.
7. **Scan history** — filterable table (checkpoint, officer, date, status).
8. **PDF report** — jsPDF one-click download for any vehicle/alert.
9. **Offline mode** — IndexedDB cache of recent vehicles, queue scans, sync on reconnect, offline indicator.
10. **Telugu / English toggle** — i18n on all UI strings.
11. **Field masking** — constables see masked owner contact; SHO+ see full.

### Technical notes
- **Stack**: TanStack Start, React, Tailwind v4, shadcn, Framer Motion, Lovable Cloud (Postgres + Auth + Storage for captured frames), Lovable AI Gateway (Gemini vision), Google Maps (needs your API key or the Google Maps connector), jsPDF, Recharts, IndexedDB via `idb`.
- **Continuous scanning**: throttled to ~1 frame/sec per camera to keep AI cost sane; adjustable.
- **Cloned-plate detection**: SQL check on last N scans of same plate across checkpoints within time window.
- **Storage**: captured frames go to a private storage bucket; signed URLs in reports.
- **Secrets you'll need to provide**: Google Maps API key (or connect the Google Maps connector). Lovable AI key is auto-provisioned.

### Deferred (say the word to add)
- Twilio SMS / WhatsApp / FCM push notifications
- District-wide analytics beyond station level
- Voice announcements
- Multi-checkpoint live video wall

### Questions before I build
1. **Google Maps** — connect the Google Maps connector now, or skip maps for v1?
2. **SMS/WhatsApp alerts** — include now (needs Twilio account + secret) or defer?
3. **Design direction** — dark "police control room" (deep navy + neon cyan/red accents) is my default given your reference — OK, or you want a different vibe?
4. **Seed data language** — English names/addresses, or Telugu + English mix for demo realism?

Reply and I'll build straight through.
