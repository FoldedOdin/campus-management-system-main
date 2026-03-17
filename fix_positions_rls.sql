-- Fix: allow admin users to manage positions under RLS
BEGIN;

DROP POLICY IF EXISTS "Admins can insert positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can update positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can delete positions" ON public.positions;

CREATE POLICY "Admins can insert positions" ON public.positions
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can update positions" ON public.positions
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete positions" ON public.positions
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

COMMIT;
