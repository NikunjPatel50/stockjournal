-- SwingTradingLog schema for Supabase (run in SQL Editor on a new project)

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD'
    CHECK (currency IN ('USD', 'EUR', 'GBP', 'INR', 'CAD')),
  starting_balance NUMERIC(18, 2) NOT NULL DEFAULT 10000,
  risk JSONB NOT NULL DEFAULT '{}'::jsonb,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  display JSONB NOT NULL DEFAULT '{}'::jsonb,
  journal_trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal_trades_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can insert settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can update settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can delete settings"
  ON public.user_settings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL
    CHECK (asset_class IN ('Equities', 'Options', 'Crypto', 'Forex')),
  direction TEXT NOT NULL
    CHECK (direction IN ('Long', 'Short')),
  outcome TEXT NOT NULL
    CHECK (outcome IN ('Win', 'Loss', 'Breakeven')),
  strategy TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  entry_price NUMERIC(18, 8) NOT NULL,
  exit_price NUMERIC(18, 8),
  quantity NUMERIC(18, 8) NOT NULL,
  fees NUMERIC(18, 4) NOT NULL DEFAULT 0,
  stop_loss NUMERIC(18, 8),
  profit_target NUMERIC(18, 8),
  pnl NUMERIC(18, 4) NOT NULL DEFAULT 0,
  roi NUMERIC(18, 6) NOT NULL DEFAULT 0,
  hold_time_hours NUMERIC(12, 4) NOT NULL DEFAULT 0,
  risk_reward TEXT NOT NULL DEFAULT '',
  planned_risk NUMERIC(18, 4) NOT NULL DEFAULT 0,
  realized_risk NUMERIC(18, 4) NOT NULL DEFAULT 0,
  mindset SMALLINT NOT NULL DEFAULT 3
    CHECK (mindset BETWEEN 1 AND 5),
  notes TEXT NOT NULL DEFAULT '',
  psychology TEXT[] NOT NULL DEFAULT '{}',
  screenshots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trades_user_id_idx ON public.trades (user_id);
CREATE INDEX trades_user_entry_date_idx ON public.trades (user_id, entry_date DESC);
CREATE INDEX trades_user_ticker_idx ON public.trades (user_id, ticker);

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select trades"
  ON public.trades FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can insert trades"
  ON public.trades FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can update trades"
  ON public.trades FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can delete trades"
  ON public.trades FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- trade_executions
-- ---------------------------------------------------------------------------
CREATE TABLE public.trade_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL,
  side TEXT NOT NULL
    CHECK (side IN ('Entry', 'Exit', 'Scale In', 'Scale Out')),
  price NUMERIC(18, 8) NOT NULL,
  quantity NUMERIC(18, 8) NOT NULL,
  fees NUMERIC(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trade_executions_trade_id_idx ON public.trade_executions (trade_id);
CREATE INDEX trade_executions_user_id_idx ON public.trade_executions (user_id);

CREATE TRIGGER trade_executions_updated_at
  BEFORE UPDATE ON public.trade_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select executions"
  ON public.trade_executions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can insert executions"
  ON public.trade_executions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can update executions"
  ON public.trade_executions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can delete executions"
  ON public.trade_executions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('financial', 'risk', 'habit')),
  category_label TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL
    CHECK (period IN ('monthly', 'quarterly', 'annual')),
  metric_type TEXT NOT NULL
    CHECK (metric_type IN ('profit', 'win_rate', 'max_loss', 'trade_count', 'streak_days')),
  current_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  target_value NUMERIC(18, 4) NOT NULL,
  start_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'behind', 'achieved', 'breached')),
  auto_track BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  daily_rate NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX goals_user_id_idx ON public.goals (user_id);
CREATE INDEX goals_user_period_idx ON public.goals (user_id, period);

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select goals"
  ON public.goals FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can insert goals"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can update goals"
  ON public.goals FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can delete goals"
  ON public.goals FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- discipline_rules
-- ---------------------------------------------------------------------------
CREATE TABLE public.discipline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX discipline_rules_user_id_idx ON public.discipline_rules (user_id);

CREATE TRIGGER discipline_rules_updated_at
  BEFORE UPDATE ON public.discipline_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.discipline_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can select discipline rules"
  ON public.discipline_rules FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can insert discipline rules"
  ON public.discipline_rules FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can update discipline rules"
  ON public.discipline_rules FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owners can delete discipline rules"
  ON public.discipline_rules FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- feedback_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Feature request',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_submissions_created_at_idx
  ON public.feedback_submissions (created_at DESC);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own feedback"
  ON public.feedback_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users can select own feedback"
  ON public.feedback_submissions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
