// Renders public/icon.svg to the PNG/ICO icon set, plus the 1200x630 social card (app/opengraph-image.png).
// (The card is a static PNG, not app/opengraph-image.tsx: next/og fails at build time on Windows in Next 14.2.0.) Run when the logo changes:
//   E2E_CHANNEL=msedge node scripts/generate-icons.mjs
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const svg = readFileSync(path.join(pub, "icon.svg"), "utf8");

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || undefined });
const page = await browser.newPage();

async function render(size, { opaque = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // apple-touch-icon must be square and opaque: iOS applies its own rounding.
  const inner = opaque
    ? svg.replace(/<rect [^>]*\/>/, '<rect width="512" height="512" fill="#080C16"/>')
    : svg;
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${inner}`,
  );
  return page.screenshot({ omitBackground: !opaque, clip: { x: 0, y: 0, width: size, height: size } });
}

const out = {
  "icon-192.png": await render(192),
  "icon-512.png": await render(512),
  "apple-touch-icon.png": await render(180, { opaque: true }),
};
for (const [name, buf] of Object.entries(out)) writeFileSync(path.join(pub, name), buf);

// favicon.ico: one 32x32 PNG wrapped in an ICO container
const png32 = await render(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(path.join(pub, "favicon.ico"), Buffer.concat([header, png32]));

// Social share card
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<style>
  html,body{margin:0}
  .card{width:1200px;height:630px;box-sizing:border-box;padding:96px;background:#080C16;color:#F8FAFC;
    font-family:"Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center}
  .logo{width:112px;height:112px;margin-bottom:44px}.logo svg{width:112px;height:112px}
  h1{font-size:88px;margin:0;letter-spacing:-2px}
  p{font-size:38px;color:#94A3B8;margin:24px 0 0;max-width:900px;line-height:1.3}
</style><div class="card"><div class="logo">${svg}</div><h1>Selfstack</h1>
<p>One Life Score across health, mind, relationships, work, money and growth.</p></div>`);
writeFileSync(path.join(pub, "..", "app", "opengraph-image.png"), await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));

await browser.close();
console.log("icons written to", pub);
