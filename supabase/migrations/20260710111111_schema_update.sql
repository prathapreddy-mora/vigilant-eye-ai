-- Extending vehicles table with new fields
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS ownership TEXT,
  ADD COLUMN IF NOT EXISTS rto_office TEXT,
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS engine_no TEXT,
  ADD COLUMN IF NOT EXISTS chassis_no TEXT,
  ADD COLUMN IF NOT EXISTS fake_plate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_plate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fitness_valid BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fitness_expiry DATE,
  ADD COLUMN IF NOT EXISTS road_tax_paid BOOLEAN NOT NULL DEFAULT true;

-- Watchlist table for manual BOLO entries
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  reason TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS watchlists_plate_idx ON public.watchlists(plate);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlists TO authenticated;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlists_all_authed" ON public.watchlists FOR ALL TO authenticated USING (true);

-- Geofenced restricted zones
CREATE TABLE IF NOT EXISTS public.restricted_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  active BOOLEAN NOT NULL DEFAULT true,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restricted_zones TO authenticated;
ALTER TABLE public.restricted_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_select_authed" ON public.restricted_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "zones_admin_all" ON public.restricted_zones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SOS Logs
CREATE TABLE IF NOT EXISTS public.sos_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sos_logs TO authenticated;
ALTER TABLE public.sos_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sos_select_authed" ON public.sos_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sos_insert_authed" ON public.sos_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = officer_id);

-- Update profiles with employee number
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_number TEXT UNIQUE;
