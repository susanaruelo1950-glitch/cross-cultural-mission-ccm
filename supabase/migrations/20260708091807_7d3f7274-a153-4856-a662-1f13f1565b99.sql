
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_coordinator_of_missionary(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coordinator_of_missionary(uuid, text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
