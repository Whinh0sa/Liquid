import { Router } from "express";
import {
  UpdateAssetStatusParams,
  UpdateAssetStatusBody,
} from "@workspace/api-zod";

const router = Router();

// ─── THE DIGITAL TWIN DATABASE ───────────────────────────────────────────────
// Structure: Fixed tech assets with algorithmic depreciation curves.
// Values stored in cents to prevent floating-point math errors.
// Mutable in-process for demo; in production this would be Drizzle/Postgres.
interface DepreciationCliff {
  daysAway: number;
  projectedDrop: number;
  reason: string;
}

type AssetStatus = "HOLD" | "LIQUIDATE" | "IN_TRANSIT" | "ACTION_REQUIRED";

interface Asset {
  id: string;
  category: string;
  model: string;
  purchasePrice: number;
  currentValue: number;
  depreciationCliff: DepreciationCliff;
  status: AssetStatus;
}

const userPortfolio: Asset[] = [
  {
    id: "AST-001",
    category: "Hardware",
    model: "iPhone 14 Pro - 256GB",
    purchasePrice: 109900,
    currentValue: 65000,
    depreciationCliff: {
      daysAway: 12,
      projectedDrop: 15000,
      reason: "Apple Fall Keynote Expected",
    },
    status: "HOLD",
  },
  {
    id: "AST-002",
    category: "Hardware",
    model: "MacBook Pro M2 - 14 inch",
    purchasePrice: 199900,
    currentValue: 120000,
    depreciationCliff: {
      daysAway: 85,
      projectedDrop: 20000,
      reason: "Historical Q4 hardware cycle",
    },
    status: "HOLD",
  },
  {
    id: "AST-003",
    category: "Optics",
    model: "Sony A7IV Body",
    purchasePrice: 249800,
    currentValue: 210000,
    depreciationCliff: {
      daysAway: 3,
      projectedDrop: 35000,
      reason: "Competitor Firmware Release",
    },
    status: "ACTION_REQUIRED",
  },
  {
    id: "AST-004",
    category: "Hardware",
    model: "iPad Pro M4 - 13 inch",
    purchasePrice: 139900,
    currentValue: 105000,
    depreciationCliff: {
      daysAway: 42,
      projectedDrop: 12000,
      reason: "Expected iPadOS refresh cycle",
    },
    status: "HOLD",
  },
  {
    id: "AST-005",
    category: "Audio",
    model: "Sony WH-1000XM5",
    purchasePrice: 39900,
    currentValue: 28000,
    depreciationCliff: {
      daysAway: 8,
      projectedDrop: 8000,
      reason: "New model rumored — XM6",
    },
    status: "ACTION_REQUIRED",
  },
];

// ─── GET /api/portfolio ───────────────────────────────────────────────────────
router.get("/portfolio", async (req, res) => {
  // Simulate network latency for realism
  await new Promise((resolve) => setTimeout(resolve, 800));

  const totalValueCents = userPortfolio.reduce(
    (acc, item) => acc + item.currentValue,
    0,
  );

  // Capital at risk: cliffs within 15 days
  const totalAtRiskCents = userPortfolio
    .filter((item) => item.depreciationCliff.daysAway < 15)
    .reduce((acc, item) => acc + item.depreciationCliff.projectedDrop, 0);

  res.json({
    portfolio: userPortfolio,
    metrics: {
      totalNetWorth: totalValueCents / 100,
      capitalAtRisk: totalAtRiskCents / 100,
    },
  });
});

// ─── PATCH /api/portfolio/:id ─────────────────────────────────────────────────
router.patch("/portfolio/:id", (req, res) => {
  const paramsResult = UpdateAssetStatusParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid asset ID" });
    return;
  }

  const bodyResult = UpdateAssetStatusBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  const { id } = paramsResult.data;
  const { status } = bodyResult.data;

  const asset = userPortfolio.find((a) => a.id === id);
  if (!asset) {
    res.status(404).json({ error: `Asset ${id} not found` });
    return;
  }

  asset.status = status as AssetStatus;
  req.log.info({ id, status }, "Asset status updated");

  res.json(asset);
});

export default router;
