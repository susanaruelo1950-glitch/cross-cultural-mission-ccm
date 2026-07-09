/**
 * Realtime smoke test.
 *
 * Verifies:
 *   1. The public dashboard loads.
 *   2. The <LiveUpdatesIndicator /> reaches "Live" within 15s.
 *   3. A simulated remote change fires the pulse (via window CustomEvent).
 *
 * Run:  node tests/e2e/realtime-smoke.mjs
 * Requires: Playwright (pre-installed in the Lovable sandbox).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url)) + "/screenshots";
await mkdir(OUT, { recursive: true });

const URL = process.env.APP_URL || "http://localhost:8080";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("[console] " + m.text());
});

console.log("→ opening", URL);
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: `${OUT}/1_dashboard.png` });

// 1. Live indicator turns to "Live" within 15s.
const indicator = page.locator('[title^="Realtime:"]');
await indicator.waitFor({ timeout: 20000 });
const startedAt = Date.now();
let status = "connecting";
while (Date.now() - startedAt < 15000) {
  status = (await indicator.getAttribute("title")) ?? "";
  if (status.includes("Live")) break;
  await page.waitForTimeout(300);
}
console.log("• realtime status:", status);
await page.screenshot({ path: `${OUT}/2_indicator.png` });
if (!status.includes("Live")) {
  console.error("FAIL: realtime never reached Live in 15s");
  process.exitCode = 1;
}

// 2. Simulate a remote change → indicator should pulse (ring-2 class).
await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent("gc-realtime-change", {
    detail: { table: "ministry_updates", event: "INSERT", new: {}, old: null },
  }));
});
await page.waitForTimeout(400);
const classes = (await indicator.getAttribute("class")) ?? "";
if (!classes.includes("ring-2")) {
  console.error("FAIL: indicator did not pulse after realtime event");
  process.exitCode = 1;
} else {
  console.log("• pulse OK");
}
await page.screenshot({ path: `${OUT}/3_pulse.png` });

if (errors.length) {
  console.warn("captured page errors:");
  for (const e of errors) console.warn(" ", e);
}

await browser.close();
console.log(process.exitCode ? "❌ smoke failed" : "✅ smoke passed");
