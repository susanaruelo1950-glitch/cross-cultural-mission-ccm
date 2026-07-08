-- Restrict SELECT on prayer_requests_db and prayer_events to admin,
-- scoped coordinator of the missionary, or the record's own creator.
DROP POLICY IF EXISTS "Prayer requests readable by authenticated users" ON public.prayer_requests_db;
CREATE POLICY "Prayer requests readable by admin/coord/owner"
  ON public.prayer_requests_db FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (
      private.has_role(auth.uid(), 'coordinator'::app_role)
      AND private.is_coordinator_of_missionary(auth.uid(), missionary_id)
    )
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Prayer events readable by authenticated users" ON public.prayer_events;
CREATE POLICY "Prayer events readable by admin/coord/owner"
  ON public.prayer_events FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (
      private.has_role(auth.uid(), 'coordinator'::app_role)
      AND private.is_coordinator_of_missionary(auth.uid(), missionary_id)
    )
    OR user_id = auth.uid()
  );