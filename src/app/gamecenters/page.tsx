"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomBar } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  gamecentersPageService,
  resolveCategoryFilter,
  type GamecenterListItem,
  type GamecenterFilterParams,
} from "@/services/gamecentersPageService";
import { catalogService } from "@/services/catalogService";
import { isAbortError } from "@/lib/api/client";
import type { DeviceCatalogItem } from "@/types/catalog";
import { toPersianDigits } from "@/lib/format";
import { useCity } from "@/context/CityContext";
import { cn } from "@/lib/utils";

const FALLBACK_DEVICE_CATEGORIES = [
  { id: "ps5", name: "پلی‌استیشن ۵" },
  { id: "ps4", name: "پلی‌استیشن ۴" },
  { id: "pc", name: "کامپیوتر گیمینگ" },
  { id: "xbox", name: "ایکس‌باکس" },
  { id: "vr", name: "واقعیت مجازی" },
  { id: "billiards", name: "بیلیارد" },
  { id: "steering", name: "فرمان بازی" },
];

const ITEMS_PER_PAGE = 12;

const SORT_OPTIONS: { id: GamecenterFilterParams["sort"]; name: string }[] = [
  { id: "default", name: "پیش‌فرض" },
  { id: "popular", name: "محبوب‌ترین" },
  { id: "newest", name: "جدیدترین" },
  { id: "rating", name: "بالاترین امتیاز" },
  { id: "price_asc", name: "ارزان‌ترین" },
  { id: "price_desc", name: "گران‌ترین" },
];

function GamecentersGridSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4"
    >
      <span className="sr-only">در حال بارگذاری</span>
      {Array.from({ length: 8 }).map((_, idx) => (
        <CardSkeleton key={idx} />
      ))}
    </div>
  );
}

function GamecentersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParam = searchParams.get("q") || "";
  const categoryParam =
    searchParams.get("category") || searchParams.get("device") || "all";
  const stationTypeParam = searchParams.get("stationType") || undefined;
  const sortParam =
    (searchParams.get("sort") as GamecenterFilterParams["sort"]) || "default";
  const cityParam = searchParams.get("city")?.trim() || "";

  const { selectedCity: contextCity, isCityReady, setCity } = useCity();
  const selectedCity = cityParam || contextCity;

  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [isCatalogReady, setIsCatalogReady] = useState(false);

  const [allCenters, setAllCenters] = useState<GamecenterListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    catalogService
      .listDevices({ isActive: true, limit: 50 }, controller.signal)
      .then((devices) => {
        if (!active) return;
        setCatalogDevices(Array.isArray(devices) ? devices : []);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setCatalogDevices([]);
      })
      .finally(() => {
        if (active) setIsCatalogReady(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const categoryTabs = useMemo(() => {
    const dynamicItems =
      catalogDevices.length > 0
        ? catalogDevices.map((d) => ({ id: d.id, name: d.name }))
        : FALLBACK_DEVICE_CATEGORIES;

    return [
      { id: "all", name: "همه" },
      { id: "discounted", name: "تخفیف‌دار" },
      ...dynamicItems,
    ];
  }, [catalogDevices]);

  const resolvedCategory = useMemo(
    () => resolveCategoryFilter(categoryParam, catalogDevices, stationTypeParam),
    [categoryParam, catalogDevices, stationTypeParam]
  );

  useEffect(() => {
    if (!cityParam && !isCityReady) return;
    if (!isCatalogReady) return;

    const controller = new AbortController();
    let active = true;

    async function fetchCenters() {
      try {
        setIsLoading(true);
        setError(null);

        let effectiveCatalog = catalogDevices;
        // If user arrived with a catalog device ID not in the active list (e.g. direct deep link
        // or listDevices failed), fetch that specific device once so stationType filtering still works.
        if (
          categoryParam !== "all" &&
          categoryParam !== "discounted" &&
          !resolvedCategory.catalogDevice &&
          !resolvedCategory.stationType
        ) {
          try {
            const singleDevice = await catalogService.getDeviceById(
              categoryParam,
              controller.signal
            );
            if (singleDevice?.id) {
              effectiveCatalog = [...catalogDevices, singleDevice];
            }
          } catch (deviceErr) {
            if (isAbortError(deviceErr)) throw deviceErr;
          }
        }

        const { centers } = await gamecentersPageService.loadFilteredCenters({
          city: selectedCity,
          category: categoryParam,
          stationType: stationTypeParam,
          catalogDevices: effectiveCatalog,
          signal: controller.signal,
        });

        if (!active) return;
        setAllCenters(centers);
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setError("خطا در دریافت لیست گیمنت‌ها");
        setAllCenters([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchCenters();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    selectedCity,
    cityParam,
    isCityReady,
    isCatalogReady,
    categoryParam,
    stationTypeParam,
    catalogDevices,
    resolvedCategory.catalogDevice,
    resolvedCategory.stationType,
    reloadToken,
  ]);

  const updateQueryParams = (
    updates: Record<string, string | null | undefined>
  ) => {
    setVisibleCount(ITEMS_PER_PAGE);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if ("category" in updates) {
      params.delete("device");
      params.delete("stationType");
    }
    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (key === "category" && value === "all") ||
        (key === "sort" && value === "default")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleClearFilters = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    router.push(pathname);
  };

  const isFilteringActive = useMemo(() => {
    return Boolean(
      queryParam ||
        (categoryParam && categoryParam !== "all") ||
        stationTypeParam ||
        sortParam !== "default"
    );
  }, [queryParam, categoryParam, stationTypeParam, sortParam]);

  const filteredCenters = useMemo(() => {
    return gamecentersPageService.filterCenters(allCenters, {
      q: queryParam,
      category: "all",
      sort: sortParam,
    });
  }, [allCenters, queryParam, sortParam]);

  const totalItems = filteredCenters.length;
  const visibleCenters = useMemo(
    () => filteredCenters.slice(0, visibleCount),
    [filteredCenters, visibleCount]
  );
  const hasMore = visibleCount < totalItems;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-[calc(var(--bottom-bar-h)+1.5rem)] lg:pb-12">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => {
          setCity(city);
          updateQueryParams({ city });
        }}
      />

      <main className="flex-1 px-4 lg:px-8 flex flex-col gap-6 lg:gap-8 lg:pt-[var(--header-h)] pt-[var(--header-m-h)] max-w-[var(--max-app-width)] w-full mx-auto">
        <section className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-page-title text-[var(--text-white)]">گیمنت‌ها</h1>
            {!isLoading && !error && (
              <span className="text-secondary text-[var(--text-muted)]">
                {toPersianDigits(totalItems)} گیمنت
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth -mx-4 px-4 lg:mx-0 lg:px-0">
            <button
              type="button"
              onClick={() => setIsSortOpen(true)}
              className="relative shrink-0 h-11 px-3.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-xs font-bold text-[var(--text-white)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="sort" size={16} />
              <span>مرتب‌سازی</span>
              {sortParam !== "default" && (
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-[var(--primary)]"
                />
              )}
            </button>

            {categoryTabs.map((cat) => {
              const isActive =
                categoryParam === cat.id ||
                (cat.id === "all" && !categoryParam && !stationTypeParam) ||
                Boolean(
                  resolvedCategory.catalogDevice?.id &&
                    resolvedCategory.catalogDevice.id === cat.id
                );
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateQueryParams({ category: cat.id })}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 h-11 px-4 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer",
                    isActive
                      ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  )}
                >
                  {isActive && <Icon name="check" size={16} strokeWidth={2} />}
                  <span>{cat.name}</span>
                </button>
              );
            })}

            {isFilteringActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="shrink-0"
              >
                <Icon name="close" size={16} />
                <span>پاک کردن</span>
              </Button>
            )}
          </div>
        </section>

        {isLoading ? (
          <GamecentersGridSkeleton />
        ) : error ? (
          <ErrorState
            title="خطا در دریافت لیست گیمنت‌ها"
            description={error}
            onRetry={() => setReloadToken((v) => v + 1)}
          />
        ) : visibleCenters.length > 0 ? (
          <section className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {visibleCenters.map((item) => (
                <DiscountedGamecenterCard key={item.id} center={item} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
                >
                  نمایش بیشتر
                </Button>
              </div>
            )}
          </section>
        ) : (
          <EmptyState
            title="موردی با این فیلتر نیست"
            actionLabel={isFilteringActive ? "حذف فیلتر" : undefined}
            onAction={isFilteringActive ? handleClearFilters : undefined}
          />
        )}
      </main>

      <BottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        title="مرتب‌سازی"
      >
        <div className="flex flex-col gap-2">
          {SORT_OPTIONS.map((opt) => {
            const active =
              sortParam === opt.id || (opt.id === "default" && !sortParam);
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  updateQueryParams({ sort: opt.id });
                  setIsSortOpen(false);
                }}
                className={cn(
                  "h-11 px-4 rounded-card flex items-center justify-between text-sm font-bold transition-colors cursor-pointer",
                  active
                    ? "bg-[var(--primary-muted)] text-[var(--primary)] border border-[var(--primary)]"
                    : "bg-[var(--foreground)]/40 text-[var(--text-white)] hover:bg-[var(--foreground)]"
                )}
              >
                <span>{opt.name}</span>
                {active && <Icon name="check" size={16} strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <BottomBar activeTab="gamecenters" />
    </div>
  );
}

export default function GamecentersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-body)] px-4 pt-[var(--header-m-h)] lg:pt-[var(--header-h)] max-w-[var(--max-app-width)] mx-auto">
          <GamecentersGridSkeleton />
        </div>
      }
    >
      <GamecentersContent />
    </Suspense>
  );
}
