This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Installing on iPhone (PWA)

The app is an installable web app. Deploy it, open the HTTPS URL in **Safari**,
tap **Share → Add to Home Screen**. It then launches full screen with a launch
image, no browser chrome, and boots from on-device caches.

| Piece | Where |
| --- | --- |
| Manifest | `app/manifest.ts` |
| iOS meta tags, launch images, viewport | `app/layout.tsx` |
| Service worker (shell + asset cache, update flow) | `public/sw.js`, `app/ServiceWorkerRegistration.tsx` |
| Last-known data painted before Convex connects | `lib/use-cached-query.ts` |
| Safe-area / touch behaviour | `app/globals.css` |

Things to know:

- **The service worker only runs in production builds** (`bun run build && bun run start`). `bun run dev` never registers it.
- **Updates apply on the next launch.** A launch is served from cache while the new version downloads in the background; the launch after that runs it.
- **Changing the icon**: edit `scripts/pwa/icon.svg`, then `bun run pwa-assets` (regenerates the home-screen icons, favicon and all launch images).
- **New device sizes**: iOS shows a launch image only on an exact size match. Add the device to `lib/ios-splash-devices.json` and run `bun run pwa-assets`.
- **Adding a Material Symbols icon**: the icon font is a vendored subset. Run `bun run icons` afterwards or the new icon shows up as its raw name (e.g. "bolt").
- Convex data is cached in `localStorage` (key prefix `mygraines:v1:`); bump the version in `lib/use-cached-query.ts` if a query's result shape changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
