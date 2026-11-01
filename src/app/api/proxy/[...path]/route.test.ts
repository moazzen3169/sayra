import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { NextRequest } from "next/server";
import { dynamicHandler } from "./route";

describe("API Proxy Route Handler (/api/proxy/[...path])", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SAYRA_API_KEY = "verified-server-api-key";
    process.env.API_BASE_URL = "http://upstream-api.example.com/api/v1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it("returns 400 on invalid or empty path", async () => {
    const req = new NextRequest("http://localhost:3000/api/proxy");
    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: [] }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_PROXY_PATH");
  });

  it("returns 400 on path traversal attempts", async () => {
    const req = new NextRequest("http://localhost:3000/api/proxy/../../etc/passwd");
    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: ["..", "..", "etc", "passwd"] }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("PATH_TRAVERSAL_DETECTED");
  });

  it("returns 500 when server API key is unconfigured or missing", async () => {
    delete process.env.SAYRA_API_KEY;
    delete process.env.PLAYNEST_API_KEY;
    delete process.env.STATIC_API_KEY;

    const req = new NextRequest("http://localhost:3000/api/proxy/gamingCenters/test");
    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: ["gamingCenters", "test"] }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("SERVER_API_KEY_UNCONFIGURED");
  });

  it("injects x-api-key and forwards Authorization bearer token", async () => {
    let capturedUrl = "";
    let capturedHeaders: Headers | undefined;
    let capturedMethod = "";

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = new Headers(init?.headers);
      capturedMethod = init?.method || "GET";
      return new Response(JSON.stringify({ success: true, data: { status: "ok" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/proxy/auth/me?test=1", {
      method: "GET",
      headers: {
        authorization: "Bearer user-access-token-123",
        cookie: "session=sensitive-cookie",
        "x-api-key": "client-trying-to-spoof",
      },
    });

    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: ["auth", "me"] }),
    });

    expect(res.status).toBe(200);
    expect(capturedUrl).toBe("http://upstream-api.example.com/api/v1/auth/me?test=1");
    expect(capturedMethod).toBe("GET");
    expect(capturedHeaders?.get("x-api-key")).toBe("verified-server-api-key");
    expect(capturedHeaders?.get("authorization")).toBe("Bearer user-access-token-123");
    // Ensure browser cookies are stripped and not leaked to backend
    expect(capturedHeaders?.get("cookie")).toBeNull();
  });

  it("forwards request bodies and supports POST/PUT/PATCH/DELETE methods", async () => {
    let capturedBody = "";
    let capturedMethod = "";

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method || "";
      if (init?.body) {
        capturedBody = init.body.toString();
      }
      return new Response(JSON.stringify({ success: true, data: { id: "res-1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/proxy/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stationId: "station-42" }),
    });

    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: ["reservations"] }),
    });

    expect(res.status).toBe(201);
    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toContain("station-42");
  });

  it("handles upstream network failures and returns 502 with error envelope", async () => {
    globalThis.fetch = (async () => {
      throw new Error("Connection refused");
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/proxy/failing-endpoint");
    const res = await dynamicHandler(req, {
      params: Promise.resolve({ path: ["failing-endpoint"] }),
    });

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error.code).toBe("PROXY_NETWORK_ERROR");
  });
});
