import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  normalizeReadings,
  peakSeverity,
  readingsOf,
  resolveReadings,
} from "../lib/severity";

function assertSeverity(severity: number) {
  if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
    throw new Error("Severity must be a number from 1 to 10.");
  }
}

function assertReadings(readings: { at: number; severity: number }[]) {
  for (const r of readings) {
    assertSeverity(r.severity);
    if (!Number.isFinite(r.at)) throw new Error("Reading time must be a number.");
  }
}

const readingValidator = v.object({ at: v.number(), severity: v.number() });

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("migraines")
      .withIndex("by_endTime", (q) => q.eq("endTime", null))
      .order("desc")
      .first();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("migraines")
      .withIndex("by_startTime")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    // Initial severity. Optional `readings` supplies a whole timeline instead.
    severity: v.number(),
    readings: v.optional(v.array(readingValidator)),
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertSeverity(args.severity);
    if (args.readings) assertReadings(args.readings);

    const now = Date.now();
    const startTime = args.startTime ?? now;
    const endTime = args.endTime ?? null;
    const readings = normalizeReadings(
      args.readings ?? [{ at: startTime, severity: args.severity }],
      startTime,
      endTime,
    );

    return await ctx.db.insert("migraines", {
      startTime,
      endTime,
      severity: peakSeverity(readings),
      readings,
      notes: args.notes,
      triggers: args.triggers,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("migraines"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.union(v.null(), v.number())),
    // Full edited timeline from current clients. Wins over `severity`.
    readings: v.optional(v.array(readingValidator)),
    // Single value from older clients; applied to the latest reading.
    severity: v.optional(v.number()),
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.severity !== undefined) assertSeverity(args.severity);
    if (args.readings) assertReadings(args.readings);

    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Migraine not found.");

    const startTime = args.startTime ?? doc.startTime;
    const endTime = args.endTime !== undefined ? args.endTime : doc.endTime;
    // Every update re-fits the timeline to the (possibly changed) start/end and
    // keeps `severity` equal to its peak. Legacy documents gain `readings` here.
    const readings = resolveReadings({
      existing: readingsOf(doc),
      provided: args.readings,
      legacySeverity: args.severity,
      startTime,
      endTime,
    });

    const patch: Record<string, unknown> = {
      startTime,
      endTime,
      readings,
      severity: peakSeverity(readings),
    };
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.triggers !== undefined) patch.triggers = args.triggers;

    await ctx.db.patch(args.id, patch);
  },
});

export const markDone = mutation({
  args: { id: v.id("migraines") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { endTime: Date.now() });
  },
});

export const deleteMigraine = mutation({
  args: { id: v.id("migraines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
