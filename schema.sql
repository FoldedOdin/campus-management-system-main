-- TrustVote Database Schema for Supabase
-- Execute this script in Supabase SQL Editor

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) CHECK (role IN (
    'student',
    'admin',
    'chairman',
    'staff_coordinator'
  )) DEFAULT 'student',
  student_id VARCHAR(100),
  department VARCHAR(255),
  year VARCHAR(50),
  phone VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Auto-create/sync public profile rows from Supabase Auth users
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    student_id,
    department,
    year,
    phone,
    verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NULLIF(NEW.raw_user_meta_data->>'student_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'department', ''),
    NULLIF(NEW.raw_user_meta_data->>'year', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), public.users.role),
    student_id = COALESCE(EXCLUDED.student_id, public.users.student_id),
    department = COALESCE(EXCLUDED.department, public.users.department),
    year = COALESCE(EXCLUDED.year, public.users.year),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    verified = EXCLUDED.verified,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- ========================================
-- 2. POSITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. CANDIDATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  party VARCHAR(255),
  manifesto TEXT,
  photo_url VARCHAR(500),
  vote_count INTEGER DEFAULT 0,
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);

-- ========================================
-- 4. VOTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_student ON votes(student_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_position ON votes(position_id);

-- ========================================
-- 4B. BLOCKCHAIN VOTE AUDIT TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS vote_blockchain_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL UNIQUE REFERENCES votes(id) ON DELETE CASCADE,
  tx_hash VARCHAR(100) NOT NULL UNIQUE,
  block_number BIGINT,
  commitment VARCHAR(66) NOT NULL,
  voter_nullifier VARCHAR(66) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  election_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vote_blockchain_audit_vote_id ON vote_blockchain_audit(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_blockchain_audit_tx_hash ON vote_blockchain_audit(tx_hash);

-- ========================================
-- 5. ANNOUNCEMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- ========================================
-- 6. ELECTION SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS election_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  allow_voting BOOLEAN DEFAULT FALSE,
  allow_candidate_requests BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. CANDIDATE REQUESTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS candidate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  party VARCHAR(255),
  symbol VARCHAR(120),
  photo_url VARCHAR(500),
  manifesto TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidate_requests_position ON candidate_requests(position_id);
CREATE INDEX IF NOT EXISTS idx_candidate_requests_user ON candidate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_requests_status ON candidate_requests(status);

-- ========================================
-- 8. COLLEGE EVENT REQUESTS TABLE
-- ========================================
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

-- ========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_blockchain_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_event_requests ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE RLS POLICIES
-- ========================================

-- Announcements - Anyone can view
CREATE POLICY "Anyone can view announcements" ON announcements
  FOR SELECT USING (TRUE);

-- Announcements - Admin can manage
CREATE POLICY "Admins can insert announcements" ON announcements
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    AND auth.uid()::text = author_id::text
  );

CREATE POLICY "Admins can update announcements" ON announcements
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete announcements" ON announcements
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- Candidates - Anyone can view approved candidates
CREATE POLICY "Anyone can view approved candidates" ON candidates
  FOR SELECT USING (status = 'approved');

-- Candidates - Admin can manage
CREATE POLICY "Admins can view all candidates" ON candidates
  FOR SELECT USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can insert candidates" ON candidates
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can update candidates" ON candidates
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete candidates" ON candidates
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- Votes - Students can only see their own votes, admins can view all votes
CREATE POLICY "Students can view their votes" ON votes
  FOR SELECT USING (
    auth.uid()::text = student_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Students can create votes" ON votes
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

CREATE POLICY "Admins can view all votes" ON votes
  FOR SELECT USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Students can view blockchain audit for own votes" ON vote_blockchain_audit;
CREATE POLICY "Students can view blockchain audit for own votes" ON vote_blockchain_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM votes v
      WHERE v.id = vote_id
      AND v.student_id::text = auth.uid()::text
    )
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Students can insert blockchain audit for own votes" ON vote_blockchain_audit;
CREATE POLICY "Students can insert blockchain audit for own votes" ON vote_blockchain_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM votes v
      WHERE v.id = vote_id
      AND v.student_id::text = auth.uid()::text
    )
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users - Users can view their own data
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- Users - Users can create/update their own profile
CREATE POLICY "Users can create their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Positions - Everyone can view
CREATE POLICY "Everyone can view positions" ON positions
  FOR SELECT USING (TRUE);

-- Positions - Admin can manage
CREATE POLICY "Admins can insert positions" ON positions
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can update positions" ON positions
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Admins can delete positions" ON positions
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- Election Settings - Everyone can view
CREATE POLICY "Everyone can view election settings" ON election_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert election settings" ON election_settings
  FOR INSERT WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update election settings" ON election_settings
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

CREATE POLICY "Admins can delete election settings" ON election_settings
  FOR DELETE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Candidate Requests - Users can view their own requests
CREATE POLICY "Users can view their candidate requests" ON candidate_requests
  FOR SELECT USING (
    auth.uid()::text = user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

CREATE POLICY "Users can create candidate requests" ON candidate_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can update candidate requests" ON candidate_requests
  FOR UPDATE USING (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

-- College Event Requests - Winner can create/view own requests, admin can review
CREATE POLICY "Winners can view own college event requests" ON college_event_requests
  FOR SELECT USING (
    auth.uid()::text = winner_user_id::text
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Winners can create college event requests" ON college_event_requests
  FOR INSERT WITH CHECK (
    auth.uid()::text = winner_user_id::text
    AND EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = winner_candidate_id
      AND c.user_id = winner_user_id
    )
  );

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

-- ========================================
-- DONE! ✅
-- ========================================
-- All tables and policies have been created.
-- Your Supabase database is ready for TrustVote!
