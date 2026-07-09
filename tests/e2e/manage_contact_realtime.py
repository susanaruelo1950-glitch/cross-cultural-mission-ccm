"""
Contact-edit realtime consistency smoke.

Simulates an admin editing a missionary's phone + email in Manage by writing
the edited row into the local store (the same runtime store `upsertMissionary`
writes to). Then verifies:

    1. The guest-facing profile page shows the new phone/email using the
       clickable tel:/mailto: format and correct Philippine phone display.
    2. Clearing the fields falls back to the "not shared yet" copy so
       guest, supporter, and coordinator views never render empty rows.
    3. A hard reload preserves the edit — the store is the source of truth.

Run:  python3 tests/e2e/manage_contact_realtime.py
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
TARGET_ID = "m-basilio-sumido"
NEW_PHONE = "09171234567"
NEW_EMAIL = "pastor.test@example.org"


def store_with(missionary: dict) -> str:
    return json.dumps({
        "phases": [],
        "areas": [],
        "missionaries": [missionary],
        "deletedIds": [],
        "deletedNames": [],
    })


async def main() -> int:
    exit_code = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Prime the profile so we can read its base data.
        await page.goto(f"{URL}/missionaries/{TARGET_ID}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        # 1. Apply an edited row via the same runtime store the admin uses.
        edit = {
            "id": TARGET_ID,
            "areaId": "area-kidapawan",
            "fullName": "Basilio M. Sumido",
            "church": "Kidapawan Church Plant",
            "address": "Kidapawan, North Cotabato",
            "phone": NEW_PHONE,
            "email": NEW_EMAIL,
            "status": "Active",
            "country": "Philippines",
            "region": "SOCCSKSARGEN (Region XII)",
            "province": "North Cotabato",
        }
        await page.evaluate(
            f"""(() => {{
              window.localStorage.setItem({json.dumps(STORAGE_KEY)}, {json.dumps(store_with(edit))});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT / "contact_edited.png"))

        tel = await page.locator(f'a[href^="tel:"]').count()
        mailto = await page.locator(f'a[href="mailto:{NEW_EMAIL}"]').count()
        if tel == 0:
            print("FAIL: no tel: link after edit")
            exit_code = 1
        if mailto == 0:
            print(f"FAIL: no mailto:{NEW_EMAIL} link after edit")
            exit_code = 1
        # Philippine formatter should present the 09XX number spaced.
        body = await page.inner_text("body")
        if NEW_PHONE not in body and "0917" not in body:
            print("FAIL: phone number not visible on profile")
            exit_code = 1

        # 2. Hard reload — edit must persist through the store.
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        mailto2 = await page.locator(f'a[href="mailto:{NEW_EMAIL}"]').count()
        if mailto2 == 0:
            print("FAIL: edit did not survive reload")
            exit_code = 1

        # 3. Clear the fields — fallback text must render for every audience.
        cleared = dict(edit)
        cleared["phone"] = ""
        cleared["email"] = ""
        await page.evaluate(
            f"""(() => {{
              window.localStorage.setItem({json.dumps(STORAGE_KEY)}, {json.dumps(store_with(cleared))});
              window.dispatchEvent(new Event('gc-store-changed'));
            }})()"""
        )
        await page.wait_for_timeout(1500)
        body = await page.inner_text("body")
        if "Phone not shared yet" not in body:
            print("FAIL: phone fallback missing")
            exit_code = 1
        if "Email not shared yet" not in body:
            print("FAIL: email fallback missing")
            exit_code = 1
        await page.screenshot(path=str(OUT / "contact_fallback.png"))

        await browser.close()
        print("❌ contact-realtime failed" if exit_code else "✅ contact-realtime passed")
        return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
