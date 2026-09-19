
-- Enums
CREATE TYPE public.app_role AS ENUM ('constable','sho','admin');
CREATE TYPE public.vehicle_status AS ENUM ('active','stolen','blacklisted','under_investigation');
CREATE TYPE public.alert_reason AS ENUM ('stolen','blacklisted','criminal_case','pending_challan','attribute_mismatch','cloned_plate','under_investigation','low_confidence');
CREATE TYPE public.alert_state AS ENUM ('active','assigned','resolved','closed');
CREATE TYPE public.risk_level AS ENUM ('low','medium','high','critical');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  badge_number TEXT,
  station TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_authed" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Admin RLS on user_roles
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Handle new user: create profile + default constable role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'constable');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Checkpoints
CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checkpoints TO authenticated;
GRANT ALL ON public.checkpoints TO service_role;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkpoints_select_authed" ON public.checkpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "checkpoints_admin_write" ON public.checkpoints FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  owner_contact TEXT,
  owner_address TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  color TEXT NOT NULL,
  registration_date DATE,
  registration_validity DATE,
  insurance_valid BOOLEAN NOT NULL DEFAULT true,
  insurance_expiry DATE,
  puc_valid BOOLEAN NOT NULL DEFAULT true,
  puc_expiry DATE,
  pending_challans INTEGER NOT NULL DEFAULT 0,
  challan_amount NUMERIC NOT NULL DEFAULT 0,
  criminal_cases TEXT[] NOT NULL DEFAULT '{}',
  status public.vehicle_status NOT NULL DEFAULT 'active',
  last_known_lat DOUBLE PRECISION,
  last_known_lng DOUBLE PRECISION,
  last_seen_at TIMESTAMPTZ,
  rc_number TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_plate_idx ON public.vehicles(plate);
CREATE INDEX vehicles_status_idx ON public.vehicles(status);
GRANT SELECT ON public.vehicles TO authenticated;
GRANT UPDATE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_select_authed" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_update_last_seen_authed" ON public.vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_admin_all" ON public.vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Scans
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE SET NULL,
  checkpoint_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ocr_confidence INTEGER,
  detected_color TEXT,
  detected_type TEXT,
  detected_brand TEXT,
  image_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unknown',
  matched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scans_plate_idx ON public.scans(plate);
CREATE INDEX scans_created_idx ON public.scans(created_at DESC);
GRANT SELECT, INSERT ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans_select_authed" ON public.scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "scans_insert_authed" ON public.scans FOR INSERT TO authenticated WITH CHECK (officer_id = auth.uid() OR officer_id IS NULL);

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  reasons public.alert_reason[] NOT NULL DEFAULT '{}',
  risk public.risk_level NOT NULL DEFAULT 'medium',
  risk_score INTEGER NOT NULL DEFAULT 50,
  state public.alert_state NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  image_url TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX alerts_state_idx ON public.alerts(state);
CREATE INDEX alerts_created_idx ON public.alerts(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select_authed" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts_insert_authed" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "alerts_update_sho_admin" ON public.alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'sho') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'sho') OR public.has_role(auth.uid(),'admin'));

-- Audit log (append-only)
CREATE TABLE public.alert_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_alert_idx ON public.alert_audit_log(alert_id, created_at);
GRANT SELECT, INSERT ON public.alert_audit_log TO authenticated;
GRANT ALL ON public.alert_audit_log TO service_role;
ALTER TABLE public.alert_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_authed" ON public.alert_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert_authed" ON public.alert_audit_log FOR INSERT TO authenticated WITH CHECK (officer_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER alerts_touch BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
