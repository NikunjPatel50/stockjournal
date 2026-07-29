-- Cloud backup for journal trades (synced from browser localStorage per user)

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS journal_trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS journal_trades_updated_at TIMESTAMPTZ;
