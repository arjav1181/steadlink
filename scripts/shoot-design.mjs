/**
 * Screenshot the design system route.
 *
 * Uses the system chromium via Playwright's executablePath, so no browser
 * download is needed.
 *
 *   node scripts/shoot-design.mjs [outDir]
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = process.env.DESIGN_URL ?? "http://localhost:3210/design";
const OUT = process.argv[2] ?? "/home/runner/workspace/replica/design/preview";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox"] });

const consoleErrors = [];
const failedRequests = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on("response", (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.screenshot({ path: path.join(OUT, "design-full.png"), fullPage: true });

// Section-by-section captures, so each part of the system is legible.
const sections = await page.$$("main > section");
for (const [index, section] of sections.entries()) {
  const heading = await section.$("h2");
  const title = (await heading?.textContent()) ?? `section-${index}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await section.screenshot({ path: path.join(OUT, `section-${String(index).padStart(2, "0")}-${slug}.png`) });
}

// Mobile pass: the same primitives at 390px.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "design-mobile.png"), fullPage: true });

// A11y snapshot of the page's landmark and control structure.
const a11y = await page.evaluate(() => {
  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).slice(0, 3).join(".") : "";
    return `<${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}>`;
  };
  const buttons = [...document.querySelectorAll("button")].filter(
    (b) => b.getAttribute("aria-hidden") !== "true" && b.offsetParent !== null,
  );
  // A button's accessible name can come from its contents, which includes a
  // descendant's aria-label (an SVG with role="img"). Checking textContent
  // alone would report false positives.
  const hasName = (el) =>
    Boolean(
      el.textContent?.trim() ||
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        el.getAttribute("title") ||
        el.querySelector("[aria-label]"),
    );
  const unlabelledButtons = buttons.filter((b) => !hasName(b)).map(describe);
  const inputs = [...document.querySelectorAll("input, textarea, select")].filter(
    (i) => i.getAttribute("aria-hidden") !== "true" && i.offsetParent !== null,
  );
  const unlabelledInputs = inputs
    .filter((input) => {
      if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) return false;
      if (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) return false;
      if (input.closest("label")) return false;
      return true;
    })
    .map(describe);
  return {
    buttons: buttons.length,
    unlabelledButtons,
    inputs: inputs.length,
    unlabelledInputs,
    headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName} ${h.textContent?.trim()}`),
    landmarks: [...document.querySelectorAll("nav,main,header,table")].map((el) =>
      el.tagName.toLowerCase(),
    ),
    imagesWithoutAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
  };
});

await browser.close();

console.log(JSON.stringify({ out: OUT, consoleErrors, failedRequests, a11y }, null, 2));
if (consoleErrors.length) process.exitCode = 1;
