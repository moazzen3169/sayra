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
import type { BannerItem, DiscountedCenter } from "@/types/home";
import type { BlogPostSummary } from "@/types/blog";

export const dynamic = "force-dynamic";

const SSR_FETCH_TIMEOUT_MS = 2500;

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

  return (
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
  );
}
