
DROP POLICY IF EXISTS "Profiles readable by anyone" ON public.profiles;

CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION private.is_coordinator_of_missionary(_uid uuid, _mid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coordinator_assignments ca
    JOIN public.missionary_area_map mam
      ON mam.area_id = ca.area_id
    WHERE ca.user_id = _uid AND mam.missionary_id = _mid
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_coordinator_of_missionary(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_coordinator_of_missionary(uuid, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can delete ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin can delete ministry updates" ON public.ministry_updates
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin or scoped coord insert ministry update" ON public.ministry_updates;
CREATE POLICY "Admin or scoped coord insert ministry update" ON public.ministry_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin or scoped coord update ministry update" ON public.ministry_updates;
CREATE POLICY "Admin or scoped coord update ministry update" ON public.ministry_updates
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin can delete prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin can delete prayer requests" ON public.prayer_requests_db
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin or scoped coord insert prayer request" ON public.prayer_requests_db;
CREATE POLICY "Admin or scoped coord insert prayer request" ON public.prayer_requests_db
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin or scoped coord update prayer request" ON public.prayer_requests_db;
CREATE POLICY "Admin or scoped coord update prayer request" ON public.prayer_requests_db
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "admin manages regions" ON public.regions;
CREATE POLICY "admin manages regions" ON public.regions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages provinces" ON public.provinces;
CREATE POLICY "admin manages provinces" ON public.provinces
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages phases" ON public.phases;
CREATE POLICY "admin manages phases" ON public.phases
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages areas" ON public.areas;
CREATE POLICY "admin manages areas" ON public.areas
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages map" ON public.missionary_area_map;
CREATE POLICY "admin manages map" ON public.missionary_area_map
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "self or admin view assignments" ON public.coordinator_assignments;
CREATE POLICY "self or admin view assignments" ON public.coordinator_assignments
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manages assignments" ON public.coordinator_assignments;
CREATE POLICY "admin manages assignments" ON public.coordinator_assignments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin or scoped coord insert photo" ON public.missionary_photos;
CREATE POLICY "admin or scoped coord insert photo" ON public.missionary_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "admin or scoped coord update photo" ON public.missionary_photos;
CREATE POLICY "admin or scoped coord update photo" ON public.missionary_photos
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::public.app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "admin delete photo" ON public.missionary_photos;
CREATE POLICY "admin delete photo" ON public.missionary_photos
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin/coordinator can upload ministry updates images" ON storage.objects;
CREATE POLICY "Admin/coordinator can upload ministry updates images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ministry-updates'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role)
         OR private.has_role(auth.uid(), 'coordinator'::public.app_role))
  );

DROP POLICY IF EXISTS "Admin/coordinator can update ministry updates images" ON storage.objects;
CREATE POLICY "Admin/coordinator can update ministry updates images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ministry-updates'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role)
         OR private.has_role(auth.uid(), 'coordinator'::public.app_role))
  );

DROP POLICY IF EXISTS "Admin can delete ministry updates images" ON storage.objects;
CREATE POLICY "Admin can delete ministry updates images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ministry-updates'
    AND private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%'
           OR qual ILIKE '%is_coordinator_of_missionary%' OR with_check ILIKE '%is_coordinator_of_missionary%')
      AND policyname NOT IN (
        'Admin/coordinator can upload ministry updates images',
        'Admin/coordinator can update ministry updates images',
        'Admin can delete ministry updates images'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "missionary-photos scoped insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'missionary-photos'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role)
         OR private.has_role(auth.uid(), 'coordinator'::public.app_role))
  );

CREATE POLICY "missionary-photos scoped update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'missionary-photos'
    AND (private.has_role(auth.uid(), 'admin'::public.app_role)
         OR private.has_role(auth.uid(), 'coordinator'::public.app_role))
  );

CREATE POLICY "missionary-photos admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'missionary-photos'
    AND private.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_coordinator_of_missionary(uuid, text);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
