import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { JsonLd } from "@/components/seo/JsonLd";
import { ApiError } from "@/lib/api/client";
import { SITE_URL } from "@/lib/seo";
import { blogService } from "@/services/blogService";
import type { BlogPostDetail } from "@/types/blog";

type Props = { params: Promise<{ slug: string }> };

function safeDecodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type ArticleLookupResult =
  | { status: "ok"; post: BlogPostDetail }
  | { status: "not_found" }
  | { status: "error"; error: unknown };

/**
 * Deduplicated article fetcher using React cache for Server Component & Metadata.
 * Distinguishes true 404 (Soft 404 fix) from transient 5xx/network failures.
 */
const getArticleCached = cache(
  async (slug: string): Promise<ArticleLookupResult> => {
    const decodedSlug = safeDecodeSlug(slug);
    try {
      const post = await blogService.getBySlug(decodedSlug);
      return { status: "ok", post };
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.code === "NOT_FOUND")
      ) {
        return { status: "not_found" };
      }
      return { status: "error", error: err };
    }
  }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = safeDecodeSlug(slug);
  const result = await getArticleCached(decodedSlug);

  if (result.status === "not_found") {
    return {
      title: "مقاله پیدا نشد | وبلاگ سایرا",
      description: "مقاله‌ی مورد نظر یافت نشد.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (result.status === "error") {
    return {
      title: "وبلاگ سایرا",
      description: "مقالات و راهنماهای پلتفرم گیمینگ سایرا.",
    };
  }

  const { post } = result;
  const seoTitle = post.seoTitle || post.title;
  const seoDesc = post.seoDescription || post.excerpt;
  const ogImg = post.ogImageUrl || post.coverUrl;
  const images = ogImg ? [ogImg] : [];
  const canonicalSlug = post.slug || decodedSlug;
  const canonical =
    post.canonicalUrl || `/blog/${encodeURIComponent(canonicalSlug)}`;

  return {
    title: `${seoTitle} | وبلاگ سایرا`,
    description: seoDesc,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      url: canonical,
      images,
      type: "article",
      publishedTime: post.publishedAtIso || post.publishedAt || undefined,
      modifiedTime: post.updatedAtIso || post.publishedAtIso || undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDesc,
      images,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = safeDecodeSlug(slug);
  const result = await getArticleCached(decodedSlug);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    throw result.error;
  }

  const post = result.post;
  const canonicalSlug = post.slug || decodedSlug;
  const articleUrl = `${SITE_URL}/blog/${encodeURIComponent(canonicalSlug)}`;

  const articleStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      image: post.coverUrl ? [post.coverUrl] : undefined,
      datePublished: post.publishedAtIso || post.publishedAt || undefined,
      dateModified:
        post.updatedAtIso || post.publishedAtIso || post.publishedAt || undefined,
      author: {
        "@type": "Person",
        name: post.authorName || "تحریریه سایرا",
      },
      publisher: {
        "@type": "Organization",
        name: "سایرا",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/design/sayra.svg`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "خانه",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "وبلاگ",
          item: `${SITE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: articleUrl,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={articleStructuredData} />
      <BlogPostView slug={decodedSlug} initialPost={result.post} />
    </>
  );
}
