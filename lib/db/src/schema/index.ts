// ─── Liquid — Production Database Schema ─────────────────────────────────────
//
// Dialect:  PostgreSQL (via drizzle-orm/pg-core)
// ORM:      Drizzle ORM
// Zod:      drizzle-zod (strict insert / select schemas auto-derived from tables)
//
// Tables:
//   users         — platform accounts
//   assets        — physical items tracked in a user's portfolio
//   price_alerts  — per-asset price-floor notifications
//
// Relations:
//   users    1 ──< assets       (one user → many assets)
//   assets   1 ──< price_alerts (one asset → many alerts)
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ───────────────────────────────────────────────────────────────────

/**
 * High-level asset categories.
 * TECH   — electronics, hardware, peripherals
 * FASHION — clothing, watches, accessories
 */
export const assetCategoryEnum = pgEnum("asset_category", [
  "TECH",
  "FASHION",
]);

/**
 * Lifecycle / urgency status of an asset.
 * Mirrors the client-side AssetStatus values in @workspace/api-zod.
 *
 * HOLD            — monitoring, no action required yet
 * ACTION_REQUIRED — approaching cliff; user should plan to sell
 * LIQUIDATE       — sale order placed
 * IN_TRANSIT      — item shipped / sale confirmed
 */
export const assetStatusEnum = pgEnum("asset_status", [
  "HOLD",
  "ACTION_REQUIRED",
  "LIQUIDATE",
  "IN_TRANSIT",
]);

// ─── Table: users ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Clerk's user ID (e.g. "user_2abc...").
     * This is the primary link between Clerk JWTs and the database.
     * Set on first authenticated request (auto-provisioned).
     */
    clerkUserId: text("clerk_user_id").notNull(),

    /** Unique login email — sourced from Clerk on provisioning. */
    email: text("email").notNull(),

    /** Display name shown in the UI — sourced from Clerk. */
    displayName: text("display_name"),

    /** UTC timestamp when the account was created. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    /** UTC timestamp of the most recent request from this user. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    // The primary lookup index — used on every authenticated request.
    uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
    // Secondary index for email-based lookups.
    uniqueIndex("users_email_idx").on(table.email),
  ],
);

// ─── Table: assets ────────────────────────────────────────────────────────────

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /** Owner of this asset — references users.id. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ── Classification ────────────────────────────────────────────────────
    category: assetCategoryEnum("category").notNull().default("TECH"),

    /** Brand / manufacturer e.g. "Apple", "Sony". */
    make: text("make").notNull(),

    /** Specific product model e.g. "iPhone 14 Pro". */
    model: text("model").notNull(),

    /**
     * Storage / size variant for electronics (e.g. "256GB").
     * Optional — not all categories need this field.
     */
    storageCapacity: text("storage_capacity"),

    // ── Pricing (all values stored in cents to avoid floating-point drift) ──
    /** Original purchase price in cents. */
    purchasePrice: integer("purchase_price").notNull(),

    /** Current estimated resale value in cents. */
    currentEstimatedValue: integer("current_estimated_value").notNull(),

    /**
     * Projected value drop at the depreciation cliff, in cents.
     * Used by computeSellWindow() to calculate urgency.
     */
    projectedDrop: integer("projected_drop").notNull().default(0),

    // ── Depreciation Cliff ────────────────────────────────────────────────
    /**
     * UTC date/time of the expected depreciation cliff.
     * The sell-window algorithm derives daysAway from this field at runtime.
     */
    cliffDate: timestamp("cliff_date", { withTimezone: true }).notNull(),

    /**
     * Human-readable reason for the cliff e.g. "Apple Fall Keynote Expected".
     * Displayed verbatim in the UI.
     */
    cliffReason: text("cliff_reason"),

    // ── Lifecycle Status ──────────────────────────────────────────────────
    status: assetStatusEnum("status").notNull().default("HOLD"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Fast portfolio queries for a single user.
    index("assets_user_id_idx").on(table.userId),

    // Fast range queries across all users approaching their cliff.
    // Used by scheduled jobs to surface urgent assets.
    index("assets_cliff_date_idx").on(table.cliffDate),

    // Composite index for the most common dashboard query:
    // "give me all HOLD assets for user X ordered by cliff".
    index("assets_user_status_cliff_idx").on(
      table.userId,
      table.status,
      table.cliffDate,
    ),
  ],
);

// ─── Table: price_alerts ─────────────────────────────────────────────────────

export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /** The asset this alert belongs to — references assets.id. */
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),

    /**
     * Floor price in cents. The alert fires when currentEstimatedValue
     * drops to or below this threshold.
     */
    targetPrice: integer("target_price").notNull(),

    /** True while the alert is monitoring. False once dismissed. */
    isActive: boolean("is_active").notNull().default(true),

    /**
     * UTC timestamp when the alert condition was first met.
     * Null until the alert triggers.
     */
    triggeredAt: timestamp("triggered_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Fast lookup of all alerts for a given asset.
    index("price_alerts_asset_id_idx").on(table.assetId),

    // Efficient polling: find all active alerts that haven't triggered yet.
    index("price_alerts_active_idx").on(table.isActive),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  /** All assets in this user's portfolio. */
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  /** The account that owns this asset. */
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),

  /** All price-floor alerts configured for this asset. */
  priceAlerts: many(priceAlerts),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  /** The asset this alert monitors. */
  asset: one(assets, {
    fields: [priceAlerts.assetId],
    references: [assets.id],
  }),
}));

// ─── Zod Schemas (drizzle-zod) ────────────────────────────────────────────────
//
// Insert schemas:  strip DB-generated fields (id, createdAt, updatedAt).
//                  Used for API request body validation.
//
// Select schemas:  full row shape returned from a SELECT.
//                  Used for API response typing and frontend contracts.
//

// — users —
export const insertUserSchema = createInsertSchema(users, {
  clerkUserId: (s) => s.min(1).max(255),
  email: (s) => s.email(),
  displayName: (s) => s.max(120).optional(),
}).omit({ id: true, createdAt: true, lastSeenAt: true });

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

// — assets —
export const insertAssetSchema = createInsertSchema(assets, {
  make: (s) => s.min(1).max(80),
  model: (s) => s.min(1).max(120),
  storageCapacity: (s) => s.max(40).optional(),
  cliffReason: (s) => s.max(255).optional(),
  purchasePrice: (s) => s.int().positive(),
  currentEstimatedValue: (s) => s.int().positive(),
  projectedDrop: (s) => s.int().nonnegative(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectAssetSchema = createSelectSchema(assets);

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = z.infer<typeof selectAssetSchema>;

// — price_alerts —
export const insertPriceAlertSchema = createInsertSchema(priceAlerts, {
  targetPrice: (s) => s.int().positive(),
}).omit({ id: true, createdAt: true, triggeredAt: true });

export const selectPriceAlertSchema = createSelectSchema(priceAlerts);

export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = z.infer<typeof selectPriceAlertSchema>;

// ─── Convenience re-exports ───────────────────────────────────────────────────
// Allow consumers to import enum value sets for validation / mapping.

export type AssetCategory = (typeof assetCategoryEnum.enumValues)[number];
export type AssetStatus = (typeof assetStatusEnum.enumValues)[number];