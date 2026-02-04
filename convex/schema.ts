import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Severity history entry for tracking changes over time
const severityEntry = v.object({
  timestamp: v.number(), // ms since epoch
  severity: v.number(), // 1-10
});

export default defineSchema({
  migraines: defineTable({
    startTime: v.number(), // ms since epoch
    endTime: v.union(v.null(), v.number()), // null means "active"
    severity: v.number(), // 1-10 (current/latest severity)
    severityHistory: v.optional(v.array(severityEntry)), // timestamped severity changes
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
  })
    .index("by_endTime", ["endTime"])
    .index("by_startTime", ["startTime"]),
});
