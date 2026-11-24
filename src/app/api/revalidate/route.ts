import { timingSafeEqual } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const MAX_PATHS_PER_REQUEST = 50;
const MAX_TAGS_PER_REQUEST = 50;

function isAuthorized(req: NextRequest, expectedSecret: string): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = (
    req.headers.get("x-revalidate-secret") ||
    req.headers.get("x-revalidation-secret") ||
    bearerToken
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
  const secret = (
    process.env.REVALIDATION_SECRET ||
    process.env.NEXT_REVALIDATION_SECRET ||
    ""
  ).trim();
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

  let body: { paths?: unknown; tags?: unknown };
  try {
    body = (await req.json()) as { paths?: unknown; tags?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const hasTagsField = Array.isArray(body?.tags);
  const validTags = hasTagsField
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, MAX_TAGS_PER_REQUEST)
    : [];

  const rawPaths = Array.isArray(body?.paths)
    ? body.paths
    : validTags.length > 0
      ? []
      : ["/"];

  const validPaths = rawPaths
    .filter(
      (p): p is string =>
        typeof p === "string" && p.startsWith("/") && !p.startsWith("//")
    )
    .slice(0, MAX_PATHS_PER_REQUEST);

  if (validPaths.length === 0 && validTags.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid relative paths or tags provided." },
      { status: 400 }
    );
  }

  for (const path of validPaths) {
    revalidatePath(path);
  }

  for (const tag of validTags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({
    ok: true,
    revalidated: true,
    paths: validPaths,
    tags: validTags,
    timestamp: new Date().toISOString(),
  });
}
