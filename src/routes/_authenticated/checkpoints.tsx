import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Map, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkpoints")({
  head: () => ({ meta: [{ title: "Manage Checkpoints — TruePlate AI" }] }),
  component: CheckpointsManagement,
});

function CheckpointsManagement() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCp, setNewCp] = useState({ name: "", city: "", map_link: "" });
  const [editingCp, setEditingCp] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCheckpoints = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("checkpoints").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load checkpoints: " + error.message);
    } else {
      setCheckpoints(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    
    // Try to extract lat/lng from google maps link if it contains an @ symbol (e.g. @15.5057,80.0499)
    let parsedLat = null;
    let parsedLng = null;
    const match = newCp.map_link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      parsedLat = parseFloat(match[1]);
      parsedLng = parseFloat(match[2]);
    }

    try {
      const { error } = await supabase.from("checkpoints").insert({
        name: newCp.name,
        city: newCp.city,
        lat: parsedLat,
        lng: parsedLng,
        // We will store the link in a new column or just ignore it if the DB isn't updated yet
      });
      if (error) throw error;
      toast.success("Checkpoint added successfully!");
      setIsAddOpen(false);
      setNewCp({ name: "", city: "", map_link: "" });
      fetchCheckpoints();
    } catch (err: any) {
      toast.error("Failed to add checkpoint: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;
    setSavingEdit(true);

    let parsedLat = editingCp.lat;
    let parsedLng = editingCp.lng;
    if (editingCp.map_link) {
      const match = editingCp.map_link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        parsedLat = parseFloat(match[1]);
        parsedLng = parseFloat(match[2]);
      }
    }

    try {
      const { error } = await supabase.from("checkpoints").update({
        name: editingCp.name,
        city: editingCp.city,
        lat: parsedLat,
        lng: parsedLng,
      }).eq("id", editingCp.id);
      
      if (error) throw error;
      toast.success("Checkpoint updated successfully!");
      setEditingCp(null);
      fetchCheckpoints();
    } catch (err: any) {
      toast.error("Failed to update checkpoint: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete checkpoint: ${name}?`)) return;
    try {
      const { error } = await supabase.from("checkpoints").delete().eq("id", id);
      if (error) throw error;
      toast.success("Checkpoint deleted successfully!");
      fetchCheckpoints();
    } catch (err: any) {
      toast.error("Failed to delete checkpoint: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2 text-primary">
            <MapPin className="h-7 w-7" /> Checkpoints
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage active deployment locations and restricted zones.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCheckpoints} className="p-2 border border-border rounded-md hover:bg-surface/50">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90 transition-opacity font-semibold">
                <Plus className="h-4 w-4" /> Add Checkpoint
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Checkpoint</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Checkpoint Name</label>
                  <input required value={newCp.name} onChange={e => setNewCp({...newCp, name: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Highway Toll Plaza" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City / District</label>
                  <input required value={newCp.city} onChange={e => setNewCp({...newCp, city: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="e.g. Ongole" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Maps Link</label>
                  <input required value={newCp.map_link} onChange={e => setNewCp({...newCp, map_link: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="Paste Google Maps URL here..." />
                  <p className="text-[10px] text-muted-foreground">The system will automatically extract coordinates from the link.</p>
                </div>
                <DialogFooter>
                  <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:opacity-90 font-semibold flex items-center gap-2">
                    {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Checkpoint
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Modal */}
          <Dialog open={!!editingCp} onOpenChange={(open) => !open && setEditingCp(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Checkpoint</DialogTitle>
              </DialogHeader>
              {editingCp && (
                <form onSubmit={handleEdit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Checkpoint Name</label>
                    <input required value={editingCp.name} onChange={e => setEditingCp({...editingCp, name: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City / District</label>
                    <input required value={editingCp.city} onChange={e => setEditingCp({...editingCp, city: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Location (Google Maps Link)</label>
                    <input value={editingCp.map_link || ""} onChange={e => setEditingCp({...editingCp, map_link: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:border-primary outline-none" placeholder="Leave blank to keep current location..." />
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/80 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Checkpoint Name</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && checkpoints.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading checkpoints...</td>
                </tr>
              )}
              {!loading && checkpoints.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No active checkpoints found.</td>
                </tr>
              )}
              {checkpoints.map((cp) => (
                <tr key={cp.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">{cp.name}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Map className="h-4 w-4 text-muted-foreground" />
                    {cp.lat && cp.lng ? (
                      <a 
                        href={`https://www.google.com/maps?q=${cp.lat},${cp.lng}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {cp.lat.toFixed(5)}, {cp.lng.toFixed(5)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic">Location unmapped</span>
                    )}
                    {cp.city && <span className="text-muted-foreground text-xs ml-1">({cp.city})</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest bg-ok/10 text-ok border border-ok/20">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => setEditingCp({...cp, map_link: ""})} className="text-primary hover:underline font-medium text-sm">Edit</button>
                    <button onClick={() => handleDelete(cp.id, cp.name)} className="text-destructive hover:underline font-medium text-sm">Delete</button>
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
