"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useMemo } from "react";

function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. Run `bunx convex dev` to create `.env.local`.",
    );
  }
  return url;
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => new ConvexReactClient(getConvexUrl()), []);
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}



