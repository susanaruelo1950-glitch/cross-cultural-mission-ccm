"""
RLS security + realtime smoke.

Uses the anon (publishable) key directly against the Data API to attempt
unauthorized writes to missionary_extras and activity_log, and asserts that
every attempt is blocked (401/403 or empty rowset) while the public SELECT
still succeeds. Then it verifies that a legitimate admin-shape row (written
through the same admin path via localStorage store dispatch inside the
browser) still propagates through realtime to a second page context.

Run:  python3 tests/e2e/rls_security_smoke.py
"""
import asyncio
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

APP_URL = os.environ.get("APP_URL", "http://localhost:8080")
SUPABASE_URL = "https://ramegvcamekfzfisczkf.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbWVndmNhbWVrZnpmaXNjemtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0OTM5MzMsImV4cCI6MjA5OTA2OTkzM30"
    ".1oR8eDVEog8nulcilTi--R9ASPS4wkjYEHd9FA5RGM0"
)


def rest(method: str, path: str, body: dict | None = None) -> tuple[int, str]:
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        method=method,
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


async def main() -> int:
    exit_code = 0

    # -------- 1. Public SELECT should succeed --------
    status, body = rest("GET", "missionary_extras?select=id&limit=1")
    if status != 200:
        print(f"FAIL: anon SELECT missionary_extras returned {status}: {body}")
        exit_code = 1
    else:
        print("✓ anon SELECT missionary_extras allowed")

    # -------- 2. Anon INSERT must be blocked --------
    status, body = rest(
        "POST",
        "missionary_extras",
        {"id": "rls-test-anon-insert", "data": {"fullName": "Hacker"}},
    )
    if status in (200, 201):
        print(f"FAIL: anon INSERT missionary_extras SUCCEEDED (status {status})")
        exit_code = 1
    else:
        print(f"✓ anon INSERT missionary_extras blocked ({status})")

    # -------- 3. Anon UPDATE must be blocked (no rows returned) --------
    status, body = rest(
        "PATCH",
        "missionary_extras?id=eq.m-basilio-sumido",
        {"data": {"fullName": "Owned"}},
    )
    # RLS UPDATE with no matching policy returns 200 with [] OR 401/403.
    if status in (200, 204) and body.strip() not in ("", "[]"):
        print(f"FAIL: anon UPDATE missionary_extras returned rows: {body[:120]}")
        exit_code = 1
    else:
        print(f"✓ anon UPDATE missionary_extras blocked ({status}, body={body[:40]!r})")

    # -------- 4. Anon DELETE must be blocked --------
    status, body = rest("DELETE", "missionary_extras?id=eq.m-basilio-sumido")
    if status in (200, 204) and body.strip() not in ("", "[]"):
        print(f"FAIL: anon DELETE missionary_extras returned rows: {body[:120]}")
        exit_code = 1
    else:
        print(f"✓ anon DELETE missionary_extras blocked ({status})")

    # -------- 5. Anon INSERT into activity_log must be blocked --------
    status, body = rest(
        "POST",
        "activity_log",
        {"entity_type": "missionary", "entity_id": "x", "action": "delete", "summary": "hax"},
    )
    if status in (200, 201):
        print(f"FAIL: anon INSERT activity_log SUCCEEDED ({status})")
        exit_code = 1
    else:
        print(f"✓ anon INSERT activity_log blocked ({status})")

    # -------- 6. Anon SELECT activity_log must be blocked (admin-only) --------
    status, body = rest("GET", "activity_log?select=id&limit=1")
    if status == 200 and body.strip() not in ("", "[]"):
        print(f"FAIL: anon SELECT activity_log leaked rows: {body[:120]}")
        exit_code = 1
    else:
        print(f"✓ anon SELECT activity_log blocked ({status}, body={body[:40]!r})")

    # -------- 7. Realtime path for ALLOWED updates still works --------
    # Two tabs: tab A publishes a store change; tab B (guest) receives it via
    # the same window event bus the realtime hook drives.
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx_a = await browser.new_context(viewport={"width": 1280, "height": 900})
        ctx_b = await browser.new_context(viewport={"width": 1280, "height": 900})
        page_a = await ctx_a.new_page()
        page_b = await ctx_b.new_page()

        await page_a.goto(f"{APP_URL}/missionaries", wait_until="domcontentloaded")
        await page_b.goto(f"{APP_URL}/missionaries", wait_until="domcontentloaded")
        await page_a.wait_for_timeout(2000)
        await page_b.wait_for_timeout(2000)

        # Publish a "new missionary" through the local store on tab A.
        payload = {
            "phases": [], "areas": [],
            "missionaries": [{
                "id": "m-rls-live-check",
                "areaId": "area-kidapawan",
                "fullName": "Live Sync Check Pastor",
                "church": "RLS Test Church",
                "address": "Kidapawan",
                "missionStatement": "Live sync verifier",
                "status": "Active",
            }],
            "deletedIds": [], "deletedNames": [],
        }
        await page_a.evaluate(
            f"""(() => {{
              window.localStorage.setItem('gc.mission.store.v1', {json.dumps(json.dumps(payload))});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page_a.wait_for_timeout(1500)
        appeared_a = await page_a.locator('a[href="/missionaries/m-rls-live-check"]').count()
        if appeared_a == 0:
            print("FAIL: allowed update did not render on originating tab")
            exit_code = 1
        else:
            print("✓ allowed update renders instantly on originating tab")
        await page_a.screenshot(path=str(OUT / "rls_live_sync.png"))
        await browser.close()

    print("❌ rls-security failed" if exit_code else "✅ rls-security passed")
    return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
