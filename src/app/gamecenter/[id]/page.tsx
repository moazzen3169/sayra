import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { GamecenterDetailClient } from "@/components/gamecenter/GamecenterDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { ApiError } from "@/lib/api/client";
import { SITE_URL } from "@/lib/seo";
import {
  loadGamecenterDetail,
} from "@/services/gamecenterDetailService";
import type { GamecenterDetail } from "@/types/gamecenter";

type Props = {
  params: Promise<{ id: string }>;
};

function safeDecodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type CenterLookupResult =
  | { status: "ok"; detail: GamecenterDetail }
  | { status: "not_found" }
  | { status: "error"; error: unknown };

const loadCenterCached = cache(
  async (routeId: string): Promise<CenterLookupResult> => {
    const cleanId = safeDecodeParam(routeId).trim();
    if (!cleanId) {
      return { status: "not_found" };
    }
    try {
      const detail = await loadGamecenterDetail(cleanId);
      if (!detail?.center || (!detail.center.id && !detail.center.slug)) {
        return { status: "not_found" };
      }
      return { status: "ok", detail };
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 400 || err.code === "NOT_FOUND")
      ) {
        return { status: "not_found" };
      }
      return { status: "error", error: err };
    }
  }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const decodedId = safeDecodeParam(id);
  const result = await loadCenterCached(decodedId);

  if (result.status === "not_found") {
    return {
      title: "گیمنت پیدا نشد | سایرا",
      description: "گیمنت مورد نظر در پلتفرم سایرا یافت نشد.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (result.status === "error") {
    return {
      title: "مشخصات و رزرو آنلاین گیمنت | سایرا",
      description: "مشاهده مشخصات، دستگاه‌ها و رزرو آنلاین گیمنت در سایرا.",
    };
  }

  const { detail } = result;
  const center = detail.center;
  const canonicalSlug = center.slug || decodedId;
  const canonicalUrl = `/gamecenter/${encodeURIComponent(canonicalSlug)}`;
  const title = `${center.name} | رزرو آنلاین گیمنت در سایرا`;
  const description =
    center.description?.trim() ||
    `مشاهده دستگاه‌ها، تعرفه‌ها، موقعیت و رزرو آنلاین سانس در ${center.name} از طریق پلتفرم سایرا.`;
  const coverImageUrl = detail.images?.[0]?.url;
  const ogImages = coverImageUrl
    ? [
        {
          url: coverImageUrl,
          alt: center.name,
        },
      ]
    : [];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function GameCenterDetailPage({ params }: Props) {
  const { id } = await params;
  const decodedId = safeDecodeParam(id);
  const result = await loadCenterCached(decodedId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    throw result.error;
  }

  const { detail } = result;
  const center = detail.center;
  const canonicalSlug = center.slug?.trim();
  if (canonicalSlug && canonicalSlug !== decodedId) {
    permanentRedirect(`/gamecenter/${encodeURIComponent(canonicalSlug)}`);
  }

  const targetSlug = canonicalSlug || decodedId;
  const primaryAddress = detail.address;
  const coverImageUrl = detail.images?.[0]?.url;
  const ratingAvg = center.raiting || 0;
  const ratingCount = center.comment_count || 0;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "EntertainmentBusiness",
      name: center.name,
      description: center.description || undefined,
      url: `${SITE_URL}/gamecenter/${encodeURIComponent(canonicalSlug || targetSlug)}`,
      image: coverImageUrl || undefined,
      ...(primaryAddress
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: primaryAddress,
            },
          }
        : {}),
      ...(detail.location
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: detail.location.lat,
              longitude: detail.location.lng,
            },
          }
        : {}),
      ...(ratingCount > 0 && ratingAvg > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: ratingAvg,
              reviewCount: ratingCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      ...(center.hourlyRate
        ? {
            priceRange: `${center.hourlyRate} IRR`,
          }
        : {}),
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
          name: "گیم‌نت‌ها",
          item: `${SITE_URL}/gamecenters`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: center.name,
          item: `${SITE_URL}/gamecenter/${encodeURIComponent(canonicalSlug || targetSlug)}`,
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <GamecenterDetailClient
        key={targetSlug}
        gamingCenterSlug={targetSlug}
        initialDetail={detail}
      />
    </>
  );
}
