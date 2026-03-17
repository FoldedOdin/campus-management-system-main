-- Fix: allow admin users to manage candidates and approve/reject requests under RLS
BEGIN;

DROP POLICY IF EXISTS "Admins can view all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can update candidate requests" ON public.candidate_requests;

CREATE POLICY "Admins can view all candidates" ON public.candidates
  FOR SELECT USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can insert candidates" ON public.candidates
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can update candidates" ON public.candidates
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete candidates" ON public.candidates
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can update candidate requests" ON public.candidate_requests
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

COMMIT;
