-- Product feedback submissions from authenticated users

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

REVOKE ALL ON public.feedback_submissions FROM anon;
GRANT SELECT, INSERT ON public.feedback_submissions TO authenticated;
