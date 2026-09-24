PRAGMA foreign_keys = ON;

-- Opportunistic auth-rate-limit GC deletes by window_start. Keep that bounded as the
-- table grows so abuse traffic cannot turn cleanup into a full-table scan forever.
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window_start
ON auth_rate_limits(window_start);
