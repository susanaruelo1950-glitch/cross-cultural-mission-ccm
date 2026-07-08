
-- ============================================================
-- ROLES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'supporter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by anyone" ON public.profiles;
CREATE POLICY "Profiles readable by anyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- NEW-USER TRIGGER: create profile + assign role
-- Admin email alfredkennethr@gmail.com → 'admin', everyone else → 'supporter'
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'alfredkennethr@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'supporter')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MINISTRY UPDATES (reports w/ image)
-- missionary_id is text to match existing in-memory ids like "m-vincent-roy-aniversario"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ministry_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  image_url TEXT,
  report_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ministry_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_updates TO authenticated;
GRANT ALL ON public.ministry_updates TO service_role;

ALTER TABLE public.ministry_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ministry updates readable by anyone" ON public.ministry_updates;
CREATE POLICY "Ministry updates readable by anyone" ON public.ministry_updates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin/coordinator can insert ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin/coordinator can insert ministry updates" ON public.ministry_updates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "Admin/coordinator can update ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin/coordinator can update ministry updates" ON public.ministry_updates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "Admin can delete ministry updates" ON public.ministry_updates;
CREATE POLICY "Admin can delete ministry updates" ON public.ministry_updates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ministry_updates_missionary_idx ON public.ministry_updates (missionary_id, report_date DESC);

-- ============================================================
-- PRAYER REQUESTS (DB-backed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prayer_requests_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  urgent BOOLEAN NOT NULL DEFAULT false,
  answered BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prayer_requests_db TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests_db TO authenticated;
GRANT ALL ON public.prayer_requests_db TO service_role;

ALTER TABLE public.prayer_requests_db ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prayer requests readable by anyone" ON public.prayer_requests_db;
CREATE POLICY "Prayer requests readable by anyone" ON public.prayer_requests_db FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin/coordinator can insert prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin/coordinator can insert prayer requests" ON public.prayer_requests_db FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "Admin/coordinator can update prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin/coordinator can update prayer requests" ON public.prayer_requests_db FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "Admin can delete prayer requests" ON public.prayer_requests_db;
CREATE POLICY "Admin can delete prayer requests" ON public.prayer_requests_db FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS prayer_requests_missionary_idx ON public.prayer_requests_db (missionary_id, created_at DESC);

-- ============================================================
-- PRAYER EVENTS (one row per "I prayed" tap)
-- Anonymous prayers allowed (user_id NULL); logged-in prayers attributed
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prayer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prayer_events TO anon;
GRANT SELECT, INSERT ON public.prayer_events TO authenticated;
GRANT ALL ON public.prayer_events TO service_role;

ALTER TABLE public.prayer_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prayer events readable by anyone" ON public.prayer_events;
CREATE POLICY "Prayer events readable by anyone" ON public.prayer_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add prayer event" ON public.prayer_events;
CREATE POLICY "Anyone can add prayer event" ON public.prayer_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS prayer_events_missionary_idx ON public.prayer_events (missionary_id);
CREATE INDEX IF NOT EXISTS prayer_events_user_missionary_idx ON public.prayer_events (user_id, missionary_id);

-- ============================================================
-- PRAYER COUNTS VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.prayer_counts AS
  SELECT missionary_id, COUNT(*)::BIGINT AS total
  FROM public.prayer_events
  GROUP BY missionary_id;

GRANT SELECT ON public.prayer_counts TO anon, authenticated, service_role;

-- ============================================================
-- Shared updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS ministry_updates_set_updated_at ON public.ministry_updates;
CREATE TRIGGER ministry_updates_set_updated_at
  BEFORE UPDATE ON public.ministry_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
