
-- ============================================================
-- DIRECTORY: regions, provinces, phases, areas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regions TO anon, authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regions readable" ON public.regions;
CREATE POLICY "regions readable" ON public.regions FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages regions" ON public.regions;
CREATE POLICY "admin manages regions" ON public.regions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.provinces (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provinces TO anon, authenticated;
GRANT ALL ON public.provinces TO service_role;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "provinces readable" ON public.provinces;
CREATE POLICY "provinces readable" ON public.provinces FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages provinces" ON public.provinces;
CREATE POLICY "admin manages provinces" ON public.provinces FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phases TO anon, authenticated;
GRANT ALL ON public.phases TO service_role;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phases readable" ON public.phases;
CREATE POLICY "phases readable" ON public.phases FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages phases" ON public.phases;
CREATE POLICY "admin manages phases" ON public.phases FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.areas (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region_id TEXT REFERENCES public.regions(id) ON DELETE SET NULL,
  province_id TEXT REFERENCES public.provinces(id) ON DELETE SET NULL,
  description TEXT,
  coordinator_name TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.areas TO anon, authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "areas readable" ON public.areas;
CREATE POLICY "areas readable" ON public.areas FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages areas" ON public.areas;
CREATE POLICY "admin manages areas" ON public.areas FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- Missionary -> area map (used for RLS scoping)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missionary_area_map (
  missionary_id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missionary_area_map TO anon, authenticated;
GRANT ALL ON public.missionary_area_map TO service_role;
ALTER TABLE public.missionary_area_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "map readable" ON public.missionary_area_map;
CREATE POLICY "map readable" ON public.missionary_area_map FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages map" ON public.missionary_area_map;
CREATE POLICY "admin manages map" ON public.missionary_area_map FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- Coordinator assignments (which coordinator manages which areas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coordinator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_id)
);
GRANT SELECT ON public.coordinator_assignments TO authenticated;
GRANT ALL ON public.coordinator_assignments TO service_role;
ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "self or admin view assignments" ON public.coordinator_assignments;
CREATE POLICY "self or admin view assignments" ON public.coordinator_assignments FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin manages assignments" ON public.coordinator_assignments;
CREATE POLICY "admin manages assignments" ON public.coordinator_assignments FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- Missionary photos (photo override per missionary)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missionary_photos (
  missionary_id TEXT PRIMARY KEY,
  photo_url TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missionary_photos TO anon, authenticated;
GRANT ALL ON public.missionary_photos TO service_role;
ALTER TABLE public.missionary_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos readable" ON public.missionary_photos;
CREATE POLICY "photos readable" ON public.missionary_photos FOR SELECT USING (true);

-- ============================================================
-- Coordinator-scoping helper (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_coordinator_of_missionary(_uid UUID, _mid TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.missionary_area_map mam
    JOIN public.coordinator_assignments ca ON ca.area_id = mam.area_id
    WHERE mam.missionary_id = _mid AND ca.user_id = _uid
  );
$$;

DROP POLICY IF EXISTS "admin or scoped coord insert photo" ON public.missionary_photos;
CREATE POLICY "admin or scoped coord insert photo" ON public.missionary_photos FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );
DROP POLICY IF EXISTS "admin or scoped coord update photo" ON public.missionary_photos;
CREATE POLICY "admin or scoped coord update photo" ON public.missionary_photos FOR UPDATE
  USING (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );
DROP POLICY IF EXISTS "admin delete photo" ON public.missionary_photos;
CREATE POLICY "admin delete photo" ON public.missionary_photos FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- Tighten ministry_updates & prayer_requests_db policies to scoped coordinators
-- ============================================================
DROP POLICY IF EXISTS "Admin/coordinator can insert ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin or scoped coord insert ministry update" ON public.ministry_updates FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );
DROP POLICY IF EXISTS "Admin/coordinator can update ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin or scoped coord update ministry update" ON public.ministry_updates FOR UPDATE
  USING (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin/coordinator can insert prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin or scoped coord insert prayer request" ON public.prayer_requests_db FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );
DROP POLICY IF EXISTS "Admin/coordinator can update prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin or scoped coord update prayer request" ON public.prayer_requests_db FOR UPDATE
  USING (
    public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'coordinator') AND public.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

-- ============================================================
-- SEED: regions, provinces, phases, areas, missionary_area_map
-- ============================================================
INSERT INTO public.regions (id, name) VALUES
  ('region-xii','SOCCSKSARGEN (Region XII)'),
  ('region-xi','Davao Region (Region XI)'),
  ('barmm','BARMM')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.provinces (id, region_id, name) VALUES
  ('sultan-kudarat','region-xii','Sultan Kudarat'),
  ('sarangani','region-xii','Sarangani'),
  ('cotabato','region-xii','Cotabato'),
  ('davao-del-sur','region-xi','Davao del Sur'),
  ('maguindanao-del-sur','barmm','Maguindanao del Sur')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id;

INSERT INTO public.phases (id, name, "order", description) VALUES
  ('phase-1','Phase 1 — FCL Batch 1',1,'First batch of commissioned church planter pastors serving in Sultan Kudarat and Maguindanao del Sur.'),
  ('phase-2','Phase 2 — FCL Batch 2',2,'Second batch of church planter pastors serving across Sarangani, Sultan Kudarat, Davao del Sur, and Cotabato.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order", description = EXCLUDED.description;

INSERT INTO public.areas (id, phase_id, name, region_id, province_id, description, coordinator_name, gps_lat, gps_lng) VALUES
  ('area-bagumbayan','phase-1','Bagumbayan Area','region-xii','sultan-kudarat','Church plants across the municipality of Bagumbayan.',NULL,6.828,124.762),
  ('area-sen-ninoy-aquino','phase-1','Senator Ninoy Aquino Area','region-xii','sultan-kudarat','Frontier and tribal ministry in the highlands of Sen. Ninoy Aquino.',NULL,6.542,124.590),
  ('area-esperanza','phase-1','Esperanza Area','region-xii','sultan-kudarat',NULL,NULL,6.700,124.720),
  ('area-maguindanao','phase-1','Maguindanao del Sur Area','barmm','maguindanao-del-sur','Cross-cultural ministry among Muslim communities.',NULL,6.898,124.520),
  ('area-maitum','phase-2','Sarangari Area','region-xii','sarangani','Wesleyan church plants across Maitum, Kiamba, and Maasim.','Johnnely A. Delos Reyes',6.038,124.492),
  ('area-bansalan','phase-2','Bansalan Area','region-xi','davao-del-sur','Alliance church planting ministries around Bansalan and Digos.','Jolle E. Malik',6.783,125.213),
  ('area-digos','phase-2','Digos Area','region-xi','davao-del-sur','Church planting ministries across Digos City, Sulop, and Hagonoy.','Ptr. Lazaro E. Bangcas',6.750,125.357),
  ('area-arakan','phase-2','Arakan Area','region-xii','cotabato','Alliance fellowships and church plants across Arakan Valley.','Ronilo E. Dalisay',7.398,125.135)
ON CONFLICT (id) DO UPDATE SET
  phase_id=EXCLUDED.phase_id,
  name=EXCLUDED.name,
  region_id=EXCLUDED.region_id,
  province_id=EXCLUDED.province_id,
  description=EXCLUDED.description,
  coordinator_name=EXCLUDED.coordinator_name,
  gps_lat=EXCLUDED.gps_lat,
  gps_lng=EXCLUDED.gps_lng;

INSERT INTO public.missionary_area_map (missionary_id, area_id, full_name) VALUES
  ('m-vincent-roy-aniversario','area-bagumbayan','Vincent Roy L. Aniversario'),
  ('m-ronie-laud','area-bagumbayan','Ronie B. Laud'),
  ('m-jolieses-lentija','area-bagumbayan','Jolieses C. Lentija'),
  ('m-randy-tobung','area-bagumbayan','Randy G. Tobung'),
  ('m-joshua-aligarbes','area-sen-ninoy-aquino','Joshua M. Aligarbes'),
  ('m-erlee-dadan','area-sen-ninoy-aquino','Er Lee Joy R. Dadan'),
  ('m-gilmark-guyos','area-sen-ninoy-aquino','Gil Mark D. Guyos'),
  ('m-vincent-juromay','area-esperanza','Vincent D. Juromay'),
  ('m-basilio-sumido','area-maguindanao','Basilio M. Sumido'),
  ('m-johnnely-delos-reyes','area-maitum','Johnnely A. Delos Reyes'),
  ('m-christopher-llego','area-maitum','Christopher Q. Llego'),
  ('m-jerson-lumbay','area-maitum','Jerson S. Lumbay'),
  ('m-john-rey-ubando','area-maitum','John Rey G. Ubando'),
  ('m-elmar-manton','area-maitum','Elmar T. Manton'),
  ('m-maricel-alam','area-maitum','Maricel A. Alam'),
  ('m-jolle-malik','area-bansalan','Jolle E. Malik'),
  ('m-samuel-onotan','area-bansalan','Samuel M. Onotan'),
  ('m-marcelo-tenebro','area-bansalan','Marcelo G. Tenebro'),
  ('m-alberto-badal-jr','area-bansalan','Alberto Badal Jr.'),
  ('m-gilbert-pili','area-bansalan','Gilbert M. Pili'),
  ('m-frederick-omo','area-bansalan','Frederick P. Omo'),
  ('m-henoven-david','area-bansalan','Henoven B. David'),
  ('m-ronel-felecella','area-bansalan','Ronel L. Felecella'),
  ('m-lazaro-bangcas','area-digos','Lazaro E. Bangcas'),
  ('m-phemarjohn-bontia','area-digos','Phemarjohn R. Bontia'),
  ('m-gary-david-sr','area-digos','Gary B. David Sr.'),
  ('m-ben-jabez-baloy','area-digos','Ben Jabez O. Baloy'),
  ('m-rico-masaglang','area-digos','Rico T. Masaglang'),
  ('m-jessie-dial','area-digos','Jessie B. Dial'),
  ('m-saljohn-sobredilla','area-digos','Saljohn N. Sobredilla'),
  ('m-marty-nellas','area-digos','Marty B. Nellas'),
  ('m-ronilo-dalisay','area-arakan','Ronilo E. Dalisay'),
  ('m-romel-gay','area-arakan','Romel B. Gay'),
  ('m-ariel-engay','area-arakan','Ariel A. Engay'),
  ('m-artemio-allah','area-arakan','Artemio A. Allah'),
  ('m-dino-dayon','area-arakan','Dino B. Dayon'),
  ('m-marvin-jon-gutierrez','area-arakan','Marvin Jon F. Gutierrez'),
  ('m-edgardo-semenilla','area-arakan','Edgardo S. Semenilla'),
  ('m-gabriel-damiog','area-arakan','Gabriel A. Damiog')
ON CONFLICT (missionary_id) DO UPDATE SET area_id = EXCLUDED.area_id, full_name = EXCLUDED.full_name;
