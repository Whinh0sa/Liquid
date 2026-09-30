import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { customFetch, ApiError } from "./custom-fetch.js";

describe("customFetch - Error Paths", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws ApiError when response is not OK (e.g. 500 Internal Server Error)", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Internal server error" }), {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/data");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.name, "ApiError");
        assert.equal(error.status, 500);
        assert.equal(error.statusText, "Internal Server Error");
        assert.deepEqual(error.data, { message: "Internal server error" });
        assert.equal(error.method, "GET");
        assert.equal(error.url, "https://api.example.com/data");
        assert.equal(error.message, "HTTP 500 Internal Server Error: Internal server error");
        return true;
      },
    );
  });

  it("formats error message with title and detail (RFC 7807 problem details)", async () => {
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
        await customFetch("https://api.example.com/users", { method: "POST", body: "{}" });
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 400);
        assert.equal(error.method, "POST");
        assert.equal(error.message, "HTTP 400 Bad Request: Invalid Request — The field 'email' is required.");
        assert.deepEqual(error.data, {
          title: "Invalid Request",
          detail: "The field 'email' is required.",
        });
        return true;
      },
    );
  });

  it("formats error message when error_description or error field is present", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error_description: "Invalid token provided" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/protected");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 401);
        assert.equal(error.message, "HTTP 401 Unauthorized: Invalid token provided");
        return true;
      },
    );
  });

  it("formats error message with plain text error body and truncates long text", async () => {
    const longText = "A".repeat(350);
    globalThis.fetch = async () =>
      new Response(longText, {
        status: 502,
        statusText: "Bad Gateway",
        headers: { "content-type": "text/plain" },
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/gateway");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 502);
        assert.equal(error.data, longText);
        // Truncates to 300 characters (299 chars + '…')
        assert.equal(error.message, `HTTP 502 Bad Gateway: ${"A".repeat(299)}…`);
        return true;
      },
    );
  });

  it("handles empty error body gracefully", async () => {
    globalThis.fetch = async () =>
      new Response("", {
        status: 404,
        statusText: "Not Found",
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/missing");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 404);
        assert.equal(error.data, null);
        assert.equal(error.message, "HTTP 404 Not Found");
        return true;
      },
    );
  });

  it("handles 204/205/304 status codes in error responses (hasNoBody)", async () => {
    globalThis.fetch = async () =>
      new Response(null, {
        status: 304,
        statusText: "Not Modified",
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/not-modified");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 304);
        assert.equal(error.data, null);
        assert.equal(error.message, "HTTP 304 Not Modified");
        return true;
      },
    );
  });

  it("parses JSON-like error bodies when content-type is missing", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        statusText: "Forbidden",
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/forbidden");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 403);
        assert.deepEqual(error.data, { error: "Access denied" });
        assert.equal(error.message, "HTTP 403 Forbidden: Access denied");
        return true;
      },
    );
  });

  it("falls back to raw text if JSON parsing fails on JSON-like error body", async () => {
    globalThis.fetch = async () =>
      new Response("{ invalid json syntax ", {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/invalid-json");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 500);
        assert.equal(error.data, "{ invalid json syntax ");
        assert.equal(error.message, "HTTP 500 Internal Server Error: { invalid json syntax");
        return true;
      },
    );
  });

  it("strips UTF-8 BOM from error response body before parsing", async () => {
    const bomJson = "\uFEFF" + JSON.stringify({ message: "BOM test error" });
    globalThis.fetch = async () =>
      new Response(bomJson, {
        status: 400,
        statusText: "Bad Request",
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      async () => {
        await customFetch("https://api.example.com/bom-error");
      },
      (error: ApiError) => {
        assert(error instanceof ApiError);
        assert.equal(error.status, 400);
        assert.deepEqual(error.data, { message: "BOM test error" });
        assert.equal(error.message, "HTTP 400 Bad Request: BOM test error");
        return true;
      },
    );
  });
});
