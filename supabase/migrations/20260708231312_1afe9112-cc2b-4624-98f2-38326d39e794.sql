
-- Add coordinator-approved public visibility flags for prayer requests and prayer events
ALTER TABLE public.prayer_requests_db
  ADD COLUMN IF NOT EXISTS coordinator_approved_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.prayer_events
  ADD COLUMN IF NOT EXISTS coordinator_approved_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS prayer_requests_public_idx
  ON public.prayer_requests_db (missionary_id, created_at DESC)
  WHERE coordinator_approved_public = true;

CREATE INDEX IF NOT EXISTS prayer_events_public_idx
  ON public.prayer_events (missionary_id)
  WHERE coordinator_approved_public = true;

-- Replace SELECT policies to also allow reading approved-public rows
DROP POLICY IF EXISTS "Prayer requests readable by admin/coord/owner" ON public.prayer_requests_db;
CREATE POLICY "Prayer requests readable by admin/coord/owner/approved"
  ON public.prayer_requests_db FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::app_role) AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
    OR (created_by = auth.uid())
    OR (coordinator_approved_public = true)
  );

DROP POLICY IF EXISTS "Prayer events readable by admin/coord/owner" ON public.prayer_events;
CREATE POLICY "Prayer events readable by admin/coord/owner/approved"
  ON public.prayer_events FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::app_role) AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
    OR (user_id = auth.uid())
    OR (coordinator_approved_public = true)
  );

-- Only admin or scoped coordinator can toggle the approval flag (UPDATE policy already restricts UPDATE)
-- Update policy on prayer_events (allow admin/coord to flip approval)
DROP POLICY IF EXISTS "Admin or scoped coord update prayer event" ON public.prayer_events;
CREATE POLICY "Admin or scoped coord update prayer event"
  ON public.prayer_events FOR UPDATE
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (private.has_role(auth.uid(), 'coordinator'::app_role) AND private.is_coordinator_of_missionary(auth.uid(), missionary_id))
  );
