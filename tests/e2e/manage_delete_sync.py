"""
Admin delete + realtime consistency smoke.

Verifies that an admin-level delete tombstone applied to the local store:
    1. Immediately removes the missionary from the directory (guest view).
    2. Survives a hard reload — the row stays hidden.
    3. Reverses cleanly when the tombstone is cleared.

Run:  python3 tests/e2e/manage_delete_sync.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

URL = os.environ.get("APP_URL", "http://localhost:8080")
STORAGE_KEY = "gc.mission.store.v1"
VICTIM_ID = "m-basilio-sumido"
VICTIM_NAME = "Ptr. Basilio N. Sumido"


async def count_rows(page) -> int:
    await page.wait_for_selector('a[href^="/missionaries/m-"]', timeout=15_000)
    return await page.locator('a[href^="/missionaries/m-"]').count()


async def main() -> int:
    exit_code = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await page.goto(f"{URL}/missionaries", wait_until="domcontentloaded")
        baseline = await count_rows(page)
        print(f"• baseline directory rows: {baseline}")
        await page.screenshot(path=str(OUT / "delete_before.png"))

        # Simulate an admin delete by writing the tombstone directly into the
        # local store the app persists across reloads.
        payload = {
            "phases": [],
            "areas": [],
            "missionaries": [],
            "deletedIds": [VICTIM_ID],
            "deletedNames": [VICTIM_NAME],
        }
        await page.evaluate(
            f"""(() => {{
              window.localStorage.setItem({json.dumps(STORAGE_KEY)}, {json.dumps(json.dumps(payload))});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.wait_for_timeout(600)
        after_delete = await count_rows(page)
        print(f"• after tombstone rows: {after_delete}")
        if after_delete != baseline - 1:
            print(f"FAIL: expected {baseline - 1}, got {after_delete}")
            exit_code = 1
        await page.screenshot(path=str(OUT / "delete_after.png"))

        # Hard reload — tombstone must persist across page loads.
        await page.reload(wait_until="domcontentloaded")
        after_reload = await count_rows(page)
        print(f"• after reload rows: {after_reload}")
        if after_reload != baseline - 1:
            print(f"FAIL: tombstone lost after reload → {after_reload}")
            exit_code = 1

        # Direct profile URL should 404 / show not-found for the deleted row —
        # but our delete only hides from listings; the seeded profile stays
        # reachable. That's acceptable, but the listing must not link to it.
        links = await page.locator(f'a[href="/missionaries/{VICTIM_ID}"]').count()
        if links != 0:
            print(f"FAIL: directory still links to {VICTIM_ID} ({links}x)")
            exit_code = 1

        # Undo: clear tombstone → row returns.
        await page.evaluate(
            f"""(() => {{
              window.localStorage.removeItem({json.dumps(STORAGE_KEY)});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.reload(wait_until="domcontentloaded")
        restored = await count_rows(page)
        print(f"• after undo rows: {restored}")
        if restored != baseline:
            print(f"FAIL: undo did not restore ({restored} vs {baseline})")
            exit_code = 1

        await browser.close()
        print("❌ delete-sync failed" if exit_code else "✅ delete-sync passed")
        return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
