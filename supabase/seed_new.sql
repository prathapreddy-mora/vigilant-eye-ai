-- Truncate existing data to start fresh
TRUNCATE TABLE public.scans CASCADE;
TRUNCATE TABLE public.alerts CASCADE;
TRUNCATE TABLE public.alert_audit_log CASCADE;
TRUNCATE TABLE public.vehicles CASCADE;

-- Insert new production data based on user provided table
INSERT INTO public.vehicles (
  plate, owner_name, ownership, rto_office, brand, model, fuel_type, engine_no, chassis_no, 
  fake_plate, duplicate_plate, suspicious, insurance_valid, puc_valid, fitness_valid, 
  pending_challans, challan_amount, road_tax_paid, registration_validity, status, criminal_cases, color, vehicle_type
) VALUES 
-- 1. AP27BB2359
('AP27BB2359', 'Ramesh Kumar', '1st Owner', 'Ongole (AP27)', 'Hero', 'Passion Pro', 'Petrol', 'ENGAP27BB2359', 'CHSAP27BB2359', 
 false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Red', 'Two Wheeler'),

-- 2. AP29SU7815
('AP29SU7815', 'Sai Kiran', '1st Owner', 'Vijayawada', 'Ola', 'S1 Air', 'Electric', 'EVAP29SU7815', 'EVCHAP29SU7815', 
 false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'White', 'Two Wheeler'),

-- 3. TG29B9772 (Stolen, Blacklisted, Criminal Case)
('TG29B9772', 'Arjun Reddy', '2nd Owner', 'Hyderabad', 'Yamaha', 'FZ-S FI', 'Petrol', 'ENGTG29B9772', 'CHSTG29B9772', 
 false, false, false, true, true, true, 2, 2500, true, '2030-01-01', 'stolen', '{"Pending Criminal Case"}', 'Black', 'Two Wheeler'),

-- 4. AP40AE1109
('AP40AE1109', 'Lakshmi Devi', '1st Owner', 'Visakhapatnam', 'Hero', 'Pleasure+', 'Petrol', 'ENGAP40AE1109', 'CHSAP40AE1109', 
 false, false, false, true, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Blue', 'Two Wheeler'),

-- 5. AP27AG1102 (Suspicious, Registration Expired, PUC Expired, Challans, Road Tax Unpaid)
('AP27AG1102', 'Praveen Kumar', '2nd Owner', 'Ongole', 'Hero', 'Passion Plus', 'Petrol', 'ENGAP27AG1102', 'CHSAP27AG1102', 
 false, false, true, true, false, true, 1, 500, false, '2023-01-01', 'active', '{}', 'Black', 'Two Wheeler'),

-- 6. AP39CZ2158 (Fake Plate, Suspicious, Insurance Expired)
('AP39CZ2158', 'Karthik Varma', '1st Owner', 'Tirupati', 'Honda', 'Activa 6G', 'Petrol', 'ENGAP39CZ2158', 'CHSAP39CZ2158', 
 true, false, true, false, true, true, 0, 0, true, '2030-01-01', 'active', '{}', 'Grey', 'Two Wheeler'),

-- 7. AP27AK3753 (Stolen, Blacklisted, Challan)
('AP27AK3753', 'Naveen Kumar', '1st Owner', 'Ongole', 'Hero Honda', 'Splendor Plus', 'Petrol', 'ENGAP27AK3753', 'CHSAP27AK3753', 
 false, false, false, true, true, true, 1, 1000, true, '2030-01-01', 'stolen', '{}', 'Black', 'Two Wheeler'),

-- 8. KA32EM3809 (Criminal Investigation, Suspicious)
('KA32EM3809', 'Rohit Shetty', '2nd Owner', 'Karnataka', 'Bajaj', 'Avenger Street 160', 'Petrol', 'ENGKA32EM3809', 'CHSKA32EM3809', 
 false, false, true, true, true, true, 0, 0, true, 'under_investigation', '{"Hit and Run Investigation"}', 'Red', 'Two Wheeler'),

-- 9. AP39RY1366 (Duplicate Plate, Suspicious, Insurance/PUC/Fitness Expired, Challans, Road Tax Unpaid)
('AP39RY1366', 'Anusha Reddy', '1st Owner', 'Tirupati', 'Suzuki', 'Access 125', 'Petrol', 'ENGAP39RY1366', 'CHSAP39RY1366', 
 false, true, true, false, false, false, 3, 3500, false, '2030-01-01', 'active', '{}', 'White', 'Two Wheeler'),

-- 10. TG07K2373 (Registration/Insurance/PUC/Fitness Expired, Road Tax Unpaid, Reg Invalid)
('TG07K2373', 'Mohan Rao', '1st Owner', 'Hyderabad', 'Suzuki', 'Access 125', 'Petrol', 'ENGTG07K2373', 'CHSTG07K2373', 
 false, false, false, false, false, false, 0, 0, false, '2020-01-01', 'active', '{}', 'Blue', 'Two Wheeler');
