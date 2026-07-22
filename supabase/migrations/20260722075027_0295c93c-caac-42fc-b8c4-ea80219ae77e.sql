
CREATE TABLE IF NOT EXISTS public.support_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'PHP',
  note TEXT,
  image_url TEXT,
  receipt_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_receipts TO authenticated;
GRANT ALL ON public.support_receipts TO service_role;

ALTER TABLE public.support_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support receipts readable by anyone" ON public.support_receipts;
CREATE POLICY "Support receipts readable by anyone" ON public.support_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin or scoped coord insert support receipt" ON public.support_receipts;
CREATE POLICY "Admin or scoped coord insert support receipt" ON public.support_receipts FOR INSERT
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin or scoped coord update support receipt" ON public.support_receipts;
CREATE POLICY "Admin or scoped coord update support receipt" ON public.support_receipts FOR UPDATE
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::app_role)
        AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin can delete support receipts" ON public.support_receipts;
CREATE POLICY "Admin can delete support receipts" ON public.support_receipts FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS support_receipts_missionary_idx
  ON public.support_receipts (missionary_id, receipt_date DESC);

DROP TRIGGER IF EXISTS support_receipts_set_updated_at ON public.support_receipts;
CREATE TRIGGER support_receipts_set_updated_at
  BEFORE UPDATE ON public.support_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_receipts REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_receipts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DROP POLICY IF EXISTS "Support receipts images readable by anyone" ON storage.objects;
CREATE POLICY "Support receipts images readable by anyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'support-receipts');

DROP POLICY IF EXISTS "Admin/coordinator can upload support receipts images" ON storage.objects;
CREATE POLICY "Admin/coordinator can upload support receipts images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'support-receipts'
    AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'coordinator'::app_role))
  );

DROP POLICY IF EXISTS "Admin/coordinator can update support receipts images" ON storage.objects;
CREATE POLICY "Admin/coordinator can update support receipts images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'support-receipts'
    AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'coordinator'::app_role))
  );

DROP POLICY IF EXISTS "Admin can delete support receipts images" ON storage.objects;
CREATE POLICY "Admin can delete support receipts images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'support-receipts' AND private.has_role(auth.uid(), 'admin'::app_role)
  );
