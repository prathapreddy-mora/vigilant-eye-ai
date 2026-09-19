const mongoose = require('mongoose');
const models = require('./models.cjs');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/vigilant_eye')
  .then(() => console.log('MongoDB connected for seeding stations'))
  .catch(err => console.error('MongoDB connection error:', err));

async function seed() {
  // Clear collections
  await models.PoliceStation.deleteMany({});
  await models.PatrolUnit.deleteMany({});
  
  // 1. Seed Stations (6 requested stations)
  const stations = [
    {
      station_id: 'PS001',
      name: 'Ongole I Town Police Station',
      location: { type: 'Point', coordinates: [80.0455, 15.5032] }, // [lng, lat]
      lat: 15.5032,
      lng: 80.0455,
      radius_km: 3.0,
      dashboard_id: 'dash_ps001',
      contact_number: '+91 85922 86100',
      district: 'Prakasam',
      active: true
    },
    {
      station_id: 'PS002',
      name: 'Ongole II Town Police Station',
      location: { type: 'Point', coordinates: [80.0540, 15.5085] },
      lat: 15.5085,
      lng: 80.0540,
      radius_km: 2.5,
      dashboard_id: 'dash_ps002',
      contact_number: '+91 85922 86200',
      district: 'Prakasam',
      active: true
    },
    {
      station_id: 'PS003',
      name: 'Ongole Taluka Police Station',
      location: { type: 'Point', coordinates: [80.0350, 15.5180] },
      lat: 15.5180,
      lng: 80.0350,
      radius_km: 5.0,
      dashboard_id: 'dash_ps003',
      contact_number: '+91 85922 86300',
      district: 'Prakasam',
      active: true
    },
    {
      station_id: 'PS004',
      name: 'Ongole III Town Police Station',
      location: { type: 'Point', coordinates: [80.0620, 15.4950] },
      lat: 15.4950,
      lng: 80.0620,
      radius_km: 3.0,
      dashboard_id: 'dash_ps004',
      contact_number: '+91 85922 86400',
      district: 'Prakasam',
      active: true
    },
    {
      station_id: 'PS005',
      name: 'Chimakurthy Police Station',
      location: { type: 'Point', coordinates: [79.8665, 15.5862] },
      lat: 15.5862,
      lng: 79.8665,
      radius_km: 15.0,
      dashboard_id: 'dash_ps005',
      contact_number: '+91 85922 86500',
      district: 'Prakasam',
      active: true
    },
    {
      station_id: 'PS006',
      name: 'Kandukur Police Station',
      location: { type: 'Point', coordinates: [79.9042, 15.2165] },
      lat: 15.2165,
      lng: 79.9042,
      radius_km: 20.0,
      dashboard_id: 'dash_ps006',
      contact_number: '+91 85922 86600',
      district: 'Prakasam',
      active: true
    }
  ];

  await models.PoliceStation.insertMany(stations);
  console.log('Seeded 6 police stations');

  // 2. Seed Patrol Units for all 6 stations
  const patrolUnits = [
    // PS001
    { patrol_id: 'PT001', station_id: 'PS001', vehicle_details: 'Mahindra Scorpio (AP27P1234)', live_latitude: 15.5011, live_longitude: 80.0433, availability: 'Available' },
    { patrol_id: 'PT002', station_id: 'PS001', vehicle_details: 'Hero Splendor (AP27P5678)', live_latitude: 15.5050, live_longitude: 80.0460, availability: 'Available' },
    // PS002
    { patrol_id: 'PT003', station_id: 'PS002', vehicle_details: 'Mahindra Scorpio (AP27P4321)', live_latitude: 15.5090, live_longitude: 80.0510, availability: 'Available' },
    { patrol_id: 'PT004', station_id: 'PS002', vehicle_details: 'Hero Splendor (AP27P8765)', live_latitude: 15.5070, live_longitude: 80.0560, availability: 'Available' },
    // PS003
    { patrol_id: 'PT005', station_id: 'PS003', vehicle_details: 'Mahindra Scorpio (AP27P9999)', live_latitude: 15.5190, live_longitude: 80.0340, availability: 'Available' },
    { patrol_id: 'PT006', station_id: 'PS003', vehicle_details: 'Bolero (AP27P8888)', live_latitude: 15.5160, live_longitude: 80.0360, availability: 'Available' },
    // PS004
    { patrol_id: 'PT007', station_id: 'PS004', vehicle_details: 'Mahindra Scorpio (AP27P7777)', live_latitude: 15.4960, live_longitude: 80.0610, availability: 'Available' },
    { patrol_id: 'PT008', station_id: 'PS004', vehicle_details: 'Pulsar 150 (AP27P6666)', live_latitude: 15.4940, live_longitude: 80.0630, availability: 'Available' },
    // PS005
    { patrol_id: 'PT009', station_id: 'PS005', vehicle_details: 'Mahindra Bolero (AP27P5555)', live_latitude: 15.5850, live_longitude: 79.8650, availability: 'Available' },
    { patrol_id: 'PT010', station_id: 'PS005', vehicle_details: 'Apache RTR (AP27P4444)', live_latitude: 15.5870, live_longitude: 79.8680, availability: 'Available' },
    // PS006
    { patrol_id: 'PT011', station_id: 'PS006', vehicle_details: 'Mahindra Bolero (AP27P3333)', live_latitude: 15.2150, live_longitude: 79.9030, availability: 'Available' },
    { patrol_id: 'PT012', station_id: 'PS006', vehicle_details: 'Pulsar 220 (AP27P2222)', live_latitude: 15.2180, live_longitude: 79.9050, availability: 'Available' }
  ];

  await models.PatrolUnit.insertMany(patrolUnits);
  console.log('Seeded 12 patrol units (2 for each station)');

  // 3. Seed Users/Officers for Stations
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Clear any existing test/station officer accounts to avoid duplicates
  const targetEmails = [
    'admin@gmail.com',
    'onetown@ongole.com', 'twotown@ongole.com', 'taluka@ongole.com',
    'threetown@ongole.com', 'chimakurthy@ongole.com', 'kandukur@ongole.com',
    'sho1@ongole.com', 'officer1@ongole.com', 'officer2@ongole.com'
  ];
  await models.User.deleteMany({ email: { $in: targetEmails } });

  const testOfficers = [
    { email: 'admin@gmail.com', password: hashedPassword, full_name: 'Super Admin', role: 'admin' },
    { email: 'onetown@ongole.com', password: hashedPassword, full_name: 'Ongole I Town SHO', role: 'sho', badge_number: 'SHO_ONE_TOWN', phone: '+91 85922 86101', station_id: 'PS001' },
    { email: 'twotown@ongole.com', password: hashedPassword, full_name: 'Ongole II Town SHO', role: 'sho', badge_number: 'SHO_TWO_TOWN', phone: '+91 85922 86201', station_id: 'PS002' },
    { email: 'taluka@ongole.com', password: hashedPassword, full_name: 'Ongole Taluka SHO', role: 'sho', badge_number: 'SHO_TALUKA', phone: '+91 85922 86301', station_id: 'PS003' },
    { email: 'threetown@ongole.com', password: hashedPassword, full_name: 'Ongole III Town SHO', role: 'sho', badge_number: 'SHO_THREE_TOWN', phone: '+91 85922 86401', station_id: 'PS004' },
    { email: 'chimakurthy@ongole.com', password: hashedPassword, full_name: 'Chimakurthy SHO', role: 'sho', badge_number: 'SHO_CHIMAKURTHY', phone: '+91 85922 86501', station_id: 'PS005' },
    { email: 'kandukur@ongole.com', password: hashedPassword, full_name: 'Kandukur SHO', role: 'sho', badge_number: 'SHO_KANDUKUR', phone: '+91 85922 86601', station_id: 'PS006' }
  ];

  await models.User.insertMany(testOfficers);
  console.log('Seeded station and admin login credentials:');
  console.log('  - admin@gmail.com / admin123 -> Central Command');
  console.log('  - onetown@ongole.com / admin123 -> Ongole I Town PS');
  console.log('  - twotown@ongole.com / admin123 -> Ongole II Town PS');
  console.log('  - taluka@ongole.com / admin123 -> Ongole Taluka PS');
  console.log('  - threetown@ongole.com / admin123 -> Ongole III Town PS');
  console.log('  - chimakurthy@ongole.com / admin123 -> Chimakurthy PS');
  console.log('  - kandukur@ongole.com / admin123 -> Kandukur PS');

  mongoose.connection.close();
}

seed();
