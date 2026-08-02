-- Anonymous chatbot lead capture (written via service role in server actions).
CREATE TABLE public.chatbot_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chatbot_leads_created_at_idx
  ON public.chatbot_leads (created_at DESC);

CREATE INDEX chatbot_leads_email_idx
  ON public.chatbot_leads (email);

ALTER TABLE public.chatbot_leads ENABLE ROW LEVEL SECURITY;
