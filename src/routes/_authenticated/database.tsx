import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database, Plus, RefreshCw, Upload, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/database")({
  head: () => ({ meta: [{ title: "Database Management — TruePlate AI" }] }),
  component: DatabaseManagement,
});

function DatabaseManagement() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [newVehicle, setNewVehicle] = useState({
    plate: "", owner_name: "", brand: "", model: "", color: "", vehicle_type: "Four Wheeler",
    ownership: "1st Owner", rto_office: "", fuel_type: "Petrol", engine_no: "", chassis_no: "",
    fake_plate: false, duplicate_plate: false, suspicious: false, status: "active",
    insurance_valid: true, puc_valid: true, fitness_valid: true, road_tax_paid: true,
    pending_challans: 0, challan_amount: 0, criminal_cases: "", registration_validity: ""
  });

  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    let query = supabase.from("vehicles").select("*").order("created_at", { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load database: " + error.message);
    } else {
      let results = data ?? [];
      if (q.trim()) {
        const term = q.trim().toLowerCase();
        const plateTerm = term.replace(/\s+/g, '');
        results = results.filter(v => 
          (v.plate || '').toLowerCase().includes(plateTerm) ||
          (v.owner_name || '').toLowerCase().includes(term) ||
          (v.brand || '').toLowerCase().includes(term) ||
          (v.model || '').toLowerCase().includes(term)
        );

        // If no matches found and input looks like a valid plate number, fetch/generate dynamically from DB
        if (results.length === 0 && /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(plateTerm.toUpperCase())) {
          const { data: dynamicVal } = await supabase.from("vehicles").select("*").eq("plate", plateTerm.toUpperCase()).maybeSingle();
          if (dynamicVal) {
            results = [dynamicVal];
          }
        }
      }
      setVehicles(results);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [q]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { error } = await supabase.from("vehicles").insert({
        ...newVehicle,
        criminal_cases: newVehicle.criminal_cases ? newVehicle.criminal_cases.split(",").map((s: string) => s.trim()) : [],
        registration_validity: newVehicle.registration_validity ? new Date(newVehicle.registration_validity).toISOString() : null,
        plate: newVehicle.plate.toUpperCase(),
        pending_challans: parseInt(newVehicle.pending_challans as any) || 0,
        challan_amount: parseInt(newVehicle.challan_amount as any) || 0
      });
      if (error) throw error;
      toast.success("Vehicle added successfully!");
      setIsAddModalOpen(false);
      setNewVehicle({ 
        plate: "", owner_name: "", brand: "", model: "", color: "", vehicle_type: "Four Wheeler",
        ownership: "1st Owner", rto_office: "", fuel_type: "Petrol", engine_no: "", chassis_no: "",
        fake_plate: false, duplicate_plate: false, suspicious: false, status: "active",
        insurance_valid: true, puc_valid: true, fitness_valid: true, road_tax_paid: true,
        pending_challans: 0, challan_amount: 0, criminal_cases: "", registration_validity: ""
      });
      fetchVehicles();
    } catch (err: any) {
      toast.error("Error adding vehicle: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setSavingEdit(true);
    try {
      const payload = {
        ...editingVehicle,
        criminal_cases: typeof editingVehicle.criminal_cases === 'string' 
          ? editingVehicle.criminal_cases.split(",").map((s: string) => s.trim()).filter(Boolean)
          : editingVehicle.criminal_cases,
        registration_validity: editingVehicle.registration_validity ? new Date(editingVehicle.registration_validity).toISOString() : null,
        pending_challans: parseInt(editingVehicle.pending_challans as any) || 0,
        challan_amount: parseInt(editingVehicle.challan_amount as any) || 0
      };
      // Prevent updating immutable ID
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id);
      
      if (error) throw error;
      toast.success("Vehicle updated successfully!");
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      toast.error("Error updating vehicle: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVehicle = async (id: string, plate: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete vehicle ${plate}?`)) return;
    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Vehicle deleted successfully!");
      fetchVehicles();
    } catch (err: any) {
      toast.error("Error deleting vehicle: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2 text-primary">
            <Database className="h-7 w-7" /> Vehicle Database
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all registered vehicle records across the RTO system.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchVehicles} className="p-2 border border-border rounded-md hover:bg-surface/50">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90 transition-opacity font-semibold">
                <Plus className="h-4 w-4" /> Add Vehicle
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-6 py-2">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary border-b pb-1">Basic Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Number Plate</label>
                      <input required value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none uppercase" placeholder="e.g. AP27BB1234" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Owner Name</label>
                      <input required value={newVehicle.owner_name} onChange={e => setNewVehicle({...newVehicle, owner_name: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Ownership</label>
                      <input value={newVehicle.ownership} onChange={e => setNewVehicle({...newVehicle, ownership: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. 1st Owner" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">RTO Office</label>
                      <input value={newVehicle.rto_office} onChange={e => setNewVehicle({...newVehicle, rto_office: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Hyderabad" />
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary border-b pb-1">Vehicle Specifications</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Brand</label>
                      <input required value={newVehicle.brand} onChange={e => setNewVehicle({...newVehicle, brand: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Honda" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Model</label>
                      <input required value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. City" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Color</label>
                      <input required value={newVehicle.color} onChange={e => setNewVehicle({...newVehicle, color: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. White" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Vehicle Type</label>
                      <select value={newVehicle.vehicle_type} onChange={e => setNewVehicle({...newVehicle, vehicle_type: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none">
                        <option>Two Wheeler</option>
                        <option>Four Wheeler</option>
                        <option>Heavy Vehicle</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Fuel Type</label>
                      <select value={newVehicle.fuel_type} onChange={e => setNewVehicle({...newVehicle, fuel_type: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none">
                        <option>Petrol</option><option>Diesel</option><option>Electric</option><option>CNG</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Engine No</label>
                      <input value={newVehicle.engine_no} onChange={e => setNewVehicle({...newVehicle, engine_no: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Chassis No</label>
                      <input value={newVehicle.chassis_no} onChange={e => setNewVehicle({...newVehicle, chassis_no: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary border-b pb-1">Compliance & Challans</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-xs font-medium">Insurance</label>
                      <select value={newVehicle.insurance_valid ? "yes" : "no"} onChange={e => setNewVehicle({...newVehicle, insurance_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                        <option value="yes">Valid</option><option value="no">Expired</option>
                      </select>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-xs font-medium">PUC</label>
                      <select value={newVehicle.puc_valid ? "yes" : "no"} onChange={e => setNewVehicle({...newVehicle, puc_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                        <option value="yes">Valid</option><option value="no">Expired</option>
                      </select>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-xs font-medium">Fitness</label>
                      <select value={newVehicle.fitness_valid ? "yes" : "no"} onChange={e => setNewVehicle({...newVehicle, fitness_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                        <option value="yes">Valid</option><option value="no">Expired</option>
                      </select>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-xs font-medium">Road Tax</label>
                      <select value={newVehicle.road_tax_paid ? "yes" : "no"} onChange={e => setNewVehicle({...newVehicle, road_tax_paid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                        <option value="yes">Paid</option><option value="no">Unpaid</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-medium">Registration Validity</label>
                      <input type="date" value={newVehicle.registration_validity} onChange={e => setNewVehicle({...newVehicle, registration_validity: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Challans Count</label>
                      <input type="number" value={newVehicle.pending_challans} onChange={e => setNewVehicle({...newVehicle, pending_challans: e.target.value as any})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" min="0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Challans (₹)</label>
                      <input type="number" value={newVehicle.challan_amount} onChange={e => setNewVehicle({...newVehicle, challan_amount: e.target.value as any})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" min="0" />
                    </div>
                  </div>
                </div>

                {/* Flags */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-destructive border-b pb-1">System Flags</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Database Status</label>
                      <select value={newVehicle.status} onChange={e => setNewVehicle({...newVehicle, status: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none font-semibold">
                        <option value="active">Active</option>
                        <option value="stolen">Stolen</option>
                        <option value="blacklisted">Blacklisted</option>
                        <option value="under_investigation">Under Investigation</option>
                      </select>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={newVehicle.fake_plate} onChange={e => setNewVehicle({...newVehicle, fake_plate: e.target.checked})} className="rounded border-gray-300" />
                        Fake Plate
                      </label>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={newVehicle.duplicate_plate} onChange={e => setNewVehicle({...newVehicle, duplicate_plate: e.target.checked})} className="rounded border-gray-300" />
                        Duplicate Plate
                      </label>
                    </div>
                    <div className="space-y-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={newVehicle.suspicious} onChange={e => setNewVehicle({...newVehicle, suspicious: e.target.checked})} className="rounded border-gray-300" />
                        Suspicious
                      </label>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-medium">Criminal Cases (comma separated)</label>
                      <input value={newVehicle.criminal_cases} onChange={e => setNewVehicle({...newVehicle, criminal_cases: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Hit and Run, Speeding" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90 font-semibold flex items-center gap-2">
                    {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Vehicle
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Modal */}
          <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Vehicle</DialogTitle>
              </DialogHeader>
              {editingVehicle && (
                <form onSubmit={handleEditVehicle} className="space-y-6 py-2">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-1">Basic Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Number Plate</label>
                        <input disabled value={editingVehicle.plate} className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-muted-foreground uppercase" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Owner Name</label>
                        <input required value={editingVehicle.owner_name} onChange={e => setEditingVehicle({...editingVehicle, owner_name: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Ownership</label>
                        <input value={editingVehicle.ownership || ""} onChange={e => setEditingVehicle({...editingVehicle, ownership: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">RTO Office</label>
                        <input value={editingVehicle.rto_office || ""} onChange={e => setEditingVehicle({...editingVehicle, rto_office: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-1">Vehicle Specifications</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Brand</label>
                        <input required value={editingVehicle.brand} onChange={e => setEditingVehicle({...editingVehicle, brand: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Model</label>
                        <input required value={editingVehicle.model} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Color</label>
                        <input required value={editingVehicle.color} onChange={e => setEditingVehicle({...editingVehicle, color: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Vehicle Type</label>
                        <select value={editingVehicle.vehicle_type || ""} onChange={e => setEditingVehicle({...editingVehicle, vehicle_type: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none">
                          <option>Two Wheeler</option><option>Four Wheeler</option><option>Heavy Vehicle</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Fuel Type</label>
                        <select value={editingVehicle.fuel_type || ""} onChange={e => setEditingVehicle({...editingVehicle, fuel_type: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none">
                          <option>Petrol</option><option>Diesel</option><option>Electric</option><option>CNG</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Engine No</label>
                        <input value={editingVehicle.engine_no || ""} onChange={e => setEditingVehicle({...editingVehicle, engine_no: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Chassis No</label>
                        <input value={editingVehicle.chassis_no || ""} onChange={e => setEditingVehicle({...editingVehicle, chassis_no: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Compliance */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-1">Compliance & Challans</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2 flex flex-col">
                        <label className="text-xs font-medium">Insurance</label>
                        <select value={editingVehicle.insurance_valid ? "yes" : "no"} onChange={e => setEditingVehicle({...editingVehicle, insurance_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                          <option value="yes">Valid</option><option value="no">Expired</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-xs font-medium">PUC</label>
                        <select value={editingVehicle.puc_valid ? "yes" : "no"} onChange={e => setEditingVehicle({...editingVehicle, puc_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                          <option value="yes">Valid</option><option value="no">Expired</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-xs font-medium">Fitness</label>
                        <select value={editingVehicle.fitness_valid ? "yes" : "no"} onChange={e => setEditingVehicle({...editingVehicle, fitness_valid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                          <option value="yes">Valid</option><option value="no">Expired</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <label className="text-xs font-medium">Road Tax</label>
                        <select value={editingVehicle.road_tax_paid ? "yes" : "no"} onChange={e => setEditingVehicle({...editingVehicle, road_tax_paid: e.target.value === "yes"})} className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm focus:border-primary outline-none">
                          <option value="yes">Paid</option><option value="no">Unpaid</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-medium">Registration Validity</label>
                        <input type="date" value={editingVehicle.registration_validity ? new Date(editingVehicle.registration_validity).toISOString().split('T')[0] : ""} onChange={e => setEditingVehicle({...editingVehicle, registration_validity: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Challans Count</label>
                        <input type="number" value={editingVehicle.pending_challans || 0} onChange={e => setEditingVehicle({...editingVehicle, pending_challans: e.target.value as any})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" min="0" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Challans (₹)</label>
                        <input type="number" value={editingVehicle.challan_amount || 0} onChange={e => setEditingVehicle({...editingVehicle, challan_amount: e.target.value as any})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" min="0" />
                      </div>
                    </div>
                  </div>

                  {/* Flags */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-destructive border-b pb-1">System Flags</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Database Status</label>
                        <select value={editingVehicle.status || "active"} onChange={e => setEditingVehicle({...editingVehicle, status: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none font-semibold">
                          <option value="active">Active</option><option value="stolen">Stolen</option><option value="blacklisted">Blacklisted</option><option value="under_investigation">Under Investigation</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={editingVehicle.fake_plate || false} onChange={e => setEditingVehicle({...editingVehicle, fake_plate: e.target.checked})} className="rounded border-gray-300" />
                          Fake Plate
                        </label>
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={editingVehicle.duplicate_plate || false} onChange={e => setEditingVehicle({...editingVehicle, duplicate_plate: e.target.checked})} className="rounded border-gray-300" />
                          Duplicate Plate
                        </label>
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox" checked={editingVehicle.suspicious || false} onChange={e => setEditingVehicle({...editingVehicle, suspicious: e.target.checked})} className="rounded border-gray-300" />
                          Suspicious
                        </label>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-medium">Criminal Cases (comma separated)</label>
                        <input value={typeof editingVehicle.criminal_cases === 'string' ? editingVehicle.criminal_cases : (editingVehicle.criminal_cases?.join(", ") || "")} onChange={e => setEditingVehicle({...editingVehicle, criminal_cases: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Hit and Run" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <button type="submit" disabled={savingEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90 font-semibold flex items-center gap-2">
                      {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 bg-surface/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by Plate or Owner..." 
              className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-md focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/80 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Plate No</th>
                <th className="px-6 py-4 font-semibold">Owner</th>
                <th className="px-6 py-4 font-semibold">Vehicle</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading database...</td>
                </tr>
              )}
              {!loading && vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No records found.</td>
                </tr>
              )}
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-foreground">{v.plate}</td>
                  <td className="px-6 py-4">{v.owner_name}</td>
                  <td className="px-6 py-4">{v.brand} {v.model} <span className="text-muted-foreground text-xs block">{v.color}</span></td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest ${
                      v.status === 'stolen' || v.status === 'blacklisted' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                      v.status === 'under_investigation' ? 'bg-warn/10 text-warn border border-warn/20' :
                      'bg-ok/10 text-ok border border-ok/20'
                    }`}>
                      {v.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => setEditingVehicle(v)} className="text-primary hover:underline font-medium text-sm">Edit</button>
                    <button onClick={() => handleDeleteVehicle(v.id, v.plate)} className="text-destructive hover:underline font-medium text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
