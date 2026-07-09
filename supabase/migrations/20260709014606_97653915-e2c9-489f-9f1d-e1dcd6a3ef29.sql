DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['areas','phases','regions','provinces','missionary_area_map']) LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;