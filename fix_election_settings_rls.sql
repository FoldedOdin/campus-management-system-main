-- Fix: allow admin users to manage election_settings under RLS
BEGIN;

DROP POLICY IF EXISTS "Admins can insert election settings" ON public.election_settings;
DROP POLICY IF EXISTS "Admins can update election settings" ON public.election_settings;
DROP POLICY IF EXISTS "Admins can delete election settings" ON public.election_settings;

CREATE POLICY "Admins can insert election settings" ON public.election_settings
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update election settings" ON public.election_settings
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete election settings" ON public.election_settings
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

COMMIT;
