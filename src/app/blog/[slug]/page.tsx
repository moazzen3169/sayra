import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { JsonLd } from "@/components/seo/JsonLd";
import { ApiError } from "@/lib/api/client";
import { SITE_URL } from "@/lib/seo";
import { blogService } from "@/services/blogService";
import {
  fetchPublicGameCenterRankings,
  fetchPublicGameCentersByIds,
} from "@/services/publicGamecentersServerService";
import type {
  ArticleGamingCentersSectionData,
  BlogPostDetail,
} from "@/types/blog";

export const revalidate = 300;

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

  let resolvedCentersSection: ArticleGamingCentersSectionData | null =
    post.gamingCentersSection ?? null;

  if (
    post.gamingCenterMode &&
    post.gamingCenterMode !== "none" &&
    (!resolvedCentersSection || resolvedCentersSection.source === "unavailable")
  ) {
    if (post.gamingCenterMode === "manual") {
      const links = post.gamingCenterLinks ?? [];
      if (links.length > 0) {
        const res = await fetchPublicGameCentersByIds(
          links.map((l) => l.gamingCenterId)
        );
        const notesById = new Map(
          links.map((l) => [l.gamingCenterId, l])
        );
        resolvedCentersSection = {
          mode: "manual",
          items: res.items.map((item) => {
            const note = notesById.get(item.id);
            return {
              ...item,
              displayOrder: note?.displayOrder ?? item.displayOrder,
              customDescription: note?.customDescription ?? item.customDescription,
            };
          }),
          newlyRegistered: [],
          methodology: null,
          source: res.ok ? "express_fallback" : "unavailable",
          isStale: !res.ok,
          lastUpdatedAt: new Date().toISOString(),
        };
      }
    } else if (post.gamingCenterMode === "auto_ranking") {
      const fallbackRankings = await fetchPublicGameCenterRankings({
        city: post.rankingCity,
        neighborhood: post.rankingNeighborhood,
        deviceType: post.rankingDeviceType,
        limit: post.rankingLimit,
        minReviews: post.rankingMinReviews,
        m: post.rankingBayesianM,
        sort: post.rankingSort,
        includeNewlyRegistered: post.includeNewlyRegistered,
      });
      if (fallbackRankings) {
        const links = post.gamingCenterLinks ?? [];
        const notesById = new Map(links.map((l) => [l.gamingCenterId, l.customDescription || ""]));
        resolvedCentersSection = {
          ...fallbackRankings,
          items: fallbackRankings.items.map((item) => ({
            ...item,
            customDescription: notesById.get(item.id) || item.customDescription,
          })),
          newlyRegistered: fallbackRankings.newlyRegistered.map((item) => ({
            ...item,
            customDescription: notesById.get(item.id) || item.customDescription,
          })),
        };
      }
    }
  }

  const allListedCenters = [
    ...(resolvedCentersSection?.items ?? []),
    ...(resolvedCentersSection?.newlyRegistered ?? []),
  ];

  const centersListSchema =
    allListedCenters.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: post.title,
          url: articleUrl,
          numberOfItems: allListedCenters.length,
          itemListElement: allListedCenters.map((center, index) => {
            const centerUrl = `${SITE_URL}${center.detailUrl}`;
            const business: Record<string, unknown> = {
              "@type": "EntertainmentBusiness",
              name: center.name,
              url: centerUrl,
              image: center.images.coverUrl || undefined,
              address:
                center.address || center.city
                  ? {
                      "@type": "PostalAddress",
                      streetAddress: center.address || undefined,
                      addressLocality: center.city || undefined,
                      addressRegion: center.province || undefined,
                      addressCountry: "IR",
                    }
                  : undefined,
            };

            if (
              center.rating.validReviewsCount > 0 &&
              center.rating.average > 0
            ) {
              business.aggregateRating = {
                "@type": "AggregateRating",
                ratingValue: center.rating.average,
                reviewCount: center.rating.validReviewsCount,
                bestRating: 5,
                worstRating: 1,
              };
            }

            return {
              "@type": "ListItem",
              position: index + 1,
              item: business,
            };
          }),
        }
      : null;

  const articleStructuredData: Array<Record<string, unknown>> = [
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
    ...(centersListSchema ? [centersListSchema] : []),
  ];

  return (
    <>
      <JsonLd data={articleStructuredData} />
      <BlogPostView
        slug={decodedSlug}
        initialPost={result.post}
        gamingCentersSection={resolvedCentersSection}
      />
    </>
  );
}
