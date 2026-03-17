-- Fix: allow admin users to manage announcements under RLS
BEGIN;

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

CREATE POLICY "Admins can insert announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    AND auth.uid()::text = author_id::text
  );

CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

COMMIT;
