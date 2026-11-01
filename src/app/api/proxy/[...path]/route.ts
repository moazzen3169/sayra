import { NextRequest, NextResponse } from "next/server";
import { getUpstreamApiBaseUrl } from "@/lib/api/config";
import { getServerApiKey } from "@/lib/api/serverKey";

/**
 * Server-side API Proxy Route Handler
 * Route: /api/proxy/[...path]
 *
 * Enforces server-side authentication by injecting the application's static API key (`x-api-key`)
 * and preserving user bearer tokens (`Authorization`).
 * Restricts destinations to the configured upstream backend, blocks path traversal,
 * and strips hop-by-hop headers.
 */

// Timeout for upstream backend fetch requests (15 seconds)
const UPSTREAM_TIMEOUT_MS = 15000;

export async function dynamicHandler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  // Security: block path traversal and validate segments
  if (!path || !Array.isArray(path) || path.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_PROXY_PATH",
          message: "مسیر درخواست نامعتبر است.",
        },
      },
      { status: 400 }
    );
  }

  const hasTraversal = path.some(
    (segment) => segment === ".." || segment === "." || segment.includes("/") || segment.includes("\\")
  );
  if (hasTraversal) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PATH_TRAVERSAL_DETECTED",
          message: "دسترسی به مسیر غیرمجاز است.",
        },
      },
      { status: 400 }
    );
  }

  // Check application API key configuration
  const { key: apiKey, error: keyError } = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_API_KEY_UNCONFIGURED",
          message:
            "کلید احراز هویت سرور (API Key) پیکربندی نشده یا نامعتبر است. لطفاً متغیرهای محیطی را بررسی کنید.",
          details: process.env.NODE_ENV !== "production" ? keyError : undefined,
        },
      },
      { status: 500 }
    );
  }

  const targetPath = "/" + path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${getUpstreamApiBaseUrl()}${targetPath}${search}`;

  // Build forward headers: preserve Authorization, Content-Type, Accept, etc.
  // Strip hop-by-hop headers, cookies, and host
  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "content-length" &&
      lower !== "connection" &&
      lower !== "cookie" &&
      lower !== "keep-alive" &&
      lower !== "proxy-authenticate" &&
      lower !== "proxy-authorization" &&
      lower !== "te" &&
      lower !== "trailer" &&
      lower !== "transfer-encoding" &&
      lower !== "upgrade" &&
      lower !== "x-api-key" // Never allow client to spoof or override x-api-key
    ) {
      forwardHeaders.set(key, value);
    }
  });

  // Inject secure server-side API key
  forwardHeaders.set("x-api-key", apiKey);

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  // Link client abort signal if request aborted early
  if (request.signal) {
    request.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseHeaders = new Headers();
    res.headers.forEach((val, k) => {
      const lower = k.toLowerCase();
      // Strip hop-by-hop and encoding headers handled by Next.js
      if (
        lower !== "content-encoding" &&
        lower !== "transfer-encoding" &&
        lower !== "connection" &&
        lower !== "keep-alive"
      ) {
        responseHeaders.set(k, val);
      }
    });

    const resBuffer = await res.arrayBuffer();
    return new NextResponse(resBuffer, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isTimeout =
      (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && (err.name === "AbortError" || err.message.toLowerCase().includes("timeout")));

    if (isTimeout) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROXY_TIMEOUT",
            message: "زمان پاسخگویی سرور به پایان رسید.",
          },
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROXY_NETWORK_ERROR",
          message: "ارتباط با سرور برقرار نشد.",
        },
      },
      { status: 502 }
    );
  }
}

export const GET = dynamicHandler;
export const POST = dynamicHandler;
export const PUT = dynamicHandler;
export const PATCH = dynamicHandler;
export const DELETE = dynamicHandler;
export const HEAD = dynamicHandler;
export const OPTIONS = dynamicHandler;
