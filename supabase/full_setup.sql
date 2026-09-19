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
  employee_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Checkpoints
CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  ownership TEXT,
  rto_office TEXT,
  owner_contact TEXT,
  owner_address TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  fuel_type TEXT,
  engine_no TEXT,
  chassis_no TEXT,
  color TEXT NOT NULL,
  registration_date DATE,
  registration_validity DATE,
  insurance_valid BOOLEAN NOT NULL DEFAULT true,
  insurance_expiry DATE,
  puc_valid BOOLEAN NOT NULL DEFAULT true,
  puc_expiry DATE,
  fitness_valid BOOLEAN NOT NULL DEFAULT true,
  fitness_expiry DATE,
  road_tax_paid BOOLEAN NOT NULL DEFAULT true,
  pending_challans INTEGER NOT NULL DEFAULT 0,
  challan_amount NUMERIC NOT NULL DEFAULT 0,
  criminal_cases TEXT[] NOT NULL DEFAULT '{}',
  status public.vehicle_status NOT NULL DEFAULT 'active',
  fake_plate BOOLEAN NOT NULL DEFAULT false,
  duplicate_plate BOOLEAN NOT NULL DEFAULT false,
  suspicious BOOLEAN NOT NULL DEFAULT false,
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

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
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

-- Audit log
CREATE TABLE public.alert_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Watchlists
CREATE TABLE public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  reason TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ
);

-- Restricted Zones
CREATE TABLE public.restricted_zones (
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

-- SOS Logs
CREATE TABLE public.sos_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Turn off RLS for development speed so we don't hit permission errors
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restricted_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_logs DISABLE ROW LEVEL SECURITY;

-- Insert Seed Data
INSERT INTO public.vehicles (
  plate, owner_name, ownership, rto_office, brand, model, fuel_type, engine_no, chassis_no, 
  fake_plate, duplicate_plate, suspicious, insurance_valid, puc_valid, fitness_valid, 
  pending_challans, challan_amount, road_tax_paid, registration_validity, status, criminal_cases, color, vehicle_type
) VALUES 
('AP27BB2359', 'Ramesh Kumar', '1st Owner', 'Ongole (AP27)', 'Hero', 'Passion Pro', 'Petrol', 'ENGAP27BB2359', 'CHSAP27BB2359', false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Red', 'Two Wheeler'),
('AP29SU7815', 'Sai Kiran', '1st Owner', 'Vijayawada', 'Ola', 'S1 Air', 'Electric', 'EVAP29SU7815', 'EVCHAP29SU7815', false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'White', 'Two Wheeler'),
('TG29B9772', 'Arjun Reddy', '2nd Owner', 'Hyderabad', 'Yamaha', 'FZ-S FI', 'Petrol', 'ENGTG29B9772', 'CHSTG29B9772', false, false, false, true, true, true, 2, 2500, true, '2030-01-01', 'stolen', '{"Pending Criminal Case"}', 'Black', 'Two Wheeler'),
('AP40AE1109', 'Lakshmi Devi', '1st Owner', 'Visakhapatnam', 'Hero', 'Pleasure+', 'Petrol', 'ENGAP40AE1109', 'CHSAP40AE1109', false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Blue', 'Two Wheeler'),
('AP27AG1102', 'Praveen Kumar', '2nd Owner', 'Ongole', 'Hero', 'Passion Plus', 'Petrol', 'ENGAP27AG1102', 'CHSAP27AG1102', false, false, true, true, false, true, 1, 500, false, '2023-01-01', 'active', '{}', 'Black', 'Two Wheeler'),
('AP39CZ2158', 'Karthik Varma', '1st Owner', 'Tirupati', 'Honda', 'Activa 6G', 'Petrol', 'ENGAP39CZ2158', 'CHSAP39CZ2158', true, false, true, false, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Grey', 'Two Wheeler'),
('AP27AK3753', 'Naveen Kumar', '1st Owner', 'Ongole', 'Hero Honda', 'Splendor Plus', 'Petrol', 'ENGAP27AK3753', 'CHSAP27AK3753', false, false, false, true, true, true, 1, 1000, true, '2030-01-01', 'stolen', '{}', 'Black', 'Two Wheeler'),
('KA32EM3809', 'Rohit Shetty', '2nd Owner', 'Karnataka', 'Bajaj', 'Avenger Street 160', 'Petrol', 'ENGKA32EM3809', 'CHSKA32EM3809', false, false, true, true, true, true, 0, 0, true, 'under_investigation', '{"Hit and Run Investigation"}', 'Red', 'Two Wheeler'),
('AP39RY1366', 'Anusha Reddy', '1st Owner', 'Tirupati', 'Suzuki', 'Access 125', 'Petrol', 'ENGAP39RY1366', 'CHSAP39RY1366', false, true, true, false, false, false, 3, 3500, false, '2030-01-01', 'active', '{}', 'White', 'Two Wheeler'),
('TG07K2373', 'Mohan Rao', '1st Owner', 'Hyderabad', 'Suzuki', 'Access 125', 'Petrol', 'ENGTG07K2373', 'CHSTG07K2373', false, false, false, false, false, false, 0, 0, false, '2020-01-01', 'active', '{}', 'Blue', 'Two Wheeler');
