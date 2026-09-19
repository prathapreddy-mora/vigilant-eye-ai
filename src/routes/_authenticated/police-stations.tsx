import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Edit2, Trash2, MapPin, Phone, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/police-stations")({
  head: () => ({ meta: [{ title: "Manage Police Stations — TruePlate AI" }] }),
  component: PoliceStationsManagement,
});

const MOCK_STAFF_BY_STATION: Record<string, Array<{ name: string; designation: string; phone: string; email: string }>> = {
  PS001: [
    { name: "K. Srinivasa Rao", designation: "Inspector of Police (SHO)", phone: "+91 94406 27318", email: "onetown@ongole.com" },
    { name: "M. Venkateswarlu", designation: "Sub-Inspector (SI)", phone: "+91 94906 19521", email: "si1.onetown@ongole.com" },
    { name: "D. Ramaiah", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56123", email: "asi.onetown@ongole.com" },
    { name: "P. Rajesh", designation: "Head Constable (HC-1022)", phone: "+91 99887 76655", email: "hc.rajesh@ongole.com" }
  ],
  PS002: [
    { name: "G. Venkateswara Rao", designation: "Inspector of Police (SHO)", phone: "+91 94406 27320", email: "twotown@ongole.com" },
    { name: "S. K. Mastan Vali", designation: "Sub-Inspector (SI)", phone: "+91 94906 19525", email: "si.twotown@ongole.com" },
    { name: "T. Chinna Rao", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56124", email: "asi.twotown@ongole.com" },
    { name: "K. Anil", designation: "Head Constable (HC-1420)", phone: "+91 98480 34567", email: "hc.anil@ongole.com" }
  ],
  PS003: [
    { name: "V. Suryanarayana", designation: "Inspector of Police (SHO)", phone: "+91 94406 27322", email: "taluka@ongole.com" },
    { name: "Ch. Prasad", designation: "Sub-Inspector (SI)", phone: "+91 94906 19530", email: "si.taluka@ongole.com" },
    { name: "R. Satish Kumar", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56125", email: "asi.taluka@ongole.com" },
    { name: "B. Suresh", designation: "Head Constable (HC-1150)", phone: "+91 99665 44332", email: "hc.suresh@ongole.com" }
  ],
  PS004: [
    { name: "R. Rambabu", designation: "Inspector of Police (SHO)", phone: "+91 94406 27324", email: "threetown@ongole.com" },
    { name: "Y. Koteswara Rao", designation: "Sub-Inspector (SI)", phone: "+91 94906 19535", email: "si.threetown@ongole.com" },
    { name: "A. Subbarao", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56126", email: "asi.threetown@ongole.com" },
    { name: "D. Srinivas", designation: "Head Constable (HC-1004)", phone: "+91 91234 56789", email: "hc.srinivas@ongole.com" }
  ],
  PS005: [
    { name: "T. Sreekanth", designation: "Inspector of Police (SHO)", phone: "+91 94406 27326", email: "chimakurthy@ongole.com" },
    { name: "P. Subhani", designation: "Sub-Inspector (SI)", phone: "+91 94906 19540", email: "si.chimakurthy@ongole.com" },
    { name: "M. Khader Basha", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56127", email: "asi.chimakurthy@ongole.com" },
    { name: "K. Murali", designation: "Head Constable (HC-1221)", phone: "+91 98490 12345", email: "hc.murali@ongole.com" }
  ],
  PS006: [
    { name: "K. Koteswara Rao", designation: "Inspector of Police (SHO)", phone: "+91 94406 27330", email: "kandukur@ongole.com" },
    { name: "G. Sivakumar", designation: "Sub-Inspector (SI)", phone: "+91 94906 19550", email: "si.kandukur@ongole.com" },
    { name: "V. Abraham", designation: "Assistant Sub-Inspector (ASI)", phone: "+91 85009 56128", email: "asi.kandukur@ongole.com" },
    { name: "B. Hari Babu", designation: "Head Constable (HC-1309)", phone: "+91 99551 12233", email: "hc.haribabu@ongole.com" }
  ]
};

function PoliceStationsManagement() {
  const [stations, setStations] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newStation, setNewStation] = useState({
    station_id: "",
    name: "",
    lat: "",
    lng: "",
    radius_km: "5",
    dashboard_id: "",
    contact_number: "",
    district: "",
    active: true
  });
  const [editingStation, setEditingStation] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("police_stations")
        .select("*")
        .order("station_id", { ascending: true });
      if (error) throw error;
      setStations(data ?? []);
    } catch (err: any) {
      toast.error("Failed to load police stations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.station_id || !newStation.name || !newStation.lat || !newStation.lng) {
      return toast.error("Please fill in all required fields");
    }
    setAdding(true);
    try {
      const latNum = parseFloat(newStation.lat);
      const lngNum = parseFloat(newStation.lng);
      
      const payload = {
        station_id: newStation.station_id,
        name: newStation.name,
        lat: latNum,
        lng: lngNum,
        location: {
          type: "Point",
          coordinates: [lngNum, latNum] // GeoJSON is [lng, lat]
        },
        radius_km: parseFloat(newStation.radius_km),
        dashboard_id: newStation.dashboard_id || `dash_${newStation.station_id.toLowerCase()}`,
        contact_number: newStation.contact_number,
        district: newStation.district || "Prakasam",
        active: newStation.active
      };

      const { error } = await supabase.from("police_stations").insert(payload);
      if (error) throw error;

      toast.success("Police Station added successfully!");
      setIsAddOpen(false);
      setNewStation({
        station_id: "",
        name: "",
        lat: "",
        lng: "",
        radius_km: "5",
        dashboard_id: "",
        contact_number: "",
        district: "",
        active: true
      });
      fetchStations();
    } catch (err: any) {
      toast.error("Failed to add police station: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;
    setSavingEdit(true);
    try {
      const latNum = parseFloat(editingStation.lat);
      const lngNum = parseFloat(editingStation.lng);

      const payload = {
        name: editingStation.name,
        lat: latNum,
        lng: lngNum,
        location: {
          type: "Point",
          coordinates: [lngNum, latNum]
        },
        radius_km: parseFloat(editingStation.radius_km),
        dashboard_id: editingStation.dashboard_id,
        contact_number: editingStation.contact_number,
        district: editingStation.district,
        active: editingStation.active
      };

      const { error } = await supabase
        .from("police_stations")
        .update(payload)
        .eq("id", editingStation.id);

      if (error) throw error;
      toast.success("Police Station updated successfully!");
      setEditingStation(null);
      fetchStations();
    } catch (err: any) {
      toast.error("Failed to update police station: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const { error } = await supabase.from("police_stations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Police station deleted successfully");
      fetchStations();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Command & Control: Police Stations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure police station jurisdictions, radius coverage, and dashboard room bindings.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="h-4 w-4" /> Add Station
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Register Police Station</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Station ID *</label>
                  <input
                    required
                    placeholder="PS001"
                    value={newStation.station_id}
                    onChange={e => setNewStation({ ...newStation, station_id: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Dashboard Room ID *</label>
                  <input
                    required
                    placeholder="dash_ps001"
                    value={newStation.dashboard_id}
                    onChange={e => setNewStation({ ...newStation, dashboard_id: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Station Name *</label>
                <input
                  required
                  placeholder="Ongole I Town PS"
                  value={newStation.name}
                  onChange={e => setNewStation({ ...newStation, name: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Latitude *</label>
                  <input
                    required
                    type="number"
                    step="0.000001"
                    placeholder="15.5032"
                    value={newStation.lat}
                    onChange={e => setNewStation({ ...newStation, lat: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Longitude *</label>
                  <input
                    required
                    type="number"
                    step="0.000001"
                    placeholder="80.0455"
                    value={newStation.lng}
                    onChange={e => setNewStation({ ...newStation, lng: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Jurisdiction Radius (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStation.radius_km}
                    onChange={e => setNewStation({ ...newStation, radius_km: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">District</label>
                  <input
                    placeholder="Prakasam"
                    value={newStation.district}
                    onChange={e => setNewStation({ ...newStation, district: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Contact Number</label>
                <input
                  placeholder="+91 85922 86100"
                  value={newStation.contact_number}
                  onChange={e => setNewStation({ ...newStation, contact_number: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={newStation.active}
                  onChange={e => setNewStation({ ...newStation, active: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="active" className="text-sm select-none">Active / Enabled</label>
              </div>

              <DialogFooter>
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full rounded-md bg-primary text-primary-foreground font-semibold py-2 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register Station
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className={cn("rounded-lg border border-border bg-surface/50 backdrop-blur overflow-hidden transition-all duration-300", selectedStation ? "lg:col-span-2" : "lg:col-span-3")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Station ID</th>
                    <th className="p-4">Station Name</th>
                    <th className="p-4">Coordinates (Lat, Lng)</th>
                    <th className="p-4">Coverage</th>
                    <th className="p-4">Dashboard Room</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {stations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No stations registered yet. Click "Add Station" to create one.
                      </td>
                    </tr>
                  ) : (
                    stations.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStation(s)}
                        className={cn(
                          "hover:bg-surface-2/20 cursor-pointer transition-all border-l-2",
                          selectedStation?.id === s.id
                            ? "bg-primary/5 border-l-primary"
                            : "border-l-transparent"
                        )}
                      >
                        <td className="p-4 font-mono font-bold text-primary">{s.station_id}</td>
                        <td className="p-4 font-semibold">{s.name}</td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-cyan-400" /> {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                          </div>
                        </td>
                        <td className="p-4 font-semibold">{s.radius_km} km radius</td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">{s.dashboard_id}</td>
                        <td className="p-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {s.contact_number || "N/A"}
                          </div>
                        </td>
                        <td className="p-4">
                          {s.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingStation({ ...s })}
                              className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Details Panel */}
          {selectedStation && (
            <div className="rounded-lg border border-border bg-surface/50 backdrop-blur p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="font-display font-bold text-base text-primary">{selectedStation.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    ID: {selectedStation.station_id} · {selectedStation.district} District
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStation(null)}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2.5 py-1 bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Active Duty Staff Directory
                </h4>

                <div className="space-y-2.5">
                  {(MOCK_STAFF_BY_STATION[selectedStation.station_id] || [
                    { name: "Station Officer In-Charge", designation: "Inspector (SHO)", phone: selectedStation.contact_number || "+91 85922 86100", email: `${selectedStation.station_id.toLowerCase()}@ongole.com` }
                  ]).map((staff, idx) => (
                    <div key={idx} className="rounded border border-border/40 bg-surface-2/30 p-3 space-y-2 hover:border-primary/20 transition-all">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{staff.name}</div>
                        <div className="text-xs text-primary font-medium mt-0.5">{staff.designation}</div>
                      </div>
                      <div className="pt-1.5 border-t border-border/20 flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground/75" />
                          <a href={`tel:${staff.phone.replace(/\s+/g, '')}`} className="hover:text-primary transition-colors">{staff.phone}</a>
                        </div>
                        {staff.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/75 font-mono">@</span>
                            <a href={`mailto:${staff.email}`} className="hover:text-primary transition-colors lowercase">{staff.email}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingStation && (
        <Dialog open={!!editingStation} onOpenChange={() => setEditingStation(null)}>
          <DialogContent className="max-w-md bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Police Station: {editingStation.station_id}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Station Name *</label>
                <input
                  required
                  placeholder="Ongole I Town PS"
                  value={editingStation.name}
                  onChange={e => setEditingStation({ ...editingStation, name: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Latitude *</label>
                  <input
                    required
                    type="number"
                    step="0.000001"
                    placeholder="15.5032"
                    value={editingStation.lat}
                    onChange={e => setEditingStation({ ...editingStation, lat: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Longitude *</label>
                  <input
                    required
                    type="number"
                    step="0.000001"
                    placeholder="80.0455"
                    value={editingStation.lng}
                    onChange={e => setEditingStation({ ...editingStation, lng: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Jurisdiction Radius (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingStation.radius_km}
                    onChange={e => setEditingStation({ ...editingStation, radius_km: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">District</label>
                  <input
                    placeholder="Prakasam"
                    value={editingStation.district}
                    onChange={e => setEditingStation({ ...editingStation, district: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Contact Number</label>
                <input
                  placeholder="+91 85922 86100"
                  value={editingStation.contact_number}
                  onChange={e => setEditingStation({ ...editingStation, contact_number: e.target.value })}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editingStation.active}
                  onChange={e => setEditingStation({ ...editingStation, active: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="edit-active" className="text-sm select-none">Active / Enabled</label>
              </div>

              <DialogFooter className="gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-md bg-primary text-primary-foreground font-semibold px-4 py-2 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
