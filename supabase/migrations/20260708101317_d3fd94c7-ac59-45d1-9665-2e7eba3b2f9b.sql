
-- 1) areas.coordinator_name — drop the publicly exposed personal name
ALTER TABLE public.areas DROP COLUMN IF EXISTS coordinator_name;

-- 2) prayer_events — restrict reads to authenticated users
DROP POLICY IF EXISTS "Prayer events readable by anyone" ON public.prayer_events;
REVOKE SELECT ON public.prayer_events FROM anon;
CREATE POLICY "Prayer events readable by authenticated users"
  ON public.prayer_events FOR SELECT
  TO authenticated
  USING (true);

-- 3) prayer_requests_db — restrict reads to authenticated users
DROP POLICY IF EXISTS "Prayer requests readable by anyone" ON public.prayer_requests_db;
REVOKE SELECT ON public.prayer_requests_db FROM anon;
CREATE POLICY "Prayer requests readable by authenticated users"
  ON public.prayer_requests_db FOR SELECT
  TO authenticated
  USING (true);

-- 4) profiles — owner-only reads (admins retain full read via has_role)
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
