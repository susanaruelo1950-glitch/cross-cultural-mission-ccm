
-- Documents table (admin uploads, everyone signed in can download)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can list/download; only admins can write/update/delete
CREATE POLICY "Signed-in users can view documents"
  ON public.documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- Storage policies for the `documents` bucket
CREATE POLICY "Signed-in users can read documents storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admins can upload documents storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update documents storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'documents' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documents storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND private.has_role(auth.uid(), 'admin'::app_role));
