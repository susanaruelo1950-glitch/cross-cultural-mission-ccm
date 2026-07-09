CREATE OR REPLACE FUNCTION public.record_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity TEXT;
BEGIN
  v_entity := TG_ARGV[0];
  INSERT INTO public.content_versions(entity_type, entity_id, snapshot, action, changed_by)
  VALUES (v_entity, OLD.id, to_jsonb(OLD), lower(TG_OP::TEXT), auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

ALTER TABLE public.content_versions DROP CONSTRAINT IF EXISTS content_versions_action_check;
ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_action_check
  CHECK (lower(action) IN ('update','delete','insert'));

ALTER TABLE public.prayer_requests_db
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public can read prayer requests" ON public.prayer_requests_db;
DROP POLICY IF EXISTS "Prayer requests are viewable by everyone" ON public.prayer_requests_db;
DROP POLICY IF EXISTS "Prayer requests visibility" ON public.prayer_requests_db;
CREATE POLICY "Prayer requests visibility"
  ON public.prayer_requests_db
  FOR SELECT
  USING (
    visible = true
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS layer text NOT NULL DEFAULT 'primary';
CREATE INDEX IF NOT EXISTS announcements_layer_idx ON public.announcements(layer);
