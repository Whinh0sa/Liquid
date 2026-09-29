import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { setBaseUrl, applyBaseUrl } from './custom-fetch';

describe('applyBaseUrl', () => {
  beforeEach(() => {
    setBaseUrl(null);
  });

  test('returns input when _baseUrl is null', () => {
    setBaseUrl(null);
    assert.strictEqual(applyBaseUrl('/foo'), '/foo');
    assert.strictEqual(applyBaseUrl('http://example.com/foo'), 'http://example.com/foo');
  });

  test('prepends _baseUrl to relative paths (strings)', () => {
    setBaseUrl('http://example.com');
    assert.strictEqual(applyBaseUrl('/foo'), 'http://example.com/foo');
  });

  test('does not prepend _baseUrl to absolute URLs (strings)', () => {
    setBaseUrl('http://example.com');
    assert.strictEqual(applyBaseUrl('http://other.com/foo'), 'http://other.com/foo');
    assert.strictEqual(applyBaseUrl('https://other.com/foo'), 'https://other.com/foo');
  });

  test('handles URL objects correctly for absolute paths', () => {
    setBaseUrl('http://example.com');
    const inputUrl = new URL('http://other.com/foo');
    const result = applyBaseUrl(inputUrl);
    assert.strictEqual(result, inputUrl);
  });

  test('handles URL objects correctly for relative paths', () => {
    setBaseUrl('http://example.com');
    // Using a fake base URL to construct a relative URL object for test
    const inputUrl = new URL('/foo', 'http://dummy.com');
    // It's absolute from node's perspective, so we can mock the `resolveUrl` logic by sending a fake URL obj
    // that returns a relative path toString.
    // Better yet, in `custom-fetch`, `resolveUrl(input)` is used.
    // Let's test the return path: `if (isUrl(input)) return new URL(absolute);`

    // We can't really make an URL object that `startsWith("/")` from `.toString()`.
    // The spec for URL requires a base. So URL objects are always absolute.
    // The code `if (!url.startsWith("/")) return input;` in `applyBaseUrl` means that if it's an URL object,
    // `resolveUrl` returns `input.toString()`, which will start with `http://` or `https://`
    // Therefore, an URL object will NEVER trigger the prepend logic because it doesn't start with `/`.
    // Let's write a test confirming this behavior!
    const inputUrl2 = new URL('http://other.com/foo');
    const result2 = applyBaseUrl(inputUrl2);
    assert.strictEqual(result2, inputUrl2);
  });

  test('handles Request objects correctly for absolute paths', () => {
    setBaseUrl('http://example.com');
    const req = new Request('http://other.com/foo');
    const result = applyBaseUrl(req);
    assert.strictEqual(result, req);
  });

  test('handles Request objects with relative paths correctly', () => {
    setBaseUrl('http://example.com');
    // Request objects in browsers can take relative paths if the base URI is defined.
    // In node, Request requires an absolute URL.
    // Let's simulate a Request object that returns a relative url.
    const fakeRequest = {
      url: '/foo',
      method: 'GET',
      headers: new Headers()
    };

    // Polyfill the instanceof check for the test
    const originalRequest = global.Request;
    global.Request = class FakeRequest {
      url: string;
      constructor(url: string, init?: any) {
        this.url = url;
      }
    } as any;

    const req = new Request('/foo');
    const result = applyBaseUrl(req as any);

    assert.ok(result instanceof Request);
    assert.strictEqual((result as Request).url, 'http://example.com/foo');

    global.Request = originalRequest;
  });
});
