// Vendors a subset of the Material Symbols Outlined font containing only the
// icons this app uses, so the font ships with the app (same origin, preloaded,
// cached by the service worker) instead of loading 1.1 MB from Google at launch.
//
// Run `bun run icons` after adding or removing a Material Symbols icon.
// Output: app/fonts/material-symbols-outlined.woff2

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "app/fonts/material-symbols-outlined.woff2");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) yield path;
  }
}

// Icon names appear as <span className="material-symbols-outlined">name</span>
// and as `icon: "name"` in lookup tables that feed {details.icon}.
const JSX_ICON = /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g;
const TABLE_ICON = /\bicon:\s*"([a-z0-9_]+)"/g;

const names = new Set();
for (const dir of ["app", "components"]) {
  for await (const file of walk(join(root, dir))) {
    const source = await readFile(file, "utf8");
    for (const re of [JSX_ICON, TABLE_ICON]) {
      for (const match of source.matchAll(re)) names.add(match[1]);
    }
  }
}
const icons = [...names].sort();
if (icons.length === 0) throw new Error("No Material Symbols icons found.");

// An iOS Safari UA makes Google return woff2. Omitting the variable axes yields
// the default instance (FILL 0, wght 400, GRAD 0, opsz 24), which is the only
// style the app uses.
const cssUrl =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" +
  `&icon_names=${icons.join(",")}&display=block`;
const cssRes = await fetch(cssUrl, {
  headers: {
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
});
if (!cssRes.ok) throw new Error(`Google Fonts CSS request failed: ${cssRes.status}`);
const fontUrl = (await cssRes.text()).match(
  /url\((https:[^)]+)\)\s*format\('woff2'\)/,
)?.[1];
if (!fontUrl) throw new Error("Could not find a woff2 URL in the Google Fonts CSS.");

const fontRes = await fetch(fontUrl);
if (!fontRes.ok) throw new Error(`Font download failed: ${fontRes.status}`);
const font = Buffer.from(await fontRes.arrayBuffer());

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, font);
console.log(`${icons.length} icons: ${icons.join(", ")}`);
console.log(`Wrote ${OUT.replace(root + "/", "")} (${font.length} bytes)`);
