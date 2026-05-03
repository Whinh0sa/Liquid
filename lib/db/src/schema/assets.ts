import { pgTable, text, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const assetStatusEnum = pgEnum("asset_status", [
  "HOLD",
  "LIQUIDATE",
  "IN_TRANSIT",
  "ACTION_REQUIRED",
]);

export const assetConditionEnum = pgEnum("asset_condition", [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
]);

export const assetsTable = pgTable("assets", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  model: text("model").notNull(),
  condition: assetConditionEnum("condition").notNull().default("GOOD"),
  purchasePrice: integer("purchase_price").notNull(),
  currentValue: integer("current_value").notNull(),
  cliffDaysAway: integer("cliff_days_away").notNull(),
  cliffProjectedDrop: integer("cliff_projected_drop").notNull(),
  cliffReason: text("cliff_reason").notNull(),
  status: assetStatusEnum("status").notNull().default("HOLD"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ createdAt: true, updatedAt: true });
export const selectAssetSchema = createSelectSchema(assetsTable);
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
