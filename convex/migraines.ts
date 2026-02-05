import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

function assertSeverity(severity: number) {
  if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
    throw new Error("Severity must be a number from 1 to 10.");
  }
}

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("migraines")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), null))
      .order("desc")
      .first();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("migraines")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
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
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    assertSeverity(args.severity);

    // Only enforce one active migraine at a time for this user
    if (!args.endTime) {
      const existingActive = await ctx.db
        .query("migraines")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("endTime"), null))
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

    return await ctx.db.insert("migraines", {
      userId,
      startTime,
      endTime,
      severity: args.severity,
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
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const migraine = await ctx.db.get(args.id);
    if (!migraine || migraine.userId !== userId) {
      throw new Error("Migraine not found");
    }

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

export const markDone = mutation({
  args: { id: v.id("migraines") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const migraine = await ctx.db.get(args.id);
    if (!migraine || migraine.userId !== userId) {
      throw new Error("Migraine not found");
    }

    await ctx.db.patch(args.id, { endTime: Date.now() });
  },
});

export const deleteMigraine = mutation({
  args: { id: v.id("migraines") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const migraine = await ctx.db.get(args.id);
    if (!migraine || migraine.userId !== userId) {
      throw new Error("Migraine not found");
    }

    await ctx.db.delete(args.id);
  },
});
