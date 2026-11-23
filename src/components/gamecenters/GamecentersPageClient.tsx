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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export interface GamecentersPageClientProps {
  initialCenters?: GamecenterListItem[];
  initialCatalog?: DeviceCatalogItem[];
}

export function GamecentersPageClient({
  initialCenters = [],
  initialCatalog = [],
}: GamecentersPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCity, isCityReady, setCity } = useCity();

  const queryParam = searchParams.get("q") ?? "";
  const cityParam = searchParams.get("city") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
  const stationTypeParam = searchParams.get("stationType") ?? "";
  const sortParam: GamecenterFilterParams["sort"] =
    (searchParams.get("sort") as GamecenterFilterParams["sort"]) ?? "default";

  const [allCenters, setAllCenters] = useState<GamecenterListItem[]>(initialCenters);
  const [isLoading, setIsLoading] = useState<boolean>(initialCenters.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [catalogDevices, setCatalogDevices] =
    useState<DeviceCatalogItem[]>(initialCatalog);
  const [isCatalogReady, setIsCatalogReady] = useState(initialCatalog.length > 0);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Sync city from URL to Context if present
  useEffect(() => {
    if (cityParam && cityParam !== selectedCity) {
      setCity(cityParam);
    }
  }, [cityParam, selectedCity, setCity]);

  // Load catalog devices if not provided initially
  useEffect(() => {
    if (initialCatalog.length > 0) return;
    let active = true;
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const devices = await catalogService.listDevices(
          { isActive: true, limit: 50 },
          controller.signal
        );
        if (!active) return;
        setCatalogDevices(devices);
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setCatalogDevices([]);
      } finally {
        if (active) setIsCatalogReady(true);
      }
    }

    loadCatalog();

    return () => {
      active = false;
      controller.abort();
    };
  }, [initialCatalog.length]);

  const resolvedCategory = useMemo(() => {
    return resolveCategoryFilter(
      categoryParam || stationTypeParam,
      catalogDevices
    );
  }, [categoryParam, stationTypeParam, catalogDevices]);

  const categoryTabs = useMemo(() => {
    const defaultTabs = [{ id: "all", name: "همه دستگاه‌ها" }];

    if (catalogDevices.length > 0) {
      const dynamicTabs = catalogDevices.map((device) => ({
        id: device.id,
        name: device.name,
      }));
      return [...defaultTabs, ...dynamicTabs];
    }

    return [...defaultTabs, ...FALLBACK_DEVICE_CATEGORIES];
  }, [catalogDevices]);

  // Fetch centers on filter changes
  useEffect(() => {
    // If we have initial centers and this is the default initial state, skip duplicate fetch
    if (
      initialCenters.length > 0 &&
      reloadToken === 0 &&
      !queryParam &&
      !categoryParam &&
      !stationTypeParam &&
      sortParam === "default" &&
      (!cityParam || cityParam === selectedCity)
    ) {
      return;
    }

    if (!isCityReady) return;

    let active = true;
    const controller = new AbortController();

    async function fetchCenters() {
      try {
        setIsLoading(true);
        setError(null);

        const targetCity = cityParam || selectedCity;

        let effectiveCatalog = catalogDevices;
        if (
          categoryParam &&
          categoryParam !== "all" &&
          categoryParam !== "discounted" &&
          !catalogDevices.some((d) => d.id === categoryParam)
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
          city: targetCity,
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
    initialCenters.length,
    queryParam,
    sortParam,
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
            <h1 className="text-page-title text-[var(--text-white)]">مراکز بازی و گیم‌نت‌ها</h1>
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
                      ? "bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <ErrorState
            title="خطا در دریافت لیست گیمنت‌ها"
            description={error}
            onRetry={() => setReloadToken((prev) => prev + 1)}
          />
        ) : isLoading ? (
          <GamecentersGridSkeleton />
        ) : visibleCenters.length === 0 ? (
          <EmptyState
            title="گیمنتی یافت نشد"
            description="با توجه به فیلترهای انتخابی یا شهر مورد نظر، مرکزی پیدا نشد."
            actionLabel={isFilteringActive ? "پاک کردن فیلترها" : undefined}
            onAction={isFilteringActive ? handleClearFilters : undefined}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleCenters.map((center) => (
                <DiscountedGamecenterCard key={center.id} center={center} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() =>
                    setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
                  }
                  className="min-w-[200px]"
                >
                  مشاهده بیشتر
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        title="مرتب‌سازی بر اساس"
      >
        <div className="flex flex-col gap-2 p-4">
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
