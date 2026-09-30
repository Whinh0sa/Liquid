import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { customFetch, ApiError } from "./custom-fetch.js";

describe("customFetch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("error path", () => {
    it("should throw an ApiError when the response is not ok", async () => {
      const mockErrorResponse = { message: "Internal Server Error" };
      const status = 500;
      const statusText = "Internal Server Error";

      globalThis.fetch = async () => {
        return new Response(JSON.stringify(mockErrorResponse), {
          status,
          statusText,
          headers: new Headers({ "content-type": "application/json" }),
        });
      };

      const requestUrl = "https://example.com/api/test";

      try {
        await customFetch(requestUrl);
        assert.fail("Expected customFetch to throw an error");
      } catch (error) {
        assert.ok(error instanceof ApiError);
        assert.strictEqual(error.status, status);
        assert.strictEqual(error.statusText, statusText);
        assert.deepStrictEqual(error.data, mockErrorResponse);
        assert.strictEqual(error.url, requestUrl);
        assert.strictEqual(error.method, "GET");

        // Verify the error message incorporates the parsed body
        assert.strictEqual(
          error.message,
          `HTTP 500 Internal Server Error: Internal Server Error`
        );
      }
    });

    it("should handle error response with no body gracefully", async () => {
      const status = 404;
      const statusText = "Not Found";

      globalThis.fetch = async () => {
        return new Response(null, {
          status,
          statusText,
        });
      };

      const requestUrl = "https://example.com/api/not-found";

      try {
        await customFetch(requestUrl);
        assert.fail("Expected customFetch to throw an error");
      } catch (error) {
        assert.ok(error instanceof ApiError);
        assert.strictEqual(error.status, status);
        assert.strictEqual(error.statusText, statusText);
        assert.strictEqual(error.data, null);

        assert.strictEqual(
          error.message,
          `HTTP 404 Not Found`
        );
      }
    });
  });
});
