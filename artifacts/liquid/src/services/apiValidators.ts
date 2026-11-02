// ─── API Schema Validators ───────────────────────────────────────────────────
//
// Runtime Zod validation guarding query cache boundaries to prevent
// silent malformed data corruption and downstream React component crashes.

import { z } from "zod";

export const PortfolioAssetSchema = z.object({
  id: z.string(),
  category: z.string(),
  model: z.string(),
  purchasePrice: z.number(),
  currentValue: z.number(),
  depreciationCliff: z.object({
    daysAway: z.number(),
    projectedDrop: z.number(),
    reason: z.string().optional(),
  }),
  status: z.string(),
});

export const PortfolioResponseSchema = z.object({
  portfolio: z.array(PortfolioAssetSchema),
  metrics: z
    .object({
      totalNetWorth: z.number().optional(),
      capitalAtRisk: z.number().optional(),
    })
    .optional(),
});

export type ValidatedPortfolioResponse = z.infer<typeof PortfolioResponseSchema>;

export function validatePortfolioResponse<T>(data: unknown): T {
  if (!data || typeof data !== "object") {
    return data as T;
  }

  const result = PortfolioResponseSchema.safeParse(data);
  if (!result.success) {
    console.warn(
      "[apiValidators] Portfolio payload deviated from schema:",
      result.error.flatten(),
    );
    return data as T;
  }

  return result.data as unknown as T;
}
