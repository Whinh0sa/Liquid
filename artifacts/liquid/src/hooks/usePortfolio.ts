/**
 * usePortfolio.ts
 * Demo-aware wrapper around useGetPortfolio.
 * Returns pre-seeded data when VITE_API_BASE_URL is not configured (Vercel frontend-only deploy).
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
  const demo = isDemoMode();
  const queryKey = getGetPortfolioQueryKey();

  const demoQuery = useQuery({
    queryKey,
    queryFn: () => Promise.resolve(getDemoPortfolioResponse()),
    enabled: demo,
    staleTime: 0,
  });

  const realQuery = useGetPortfolio({
    query: {
      queryKey,
      enabled: !demo,
      staleTime: 30_000,
      retry: 1,
    },
  }) as PortfolioQueryResult;

  if (demo) {
    return {
      ...demoQuery,
      queryKey,
    } as unknown as PortfolioQueryResult;
  }

  return realQuery;
}
