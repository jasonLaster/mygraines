// Generates every raster asset the PWA needs from scripts/pwa/icon.svg:
//   public/icons/*            home-screen + manifest icons
//   public/splash/WxH.png     iOS launch images (one per device size)
//   app/favicon.ico           browser tab icon
//
// Run `bun run pwa-assets` after changing the icon, the background colour or
// lib/ios-splash-devices.json.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKGROUND = "#121212"; // keep in sync with --background in globals.css
const SPLASH_TILE_CORNER_RADIUS = 0.2237; // iOS app-icon corner radius / size

const iconSvg = await readFile(join(root, "scripts/pwa/icon.svg"));
const devices = JSON.parse(
  await readFile(join(root, "lib/ios-splash-devices.json"), "utf8"),
);

const icon = (size) =>
  sharp(iconSvg, { density: (72 * size) / 1024 * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9 });

async function roundedTile(size) {
  const r = Math.round(size * SPLASH_TILE_CORNER_RADIUS);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
  return sharp(await icon(size).toBuffer())
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// --- Home-screen / manifest icons -----------------------------------------

const iconsDir = join(root, "public/icons");
await mkdir(iconsDir, { recursive: true });
await icon(180).toFile(join(iconsDir, "apple-touch-icon.png"));
await icon(192).toFile(join(iconsDir, "icon-192.png"));
await icon(512).toFile(join(iconsDir, "icon-512.png"));

// --- favicon.ico (PNG-compressed entries) ----------------------------------

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map((s) => icon(s).toBuffer()));
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(s, at); // width
  header.writeUInt8(s, at + 1); // height
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(icoImages[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += icoImages[i].length;
});
await writeFile(join(root, "app/favicon.ico"), Buffer.concat([header, ...icoImages]));

// --- iOS launch images ------------------------------------------------------

const splashDir = join(root, "public/splash");
await rm(splashDir, { recursive: true, force: true });
await mkdir(splashDir, { recursive: true });

for (const { width, height, ratio } of devices) {
  const w = width * ratio;
  const h = height * ratio;
  const shortSideCss = Math.min(width, height);
  const tileCss = Math.min(160, Math.max(96, Math.round(shortSideCss * 0.26)));
  const tile = Math.round(tileCss * ratio);
  await sharp({
    create: { width: w, height: h, channels: 3, background: BACKGROUND },
  })
    .composite([
      {
        input: await roundedTile(tile),
        left: Math.round((w - tile) / 2),
        top: Math.round((h - tile) / 2),
      },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toFile(join(splashDir, `${w}x${h}.png`));
}

console.log(
  `Wrote 3 icons, favicon.ico and ${devices.length} launch images ` +
    `(${new Set(devices.map((d) => `${d.width * d.ratio}x${d.height * d.ratio}`)).size} unique sizes).`,
);
