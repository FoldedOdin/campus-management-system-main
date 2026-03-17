-- Add College Event Requests feature (winner submits, admin approves)

CREATE TABLE IF NOT EXISTS college_event_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  winner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_title VARCHAR(255) NOT NULL,
  event_description TEXT,
  proposed_date TIMESTAMP,
  admin_notes TEXT,
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_college_event_requests_candidate ON college_event_requests(winner_candidate_id);
CREATE INDEX IF NOT EXISTS idx_college_event_requests_user ON college_event_requests(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_college_event_requests_status ON college_event_requests(status);

ALTER TABLE college_event_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Winners can view own college event requests" ON college_event_requests;
CREATE POLICY "Winners can view own college event requests" ON college_event_requests
  FOR SELECT USING (
    auth.uid()::text = winner_user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Winners can create college event requests" ON college_event_requests;
CREATE POLICY "Winners can create college event requests" ON college_event_requests
  FOR INSERT WITH CHECK (
    auth.uid()::text = winner_user_id::text
    AND EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = winner_candidate_id
      AND c.user_id = winner_user_id
    )
  );

DROP POLICY IF EXISTS "Admins can update college event requests" ON college_event_requests;
CREATE POLICY "Admins can update college event requests" ON college_event_requests
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
