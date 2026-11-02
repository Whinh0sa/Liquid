import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import aiRouter from "../ai.js";
import { db } from "../../lib/db.js";
import * as metaAi from "../../services/metaAi.js";

// ─── Mocks (modeled on middlewares/__tests__/clerkAuth.test.ts) ───────────────

vi.mock("../../middlewares/clerkAuth.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.auth = { clerkUserId: "clerk_user_123", dbUserId: "db_user_123" };
    next();
  },
}));

vi.mock("../../lib/db.js", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("../../services/metaAi.js", () => ({
  analyzePhysicalAssets: vi.fn(),
  generateExitListing: vi.fn(),
}));

vi.mock("@workspace/db/schema", () => ({
  assets: {
    id: "assets_id",
    userId: "assets_user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  and: vi.fn((...args: unknown[]) => ({ args })),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.log = { info: vi.fn(), warn: vi.fn() };
    next();
  });
  app.use("/api/ai", aiRouter);
  return app;
}

async function post(
  app: express.Express,
  path: string,
  body: unknown,
): Promise<{ status: number; json: any }> {
  // Minimal fetch against an ephemeral server (no supertest dependency).
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } finally {
    server.close();
  }
}

describe("AI routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /scan returns 400 on invalid body", async () => {
    const app = buildApp();
    const res = await post(app, "/api/ai/scan", { mimeType: "image/png" });
    expect(res.status).toBe(400);
    expect(vi.mocked(metaAi.analyzePhysicalAssets)).not.toHaveBeenCalled();
  });

  it("POST /scan returns detected assets from the service", async () => {
    vi.mocked(metaAi.analyzePhysicalAssets).mockResolvedValue({
      source: "mock",
      analysis: {
        detectedAssets: [{ name: "MacBook Pro 14 M1 Pro" }],
        portfolioSummary: { totalDetectedValue: 1415, immediateActionCount: 2, scanNotes: "ok" },
      },
    } as any);

    const app = buildApp();
    const res = await post(app, "/api/ai/scan", { image: "ZmFrZQ==", mimeType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.json.source).toBe("mock");
    expect(res.json.detectedAssets).toHaveLength(1);
    expect(res.json.portfolioSummary.totalDetectedValue).toBe(1415);
  });

  it("POST /import-batch inserts rows scoped to dbUserId", async () => {
    const valuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "11111111-1111-4111-8111-111111111111",
          userId: "db_user_123",
          category: "TECH",
          make: "Sony",
          model: "WH-1000XM4",
          storageCapacity: null,
          purchasePrice: 16500,
          currentEstimatedValue: 16500,
          projectedDrop: 1320,
          cliffDate: new Date(Date.now() + 45 * 86_400_000),
          cliffReason: "Refresh cycle",
          status: "HOLD",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });
    vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as any);

    const app = buildApp();
    const res = await post(app, "/api/ai/import-batch", {
      assets: [{ name: "Sony WH-1000XM4", estimatedValueDollars: 165, depreciationCliffDays: 45 }],
    });

    expect(res.status).toBe(201);
    expect(res.json.success).toBe(true);
    expect(res.json.count).toBe(1);
    expect(valuesSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "db_user_123",
        make: "Sony",
        currentEstimatedValue: 16500,
        purchasePrice: 16500,
        status: "HOLD",
      }),
    ]);
    expect(res.json.importedAssets[0].currentValue).toBe(16500);
  });

  it("POST /generate-listing/:assetId returns 404 for another user's asset", async () => {
    const limitSpy = vi.fn().mockResolvedValue([]);
    const whereSpy = vi.fn().mockReturnValue({ limit: limitSpy });
    const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
    vi.mocked(db.select).mockReturnValue({ from: fromSpy } as any);

    const app = buildApp();
    const res = await post(
      app,
      "/api/ai/generate-listing/22222222-2222-4222-8222-222222222222",
      {},
    );

    expect(res.status).toBe(404);
    expect(vi.mocked(metaAi.generateExitListing)).not.toHaveBeenCalled();
  });

  it("POST /generate-listing/:assetId returns 400 for non-uuid id", async () => {
    const app = buildApp();
    const res = await post(app, "/api/ai/generate-listing/not-a-uuid", {});
    expect(res.status).toBe(400);
    expect(vi.mocked(db.select)).not.toHaveBeenCalled();
  });
});
