
ALTER TABLE public.moms ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "anon read mom-photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'mom-photos');
CREATE POLICY "anon insert mom-photos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'mom-photos');
CREATE POLICY "anon delete mom-photos" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'mom-photos');
