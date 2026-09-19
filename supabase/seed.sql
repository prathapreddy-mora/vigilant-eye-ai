-- Seed script to replace the vehicles database

TRUNCATE TABLE public.vehicles CASCADE;

INSERT INTO public.vehicles (
  plate, 
  owner_name, 
  brand, 
  model, 
  vehicle_type, 
  color,
  status, 
  insurance_valid, 
  puc_valid, 
  pending_challans, 
  criminal_cases,
  registration_validity
) VALUES
-- AP27BB2359
('AP27BB2359', 'Ramesh Kumar', 'Hero', 'Passion Pro', 'Motorcycle', 'Black', 'active', true, true, 0, '{}', '2030-01-01'),
-- AP29SU7815
('AP29SU7815', 'Sai Kiran', 'Ola', 'S1 Air', 'Scooter', 'White', 'active', true, true, 0, '{}', '2030-01-01'),
-- TG29B9772
('TG29B9772', 'Arjun Reddy', 'Yamaha', 'FZ-S FI', 'Motorcycle', 'Blue', 'stolen', true, true, 2, '{"Active Criminal Case"}', '2030-01-01'),
-- AP40AE1109
('AP40AE1109', 'Lakshmi Devi', 'Hero', 'Pleasure+', 'Scooter', 'Red', 'active', true, true, 0, '{}', '2030-01-01'),
-- AP27AG1102
('AP27AG1102', 'Praveen Kumar', 'Hero', 'Passion Plus', 'Motorcycle', 'Black', 'active', true, false, 1, '{}', '2020-01-01'),
-- AP39CZ2158
('AP39CZ2158', 'Karthik Varma', 'Honda', 'Activa 6G', 'Scooter', 'Silver', 'active', false, true, 0, '{}', '2030-01-01'),
-- AP27AK3753
('AP27AK3753', 'Naveen Kumar', 'Hero Honda', 'Splendor Plus', 'Motorcycle', 'Black', 'stolen', true, true, 1, '{}', '2030-01-01'),
-- KA32EM3809
('KA32EM3809', 'Rohit Shetty', 'Bajaj', 'Avenger Street 160', 'Motorcycle', 'Black', 'under_investigation', true, true, 0, '{"Under Investigation"}', '2030-01-01'),
-- AP39RY1366
('AP39RY1366', 'Anusha Reddy', 'Suzuki', 'Access 125', 'Scooter', 'White', 'active', false, false, 3, '{}', '2030-01-01'),
-- TG07K2373
('TG07K2373', 'Mohan Rao', 'Suzuki', 'Access 125', 'Scooter', 'Silver', 'active', false, false, 0, '{}', '2020-01-01');
