-- Create distributed locks table for preventing race conditions
-- Used to prevent concurrent SM-2 updates on flashcards and quiz questions

CREATE TABLE IF NOT EXISTS distributed_locks (
  lock_key TEXT PRIMARY KEY,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires_at
ON distributed_locks(expires_at);

-- Enable RLS
ALTER TABLE distributed_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to manage locks (they are application-level, not user-specific)
CREATE POLICY "Allow lock management" ON distributed_locks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Add a cleanup job to remove expired locks (can be triggered periodically)
-- This is a stored procedure that can be called via a cron job or edge function
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM distributed_locks
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
