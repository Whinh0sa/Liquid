import { describe, it, expect, vi } from "vitest";
import { createRateLimiter } from "../rateLimiter.js";
import type { Request, Response } from "express";

describe("rateLimiter middleware", () => {
  it("allows requests under the limit and blocks requests over the limit", () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      keyGenerator: () => "test-user-1",
    });

    const mockReq = {} as Request;
    const createMockRes = () => {
      const headers: Record<string, any> = {};
      const res: Partial<Response> = {
        setHeader: vi.fn((k, v) => {
          headers[k] = v;
          return res as Response;
        }),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      return { res: res as Response, headers };
    };

    const next1 = vi.fn();
    const { res: res1 } = createMockRes();
    limiter(mockReq, res1, next1);
    expect(next1).toHaveBeenCalled();

    const next2 = vi.fn();
    const { res: res2 } = createMockRes();
    limiter(mockReq, res2, next2);
    expect(next2).toHaveBeenCalled();

    // 3rd request exceeds max: 2
    const next3 = vi.fn();
    const { res: res3 } = createMockRes();
    limiter(mockReq, res3, next3);
    expect(next3).not.toHaveBeenCalled();
    expect(res3.status).toHaveBeenCalledWith(429);
  });
});
