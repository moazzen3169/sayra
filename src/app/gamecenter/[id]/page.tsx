import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { GamecenterDetailClient } from "@/components/gamecenter/GamecenterDetailClient";
import { ApiError } from "@/lib/api/client";
import {
  gamingCenterService,
  type GamingCenterInfo,
} from "@/services/gamecenterDetailService";

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
  | { status: "ok"; center: GamingCenterInfo }
  | { status: "not_found" }
  | { status: "error"; error: unknown };

const resolveCenterCached = cache(
  async (routeId: string): Promise<CenterLookupResult> => {
    const cleanId = safeDecodeParam(routeId).trim();
    if (!cleanId) {
      return { status: "not_found" };
    }
    try {
      const center = await gamingCenterService.resolveGamingCenter(cleanId);
      if (!center || (!center.id && !center.slug)) {
        return { status: "not_found" };
      }
      return { status: "ok", center };
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
  const result = await resolveCenterCached(decodedId);

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

  const { center } = result;
  const canonicalSlug = center.slug || decodedId;
  const title = `${center.name} | رزرو آنلاین گیمنت در سایرا`;
  const description =
    center.description?.trim() ||
    `مشاهده دستگاه‌ها، تعرفه‌ها، موقعیت و رزرو آنلاین سانس در ${center.name} از طریق پلتفرم سایرا.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/gamecenter/${encodeURIComponent(canonicalSlug)}`,
    },
  };
}

export default async function GameCenterDetailPage({ params }: Props) {
  const { id } = await params;
  const decodedId = safeDecodeParam(id);
  const result = await resolveCenterCached(decodedId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    throw result.error;
  }

  const canonicalSlug = result.center.slug?.trim();
  if (canonicalSlug && canonicalSlug !== decodedId) {
    permanentRedirect(`/gamecenter/${encodeURIComponent(canonicalSlug)}`);
  }

  const targetSlug = canonicalSlug || decodedId;
  return <GamecenterDetailClient key={targetSlug} gamingCenterSlug={targetSlug} />;
}
