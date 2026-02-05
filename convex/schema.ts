import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  migraines: defineTable({
    startTime: v.number(), // ms since epoch
    endTime: v.union(v.null(), v.number()), // null means "active"
    severity: v.number(), // 1-10
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  })
    .index("by_endTime", ["endTime"])
    .index("by_startTime", ["startTime"]),

  meals: defineTable({
    timestamp: v.number(), // ms since epoch - when the meal was eaten
    description: v.string(), // simple text description of the meal
    notes: v.optional(v.string()), // optional additional notes
  })
    .index("by_timestamp", ["timestamp"]),
});
