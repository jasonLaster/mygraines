import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function assertSeverity(severity: number) {
  if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
    throw new Error("Severity must be a number from 1 to 10.");
  }
}

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
    severity: v.number(),
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertSeverity(args.severity);

    // Only enforce one active migraine at a time
    if (!args.endTime) {
      const existingActive = await ctx.db
        .query("migraines")
        .withIndex("by_endTime", (q) => q.eq("endTime", null))
        .first();
      if (existingActive) {
        throw new Error(
          "There is already an active migraine. Mark it done before starting a new one."
        );
      }
    }

    const now = Date.now();
    const startTime = args.startTime ?? now;
    const endTime = args.endTime ?? null;

    // Initialize severity history with the starting severity
    const severityHistory = [{ timestamp: startTime, severity: args.severity }];

    return await ctx.db.insert("migraines", {
      startTime,
      endTime,
      severity: args.severity,
      severityHistory,
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
    severity: v.optional(v.number()),
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.severity !== undefined) assertSeverity(args.severity);

    const patch: Record<string, unknown> = {};
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (args.severity !== undefined) patch.severity = args.severity;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.triggers !== undefined) patch.triggers = args.triggers;

    await ctx.db.patch(args.id, patch);
  },
});

// Add a timestamped severity adjustment to an active migraine
export const recordSeverityChange = mutation({
  args: {
    id: v.id("migraines"),
    severity: v.number(),
    timestamp: v.optional(v.number()), // optional custom timestamp, defaults to now
  },
  handler: async (ctx, args) => {
    assertSeverity(args.severity);

    const migraine = await ctx.db.get(args.id);
    if (!migraine) {
      throw new Error("Migraine not found");
    }

    const timestamp = args.timestamp ?? Date.now();
    const newEntry = { timestamp, severity: args.severity };

    // Get existing history or initialize empty array
    const existingHistory = migraine.severityHistory || [];

    // Add new entry and sort by timestamp
    const updatedHistory = [...existingHistory, newEntry].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    await ctx.db.patch(args.id, {
      severity: args.severity, // Update current severity
      severityHistory: updatedHistory,
    });
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
