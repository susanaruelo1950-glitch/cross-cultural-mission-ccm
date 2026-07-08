
-- Public read for ministry-updates bucket; admin/coordinator write
DROP POLICY IF EXISTS "Ministry updates images readable by anyone" ON storage.objects;
CREATE POLICY "Ministry updates images readable by anyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'ministry-updates');

DROP POLICY IF EXISTS "Admin/coordinator can upload ministry updates images" ON storage.objects;
CREATE POLICY "Admin/coordinator can upload ministry updates images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ministry-updates'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
  );

DROP POLICY IF EXISTS "Admin/coordinator can update ministry updates images" ON storage.objects;
CREATE POLICY "Admin/coordinator can update ministry updates images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ministry-updates'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
  );

DROP POLICY IF EXISTS "Admin can delete ministry updates images" ON storage.objects;
CREATE POLICY "Admin can delete ministry updates images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ministry-updates' AND public.has_role(auth.uid(), 'admin')
  );
