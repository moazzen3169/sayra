import type { Metadata } from "next";
import React from "react";
import { HomePageClient } from "@/components/home/HomePageClient";
import {
  mapCatalogDeviceToCategory,
  type DeviceCategory,
} from "@/lib/deviceCategories";
import { DEFAULT_CITY } from "@/lib/cityConstants";
import { fetchSliderBanners, toDiscountedCenter } from "@/services/homeService";
import { catalogService } from "@/services/catalogService";
import {
  gamecentersPageService,
  type GamecenterListItem,
} from "@/services/gamecentersPageService";
import { blogService } from "@/services/blogService";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/seo";
import type { BannerItem, DiscountedCenter } from "@/types/home";
import type { BlogPostSummary } from "@/types/blog";

export const revalidate = 180;

export const metadata: Metadata = {
  title: "سایرا | سامانه جامع رزرو آنلاین گیمنت و مراکز بازی",
  description:
    "مشاهده و رزرو آنلاین گیم‌نت‌ها و مراکز بازی سراسر کشور. رزرو آسان سیستم‌های گیمینگ PS5، PS4، PC، XBOX و واقعیت مجازی با تخفیف‌های ویژه در سایرا.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "سایرا | سامانه جامع رزرو آنلاین گیمنت و مراکز بازی",
    description:
      "مشاهده و رزرو آنلاین گیم‌نت‌ها و مراکز بازی سراسر کشور با تخفیف‌های ویژه در سایرا.",
  },
};

const SSR_FETCH_TIMEOUT_MS = 5000;

export default async function HomePage() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SSR_FETCH_TIMEOUT_MS);

  let initialBanners: BannerItem[] = [];
  let initialBannersLoaded = false;

  let initialCategories: DeviceCategory[] = [];
  let initialCategoriesLoaded = false;

  let initialCenters: GamecenterListItem[] = [];
  let initialCentersLoaded = false;
  let initialDiscountedCenters: DiscountedCenter[] = [];

  let initialBlogPosts: BlogPostSummary[] = [];
  let initialBlogLoaded = false;

  try {
    const [bannersRes, categoriesRes, centersRes, blogRes] =
      await Promise.allSettled([
        fetchSliderBanners(controller.signal),
        catalogService.listDevices(
          { isActive: true, limit: 50 },
          controller.signal
        ),
        gamecentersPageService.loadAllCenters({
          city: DEFAULT_CITY,
          page: 1,
          limit: 50,
          signal: controller.signal,
        }),
        blogService.list({ sort: "newest", limit: 4 }, controller.signal),
      ]);

    if (bannersRes.status === "fulfilled") {
      initialBanners = bannersRes.value;
      initialBannersLoaded = true;
    }

    if (categoriesRes.status === "fulfilled") {
      initialCategories = Array.isArray(categoriesRes.value)
        ? categoriesRes.value.map(mapCatalogDeviceToCategory)
        : [];
      initialCategoriesLoaded = true;
    }

    if (centersRes.status === "fulfilled") {
      initialCenters = centersRes.value;
      initialCentersLoaded = true;
      initialDiscountedCenters = gamecentersPageService
        .getDiscountedCenters(initialCenters)
        .map(toDiscountedCenter)
        .filter((c): c is DiscountedCenter => c !== null);
    }

    if (blogRes.status === "fulfilled") {
      initialBlogPosts = blogRes.value.items;
      initialBlogLoaded = true;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const homeStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "سایرا",
      alternateName: "Sayra",
      url: SITE_URL,
      logo: `${SITE_URL}/design/sayra.svg`,
      sameAs: [
        "https://t.me/SayraSupport",
        "https://rubika.ir/SayraSupport",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "سایرا",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/gamecenters?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <JsonLd data={homeStructuredData} />
      <HomePageClient
        initialCity={DEFAULT_CITY}
        initialBanners={initialBanners}
        initialBannersLoaded={initialBannersLoaded}
        initialCategories={initialCategories}
        initialCategoriesLoaded={initialCategoriesLoaded}
        initialCenters={initialCenters}
        initialCentersLoaded={initialCentersLoaded}
        initialDiscountedCenters={initialDiscountedCenters}
        initialBlogPosts={initialBlogPosts}
        initialBlogLoaded={initialBlogLoaded}
      />
    </>
  );
}
