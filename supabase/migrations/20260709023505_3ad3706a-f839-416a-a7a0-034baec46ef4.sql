
-- 1) Public read access for prayer requests
GRANT SELECT ON public.prayer_requests_db TO anon;

DROP POLICY IF EXISTS "Prayer requests readable by admin/coord/owner/approved" ON public.prayer_requests_db;
CREATE POLICY "Prayer requests readable by anyone"
  ON public.prayer_requests_db FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2) Announcements (dashboard news ticker + events)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  publish_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements readable by anyone"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (
    published = true
    AND publish_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- Seed one starter announcement so the ticker isn't empty
INSERT INTO public.announcements (title, body, published)
VALUES ('Upcoming graduation for Phase 2 — FCL Batch 2 this coming November. Pray with us!', NULL, true)
ON CONFLICT DO NOTHING;
