"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";

const STORAGE_PREFIX = "mygraines:v1:";

// What was in localStorage when the page booted. Intentionally never updated:
// it only exists to paint real content before the first live result arrives.
const bootSnapshots = new Map<string, unknown>();

function readBootSnapshot(key: string): unknown {
  if (!bootSnapshots.has(key)) {
    let value: unknown;
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) value = JSON.parse(raw);
    } catch {
      // Storage unavailable or corrupt: behave as if nothing was cached.
    }
    bootSnapshots.set(key, value);
  }
  return bootSnapshots.get(key);
}

const subscribe = () => () => {};
const getServerSnapshot = () => undefined;

/**
 * `useQuery` for argument-less queries that remembers the last result on this
 * device. Until Convex delivers the first live result, the remembered one is
 * returned, so a relaunched app paints real data immediately instead of a
 * loading state. Once live data arrives it always wins.
 *
 * - `data` is `undefined` when nothing is cached and nothing has loaded yet.
 * - `isLive` is true only for server-confirmed data. Anything that WRITES based
 *   on what it reads must check it: the cached snapshot can be stale.
 * - `skip` unsubscribes entirely (and ignores the cache).
 */
export function useCachedQuery<
  Query extends FunctionReference<"query", "public", Record<string, never>>,
>(
  query: Query,
  cacheKey: string,
  options: { skip?: boolean } = {},
): { data: FunctionReturnType<Query> | undefined; isLive: boolean } {
  const skip = options.skip === true;

  // `useQuery`'s rest-args type can't be resolved for a generic query, but this
  // hook only accepts queries without arguments.
  const live = (
    useQuery as (
      query: Query,
      args?: "skip",
    ) => FunctionReturnType<Query> | undefined
  )(query, skip ? "skip" : undefined);

  // Server render and hydration see `undefined` (matching the prerendered
  // HTML); React then re-renders with the cached value before the next paint.
  const cached = useSyncExternalStore(
    subscribe,
    () => readBootSnapshot(cacheKey),
    getServerSnapshot,
  ) as FunctionReturnType<Query> | undefined;

  useEffect(() => {
    if (live === undefined) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + cacheKey, JSON.stringify(live));
    } catch {
      // Quota exceeded or storage disabled: caching is best-effort.
    }
  }, [live, cacheKey]);

  if (skip) return { data: undefined, isLive: false };
  return live === undefined
    ? { data: cached, isLive: false }
    : { data: live, isLive: true };
}
