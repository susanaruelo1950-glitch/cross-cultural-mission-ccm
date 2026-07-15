-- Ensure all admin-editable tables broadcast realtime changes so admins and users stay in sync.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['prayer_events','profiles','user_roles']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Make sure UPDATE/DELETE payloads include full OLD row so realtime consumers
-- can react to changes on columns other than the primary key.
ALTER TABLE public.prayer_events REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;