"""
Realtime smoke test.

Verifies:
    1. The public dashboard loads.
    2. The <LiveUpdatesIndicator /> reaches "Live" within 15s.
    3. A simulated remote change fires the pulse (via window CustomEvent).

Run:  python3 tests/e2e/realtime_smoke.py
Requires: Playwright (pre-installed in the Lovable sandbox).
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
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "console",
            lambda m: errors.append(f"[console] {m.text}") if m.type == "error" else None,
        )

        print(f"→ opening {URL}")
        await page.goto(URL, wait_until="domcontentloaded")
        await page.screenshot(path=str(OUT / "1_dashboard.png"))

        indicator = page.locator('[title^="Realtime:"]').first
        await indicator.wait_for(timeout=20_000)

        status = ""
        for _ in range(50):  # ~15s
            status = await indicator.get_attribute("title") or ""
            if "Live" in status:
                break
            await page.wait_for_timeout(300)
        print(f"• realtime status: {status}")
        await page.screenshot(path=str(OUT / "2_indicator.png"))
        exit_code = 0
        if "Live" not in status:
            print("FAIL: realtime never reached Live in 15s")
            exit_code = 1

        # Simulate remote change → indicator should pulse (ring-2 class).
        await page.evaluate(
            """window.dispatchEvent(new CustomEvent('gc-realtime-change', {
              detail: { table: 'ministry_updates', event: 'INSERT', new: {}, old: null },
            }))"""
        )
        await page.wait_for_timeout(400)
        classes = await indicator.get_attribute("class") or ""
        if "ring-2" not in classes:
            print("FAIL: indicator did not pulse after realtime event")
            exit_code = 1
        else:
            print("• pulse OK")
        await page.screenshot(path=str(OUT / "3_pulse.png"))

        if errors:
            print("captured page errors:")
            for e in errors:
                print(" ", e)

        await browser.close()
        print("❌ smoke failed" if exit_code else "✅ smoke passed")
        return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
