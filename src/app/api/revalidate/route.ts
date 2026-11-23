import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const MAX_PATHS_PER_REQUEST = 50;

function isAuthorized(req: NextRequest, expectedSecret: string): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = (
    req.headers.get("x-revalidate-secret") || bearerToken
  ).trim();

  if (!headerSecret || headerSecret.length !== expectedSecret.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(headerSecret, "utf8"),
    Buffer.from(expectedSecret, "utf8")
  );
}

export async function POST(req: NextRequest) {
  const secret = (process.env.REVALIDATION_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATION_SECRET is not configured." },
      { status: 503 }
    );
  }

  if (!isAuthorized(req, secret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { paths?: unknown };
  try {
    body = (await req.json()) as { paths?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rawPaths = Array.isArray(body?.paths) ? body.paths : ["/"];
  const validPaths = rawPaths
    .filter(
      (p): p is string =>
        typeof p === "string" && p.startsWith("/") && !p.startsWith("//")
    )
    .slice(0, MAX_PATHS_PER_REQUEST);

  if (validPaths.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid relative paths provided." },
      { status: 400 }
    );
  }

  for (const path of validPaths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated: true,
    paths: validPaths,
    timestamp: new Date().toISOString(),
  });
}
