// ─── AI Routes (DIR-002) ──────────────────────────────────────────────────────
// All routes require Clerk authentication via requireAuth.
// Every DB query is scoped to req.auth.dbUserId.
// POST /api/ai/scan                      → Muse Spark spatial scan (or mock)
// POST /api/ai/import-batch              → persist scanned assets for the user
// POST /api/ai/generate-listing/:assetId → exit listing draft for an owned asset

import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assets } from "@workspace/db/schema";
import { db } from "../lib/db.js";
import { requireAuth } from "../middlewares/clerkAuth.js";
import { analyzePhysicalAssets, generateExitListing } from "../services/metaAi.js";

const router = Router();
router.use(requireAuth);

function daysAwayFromCliff(cliffDate: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((cliffDate.getTime() - Date.now()) / msPerDay);
}

function toApiAsset(row: typeof assets.$inferSelect) {
  return {
    id: row.id,
    category: row.category,
    make: row.make,
    model: row.model,
    storageCapacity: row.storageCapacity ?? undefined,
    purchasePrice: row.purchasePrice,
    currentValue: row.currentEstimatedValue,
    depreciationCliff: {
      daysAway: daysAwayFromCliff(row.cliffDate),
      projectedDrop: row.projectedDrop,
      reason: row.cliffReason ?? "Market event",
    },
    status: row.status,
  };
}

function splitName(name: string): { make: string; model: string } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { make: trimmed, model: trimmed };
  return { make: trimmed.slice(0, firstSpace), model: trimmed.slice(firstSpace + 1) };
}

// ─── POST /api/ai/scan ────────────────────────────────────────────────────────

const ScanBody = z.object({
  image: z.string().min(1).max(14_000_000),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/).optional(),
});

router.post("/scan", async (req, res) => {
  const result = ScanBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const { analysis, source } = await analyzePhysicalAssets(result.data.image, result.data.mimeType);
  req.log.info({ source, detected: analysis.detectedAssets.length }, "AI spatial scan completed");
  res.json({ source, ...analysis });
});

// ─── POST /api/ai/import-batch ────────────────────────────────────────────────

const ImportAsset = z
  .object({
    name: z.string().min(1).max(200),
    make: z.string().min(1).max(80).optional(),
    model: z.string().min(1).max(120).optional(),
    storageCapacity: z.string().max(40).optional(),
    category: z.enum(["TECH", "FASHION"]).default("TECH"),
    condition: z.string().max(40).optional(),
    estimatedValueDollars: z.number().positive().max(10_000_000).optional(),
    estimatedValueCents: z.number().int().positive().max(1_000_000_000).optional(),
    depreciationCliffDays: z.number().int().min(0).max(3650).default(90),
    projectedDropDollars: z.number().nonnegative().max(10_000_000).optional(),
    projectedDropCents: z.number().int().nonnegative().max(1_000_000_000).optional(),
    cliffReason: z.string().max(255).optional(),
    sellRecommendation: z.string().max(500).optional(),
  })
  .refine((a) => a.estimatedValueDollars !== undefined || a.estimatedValueCents !== undefined, {
    message: "estimatedValueDollars or estimatedValueCents is required",
  });

const ImportBatchBody = z.object({
  assets: z.array(ImportAsset).min(1).max(50),
});

router.post("/import-batch", async (req, res) => {
  const result = ImportBatchBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const now = Date.now();
  const msPerDay = 86_400_000;

  const rows = result.data.assets.map((a) => {
    const valueCents = a.estimatedValueCents ?? Math.round((a.estimatedValueDollars ?? 0) * 100);
    const dropCents =
      a.projectedDropCents ??
      (a.projectedDropDollars !== undefined
        ? Math.round(a.projectedDropDollars * 100)
        : Math.round(valueCents * 0.08));
    const split = splitName(a.name);
    return {
      userId: req.auth.dbUserId,
      category: a.category,
      make: a.make ?? split.make,
      model: a.model ?? a.name.trim(),
      storageCapacity: a.storageCapacity,
      // A scan has no purchase data — purchase = current value is intentional.
      purchasePrice: valueCents,
      currentEstimatedValue: valueCents,
      projectedDrop: dropCents,
      cliffDate: new Date(now + a.depreciationCliffDays * msPerDay),
      cliffReason: a.cliffReason ?? (a.sellRecommendation ? a.sellRecommendation.slice(0, 255) : undefined),
      status: (a.depreciationCliffDays <= 21 ? "ACTION_REQUIRED" : "HOLD") as "ACTION_REQUIRED" | "HOLD",
    };
  });

  const inserted = await db.insert(assets).values(rows).returning();
  req.log.info({ count: inserted.length }, "AI batch import completed");
  res.status(201).json({
    success: true,
    count: inserted.length,
    importedAssets: inserted.map(toApiAsset),
  });
});

// ─── POST /api/ai/generate-listing/:assetId ───────────────────────────────────

const AssetIdParams = z.object({ assetId: z.string().uuid() });

router.post("/generate-listing/:assetId", async (req, res) => {
  const params = AssetIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid asset ID" });
    return;
  }

  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, params.data.assetId), eq(assets.userId, req.auth.dbUserId)))
    .limit(1);

  if (!asset) {
    res.status(404).json({ error: `Asset ${params.data.assetId} not found` });
    return;
  }

  const { listing, source } = await generateExitListing({
    name: `${asset.make} ${asset.model}`.trim(),
    category: asset.category,
    condition: "Good",
    estimatedValueDollars: asset.currentEstimatedValue / 100,
  });

  req.log.info({ assetId: asset.id, source }, "AI exit listing generated");
  res.json({ assetId: asset.id, source, listing });
});

export default router;

