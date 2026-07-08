
-- Anyone (anon + authenticated) can view files in the bucket
DROP POLICY IF EXISTS "missionary-photos public read" ON storage.objects;
CREATE POLICY "missionary-photos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'missionary-photos');

-- Admin or scoped coordinator can INSERT
-- Path convention: <missionary_id>/<filename>
DROP POLICY IF EXISTS "missionary-photos scoped insert" ON storage.objects;
CREATE POLICY "missionary-photos scoped insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'missionary-photos'
    AND (
      public.has_role(auth.uid(),'admin')
      OR (
        public.has_role(auth.uid(),'coordinator')
        AND public.is_coordinator_of_missionary(auth.uid(), (storage.foldername(name))[1])
      )
    )
  );

DROP POLICY IF EXISTS "missionary-photos scoped update" ON storage.objects;
CREATE POLICY "missionary-photos scoped update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'missionary-photos'
    AND (
      public.has_role(auth.uid(),'admin')
      OR (
        public.has_role(auth.uid(),'coordinator')
        AND public.is_coordinator_of_missionary(auth.uid(), (storage.foldername(name))[1])
      )
    )
  );

DROP POLICY IF EXISTS "missionary-photos admin delete" ON storage.objects;
CREATE POLICY "missionary-photos admin delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'missionary-photos' AND public.has_role(auth.uid(),'admin'));
