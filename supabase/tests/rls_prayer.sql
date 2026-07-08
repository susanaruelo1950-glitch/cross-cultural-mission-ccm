-- ============================================================================
-- Automated RLS tests for prayer_requests_db and prayer_events
--
-- Run against a NON-PRODUCTION database:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_prayer.sql
--
-- The script:
--   1. Seeds two auth users (admin + supporter) and one coordinator assignment
--   2. Sets `request.jwt.claim.sub` to switch identity, then SETs role authenticated
--   3. Asserts admins/coordinators/creators/approved-public visibility rules
--   4. Rolls the transaction back so no test data persists
-- ============================================================================

BEGIN;

-- Fixture ids ----------------------------------------------------------------
DO $$
DECLARE
  admin_id   uuid := '00000000-0000-0000-0000-000000000a01';
  coord_id   uuid := '00000000-0000-0000-0000-000000000c01';
  supp_id    uuid := '00000000-0000-0000-0000-000000000501';
  other_id   uuid := '00000000-0000-0000-0000-000000000502';
  mid        text := 'test-missionary-rls';
  pr_priv    uuid;
  pr_pub     uuid;
  pr_owner   uuid;
BEGIN
  -- Seed users (auth schema, mirrors what handle_new_user does for roles)
  INSERT INTO auth.users (id, email, aud, role)
  VALUES
    (admin_id, 'rls-admin@test.local',   'authenticated', 'authenticated'),
    (coord_id, 'rls-coord@test.local',   'authenticated', 'authenticated'),
    (supp_id,  'rls-supporter@test.local','authenticated','authenticated'),
    (other_id, 'rls-other@test.local',   'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES
    (admin_id, 'admin'), (coord_id, 'coordinator'),
    (supp_id, 'supporter'), (other_id, 'supporter')
  ON CONFLICT DO NOTHING;

  -- Coordinator gets scoped to this missionary
  INSERT INTO public.coordinator_assignments (user_id, missionary_id)
  VALUES (coord_id, mid) ON CONFLICT DO NOTHING;

  -- Seed 3 prayer requests: private, approved-public, supporter-owned
  INSERT INTO public.prayer_requests_db (missionary_id, title, detail, created_by)
    VALUES (mid, 'private req', null, admin_id) RETURNING id INTO pr_priv;
  INSERT INTO public.prayer_requests_db
    (missionary_id, title, created_by, coordinator_approved_public, approved_by, approved_at)
    VALUES (mid, 'public req', admin_id, true, coord_id, now()) RETURNING id INTO pr_pub;
  INSERT INTO public.prayer_requests_db (missionary_id, title, created_by)
    VALUES (mid, 'supporter req', supp_id) RETURNING id INTO pr_owner;

  -- Helper: switch identity
  PERFORM set_config('role', 'authenticated', true);

  -- ---- Admin sees ALL --------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  ASSERT (SELECT count(*) FROM public.prayer_requests_db WHERE missionary_id = mid) = 3,
    'admin should see all 3 prayer requests';

  -- ---- Coordinator (scoped) sees ALL for that missionary ---------------
  PERFORM set_config('request.jwt.claim.sub', coord_id::text, true);
  ASSERT (SELECT count(*) FROM public.prayer_requests_db WHERE missionary_id = mid) = 3,
    'scoped coordinator should see all 3 prayer requests';

  -- ---- Supporter who created one sees own + approved-public ------------
  PERFORM set_config('request.jwt.claim.sub', supp_id::text, true);
  ASSERT (SELECT count(*) FROM public.prayer_requests_db WHERE missionary_id = mid) = 2,
    'creator sees own + approved-public (2)';
  ASSERT EXISTS (SELECT 1 FROM public.prayer_requests_db WHERE id = pr_pub),
    'creator sees approved-public row';
  ASSERT NOT EXISTS (SELECT 1 FROM public.prayer_requests_db WHERE id = pr_priv),
    'creator MUST NOT see private admin-only row';

  -- ---- Unrelated supporter sees ONLY approved-public --------------------
  PERFORM set_config('request.jwt.claim.sub', other_id::text, true);
  ASSERT (SELECT count(*) FROM public.prayer_requests_db WHERE missionary_id = mid) = 1,
    'unrelated supporter only sees approved-public (1)';
  ASSERT NOT EXISTS (SELECT 1 FROM public.prayer_requests_db WHERE id = pr_priv),
    'unrelated supporter MUST NOT see private row';
  ASSERT NOT EXISTS (SELECT 1 FROM public.prayer_requests_db WHERE id = pr_owner),
    'unrelated supporter MUST NOT see other user''s private row';

  -- ---- Unrelated supporter cannot flip approval (UPDATE denied) --------
  BEGIN
    UPDATE public.prayer_requests_db SET coordinator_approved_public = true WHERE id = pr_priv;
    ASSERT (SELECT coordinator_approved_public FROM public.prayer_requests_db WHERE id = pr_priv) IS DISTINCT FROM true,
      'supporter update MUST NOT change approval flag';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- ---- Anon role sees NOTHING ------------------------------------------
  PERFORM set_config('role', 'anon', true);
  ASSERT (SELECT count(*) FROM public.prayer_requests_db WHERE missionary_id = mid) = 0,
    'anon MUST see zero prayer_requests_db rows';
  ASSERT (SELECT count(*) FROM public.prayer_events WHERE missionary_id = mid) = 0,
    'anon MUST see zero prayer_events rows';

  RAISE NOTICE 'RLS prayer tests PASSED';
END $$;

ROLLBACK;
