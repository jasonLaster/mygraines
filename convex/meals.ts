import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("meals")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("meals")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    description: v.string(),
    timestamp: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.description.trim()) {
      throw new Error("Meal description is required.");
    }

    const timestamp = args.timestamp ?? Date.now();

    return await ctx.db.insert("meals", {
      description: args.description.trim(),
      timestamp,
      notes: args.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("meals"),
    description: v.optional(v.string()),
    timestamp: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    
    if (args.description !== undefined) {
      if (!args.description.trim()) {
        throw new Error("Meal description cannot be empty.");
      }
      patch.description = args.description.trim();
    }
    if (args.timestamp !== undefined) patch.timestamp = args.timestamp;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.id, patch);
  },
});

export const deleteMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
