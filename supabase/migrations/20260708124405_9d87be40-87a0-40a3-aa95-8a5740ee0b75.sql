
DROP POLICY IF EXISTS "Signed-in can insert version rows" ON public.content_versions;

REVOKE EXECUTE ON FUNCTION public.record_content_version() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_content_version() FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_content_version() FROM authenticated;
