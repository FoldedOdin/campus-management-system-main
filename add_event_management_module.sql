-- Event Management Module
-- Run this in Supabase SQL Editor after schema.sql

CREATE TABLE IF NOT EXISTS campus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Cultural', 'Workshops/Seminar', 'Technical', 'Fest/College Day', 'Sports')),
  description TEXT,
  event_date TIMESTAMP,
  venue VARCHAR(255),
  organizer VARCHAR(255),
  registration_limit INTEGER,
  poster_url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published', 'completed')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campus_events_category ON campus_events(category);
CREATE INDEX IF NOT EXISTS idx_campus_events_status ON campus_events(status);
CREATE INDEX IF NOT EXISTS idx_campus_events_date ON campus_events(event_date);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_type VARCHAR(50) NOT NULL CHECK (registration_type IN ('individual', 'team')) DEFAULT 'individual',
  team_name VARCHAR(255),
  team_members JSONB,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'upi', 'card')),
  payment_reference VARCHAR(255),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  registration_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'selected', 'rejected', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations(user_id);

CREATE TABLE IF NOT EXISTS team_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  winner_position INTEGER NOT NULL,
  winner_name VARCHAR(255) NOT NULL,
  selected_members JSONB,
  declared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, winner_position)
);

CREATE TABLE IF NOT EXISTS event_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_url VARCHAR(500),
  certificate_status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (certificate_status IN ('issued', 'revoked')),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_certificates_user ON event_certificates(participant_user_id);

ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_certificates ENABLE ROW LEVEL SECURITY;

-- Campus events visibility:
-- Students can view approved/published/completed.
-- Chairman/admin/staff_coordinator can view all.
DROP POLICY IF EXISTS "View campus events by role" ON campus_events;
CREATE POLICY "View campus events by role" ON campus_events
  FOR SELECT USING (
    status IN ('approved', 'published', 'completed')
    OR auth.uid()::text = created_by::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'staff_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'staff_coordinator')
    )
  );

DROP POLICY IF EXISTS "Create campus events by role" ON campus_events;
CREATE POLICY "Create campus events by role" ON campus_events
  FOR INSERT WITH CHECK (
    auth.uid()::text = created_by::text
    AND (
      COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'staff_coordinator')
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'staff_coordinator'))
    )
  );

DROP POLICY IF EXISTS "Update campus events by role" ON campus_events;
CREATE POLICY "Update campus events by role" ON campus_events
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'staff_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'staff_coordinator')
    )
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'staff_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'staff_coordinator')
    )
  );
  );

DROP POLICY IF EXISTS "Delete campus events admin only" ON campus_events;
CREATE POLICY "Delete campus events admin only" ON campus_events
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "View own registrations or privileged" ON event_registrations;
CREATE POLICY "View own registrations or privileged" ON event_registrations
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  );

DROP POLICY IF EXISTS "Create own registrations" ON event_registrations;
CREATE POLICY "Create own registrations" ON event_registrations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Update registrations by privileged" ON event_registrations;
CREATE POLICY "Update registrations by privileged" ON event_registrations
  FOR UPDATE USING (
    auth.uid()::text = user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  )
  WITH CHECK (
    auth.uid()::text = user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  );

DROP POLICY IF EXISTS "View team results for all" ON team_results;
CREATE POLICY "View team results for all" ON team_results
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Manage team results by privileged" ON team_results;
CREATE POLICY "Manage team results by privileged" ON team_results
  FOR ALL USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  );

DROP POLICY IF EXISTS "View own certificates or privileged" ON event_certificates;
CREATE POLICY "View own certificates or privileged" ON event_certificates
  FOR SELECT USING (
    auth.uid()::text = participant_user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  );

DROP POLICY IF EXISTS "Issue certificates privileged" ON event_certificates;
CREATE POLICY "Issue certificates privileged" ON event_certificates
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'chairman', 'arts_secretary', 'sports_secretary', 'event_coordinator')
    )
    OR (
      (
        COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'staff_coordinator'
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'staff_coordinator')
      )
      AND EXISTS (
        SELECT 1 FROM campus_events ce
        WHERE ce.id = event_id AND ce.category = 'Workshops/Seminar'
      )
    )
  );
