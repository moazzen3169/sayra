import { NextResponse } from "next/server";
import { blogService } from "@/services/blogService";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600; // 1 hour ISR

export async function GET() {
  const result = await blogService
    .list({ sort: "newest", limit: 30 })
    .catch(() => null);
  const items = result?.items ?? [];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>وبلاگ سایرا | اخبار و مقالات گیمینگ</title>
    <link>${SITE_URL}/blog</link>
    <description>مقالات آموزشی، نقد و بررسی بازی‌ها، کنسول‌ها و اخبار مراکز بازی در سایرا</description>
    <language>fa-ir</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${items
      .map((item) => {
        const pubDate = item.publishedAtIso
          ? new Date(item.publishedAtIso).toUTCString()
          : new Date().toUTCString();
        const postUrl = `${SITE_URL}/blog/${encodeURIComponent(item.slug)}`;
        return `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${item.excerpt || item.title}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${item.authorName ? `<author><![CDATA[${item.authorName}]]></author>` : ""}
      ${item.categoryLabel ? `<category><![CDATA[${item.categoryLabel}]]></category>` : ""}
    </item>`;
      })
      .join("")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
