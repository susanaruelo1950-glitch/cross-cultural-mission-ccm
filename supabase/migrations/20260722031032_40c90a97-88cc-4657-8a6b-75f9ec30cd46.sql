
CREATE POLICY "Anyone can read partner logos" ON storage.objects FOR SELECT USING (bucket_id = 'partner-logos');
CREATE POLICY "Admins can upload partner logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'partner-logos' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update partner logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'partner-logos' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete partner logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'partner-logos' AND private.has_role(auth.uid(), 'admin'::app_role));
