# Realtime Sync — Verification Checklist

The app subscribes to every admin-editable table and invalidates React
Query caches so every device sees changes within ~1 second. Use this
checklist to verify sync stays reliable.

## Tables covered

Enabled in `supabase_realtime` publication:

- `missionary_extras` — admin-added / edited missionaries (via `useMissionaryRealtime`)
- `missionary_photos` — profile photos & cover backgrounds
- `ministry_updates`
- `thank_you_letters`
- `prayer_requests_db`
- `scriptures`
- `coordinator_assignments`
- `activity_log` — admin audit trail
- `content_versions` — restore history
- `areas`, `phases`, `regions`, `provinces`, `missionary_area_map` — directory structure

Verify anytime with:
```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY tablename;
```

## Automatic behaviour

- `useGlobalRealtime` (mounted in `AppLayout`) opens a single channel and
  auto-reconnects on `online` events and tab-visibility changes.
- The **Live** badge in the header shows connection state
  (`Live` / `Connecting…` / `Offline`).
- Every remote change fires a `gc-realtime-change` window event; the
  header badge pulses and a toast appears.

## Manual test steps

1. **Two-tab edit sync**
   - Open the app in two browser windows signed in as the same admin.
   - Edit a missionary name in tab A and Save.
   - Tab B should show a toast and the directory list should refresh
     within 1s without a manual reload.

2. **Conflict resolution**
   - Open the same missionary edit form in tab A and tab B.
   - Save a change in tab A.
   - In tab B, a blue banner "Another admin just updated this missionary"
     appears. Save from tab B — a confirm dialog warns you'll overwrite.

3. **Network reconnect**
   - Open the app and confirm the badge shows **Live**.
   - Toggle DevTools → Network → Offline. Badge switches to **Offline**.
   - Go back Online. Badge returns to **Live** within a few seconds
     without a page reload.

4. **Tab left open overnight**
   - Leave a tab open for an hour, then have another admin add a
     missionary. Focus the tab — visibility-change triggers a reconnect
     if the channel dropped, and the new missionary appears.

5. **Pagination + realtime**
   - On `/missionaries`, page to page 2. Have another admin add a
     missionary. The current page's count refreshes without changing
     your page position.

6. **Cache invalidation**
   - Edit a thank-you letter, ministry update, prayer request,
     scripture, coordinator assignment, or profile photo from the admin
     panel. Confirm each surface (public directory, missionary detail
     page, `/pray`, etc.) reflects the change without reload.

## Admin permission checks

- `/manage` requires `isAdmin`; non-admins see the `Admins only` error.
- `/admin` requires `isAdmin`; supabase RLS on every mutation-carrying
  table is scoped to `has_role(auth.uid(), 'admin')` (see the initial
  Supabase migration).
- The client gate is a UX guard; the RLS policies are the security
  boundary — even a modified client cannot write without the admin role.
