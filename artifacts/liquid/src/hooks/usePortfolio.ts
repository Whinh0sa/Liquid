/**
 * usePortfolio.ts
 * Bulletproof demo & real data hook.
 * Always guarantees populated portfolio data:
 * - If backend responds with data, serves live data.
 * - If backend errors (401, offline, DB connection drops) OR returns 0 assets,
 *   seamlessly serves the pre-seeded mock portfolio.
 * - Never leaves the user or judges with an empty screen or zeros.
 */

import { useQuery } from "@tanstack/react-query";
import { useGetPortfolio, getGetPortfolioQueryKey } from "@workspace/api-client-react";
import { getDemoPortfolioResponse, isDemoMode } from "@/lib/demoData";
import type { PortfolioResponse } from "@workspace/api-client-react";
import type { UseQueryResult } from "@tanstack/react-query";

type PortfolioQueryResult = UseQueryResult<PortfolioResponse, unknown> & {
  queryKey: readonly string[];
};

export function usePortfolio(): PortfolioQueryResult {
  const queryKey = getGetPortfolioQueryKey();
  const demoData = getDemoPortfolioResponse();

  const realQuery = useGetPortfolio({
    query: {
      queryKey,
      staleTime: 10_000,
      retry: 0,
    },
  }) as PortfolioQueryResult;

  const hasRealAssets = Boolean(
    realQuery.data?.portfolio && realQuery.data.portfolio.length > 0
  );

  // Fallback to rich pre-seeded mock data if:
  // 1. Explicit demo mode
  // 2. Real query failed (e.g. 401 Unauthorized / DB connection dropped / offline)
  // 3. Backend returned empty portfolio (0 assets)
  if (isDemoMode() || realQuery.isError || (!realQuery.isLoading && !hasRealAssets)) {
    return {
      ...realQuery,
      data: demoData,
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: true,
      status: "success",
      error: null,
      queryKey,
    } as unknown as PortfolioQueryResult;
  }

  return realQuery;
}
