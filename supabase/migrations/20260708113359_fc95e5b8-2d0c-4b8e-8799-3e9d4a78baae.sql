
CREATE TABLE IF NOT EXISTS public.thank_you_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  letter_url TEXT,
  letter_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.thank_you_letters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thank_you_letters TO authenticated;
GRANT ALL ON public.thank_you_letters TO service_role;

ALTER TABLE public.thank_you_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thank you letters readable by anyone" ON public.thank_you_letters;
CREATE POLICY "Thank you letters readable by anyone" ON public.thank_you_letters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin or scoped coord insert thank you letter" ON public.thank_you_letters;
CREATE POLICY "Admin or scoped coord insert thank you letter" ON public.thank_you_letters FOR INSERT
  WITH CHECK (
    private.has_role(auth.uid(),'admin'::public.app_role)
    OR (private.has_role(auth.uid(),'coordinator'::public.app_role) AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin or scoped coord update thank you letter" ON public.thank_you_letters;
CREATE POLICY "Admin or scoped coord update thank you letter" ON public.thank_you_letters FOR UPDATE
  USING (
    private.has_role(auth.uid(),'admin'::public.app_role)
    OR (private.has_role(auth.uid(),'coordinator'::public.app_role) AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );

DROP POLICY IF EXISTS "Admin can delete thank you letters" ON public.thank_you_letters;
CREATE POLICY "Admin can delete thank you letters" ON public.thank_you_letters FOR DELETE
  USING (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS thank_you_letters_missionary_idx
  ON public.thank_you_letters (missionary_id, letter_date DESC);

DROP TRIGGER IF EXISTS thank_you_letters_set_updated_at ON public.thank_you_letters;
CREATE TRIGGER thank_you_letters_set_updated_at
  BEFORE UPDATE ON public.thank_you_letters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "thank you letters readable by all" ON storage.objects;
CREATE POLICY "thank you letters readable by all" ON storage.objects
  FOR SELECT USING (bucket_id = 'thank-you-letters');

DROP POLICY IF EXISTS "admin or coord upload thank you letter" ON storage.objects;
CREATE POLICY "admin or coord upload thank you letter" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thank-you-letters'
    AND (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'coordinator'::public.app_role))
  );

DROP POLICY IF EXISTS "admin delete thank you letter" ON storage.objects;
CREATE POLICY "admin delete thank you letter" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'thank-you-letters' AND private.has_role(auth.uid(),'admin'::public.app_role)
  );
