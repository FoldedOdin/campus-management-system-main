-- Run this in Supabase SQL editor to store blockchain vote proofs.
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

ALTER TABLE vote_blockchain_audit ENABLE ROW LEVEL SECURITY;

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
