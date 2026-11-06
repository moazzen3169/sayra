import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, BLOG_API_BASE_URL } from "@/lib/api/config";

const BLOG_PATH_ROOTS = new Set(["articles", "categories", "tags", "media", "authors"]);

/**
 * Server-side API Proxy Route
 * Route: /api/proxy/[...path]
 *
 * Forwards requests to backend API securely, injecting the server-side API key (SAYRA_API_KEY)
 * into the `x-api-key` header if configured on the server, ensuring secrets are NEVER exposed
 * to the browser client or NEXT_PUBLIC variables.
 * Blog-related requests are routed to BLOG_API_BASE_URL, while all other requests use API_BASE_URL.
 */
export async function dynamicHandler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const firstSegment = (path || [])[0];
  const isBlog = firstSegment ? BLOG_PATH_ROOTS.has(firstSegment) : false;
  const baseUrl = isBlog ? BLOG_API_BASE_URL : API_BASE_URL;

  const targetPath = "/" + (path || []).join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${baseUrl}${targetPath}${search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Do not forward host or connection hop-by-hop headers
    if (lower !== "host" && lower !== "content-length" && lower !== "connection") {
      forwardHeaders.set(key, value);
    }
  });

  // Inject server-side API key if configured
  const serverApiKey = process.env.SAYRA_API_KEY || process.env.PLAYNEST_API_KEY;
  if (serverApiKey) {
    forwardHeaders.set("x-api-key", serverApiKey);
  }

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    res.headers.forEach((val, k) => {
      const lower = k.toLowerCase();
      if (lower !== "content-encoding" && lower !== "transfer-encoding") {
        responseHeaders.set(k, val);
      }
    });

    const resBuffer = await res.arrayBuffer();
    return new NextResponse(resBuffer, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch {
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
