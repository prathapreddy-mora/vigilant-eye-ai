const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const models = require('./models.cjs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = 'supersecretkey123'; // In production use dotenv

mongoose.connect('mongodb://127.0.0.1:27017/vigilant_eye')
  .then(async () => {
    console.log('MongoDB connected to 127.0.0.1');
    await ensureDefaultCheckpoints();
  })
  .catch(err => console.error('MongoDB connection error:', err));

async function ensureDefaultCheckpoints() {
  try {
    const defaults = [
      {
        name: "Mangamuru Junction",
        city: "Ongole",
        lat: 15.5126,
        lng: 80.0381,
        map_link: "https://maps.app.goo.gl/mvgUgf7Zcayk2fPK6"
      },
      {
        name: "Ongole bus stand",
        city: "ongole",
        lat: 15.5039,
        lng: 80.0526,
        map_link: "https://maps.app.goo.gl/BSL5kRmMTYNy5kfAA"
      },
      {
        name: "Church center",
        city: "ongole",
        lat: 15.5009,
        lng: 80.0461,
        map_link: "https://maps.app.goo.gl/fmeabB8X9MuXhvu79"
      },
      {
        name: "Sangamithra Hospital Junction",
        city: "Ongole",
        lat: 15.5165,
        lng: 80.0485,
        map_link: "https://maps.app.goo.gl/WrNC7VcCLFnJUQw5A"
      },
      {
        name: "Kopollu main road",
        city: "Kopollu",
        lat: 15.4850,
        lng: 80.0760,
        map_link: "https://maps.app.goo.gl/FyvL3LcFPPfzsTKg9"
      },
      {
        name: "Chimakurthy Bus stand",
        city: "Chimakurthy",
        lat: 15.5865,
        lng: 79.8660,
        map_link: "https://maps.app.goo.gl/mzH68VmVq9NpW4yr5"
      }
    ];

    for (const cp of defaults) {
      const exists = await models.Checkpoint.findOne({ name: cp.name });
      if (!exists) {
        await models.Checkpoint.create(cp);
        console.log(`[Checkpoint Seed] Created default checkpoint: ${cp.name}`);
      }
    }
  } catch (err) {
    console.error("Failed to seed default checkpoints on startup:", err);
  }
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Haversine formula to compute distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const activeSimulations = new Map();

function startPatrolSimulation(alertId, stationId, patrolId) {
  if (!patrolId) return;
  const key = `${alertId}_${patrolId}`;
  if (activeSimulations.has(key)) return;

  console.log(`Starting patrol simulation for alert: ${alertId}, patrol: ${patrolId}`);
  activeSimulations.set(key, true);

  let steps = 0;
  const maxSteps = 10;
  
  const timer = setInterval(async () => {
    try {
      const alert = await models.Alert.findById(alertId);
      const patrol = await models.PatrolUnit.findOne({ patrol_id: patrolId });
      
      if (!alert || !patrol || alert.station_alert_status === 'Closed' || steps >= maxSteps) {
        clearInterval(timer);
        activeSimulations.delete(key);
        console.log(`Simulation finished for ${key}`);
        
        // Auto resolve / intercept at step end if not closed
        if (alert && (alert.station_alert_status === 'Patrol Dispatched' || alert.station_alert_status === 'Patrol Dispatched / Moving' || alert.station_alert_status === 'Assigned')) {
          alert.station_alert_status = 'Vehicle Located';
          await alert.save();
          
          await models.StationAlert.findOneAndUpdate(
            { alert_id: alertId, station_id: stationId },
            { $set: { status: 'Vehicle Located', resolved_at: new Date() } }
          );
          
          await models.AlertAuditLog.create({
            alert_id: alertId,
            action: 'intercepted',
            note: `Simulated intercept: Patrol unit ${patrolId} intercepted vehicle ${alert.plate}`
          });
          
          const updatedJson = alert.toJSON();
          io.to('central').emit('update_alert', updatedJson);
          io.to(`station:${stationId}`).emit('update_alert', updatedJson);
        }
        return;
      }
      
      // Interpolate coordinates
      const tLat = alert.lat;
      const tLng = alert.lng;
      const cLat = patrol.live_latitude || 15.5057;
      const cLng = patrol.live_longitude || 80.0499;
      
      const newLat = cLat + (tLat - cLat) * 0.25;
      const newLng = cLng + (tLng - cLng) * 0.25;
      
      patrol.live_latitude = parseFloat(newLat.toFixed(5));
      patrol.live_longitude = parseFloat(newLng.toFixed(5));
      patrol.last_updated = new Date();
      await patrol.save();
      
      // Emit update to central and station dashboards
      io.to('central').emit('patrol_update', {
        alert_id: alertId.toString(),
        patrol_id: patrolId,
        lat: patrol.live_latitude,
        lng: patrol.live_longitude
      });
      io.to(`station:${stationId}`).emit('patrol_update', {
        alert_id: alertId.toString(),
        patrol_id: patrolId,
        lat: patrol.live_latitude,
        lng: patrol.live_longitude
      });
      
      steps++;
    } catch (e) {
      console.error('Simulation error:', e);
      clearInterval(timer);
      activeSimulations.delete(key);
    }
  }, 3000);
}

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    let user = await models.User.findOne({ email });
    if (user) return res.status(400).json({ error: { message: 'User already exists' } });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new models.User({ email, password: hashedPassword, full_name });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { user: user.toJSON(), session: { access_token: token, user: user.toJSON() } } });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await models.User.findOne({ email });
    if (!user) return res.status(400).json({ error: { message: 'Invalid credentials' } });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: { message: 'Invalid credentials' } });
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ data: { user: user.toJSON(), session: { access_token: token, user: user.toJSON() } } });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/auth/session', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.json({ data: { session: null } });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await models.User.findById(decoded.id);
    if (!user) throw new Error('User not found');
    res.json({ data: { session: { access_token: token, user: user.toJSON() } } });
  } catch (err) {
    res.json({ data: { session: null } });
  }
});

app.post('/api/auth/update', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: { message: 'Unauthorized' } });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await models.User.findById(decoded.id);
    if (!user) throw new Error('User not found');
    
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
      await user.save();
    }
    res.json({ data: { user: user.toJSON() } });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// --- Mock Supabase DB Endpoint ---
const modelMap = {
  vehicles: models.Vehicle,
  scans: models.Scan,
  alerts: models.Alert,
  alert_audit_log: models.AlertAuditLog,
  watchlists: models.Watchlist,
  restricted_zones: models.RestrictedZone,
  sos_logs: models.SosLog,
  checkpoints: models.Checkpoint,
  profiles: models.User,
  police_stations: models.PoliceStation,
  station_alerts: models.StationAlert,
  patrol_units: models.PatrolUnit,
  alert_notifications: models.AlertNotification,
  vehicle_tracking_history: models.VehicleTrackingHistory
};

app.post('/api/supabase', async (req, res) => {
  try {
    const { table, action, data: reqData, filters, limit, order, single } = req.body;
    console.log(`[Supabase API] Table: ${table}, Action: ${action}, Filters: ${JSON.stringify(filters || [])}, Limit: ${limit}, Order: ${JSON.stringify(order || [])}`);
    const Model = modelMap[table];
    if (!Model) return res.status(400).json({ error: { message: `Table ${table} not found` } });

    // Build Mongoose Query
    let mQuery = {};
    for (const f of filters) {
      let col = f.col === 'id' ? '_id' : f.col;
      if (col === 'created_at') col = 'createdAt';
      if (col === 'updated_at') col = 'updatedAt';

      if (f.type === 'eq') mQuery[col] = f.val;
      else if (f.type === 'in') mQuery[col] = { $in: f.vals };
      else if (f.type === 'gt') mQuery[col] = { ...mQuery[col], $gt: f.val };
      else if (f.type === 'gte') mQuery[col] = { ...mQuery[col], $gte: f.val };
      else if (f.type === 'lt') mQuery[col] = { ...mQuery[col], $lt: f.val };
      else if (f.type === 'lte') mQuery[col] = { ...mQuery[col], $lte: f.val };
      else if (f.type === 'not') {
        if (f.op === 'is') mQuery[col] = { $ne: f.val };
        else if (f.op === 'eq') mQuery[col] = { $ne: f.val };
      }
    }

    if (action === 'insert') {
      let docs = Array.isArray(reqData) ? reqData : [reqData];

      if (table === 'alerts' || table === 'scans') {
        const filtered = [];
        for (const doc of docs) {
          if (doc.plate && (await isRealPlate(doc.plate))) {
            filtered.push(doc);
          }
        }
        docs = filtered;
      }

      if (docs.length === 0) {
        return res.json({ data: single ? null : [], error: null });
      }
      
      // Auto selection of station for new alerts (Forced to Ongole I Town Police Station PS001 only)
      if (table === 'alerts') {
        for (const doc of docs) {
          if (doc.lat != null && doc.lng != null) {
            const targetStation = await models.PoliceStation.findOne({ station_id: 'PS001' });
            if (targetStation) {
              const dist = haversineKm(doc.lat, doc.lng, targetStation.lat, targetStation.lng);
              doc.routed_station_id = 'PS001';
              doc.routed_station_name = targetStation.name;
              doc.distance_km = parseFloat(dist.toFixed(2));
              doc.station_alert_status = 'Sent';
              doc.secondary_stations = [];
            } else {
              doc.routed_station_id = 'PS001';
              doc.routed_station_name = 'Ongole I Town Police Station';
              doc.distance_km = 0;
              doc.station_alert_status = 'Sent';
              doc.secondary_stations = [];
            }
          }
        }
      }

      const created = await Model.insertMany(docs);
      
      // Post-creation side-effects
      if (table === 'alerts') {
        for (const alertDoc of created) {
          const alertJson = alertDoc.toJSON();
          if (alertJson.routed_station_id) {
            let isStolenOrUnderInv = false;
            if (alertJson.vehicle_id) {
              const vehicle = await models.Vehicle.findById(alertJson.vehicle_id);
              if (vehicle) {
                const vStatus = vehicle.status;
                isStolenOrUnderInv = vStatus === 'stolen' || vStatus === 'theft' || vStatus === 'under_investigation';
              }
            } else {
              const isFake = alertJson.reasons && alertJson.reasons.some(r => r.includes('Fake') || r.includes('Duplicate') || r.includes('Cloned'));
              isStolenOrUnderInv = isFake;
            }
            if (isStolenOrUnderInv && alertJson.routed_station_id === 'PS001') {
              const allowedPlates = ['TG29B9772', 'KA32EM3809'];
              if (!allowedPlates.includes(alertJson.plate)) {
                isStolenOrUnderInv = false;
              }
            }

            if (isStolenOrUnderInv) {
              // Create station alert record
              await models.StationAlert.create({
                alert_id: alertDoc._id,
                station_id: alertJson.routed_station_id,
                status: 'Sent',
                sent_at: new Date()
              });

              // Create notification records
              await models.AlertNotification.create({
                alert_id: alertDoc._id,
                channel: 'dashboard',
                recipient: `station:${alertJson.routed_station_id}`,
                sent_at: new Date()
              });
              await models.AlertNotification.create({
                alert_id: alertDoc._id,
                channel: 'SMS',
                recipient: '+919848022338',
                sent_at: new Date()
              });
              await models.AlertNotification.create({
                alert_id: alertDoc._id,
                channel: 'FCM',
                recipient: 'fcm_token_device',
                sent_at: new Date()
              });

              // Create station alert records for secondary stations if any
              if (alertJson.secondary_stations && alertJson.secondary_stations.length > 0) {
                for (const sec of alertJson.secondary_stations) {
                  await models.StationAlert.create({
                    alert_id: alertDoc._id,
                    station_id: sec.stationId,
                    status: 'Sent',
                    sent_at: new Date()
                  });
                  
                  await models.AlertNotification.create({
                    alert_id: alertDoc._id,
                    channel: 'dashboard',
                    recipient: `station:${sec.stationId}`,
                    sent_at: new Date()
                  });
                }
              }

              // Emit to station socket room
              io.to(`station:${alertJson.routed_station_id}`).emit('new_alert', alertJson);
              if (alertJson.secondary_stations && alertJson.secondary_stations.length > 0) {
                for (const sec of alertJson.secondary_stations) {
                  io.to(`station:${sec.stationId}`).emit('new_alert', alertJson);
                }
              }

              // Escalation timer (30 seconds)
              setTimeout(async () => {
                const currentAlert = await models.Alert.findById(alertDoc._id);
                if (currentAlert && currentAlert.station_alert_status === 'Sent') {
                  currentAlert.station_alert_status = 'Auto-Forwarded';
                  await currentAlert.save();
                  
                  await models.AlertAuditLog.create({
                    alert_id: currentAlert._id,
                    action: 'escalated',
                    note: 'Auto-forwarded: Alert remained unacknowledged for more than 30 seconds'
                  });

                  await models.StationAlert.updateMany(
                    { alert_id: currentAlert._id, status: 'Sent' },
                    { $set: { status: 'Auto-Forwarded' } }
                  );

                  const updatedJson = currentAlert.toJSON();
                  io.to('central').emit('update_alert', updatedJson);
                  io.to(`station:${updatedJson.routed_station_id}`).emit('update_alert', updatedJson);
                  console.log(`Alert ${currentAlert._id} escalated to District Control Room!`);
                }
              }, 30000);
            }

            // Always emit to central dashboard
            io.to('central').emit('new_alert', alertJson);
          }
        }
      } else if (table === 'scans') {
        for (const scanDoc of created) {
          const scanJson = scanDoc.toJSON();
          let linkedAlertId = null;
          if (scanJson.verification_status === 'flagged') {
            const recentAlert = await models.Alert.findOne({ plate: scanJson.plate }).sort({ createdAt: -1 });
            if (recentAlert) {
              linkedAlertId = recentAlert._id;
            }
          }
          await models.VehicleTrackingHistory.create({
            plate: scanJson.plate,
            image_url: scanJson.image_url,
            ocr_confidence: scanJson.ocr_confidence,
            latitude: scanJson.lat,
            longitude: scanJson.lng,
            camera_id: scanJson.checkpoint_name || 'CAM_DEV',
            timestamp: scanJson.createdAt || new Date(),
            linked_alert_id: linkedAlertId
          });
        }
      }

      return res.json({ data: single ? created[0].toJSON() : created.map(c => c.toJSON()), error: null });
    }

    if (action === 'upsert') {
      const docs = Array.isArray(reqData) ? reqData : [reqData];
      const results = [];
      for (const d of docs) {
        if (d.id) {
          const updated = await Model.findOneAndUpdate({ _id: d.id }, { $set: d }, { new: true, upsert: true });
          results.push(updated);
        } else {
          const created = await Model.create(d);
          results.push(created);
        }
      }
      return res.json({ data: single ? (results[0]?.toJSON() || null) : results.map(c => c.toJSON()), error: null });
    }
    
    if (action === 'update') {
      await Model.updateMany(mQuery, { $set: reqData });
      const updated = await Model.find(mQuery);

      if (table === 'alerts') {
        for (const item of updated) {
          const alertJson = item.toJSON();
          io.to('central').emit('update_alert', alertJson);
          if (alertJson.routed_station_id) {
            io.to(`station:${alertJson.routed_station_id}`).emit('update_alert', alertJson);
          }
          if (alertJson.secondary_stations && alertJson.secondary_stations.length > 0) {
            for (const sec of alertJson.secondary_stations) {
              io.to(`station:${sec.stationId}`).emit('update_alert', alertJson);
            }
          }

          if (reqData.station_alert_status) {
            const updateFields = { status: reqData.station_alert_status };
            if (reqData.station_alert_status === 'Acknowledged' || reqData.station_alert_status === 'Accepted') {
              updateFields.acknowledged_at = new Date();
            } else if (reqData.station_alert_status === 'Assigned') {
              updateFields.assigned_at = new Date();
              if (reqData.assigned_to) {
                updateFields.assigned_officer_id = reqData.assigned_to;
              }
            } else if (reqData.station_alert_status === 'Patrol Dispatched' || reqData.station_alert_status === 'Patrol Dispatched / Moving') {
              updateFields.dispatched_at = new Date();
              if (reqData.assigned_patrol_id) {
                updateFields.assigned_patrol_id = reqData.assigned_patrol_id;
              }
            } else if (reqData.station_alert_status === 'Resolved') {
              updateFields.resolved_at = new Date();
            } else if (reqData.station_alert_status === 'Closed') {
              updateFields.closed_at = new Date();
            }
            
            await models.StationAlert.findOneAndUpdate(
              { alert_id: item._id, station_id: alertJson.routed_station_id },
              { $set: updateFields }
            );

            if (reqData.station_alert_status === 'Patrol Dispatched' || reqData.station_alert_status === 'Patrol Dispatched / Moving') {
              startPatrolSimulation(item._id, alertJson.routed_station_id, reqData.assigned_patrol_id || alertJson.assigned_patrol_id);
            }
          }
        }
      } else if (table === 'station_alerts') {
        for (const item of updated) {
          const saJson = item.toJSON();
          const parentAlert = await models.Alert.findById(saJson.alert_id);
          if (parentAlert) {
            parentAlert.station_alert_status = saJson.status;
            if (saJson.assigned_officer_id) parentAlert.assigned_to = saJson.assigned_officer_id;
            await parentAlert.save();

            const alertJson = parentAlert.toJSON();
            io.to('central').emit('update_alert', alertJson);
            io.to(`station:${alertJson.routed_station_id}`).emit('update_alert', alertJson);

            if (saJson.status === 'Patrol Dispatched' || saJson.status === 'Patrol Dispatched / Moving') {
              startPatrolSimulation(parentAlert._id, alertJson.routed_station_id, saJson.assigned_patrol_id);
            }
          }
        }
      }

      return res.json({ data: single ? (updated[0]?.toJSON() || null) : updated.map(c => c.toJSON()), error: null });
    }
    
    if (action === 'delete') {
      await Model.deleteMany(mQuery);
      return res.json({ data: null, error: null });
    }

    // Select
    let queryObj = Model.find(mQuery);
    if (order && order.length > 0) {
      let sortObj = {};
      order.forEach(o => {
        let col = o.col;
        if (col === 'created_at') col = 'createdAt';
        if (col === 'updated_at') col = 'updatedAt';
        sortObj[col] = o.ascending === false ? -1 : 1;
      });
      queryObj = queryObj.sort(sortObj);
    }
    if (limit) queryObj = queryObj.limit(limit);

    let results = await queryObj;

    // Dynamically generate a mock vehicle if table is 'vehicles', query has no results, and plate is specifically queried
    if (table === 'vehicles' && results.length === 0) {
      const plateFilter = filters && filters.find(f => f.col === 'plate' && f.type === 'eq');
      if (plateFilter && isValidPlateFormat(plateFilter.val)) {
        const plateVal = plateFilter.val.toUpperCase();
        const brands = ['Hero', 'Honda', 'Maruti Suzuki', 'Hyundai', 'Tata', 'Yamaha', 'Bajaj', 'Kia', 'Toyota'];
        const modelsMap = {
          'Hero': ['Splendor+', 'Passion Pro', 'HF Deluxe'],
          'Honda': ['Activa 6G', 'Shine', 'City', 'Civic'],
          'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Alto'],
          'Hyundai': ['i20', 'Creta', 'Verna', 'Santro'],
          'Tata': ['Nexon', 'Altroz', 'Punch', 'Harrier'],
          'Yamaha': ['FZ-S', 'R15', 'MT-15'],
          'Bajaj': ['Pulsar 150', 'Avenger', 'Platina'],
          'Kia': ['Seltos', 'Sonet', 'Carens'],
          'Toyota': ['Innova', 'Fortuner', 'Glanza']
        };
        const colors = ['White', 'Black', 'Grey', 'Silver', 'Red', 'Blue'];
        const owners = ['Srinivas Rao', 'Koteswara Rao', 'Ravi Shankar', 'Subba Rao', 'Satish Kumar', 'Prakash Reddy', 'Venkatesh L.', 'Gopal Krishna', 'Anitha Devi', 'Sandhya Rani'];
        
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const model = modelsMap[brand][Math.floor(Math.random() * modelsMap[brand].length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const owner = owners[Math.floor(Math.random() * owners.length)];
        
        const newVehicleDoc = new models.Vehicle({
          plate: plateVal,
          owner_name: owner,
          ownership: '1st Owner',
          rto_office: 'Ongole (AP27)',
          brand: brand,
          model: model,
          color: color,
          vehicle_type: ['Hero', 'Honda', 'Yamaha', 'Bajaj'].includes(brand) ? 'Two Wheeler' : 'Four Wheeler',
          fuel_type: 'Petrol',
          engine_no: 'ENG' + plateVal,
          chassis_no: 'CHS' + plateVal,
          status: 'active',
          insurance_valid: true,
          puc_valid: true,
          fitness_valid: true,
          road_tax_paid: true,
          pending_challans: 0,
          challan_amount: 0,
          criminal_cases: []
        });
        results = [newVehicleDoc];
      }
    }
    
    if (single) {
      return res.json({ data: results.length > 0 ? results[0].toJSON() : null, error: null });
    }
    
    if (table === 'alerts') {
       await Model.populate(results, { path: 'vehicle_id', select: 'owner_name brand model color status' });
       const mapped = results.map(r => {
           let j = r.toJSON();
           if (j.vehicle_id) {
               j.vehicles = j.vehicle_id;
               j.vehicle_id = j.vehicle_id.id;
           }
           return j;
       });

        const stationFilter = filters.find(f => f.col === 'routed_station_id');
        if (stationFilter) {
          const stationId = stationFilter.val;
          let filtered = mapped.filter(item => {
            const vStatus = item.vehicles?.status;
            const isFake = item.reasons && item.reasons.some(r => r.includes('Fake') || r.includes('Duplicate') || r.includes('Cloned'));
            return vStatus === 'stolen' || vStatus === 'theft' || vStatus === 'under_investigation' || isFake;
          });

          if (stationId === 'PS001') {
            filtered = filtered.filter(item => item.plate === 'TG29B9772' || item.plate === 'KA32EM3809');
            
            // Deduplicate by plate, keeping the first occurrence (which is the most recent alert)
            const seen = new Set();
            filtered = filtered.filter(item => {
              if (seen.has(item.plate)) return false;
              seen.add(item.plate);
              return true;
            });
          }
          return res.json({ data: filtered, error: null, count: filtered.length });
        }

       return res.json({ data: mapped, error: null, count: mapped.length });
    }

    return res.json({ data: results.map(r => r.toJSON()), error: null, count: results.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: err.message }, data: null });
  }
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Express server running on http://127.0.0.1:${PORT}`);
});

function isValidPlateFormat(plate) {
  if (!plate) return false;
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Clean string should be between 4 and 11 characters
  if (cleaned.length < 4 || cleaned.length > 11) {
    return false;
  }

  // Must contain at least one digit and at least one letter
  const hasDigit = /[0-9]/.test(cleaned);
  const hasLetter = /[A-Z]/.test(cleaned);
  if (!hasDigit || !hasLetter) {
    return false;
  }

  // Standard Indian Plate: e.g., AP27BB2359, DL1CBA1111, HR261234, AP27B2359, AP27A1, DL1A9
  const standardPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;
  
  // BH Series Plate: e.g., 22BH5015A
  const bhPattern = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  
  // Diplomatic Plate: e.g., 12CD34
  const diplomaticPattern = /^[0-9]{2,3}[A-Z]{2}[0-9]{2,4}$/;

  return standardPattern.test(cleaned) || bhPattern.test(cleaned) || diplomaticPattern.test(cleaned);
}

async function isRealPlate(plate) {
  if (isValidPlateFormat(plate)) return true;
  const exists = await models.Vehicle.exists({ plate: plate });
  return !!exists;
}
