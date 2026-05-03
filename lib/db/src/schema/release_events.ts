import { pgTable, serial, text, integer, timestamp, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventSeverityEnum = pgEnum("event_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const releaseEventsTable = pgTable("release_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  affectsModel: text("affects_model").notNull(),
  estimatedImpactPct: integer("estimated_impact_pct").notNull(),
  severity: eventSeverityEnum("severity").notNull(),
  eventDate: date("event_date"),
  daysAway: integer("days_away").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReleaseEventSchema = createInsertSchema(releaseEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectReleaseEventSchema = createSelectSchema(releaseEventsTable);
export type InsertReleaseEvent = z.infer<typeof insertReleaseEventSchema>;
export type ReleaseEvent = typeof releaseEventsTable.$inferSelect;
