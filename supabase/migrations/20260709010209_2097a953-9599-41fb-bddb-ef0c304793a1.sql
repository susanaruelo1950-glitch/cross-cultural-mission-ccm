
CREATE TABLE IF NOT EXISTS public.missionary_extras (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.missionary_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missionary_extras TO authenticated;
GRANT ALL ON public.missionary_extras TO service_role;

ALTER TABLE public.missionary_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Missionary extras are viewable by everyone"
  ON public.missionary_extras FOR SELECT USING (true);

CREATE POLICY "Admins can insert missionary extras"
  ON public.missionary_extras FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update missionary extras"
  ON public.missionary_extras FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete missionary extras"
  ON public.missionary_extras FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_missionary_extras_updated_at
  BEFORE UPDATE ON public.missionary_extras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.missionary_extras;
