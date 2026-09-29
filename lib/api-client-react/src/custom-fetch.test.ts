import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  customFetch,
  ApiError,
  setBaseUrl,
  setAuthTokenGetter,
} from "./custom-fetch.js";

describe("customFetch - Error Paths", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setBaseUrl(null);
    setAuthTokenGetter(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setBaseUrl(null);
    setAuthTokenGetter(null);
  });

  test("throws ApiError when response.ok is false", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Something went wrong" }), {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("/api/test");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.name, "ApiError");
        assert.equal(err.status, 500);
        assert.equal(err.statusText, "Internal Server Error");
        assert.deepEqual(err.data, { error: "Something went wrong" });
        assert.equal(err.method, "GET");
        assert.equal(err.url, "/api/test");
        assert.equal(err.message, "HTTP 500 Internal Server Error: Something went wrong");
        return true;
      },
    );
  });

  test("handles JSON error body with title and detail (RFC 7807)", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          title: "Invalid Request",
          detail: "The field 'email' is required.",
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: { "content-type": "application/problem+json" },
        },
      );

    await assert.rejects(
      async () => {
        await customFetch("/api/users", { method: "POST" });
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(
          err.message,
          "HTTP 400 Bad Request: Invalid Request — The field 'email' is required.",
        );
        assert.deepEqual(err.data, {
          title: "Invalid Request",
          detail: "The field 'email' is required.",
        });
        assert.equal(err.method, "POST");
        return true;
      },
    );
  });

  test("handles JSON error body with error_description field", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error_description: "Token has expired" }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        },
      );

    await assert.rejects(
      async () => {
        await customFetch("/api/protected");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.message, "HTTP 401 Unauthorized: Token has expired");
        return true;
      },
    );
  });

  test("handles plain text error body", async () => {
    globalThis.fetch = async () =>
      new Response("Service Unavailable", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "text/plain" },
      });

    await assert.rejects(
      async () => {
        await customFetch("/api/health");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 503);
        assert.equal(err.data, "Service Unavailable");
        assert.equal(err.message, "HTTP 503 Service Unavailable: Service Unavailable");
        return true;
      },
    );
  });

  test("handles malformed JSON with JSON content-type by falling back to raw text", async () => {
    const malformedJson = "{ invalid json payload ";
    globalThis.fetch = async () =>
      new Response(malformedJson, {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("/api/broken-json");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 500);
        assert.equal(err.data, malformedJson);
        assert.equal(err.message, `HTTP 500 Internal Server Error: ${malformedJson.trim()}`);
        return true;
      },
    );
  });

  test("handles empty/no-body error responses gracefully with data: null", async () => {
    globalThis.fetch = async () =>
      new Response("", {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json", "content-length": "0" },
      });

    await assert.rejects(
      async () => {
        await customFetch("/api/missing");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        assert.equal(err.data, null);
        assert.equal(err.message, "HTTP 404 Not Found");
        return true;
      },
    );
  });

  test("handles non-JSON / non-Text blob error response when blob is available", async () => {
    const mockBlob = new Blob(["binary error content"], { type: "application/octet-stream" });
    globalThis.fetch = async () =>
      new Response(mockBlob, {
        status: 500,
        statusText: "Server Error",
        headers: { "content-type": "application/octet-stream" },
      });

    await assert.rejects(
      async () => {
        await customFetch("/api/download");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 500);
        assert.ok(err.data instanceof Blob);
        return true;
      },
    );
  });

  test("correctly attaches base URL and authorization headers even on error responses", async () => {
    setBaseUrl("https://api.example.com");
    setAuthTokenGetter(() => "secret-token");

    let capturedUrl: string | RequestInfo | URL = "";
    let capturedHeaders: Headers | undefined;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input instanceof Request ? input.url : input.toString();
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        statusText: "Forbidden",
        headers: { "content-type": "application/json" },
      });
    };

    await assert.rejects(
      async () => {
        await customFetch("/resource");
      },
      (err: any) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.url, "https://api.example.com/resource");
        assert.equal(capturedUrl, "https://api.example.com/resource");
        assert.equal(capturedHeaders?.get("authorization"), "Bearer secret-token");
        return true;
      },
    );
  });
});
