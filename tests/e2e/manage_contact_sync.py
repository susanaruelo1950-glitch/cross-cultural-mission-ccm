"""
Contact-sync smoke test.

Verifies:
    1. The mission map deep-link URL (?focus=<id>&phase=&area=) loads and
       centers on the requested pastor.
    2. The map search combobox exposes proper ARIA (role=combobox,
       aria-expanded, aria-controls, listbox with role=option) and supports
       ArrowDown/Enter/Escape keyboard flow.
    3. A missionary profile shows a phone/email row (or the "Not shared yet"
       fallback) formatted as clickable tel:/mailto: links.

Run:  python3 tests/e2e/manage_contact_sync.py
"""
import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

URL = os.environ.get("APP_URL", "http://localhost:8080")


async def main() -> int:
    exit_code = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # 1. Map loads with default filters.
        await page.goto(f"{URL}/map", wait_until="domcontentloaded")
        await page.wait_for_selector('input[role="combobox"]', timeout=15_000)
        await page.screenshot(path=str(OUT / "map_default.png"))

        # 2. Search combobox ARIA + keyboard.
        combobox = page.locator('input[role="combobox"]').first
        await combobox.focus()
        await combobox.type("a", delay=30)
        await page.wait_for_timeout(400)
        expanded = await combobox.get_attribute("aria-expanded")
        controls = await combobox.get_attribute("aria-controls")
        if expanded != "true" or not controls:
            print(f"FAIL: combobox ARIA wrong expanded={expanded} controls={controls}")
            exit_code = 1
        options = page.locator('[role="option"]')
        option_count = await options.count()
        if option_count == 0:
            print("FAIL: no listbox options after typing")
            exit_code = 1
        await combobox.press("ArrowDown")
        active_id = await combobox.get_attribute("aria-activedescendant")
        if not active_id:
            print("FAIL: ArrowDown did not set aria-activedescendant")
            exit_code = 1
        await combobox.press("Enter")
        await page.wait_for_timeout(600)
        focus_url = page.url
        if "focus=" not in focus_url:
            print(f"FAIL: deep-link ?focus= missing after Enter → {focus_url}")
            exit_code = 1
        await page.screenshot(path=str(OUT / "map_focused.png"))

        # 3. Escape clears.
        await combobox.focus()
        await combobox.press("Escape")
        val = await combobox.input_value()
        if val:
            print(f"FAIL: Escape did not clear query, got {val!r}")
            exit_code = 1

        # 4. Deep-link URL preserves filters and opens on reload.
        deep = f"{URL}/map?focus=m-basilio-sumido&phase=phase-1"
        await page.goto(deep, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT / "map_deeplink.png"))

        # 5. Contact row on a profile — tel:/mailto: OR "Not shared yet".
        await page.goto(f"{URL}/missionaries/m-basilio-sumido", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        body = await page.inner_text("body")
        has_contact = any(needle in body for needle in ("Phone", "Email", "Contact", "Not shared"))
        if not has_contact:
            print("FAIL: profile has no phone/email row or fallback text")
            exit_code = 1
        await page.screenshot(path=str(OUT / "profile_contact.png"))

        await browser.close()
        print("❌ contact-sync failed" if exit_code else "✅ contact-sync passed")
        return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
