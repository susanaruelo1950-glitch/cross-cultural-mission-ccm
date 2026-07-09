"""
Admin delete + realtime consistency smoke.

Verifies that an admin-level delete tombstone applied to the local store:
    1. Removes the target missionary from the guest directory.
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
VICTIM_HREF = f"/missionaries/{VICTIM_ID}"


async def has_victim(page) -> bool:
    return await page.locator(f'a[href="{VICTIM_HREF}"]').count() > 0


async def main() -> int:
    exit_code = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await page.goto(f"{URL}/missionaries", wait_until="domcontentloaded")
        await page.wait_for_selector('a[href^="/missionaries/m-"]', timeout=15_000)
        if not await has_victim(page):
            print(f"FAIL: baseline directory missing {VICTIM_ID}")
            exit_code = 1
        await page.screenshot(path=str(OUT / "delete_before.png"))

        payload = {
            "phases": [],
            "areas": [],
            "missionaries": [],
            "deletedIds": [VICTIM_ID],
            "deletedNames": [],
        }
        await page.evaluate(
            f"""(() => {{
              window.localStorage.setItem({json.dumps(STORAGE_KEY)}, {json.dumps(json.dumps(payload))});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.wait_for_timeout(600)
        if await has_victim(page):
            print("FAIL: victim still linked after tombstone event")
            exit_code = 1
        await page.screenshot(path=str(OUT / "delete_after.png"))

        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        if await has_victim(page):
            print("FAIL: tombstone lost after reload")
            exit_code = 1

        await page.evaluate(
            f"""(() => {{
              window.localStorage.removeItem({json.dumps(STORAGE_KEY)});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        if not await has_victim(page):
            print("FAIL: undo did not restore victim")
            exit_code = 1

        await browser.close()
        print("❌ delete-sync failed" if exit_code else "✅ delete-sync passed")
        return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
