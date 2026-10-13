import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  migraines: defineTable({
    startTime: v.number(), // ms since epoch
    endTime: v.union(v.null(), v.number()), // null means "active"
    // Peak severity (1-10) across `readings`. Kept for older clients and the
    // calendar; `readings` is the source of truth (see lib/severity.ts).
    severity: v.number(),
    // Severity over time, oldest first; readings[0].at === startTime. Absent on
    // documents created before readings existed (read as one reading at start).
    readings: v.optional(
      v.array(v.object({ at: v.number(), severity: v.number() })),
    ),
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
