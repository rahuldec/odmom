
CREATE TABLE public.moms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('online','offline')),
  employee_name TEXT NOT NULL,
  location TEXT,
  summary TEXT,
  attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  discussion_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moms TO anon, authenticated;
GRANT ALL ON public.moms TO service_role;

ALTER TABLE public.moms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read moms" ON public.moms FOR SELECT USING (true);
CREATE POLICY "Public insert moms" ON public.moms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update moms" ON public.moms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete moms" ON public.moms FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER moms_set_updated_at BEFORE UPDATE ON public.moms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX moms_meeting_date_idx ON public.moms (meeting_date DESC);
CREATE INDEX moms_created_at_idx ON public.moms (created_at DESC);
