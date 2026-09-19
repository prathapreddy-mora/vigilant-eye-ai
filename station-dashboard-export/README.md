# Station Control Dashboard Component Export

This folder contains a fully isolated, standalone React implementation of the **Station Control Dashboard** with real-time WebSocket alerts and Leaflet map tracking. You can export this folder directly and drop it into another React/Next.js/Vite project.

## Directory Structure
```
station-dashboard-export/
  ├── components/
  │    ├── MapView.tsx    # Leaflet Map tracking component (uses dynamic imports)
  │    └── dialog.tsx     # Radix-ui dialog/modal components
  ├── index.tsx           # Main StationDashboard React component
  ├── utils.ts            # Styling class merger helper (cn)
  └── README.md           # This Integration Guide
```

---

## 1. Prerequisites & Dependencies

To use this component in your destination project, make sure to install the following package dependencies:

```bash
# Core styles & Icons
npm install lucide-react clsx tailwind-merge sonner

# Real-time WebSocket connection
npm install socket.io-client

# Map tracking library (used inside MapView)
npm install leaflet @types/leaflet

# Radix UI Dialog primitives (used for Dispatch and Track Modals)
npm install @radix-ui/react-dialog
```

---

## 2. Integration Example

Import the `StationDashboard` component and supply your initialized `supabase` client instance and `socketUrl` endpoint:

```tsx
import { StationDashboard } from "./station-dashboard-export";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize your client 
const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY");

export default function MyDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <StationDashboard 
        supabaseClient={supabase}
        socketUrl="http://127.0.0.1:5000" // Your Node.js express socket.io server
        allowedEmails={[
          "taluka@ongole.com",
          "onetown@ongole.com",
          "twotown@ongole.com"
        ]}
      />
    </div>
  );
}
```

---

## 3. Configuration Props

| Prop | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `supabaseClient` | `any` | **Yes** | Your active Supabase client instance (or a mock conforming to standard supabase client syntax). |
| `socketUrl` | `string` | No | Express Socket.io backend server URL. Defaults to `'http://127.0.0.1:5000'`. |
| `allowedEmails` | `string[]` | No | Access restriction whitelist array. Defaults to the 6 seeded Prakasam/Ongole station SHO emails. |
| `onUnauthorized` | `() => void` | No | Callback triggered if the logged-in user does not belong to the whitelisted emails. |

---

## 4. Backend Database Schemas (MongoDB / Mongoose)

If you are setting up your own backend database, configure the schemas with the following field structures:

### Alert Schema
```javascript
const alertSchema = new mongoose.Schema({
  scan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan' },
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  plate: { type: String, required: true },
  reasons: { type: [String], default: [] },
  risk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  risk_score: { type: Number, default: 50 },
  state: { type: String, default: 'active' }, // 'active' or 'resolved'
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number },
  lng: { type: Number },
  image_url: { type: String },
  proof_image_url: { type: String }, // Base64 or URL capture proof 
  summary: { type: String },
  closed_at: { type: Date },
  routed_station_id: { type: String }, // e.g., 'PS001'
  routed_station_name: { type: String }, // e.g., 'Ongole I Town Police Station'
  distance_km: { type: Number },
  description: { type: String, default: "" }, // Case Notes input
  station_alert_status: { type: String, default: 'Sent' }, // 'Sent', 'Acknowledged', 'Vehicle Located / Intercepted', 'Closed'
  assigned_patrol_id: { type: String }, // Dispatched patrol unit name
  secondary_stations: { type: Array, default: [] }
}, { timestamps: true });
```

### Patrol Unit Schema
```javascript
const patrolUnitSchema = new mongoose.Schema({
  patrol_id: { type: String, required: true, unique: true }, // e.g., 'PT001'
  station_id: { type: String, required: true }, // e.g., 'PS001'
  vehicle_details: { type: String, required: true }, // e.g., 'Mahindra Scorpio (AP27P1234)'
  availability: { type: String, enum: ['Available', 'On Duty', 'Offline'], default: 'Available' }
});
```

### User Schema (Police Officers / Admins)
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Encrypted
  role: { type: String, default: 'user' }, // 'admin' or 'user' (station officer)
  station_id: { type: String } // Associated station ID for filtering (e.g. 'PS001')
});
```

---

## 5. Express API Specifications (`POST /api/supabase`)

The mock `supabaseClient` performs updates by posting queries to `/api/supabase`. The JSON payload structure for updates is:

```json
{
  "table": "alerts",
  "action": "update",
  "data": {
    "station_alert_status": "Vehicle Located / Intercepted",
    "proof_image_url": "data:image/jpeg;base64,..."
  },
  "filters": [
    { "type": "eq", "col": "id", "val": "ALERT_ID" }
  ]
}
```

Make sure your backend endpoint supports:
1. **Dynamic updates** to `alerts` table for `station_alert_status`, `description` (case description), `proof_image_url`, and `assigned_patrol_id`.
2. **Dynamic updates** to `patrol_units` availability state when dispatched (`On Duty`) or resolved (`Available`).
3. **Socket.io Broadcasting**: When status changes occur (e.g., alert acknowledged, patrol dispatched, or vehicle captured), broadcast the changes to the room:
   * `io.to('central').emit('alert_updated', updatedAlert);`
   * `io.to('station:PS001').emit('alert_updated', updatedAlert);`

