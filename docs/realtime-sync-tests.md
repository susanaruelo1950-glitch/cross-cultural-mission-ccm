# Realtime E2E — automated smoke

- `python3 tests/e2e/realtime_smoke.py` — live indicator + realtime pulse.
- `bun run tests/unit/merge.test.ts` — 3-way merge / ConflictMergeDialog logic.

Both scripts are self-contained and exit non-zero on failure.


Verifies the public dashboard mounts the realtime bridge and that the
`<LiveUpdatesIndicator />` badge reaches **Live**, and that a simulated remote
`gc-realtime-change` CustomEvent triggers the pulse animation.

## Two-tab manual test (dashboard cards)

1. Open the dashboard in **Tab A** and `/manage` in **Tab B** (signed in as admin).
2. In Tab B, add or edit a missionary and Save.
3. Tab A: within ~1s, the "Missionaries" and "Areas" stat cards should ring/pulse
   and the numbers update without a refresh. The "Live" badge in the header
   should also flash.

## Two-admin conflict-merge test

1. Open the same missionary edit form in **two browser windows** (both admins).
2. In window 1, change **only the phone** and Save.
3. In window 2, change **only the address** and Save.
   → the "Merged your edits with a teammate's changes" toast fires, both fields
   persist.
4. Repeat but change the **same field** in both windows to different values.
   → the ConflictMergeDialog appears with per-field keep-mine / keep-theirs
   radios. Auto-merged fields are counted in the header badge.

## Network reconnect

1. Open the dashboard, wait for **Live**.
2. Disable network in DevTools → badge should turn **Offline** within seconds.
3. Re-enable network → badge should return to **Live** without a page reload.

## Tab left open

Leave the app open for >30 minutes. The realtime bridge auto-reconnects on
`visibilitychange` and `online`, so returning to the tab should either show
**Live** or briefly show **Connecting…** then **Live**.
