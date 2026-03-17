-- Add new candidate request fields for party symbol and candidate photo URL
ALTER TABLE candidate_requests
  ADD COLUMN IF NOT EXISTS symbol VARCHAR(120),
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

