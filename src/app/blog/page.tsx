import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { BlogListView } from "@/components/blog/BlogListView";
import { SITE_URL } from "@/lib/seo";
import { blogService } from "@/services/blogService";
import type { BlogPostSummary } from "@/types/blog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "وبلاگ و اخبار گیمینگ | سایرا",
  description:
    "مقالات آموزشی، راهنمای بازی‌ها، نقد و بررسی کنسول‌ها و آخرین اخبار دنیای گیم و گیم‌نت‌ها در وبلاگ سایرا.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "وبلاگ و اخبار گیمینگ | سایرا",
    description:
      "مقالات آموزشی، راهنمای بازی‌ها، نقد و بررسی کنسول‌ها و آخرین اخبار دنیای گیم و گیم‌نت‌ها در وبلاگ سایرا.",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "وبلاگ سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "وبلاگ و اخبار گیمینگ | سایرا",
    description:
      "مقالات آموزشی، راهنمای بازی‌ها، نقد و بررسی کنسول‌ها و آخرین اخبار دنیای گیم در سایرا.",
  },
};

export default async function BlogPage() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let initialItems: BlogPostSummary[] = [];
  let initialTotal = 0;

  try {
    const res = await blogService.list(
      { sort: "newest", limit: 6 },
      controller.signal
    );
    if (res && Array.isArray(res.items)) {
      initialItems = res.items;
      initialTotal = res.total;
    }
  } catch {
    // Fail-open to empty initial list
  } finally {
    clearTimeout(timeoutId);
  }

  return (
    <Suspense fallback={null}>
      <BlogListView initialItems={initialItems} initialTotal={initialTotal} />
      <Footer />
    </Suspense>
  );
}
