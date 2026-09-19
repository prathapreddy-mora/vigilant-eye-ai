const mongoose = require('mongoose');
const models = require('./models.cjs');

mongoose.connect('mongodb://127.0.0.1:27017/vigilant_eye')
  .then(() => console.log('MongoDB connected for seeding dashboard'))
  .catch(err => console.error('MongoDB connection error:', err));

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function seedDashboard() {
  await models.Scan.deleteMany({});
  await models.Alert.deleteMany({});
  await models.StationAlert.deleteMany({});
  await models.AlertNotification.deleteMany({});
  
  const now = new Date();
  const scans = [];
  const alerts = [];
  
  // Need some vehicle references for alerts
  const vehicles = await models.Vehicle.find({});
  const stations = await models.PoliceStation.find({ active: true });

  // 1. Seed the two permanent alerts for onetown@ongole.com (PS001) exactly as shown in screenshot
  const vTG = await models.Vehicle.findOne({ plate: 'TG29B9772' });
  const vKA = await models.Vehicle.findOne({ plate: 'KA32EM3809' });

  const scanTGId = new mongoose.Types.ObjectId();
  scans.push({
    _id: scanTGId,
    plate: 'TG29B9772',
    vehicle_id: vTG?._id || null,
    lat: 15.491,
    lng: 80.017,
    ocr_confidence: 95,
    verification_status: 'flagged',
    matched: true,
    createdAt: new Date('2026-07-11T18:01:31'),
    updatedAt: new Date('2026-07-11T18:01:31')
  });

  alerts.push({
    scan_id: scanTGId,
    vehicle_id: vTG?._id || null,
    plate: 'TG29B9772',
    reasons: ['Suspicious Activity'],
    risk: 'medium',
    risk_score: 70,
    state: 'active',
    summary: 'Vehicle spotted in restricted timeframe',
    lat: 15.491,
    lng: 80.017,
    routed_station_id: 'PS001',
    routed_station_name: 'Ongole I Town Police Station',
    distance_km: 3.36,
    secondary_stations: [],
    station_alert_status: 'Auto-Forwarded',
    createdAt: new Date('2026-07-11T18:01:31'),
    updatedAt: new Date('2026-07-11T18:01:31')
  });

  const scanKAId = new mongoose.Types.ObjectId();
  scans.push({
    _id: scanKAId,
    plate: 'KA32EM3809',
    vehicle_id: vKA?._id || null,
    lat: 15.504,
    lng: 80.053,
    ocr_confidence: 95,
    verification_status: 'flagged',
    matched: true,
    createdAt: new Date('2026-07-11T18:01:31'),
    updatedAt: new Date('2026-07-11T18:01:31')
  });

  alerts.push({
    scan_id: scanKAId,
    vehicle_id: vKA?._id || null,
    plate: 'KA32EM3809',
    reasons: ['Suspicious Activity'],
    risk: 'medium',
    risk_score: 70,
    state: 'active',
    summary: 'Vehicle spotted in restricted timeframe',
    lat: 15.504,
    lng: 80.053,
    routed_station_id: 'PS001',
    routed_station_name: 'Ongole I Town Police Station',
    distance_km: 0.83,
    secondary_stations: [],
    station_alert_status: 'Sent',
    createdAt: new Date('2026-07-11T18:01:31'),
    updatedAt: new Date('2026-07-11T18:01:31')
  });
  
  // Generate data for past 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    
    // 5-15 scans per day
    const numScans = Math.floor(Math.random() * 10) + 5;
    
    for (let j = 0; j < numScans; j++) {
      const isSuspicious = Math.random() > 0.7;
      const vStatus = isSuspicious ? 'flagged' : 'verified';
      
      let vehicle;
      let plate;
      if (isSuspicious) {
        const whitelistedPlates = ['TG29B9772', 'KA32EM3809'];
        plate = whitelistedPlates[Math.floor(Math.random() * whitelistedPlates.length)];
        vehicle = await models.Vehicle.findOne({ plate });
      } else {
        vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        plate = vehicle?.plate || `AP27XX${Math.floor(Math.random() * 9999)}`;
      }
      
      // Seed around Ongole town
      const lat = 15.5032 + (Math.random() - 0.5) * 0.08;
      const lng = 80.0455 + (Math.random() - 0.5) * 0.08;
      
      const scanId = new mongoose.Types.ObjectId();
      scans.push({
        _id: scanId,
        plate: plate,
        vehicle_id: vehicle?._id || null,
        lat: lat,
        lng: lng,
        ocr_confidence: Math.floor(Math.random() * 20) + 80,
        verification_status: vStatus,
        matched: !!vehicle,
        createdAt: d,
        updatedAt: d
      });
      
      if (isSuspicious) {
        // Calculate nearest station
        let routed_station_id = undefined;
        let routed_station_name = undefined;
        let distance_km = undefined;
        let secondary_stations = [];
        
        if (stations.length > 0) {
          const withDistance = stations.map(s => {
            const dist = haversineKm(lat, lng, s.lat, s.lng);
            return { station: s, dist };
          });
          withDistance.sort((a, b) => a.dist - b.dist);
          
          // Route ALL alerts to Ongole I Town Police Station (PS001) only
          const targetStation = stations.find(s => s.station_id === 'PS001');
          if (targetStation) {
            const dist = haversineKm(lat, lng, targetStation.lat, targetStation.lng);
            routed_station_id = 'PS001';
            routed_station_name = targetStation.name;
            distance_km = parseFloat(dist.toFixed(2));
            secondary_stations = [];
          } else {
            routed_station_id = 'PS001';
            routed_station_name = 'Ongole I Town Police Station';
            distance_km = 0;
            secondary_stations = [];
          }
        }

        const alertStatus = Math.random() > 0.4 ? 'Sent' : 'Auto-Forwarded';

        alerts.push({
          scan_id: scanId,
          vehicle_id: vehicle?._id || null,
          plate: plate,
          reasons: ['Suspicious Activity'],
          risk: Math.random() > 0.5 ? 'high' : 'medium',
          risk_score: 70,
          state: 'active',
          summary: 'Vehicle spotted in restricted timeframe',
          lat: lat,
          lng: lng,
          routed_station_id,
          routed_station_name,
          distance_km,
          secondary_stations,
          station_alert_status: alertStatus,
          createdAt: d,
          updatedAt: d
        });
      }
    }
  }
  
  const createdScans = await models.Scan.insertMany(scans);
  console.log(`Inserted ${createdScans.length} scans`);
  
  const createdAlerts = await models.Alert.insertMany(alerts);
  console.log(`Inserted ${createdAlerts.length} alerts`);
  
  mongoose.connection.close();
}

seedDashboard();
