import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Officer Profile — TruePlate AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    employee_number: "",
    badge_number: "",
    station: "",
    phone: "",
    email: "",
    role: "constable"
  });

  const [passwords, setPasswords] = useState({
    new_password: "",
    confirm: ""
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      setProfile({
        full_name: pData?.full_name || "",
        employee_number: pData?.station_id || "", // Mapping station_id as employee number for now
        badge_number: pData?.badge_number || "",
        station: "Central Hub", // Dummy station
        phone: pData?.phone || "",
        email: user.email || "",
        role: pData?.role || "constable"
      });
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        badge_number: profile.badge_number,
        phone: profile.phone,
        station_id: profile.employee_number
      });
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      return toast.error("Passwords do not match");
    }
    setPassSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswords({ new_password: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPassSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Officer Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your identity, station and credentials.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight uppercase">{profile.full_name || "DUMMY"}</div>
            <div className="text-sm text-muted-foreground">· Roles: {profile.role}</div>
          </div>
        </div>
        <button className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-2 transition-colors">
          Upload photo
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
            <input required value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee Number</label>
            <input value={profile.employee_number} onChange={e => setProfile({...profile, employee_number: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badge Number</label>
            <input value={profile.badge_number} onChange={e => setProfile({...profile, badge_number: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station</label>
            <input value={profile.station} onChange={e => setProfile({...profile, station: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
            <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input disabled value={profile.email} className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full bg-[#0047b3] text-white rounded-md py-3 font-semibold shadow hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
        </button>
      </form>

      <form onSubmit={handleUpdatePassword} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-foreground">Change Password</h3>
        <div className="space-y-3">
          <input type="password" required placeholder="New password" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
          <input type="password" required placeholder="Confirm" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm focus:border-primary outline-none transition-colors" />
        </div>
        <button type="submit" disabled={passSaving} className="bg-[#0047b3] text-white rounded-md px-6 py-2.5 font-semibold text-sm shadow hover:opacity-90 transition-opacity flex items-center gap-2">
          {passSaving && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
        </button>
      </form>
    </div>
  );
}
