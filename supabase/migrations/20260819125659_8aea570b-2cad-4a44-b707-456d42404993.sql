
ALTER TABLE public.moms
  ADD COLUMN IF NOT EXISTS signatures jsonb NOT NULL DEFAULT '{"employee": null, "client": null}'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mom-signatures', 'mom-signatures', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon read mom-signatures" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'mom-signatures');
CREATE POLICY "anon insert mom-signatures" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'mom-signatures');
CREATE POLICY "anon delete mom-signatures" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'mom-signatures');
