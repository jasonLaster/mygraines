// Service worker for My Migraines.
//
// Goal: launching the installed app never waits on the network.
//
//  - The HTML shell ("/") is served from cache immediately and refreshed in the
//    background (stale-while-revalidate), so a launch is never blocked on it.
//  - Every /_next/static asset the shell references (JS, CSS, fonts) is cached
//    when the shell is cached, so the app boots entirely from disk. Assets are
//    content-hashed, so cache-first is always safe.
//  - Everything else (Convex websocket, API calls, other origins) is untouched.
//
// Deploys need no version bump: the refreshed shell references the new hashed
// assets, which are cached alongside it, and the next launch uses both. Bump
// CACHE_VERSION only if this file's own caching strategy changes.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const MAX_ASSET_ENTRIES = 160; // a few deploys' worth; oldest are evicted first

// Matches asset paths in HTML (attributes and inline flight data) and in CSS.
const ASSET_PATH = /\/_next\/static\/[^"'\\\s<>()]+/g;
const CSS_URL = /url\(\s*["']?([^"')\s]+)["']?\s*\)/g;

const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
  '<body style="margin:0;display:grid;place-items:center;height:100vh;background:#121212;' +
  'color:#fcfcf8;font:16px system-ui,sans-serif;text-align:center;padding:24px">' +
  "<p>You're offline.<br>Open My Migraines once while online to enable offline launch.</p>";

self.addEventListener("install", (event) => {
  // Seed the caches now so the very first relaunch is already instant. Never
  // fail the install over this: runtime caching fills in whatever is missing.
  event.waitUntil(
    refreshShell()
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      for (const name of await caches.keys()) {
        if (!keep.has(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "revalidate") {
    event.waitUntil(refreshShell().catch(() => {}));
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(respondWithShell(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(respondWithAsset(event));
  }
});

// --- Shell ------------------------------------------------------------------

async function respondWithShell(event) {
  const shells = await caches.open(SHELL_CACHE);
  const cached = await shells.match("/");

  // Always revalidate, whether or not we have a cached copy.
  const network = fetchShell();
  event.waitUntil(
    network
      .then((response) => response.ok && cacheAssetsFrom(response.clone()))
      .catch(() => {}),
  );

  if (cached) return cached;

  try {
    return await network;
  } catch {
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// Fetches the shell from the network and stores it. Resolves with the response.
async function fetchShell() {
  const response = await fetch("/", { cache: "no-cache" });
  // A redirected response can't be used to answer a navigation request.
  if (response.ok && !response.redirected) {
    const shells = await caches.open(SHELL_CACHE);
    await shells.put("/", response.clone());
  }
  return response;
}

async function refreshShell() {
  const response = await fetchShell();
  if (response.ok) await cacheAssetsFrom(response);
}

// --- Assets -----------------------------------------------------------------

async function respondWithAsset(event) {
  const { request } = event;
  const cache = await caches.open(ASSET_CACHE);
  // Filenames are content-hashed; ignore ?dpl=… style cache-busting params.
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(
      cache
        .put(request, response.clone())
        .then(() => trim(cache))
        .catch(() => {}),
    );
  }
  return response;
}

// Caches every /_next/static asset referenced by the shell HTML, plus the
// fonts and other assets those stylesheets reference.
async function cacheAssetsFrom(shellResponse) {
  const html = await shellResponse.text();
  const cache = await caches.open(ASSET_CACHE);

  const scripts = unique(html.match(ASSET_PATH) ?? []);
  const fetched = await cacheAll(cache, scripts);

  const nested = [];
  for (const { path, response } of fetched) {
    if (!path.split("?")[0].endsWith(".css")) continue;
    const css = await response.clone().text();
    for (const [, ref] of css.matchAll(CSS_URL)) {
      const resolved = new URL(ref, new URL(path, self.location.origin));
      if (
        resolved.origin === self.location.origin &&
        resolved.pathname.startsWith("/_next/static/")
      ) {
        nested.push(resolved.pathname + resolved.search);
      }
    }
  }
  await cacheAll(cache, unique(nested));
  await trim(cache);
}

// Ensures each path is in the cache, fetching the missing ones in parallel.
// Resolves with the entries that are available; individual failures are skipped.
async function cacheAll(cache, paths) {
  const entries = await Promise.all(
    paths.map(async (path) => {
      try {
        let response = await cache.match(path);
        if (!response) {
          response = await fetch(path);
          if (!response.ok) return null;
          await cache.put(path, response.clone());
        }
        return { path, response };
      } catch {
        return null;
      }
    }),
  );
  return entries.filter(Boolean);
}

async function trim(cache) {
  const keys = await cache.keys(); // insertion order: oldest first
  const excess = keys.length - MAX_ASSET_ENTRIES;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

function unique(list) {
  return [...new Set(list)];
}
