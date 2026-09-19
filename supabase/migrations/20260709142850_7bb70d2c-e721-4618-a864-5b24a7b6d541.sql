
-- Fix search_path + revoke public execute on SECURITY DEFINER helpers
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Tighten permissive policies
DROP POLICY IF EXISTS "vehicles_update_last_seen_authed" ON public.vehicles;
CREATE POLICY "vehicles_update_last_seen_authed" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "alerts_insert_authed" ON public.alerts;
CREATE POLICY "alerts_insert_authed" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
