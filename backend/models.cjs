const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String },
  role: { type: String, default: 'constable' },
  badge_number: { type: String },
  phone: { type: String },
  station_id: { type: String }
}, { timestamps: true });

const checkpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  map_link: { type: String }
}, { timestamps: true });

const vehicleSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  owner_name: { type: String, required: true },
  ownership: { type: String },
  rto_office: { type: String },
  owner_contact: { type: String },
  owner_address: { type: String },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  vehicle_type: { type: String, required: true },
  fuel_type: { type: String },
  engine_no: { type: String },
  chassis_no: { type: String },
  color: { type: String, required: true },
  registration_date: { type: Date },
  registration_validity: { type: Date },
  insurance_valid: { type: Boolean, default: true },
  insurance_expiry: { type: Date },
  puc_valid: { type: Boolean, default: true },
  puc_expiry: { type: Date },
  fitness_valid: { type: Boolean, default: true },
  fitness_expiry: { type: Date },
  road_tax_paid: { type: Boolean, default: true },
  pending_challans: { type: Number, default: 0 },
  challan_amount: { type: Number, default: 0 },
  criminal_cases: { type: [String], default: [] },
  status: { type: String, default: 'active' },
  fake_plate: { type: Boolean, default: false },
  duplicate_plate: { type: Boolean, default: false },
  suspicious: { type: Boolean, default: false },
  last_known_lat: { type: Number },
  last_known_lng: { type: Number },
  last_seen_at: { type: Date },
  rc_number: { type: String },
  photo_url: { type: String }
}, { timestamps: true });

const scanSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkpoint_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkpoint' },
  checkpoint_name: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  ocr_confidence: { type: Number },
  detected_color: { type: String },
  detected_type: { type: String },
  detected_brand: { type: String },
  image_url: { type: String },
  verification_status: { type: String, default: 'unknown' },
  matched: { type: Boolean, default: false }
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  scan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan' },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  plate: { type: String, required: true },
  reasons: { type: [String], default: [] },
  risk: { type: String, default: 'medium' },
  risk_score: { type: Number, default: 50 },
  state: { type: String, default: 'active' },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number },
  lng: { type: Number },
  image_url: { type: String },
  summary: { type: String },
  closed_at: { type: Date },
  routed_station_id: { type: String },
  routed_station_name: { type: String },
  distance_km: { type: Number },
  description: { type: String, default: "" },
  proof_image_url: { type: String },
  station_alert_status: { type: String, default: 'Sent' },
  assigned_patrol_id: { type: String },
  secondary_stations: { type: Array, default: [] }
}, { timestamps: true });

const alertAuditLogSchema = new mongoose.Schema({
  alert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  note: { type: String }
}, { timestamps: true });

const watchlistSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  reason: { type: String, required: true },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiry_date: { type: Date }
}, { timestamps: true });

const restrictedZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius_meters: { type: Number, default: 500 },
  active: { type: Boolean, default: true },
  start_time: { type: Date },
  end_time: { type: Date }
}, { timestamps: true });

const sosLogSchema = new mongoose.Schema({
  officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number },
  lng: { type: Number },
  last_scan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan' }
}, { timestamps: true });

const policeStationSchema = new mongoose.Schema({
  station_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius_km: { type: Number, required: true },
  dashboard_id: { type: String, required: true, unique: true },
  contact_number: { type: String },
  district: { type: String },
  active: { type: Boolean, default: true }
}, { timestamps: true });
policeStationSchema.index({ location: '2dsphere' });

const stationAlertSchema = new mongoose.Schema({
  alert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  station_id: { type: String, required: true },
  status: { type: String, default: 'Sent' }, // Sent -> Acknowledged -> Assigned -> Patrol Dispatched -> Vehicle Located -> Resolved -> Closed
  assigned_officer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_patrol_id: { type: String },
  sent_at: { type: Date, default: Date.now },
  acknowledged_at: { type: Date },
  assigned_at: { type: Date },
  dispatched_at: { type: Date },
  resolved_at: { type: Date },
  closed_at: { type: Date }
}, { timestamps: true });

const patrolUnitSchema = new mongoose.Schema({
  patrol_id: { type: String, required: true, unique: true },
  station_id: { type: String, required: true },
  vehicle_details: { type: String, required: true },
  officer_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  live_latitude: { type: Number },
  live_longitude: { type: Number },
  availability: { type: String, default: 'Available' }, // Available / On Duty / Off Duty
  last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

const alertNotificationSchema = new mongoose.Schema({
  alert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  channel: { type: String, required: true }, // dashboard / SMS / FCM
  recipient: { type: String },
  sent_at: { type: Date, default: Date.now },
  delivered_at: { type: Date },
  acknowledged_at: { type: Date }
}, { timestamps: true });

const vehicleTrackingHistorySchema = new mongoose.Schema({
  plate: { type: String, required: true },
  image_url: { type: String },
  ocr_confidence: { type: Number },
  latitude: { type: Number },
  longitude: { type: Number },
  camera_id: { type: String },
  timestamp: { type: Date, default: Date.now },
  linked_alert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }
}, { timestamps: true });

// Transform _id to id
[userSchema, checkpointSchema, vehicleSchema, scanSchema, alertSchema, alertAuditLogSchema, watchlistSchema, restrictedZoneSchema, sosLogSchema, policeStationSchema, stationAlertSchema, patrolUnitSchema, alertNotificationSchema, vehicleTrackingHistorySchema].forEach(schema => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      if (ret.createdAt) {
        ret.created_at = ret.createdAt;
      }
      if (ret.updatedAt) {
        ret.updated_at = ret.updatedAt;
      }
      delete ret._id;
      delete ret.__v;
    }
  });
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Checkpoint: mongoose.model("Checkpoint", checkpointSchema),
  Vehicle: mongoose.model("Vehicle", vehicleSchema),
  Scan: mongoose.model("Scan", scanSchema),
  Alert: mongoose.model("Alert", alertSchema),
  AlertAuditLog: mongoose.model("AlertAuditLog", alertAuditLogSchema),
  Watchlist: mongoose.model("Watchlist", watchlistSchema),
  RestrictedZone: mongoose.model("RestrictedZone", restrictedZoneSchema),
  SosLog: mongoose.model("SosLog", sosLogSchema),
  PoliceStation: mongoose.model("PoliceStation", policeStationSchema),
  StationAlert: mongoose.model("StationAlert", stationAlertSchema),
  PatrolUnit: mongoose.model("PatrolUnit", patrolUnitSchema),
  AlertNotification: mongoose.model("AlertNotification", alertNotificationSchema),
  VehicleTrackingHistory: mongoose.model("VehicleTrackingHistory", vehicleTrackingHistorySchema)
};
