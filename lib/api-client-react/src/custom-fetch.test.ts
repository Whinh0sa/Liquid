import { describe, it, expect, beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { customFetch, ApiError } from "./custom-fetch";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

describe("customFetch", () => {
  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should return parsed success body", async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ data: "success" }), { status: 200, headers: { "content-type": "application/json" } });

    const response = await customFetch("https://api.example.com/data");
    expect(response).toEqual({ data: "success" });
  });

  it("should throw ApiError with error details on failure (500)", async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "content-type": "application/json" }
    });

    const promise = customFetch("https://api.example.com/fail");
    await expect(promise).rejects.toThrow(ApiError);
    // Since we consumed the promise, we can test object properties this way:
    fetchMocker.mockResponseOnce(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "content-type": "application/json" }
    });
    const promise2 = customFetch("https://api.example.com/fail");
    await expect(promise2).rejects.toMatchObject({
      status: 500,
      data: { error: "Internal Server Error" },
      statusText: "Internal Server Error"
    });
  });

  it("should throw ApiError with error details on failure (404)", async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ message: "Not Found" }), {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "application/json" }
    });

    const promise = customFetch("https://api.example.com/not-found");
    await expect(promise).rejects.toThrow(ApiError);
    fetchMocker.mockResponseOnce(JSON.stringify({ message: "Not Found" }), {
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "application/json" }
    });
    const promise2 = customFetch("https://api.example.com/not-found");
    await expect(promise2).rejects.toMatchObject({
      status: 404,
      data: { message: "Not Found" }
    });
  });
});
