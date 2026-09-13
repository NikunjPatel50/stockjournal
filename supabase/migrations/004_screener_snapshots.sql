-- Daily EOD snapshots for the admin Indian sector screener.
CREATE TABLE public.screener_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  session_date DATE NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX screener_snapshots_session_date_idx
  ON public.screener_snapshots (session_date DESC);

ALTER TABLE public.screener_snapshots ENABLE ROW LEVEL SECURITY;
