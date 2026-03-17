-- Fix: allow admin users to read votes/results and make vote insert policy resilient
BEGIN;

DROP POLICY IF EXISTS "Students can view their votes" ON public.votes;
DROP POLICY IF EXISTS "Students can create votes" ON public.votes;
DROP POLICY IF EXISTS "Admins can view all votes" ON public.votes;

CREATE POLICY "Students can view their votes" ON public.votes
  FOR SELECT USING (
    auth.uid()::text = student_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Students can create votes" ON public.votes
  FOR INSERT WITH CHECK (
    auth.uid()::text = student_id::text
    OR (
      COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can view all votes" ON public.votes
  FOR SELECT USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

COMMIT;
