
CREATE TABLE public.content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('thank_you_letter','ministry_update','prayer_request')),
  entity_id UUID NOT NULL,
  snapshot JSONB NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('update','delete')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX content_versions_entity_idx
  ON public.content_versions (entity_type, entity_id, created_at DESC);

GRANT SELECT, INSERT ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;

ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read version history"
  ON public.content_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'coordinator'::public.app_role)
    )
  );

CREATE POLICY "Signed-in can insert version rows"
  ON public.content_versions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_content_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity TEXT;
BEGIN
  v_entity := TG_ARGV[0];
  INSERT INTO public.content_versions(entity_type, entity_id, snapshot, action, changed_by)
  VALUES (v_entity, OLD.id, to_jsonb(OLD), TG_OP::TEXT, auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER thank_you_letters_versioning
  BEFORE UPDATE OR DELETE ON public.thank_you_letters
  FOR EACH ROW EXECUTE FUNCTION public.record_content_version('thank_you_letter');

CREATE TRIGGER ministry_updates_versioning
  BEFORE UPDATE OR DELETE ON public.ministry_updates
  FOR EACH ROW EXECUTE FUNCTION public.record_content_version('ministry_update');

CREATE TRIGGER prayer_requests_versioning
  BEFORE UPDATE OR DELETE ON public.prayer_requests_db
  FOR EACH ROW EXECUTE FUNCTION public.record_content_version('prayer_request');
