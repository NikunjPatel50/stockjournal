-- Trade Pulse: one AI note per open position per calendar day.
CREATE TABLE public.trade_pulse_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  note TEXT NOT NULL,
  primary_signal TEXT NOT NULL
    CHECK (primary_signal IN ('volume', 'price', 'news', 'mixed')),
  pulse_date DATE NOT NULL,
  market_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  news_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trade_id, pulse_date)
);

CREATE INDEX trade_pulse_notes_user_pulse_date_idx
  ON public.trade_pulse_notes (user_id, pulse_date DESC);

CREATE INDEX trade_pulse_notes_user_trade_idx
  ON public.trade_pulse_notes (user_id, trade_id, pulse_date DESC);

ALTER TABLE public.trade_pulse_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select trade pulse notes"
  ON public.trade_pulse_notes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
