import { pgTable, uuid, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { assetsTable } from "./assets";

export const sellTransactionsTable = pgTable("sell_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assetsTable.id, { onDelete: "cascade" }),
  salePrice: integer("sale_price").notNull(),
  dropAvoided: integer("drop_avoided").notNull().default(0),
  platform: text("platform"),
  notes: text("notes"),
  soldAt: timestamp("sold_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSellTransactionSchema = createInsertSchema(sellTransactionsTable).omit({ id: true, createdAt: true });
export const selectSellTransactionSchema = createSelectSchema(sellTransactionsTable);
export type InsertSellTransaction = z.infer<typeof insertSellTransactionSchema>;
export type SellTransaction = typeof sellTransactionsTable.$inferSelect;
