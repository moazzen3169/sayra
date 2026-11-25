"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomBar } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { GamecenterListItem } from "@/services/gamecentersPageService";
import {
  searchService,
  canonicalizeDeviceType,
  mapSearchGameCenterToListItem,
  mapUiSortToSearchSort,
  resolveDeviceFilterForSearch,
} from "@/services/searchService";
import { catalogService } from "@/services/catalogService";
import { isAbortError } from "@/lib/api/client";
import type { DeviceCatalogItem } from "@/types/catalog";
import type {
  ResolvedSearchGameDto,
  SearchFacetsDto,
  ZeroResultSuggestionDto,
} from "@/types/search";
import { toPersianDigits } from "@/lib/format";
import { useCity } from "@/context/CityContext";
import { cn } from "@/lib/utils";

const FALLBACK_DEVICE_TABS: Array<{ id: string; name: string; deviceType: string }> = [
  { id: "ps5", name: "پلی‌استیشن ۵", deviceType: "PLAYSTATION 5" },
  { id: "ps4", name: "پلی‌استیشن ۴", deviceType: "PLAYSTATION 4" },
  { id: "pc", name: "کامپیوتر گیمینگ", deviceType: "PC" },
  { id: "xbox", name: "ایکس‌باکس", deviceType: "XBOX" },
  { id: "vr", name: "واقعیت مجازی", deviceType: "VR" },
  { id: "switch", name: "سوییچ / بیلیارد", deviceType: "SWITCH" },
];

const ITEMS_PER_PAGE = 12;

type UiSortKey =
  | "default"
  | "relevance"
  | "popular"
  | "newest"
  | "rating"
  | "price_asc"
  | "price_desc";

const SORT_OPTIONS: { id: UiSortKey; name: string }[] = [
  { id: "default", name: "پیشنهاد سایرا (مرتبط‌ترین)" },
  { id: "popular", name: "محبوب‌ترین" },
  { id: "rating", name: "بالاترین امتیاز" },
  { id: "newest", name: "جدیدترین" },
  { id: "price_asc", name: "ارزان‌ترین" },
  { id: "price_desc", name: "گران‌ترین" },
];

function getPaginationItems(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let p = currentPage - 1; p <= currentPage + 1; p += 1) {
    if (p > 1 && p < totalPages) {
      pages.add(p);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

function GamecentersGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export interface GamecentersPageClientProps {
  initialCenters?: GamecenterListItem[];
  initialTotal?: number;
  initialTotalPages?: number;
  initialCatalog?: DeviceCatalogItem[];
}

export function GamecentersPageClient({
  initialCenters = [],
  initialTotal,
  initialTotalPages = 1,
  initialCatalog = [],
}: GamecentersPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedCity, isCityReady, setCity } = useCity();

  const queryParam = searchParams.get("q") ?? "";
  const gameParam = searchParams.get("game") ?? "";
  const gameIdParam = searchParams.get("gameId") ?? "";
  const gameSlugParam = searchParams.get("gameSlug") ?? "";
  const cityParam = searchParams.get("city") ?? "";
  const neighborhoodParam = searchParams.get("neighborhood") ?? "";
  const deviceTypeParam = searchParams.get("deviceType") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
  const stationTypeParam = searchParams.get("stationType") ?? "";
  const isOpenParam = searchParams.get("isOpen") === "true";
  const hasDiscountParam =
    searchParams.get("hasDiscount") === "true" ||
    categoryParam.toLowerCase() === "discounted";
  const sortParam = (searchParams.get("sort") as UiSortKey) || "default";
  const rawPageParam = Number(searchParams.get("page"));
  const pageParam =
    Number.isInteger(rawPageParam) && rawPageParam > 0 ? rawPageParam : 1;

  const [centers, setCenters] = useState<GamecenterListItem[]>(
    initialCenters.slice(0, ITEMS_PER_PAGE)
  );
  const [totalItems, setTotalItems] = useState<number>(
    initialTotal ?? initialCenters.length
  );
  const [currentPage, setCurrentPage] = useState<number>(pageParam);
  const [totalPages, setTotalPages] = useState<number>(
    Math.max(
      1,
      initialTotalPages ||
        Math.ceil((initialTotal ?? initialCenters.length) / ITEMS_PER_PAGE)
    )
  );
  const [facets, setFacets] = useState<SearchFacetsDto | undefined>(undefined);
  const [resolvedGames, setResolvedGames] = useState<ResolvedSearchGameDto[]>([]);
  const [suggestions, setSuggestions] = useState<ZeroResultSuggestionDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(
    initialCenters.length === 0 || pageParam > 1
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const isFirstFetchRef = useRef(true);

  const [catalogDevices, setCatalogDevices] =
    useState<DeviceCatalogItem[]>(initialCatalog);
  const [isCatalogReady, setIsCatalogReady] = useState(initialCatalog.length > 0);
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

  const resolvedDevice = useMemo(() => {
    return resolveDeviceFilterForSearch({
      deviceType: deviceTypeParam,
      category: categoryParam,
      stationType: stationTypeParam,
      catalogDevices,
    });
  }, [deviceTypeParam, categoryParam, stationTypeParam, catalogDevices]);

  const deviceTabs = useMemo(() => {
    const allTab = { id: "all", name: "همه دستگاه‌ها", deviceType: "" };

    if (catalogDevices.length > 0) {
      const dynamicTabs = catalogDevices.map((device) => {
        const rawType = device.deviceTypeRef?.category || device.deviceType;
        let canonical = canonicalizeDeviceType(rawType) || "";
        if (!canonical || canonical === "PLAYSTATION") {
          const fromName = canonicalizeDeviceType(device.name);
          if (fromName === "PLAYSTATION 5" || fromName === "PLAYSTATION 4") {
            canonical = fromName;
          }
        }
        return {
          id: device.id,
          name: device.name,
          deviceType: canonical,
        };
      });
      return [allTab, ...dynamicTabs];
    }

    return [allTab, ...FALLBACK_DEVICE_TABS];
  }, [catalogDevices]);

  const facetCountByDeviceType = useMemo(() => {
    const map = new Map<string, number>();
    if (!facets?.deviceTypes) return map;
    for (const bucket of facets.deviceTypes) {
      const canonical = canonicalizeDeviceType(bucket.key);
      if (canonical) {
        map.set(canonical, (map.get(canonical) ?? 0) + bucket.count);
      }
    }
    return map;
  }, [facets]);

  const needsCatalogResolution = Boolean(
    categoryParam &&
      categoryParam !== "all" &&
      categoryParam !== "discounted" &&
      !deviceTypeParam &&
      !resolvedDevice.deviceType &&
      !isCatalogReady
  );

  // Fetch search results from GET /public/search/gamecenters
  useEffect(() => {
    const isDefaultInitialState =
      initialCenters.length > 0 &&
      reloadToken === 0 &&
      pageParam === 1 &&
      !queryParam &&
      !gameParam &&
      !gameIdParam &&
      !gameSlugParam &&
      !neighborhoodParam &&
      !deviceTypeParam &&
      !categoryParam &&
      !stationTypeParam &&
      !isOpenParam &&
      !hasDiscountParam &&
      sortParam === "default" &&
      (!cityParam || cityParam === selectedCity);

    if (isFirstFetchRef.current && isDefaultInitialState) {
      isFirstFetchRef.current = false;
      return;
    }

    if (!isCityReady || needsCatalogResolution) return;
    isFirstFetchRef.current = false;

    let active = true;
    const controller = new AbortController();

    async function fetchSearchResults() {
      try {
        setIsLoading(true);
        setError(null);
        setCurrentPage(pageParam);

        const targetCity = cityParam || selectedCity;

        // If categoryParam is an unknown catalog ID not in initial list, try single lookup
        let effectiveDeviceType = resolvedDevice.deviceType;
        if (
          !effectiveDeviceType &&
          categoryParam &&
          categoryParam !== "all" &&
          categoryParam !== "discounted"
        ) {
          try {
            const singleDevice = await catalogService.getDeviceById(
              categoryParam,
              controller.signal
            );
            if (singleDevice?.id) {
              const singleResolved = resolveDeviceFilterForSearch({
                category: categoryParam,
                catalogDevices: [singleDevice],
              });
              effectiveDeviceType = singleResolved.deviceType;
            }
          } catch (deviceErr) {
            if (isAbortError(deviceErr)) throw deviceErr;
          }
        }

        const hasSearchIntent = Boolean(
          queryParam.trim() || gameParam.trim() || gameIdParam.trim() || gameSlugParam.trim()
        );

        const payload = await searchService.searchGameCenters({
          q: queryParam || undefined,
          game: !gameIdParam && gameParam ? gameParam : undefined,
          gameId: gameIdParam || undefined,
          gameSlug: gameSlugParam || undefined,
          city: targetCity,
          neighborhood: neighborhoodParam || undefined,
          deviceType: effectiveDeviceType,
          isOpen: isOpenParam ? true : undefined,
          hasDiscount: hasDiscountParam || resolvedDevice.isDiscounted ? true : undefined,
          sort: mapUiSortToSearchSort(sortParam, hasSearchIntent),
          includeFacets: true,
          page: pageParam,
          limit: ITEMS_PER_PAGE,
          signal: controller.signal,
        });

        if (!active) return;
        const nextTotal = payload.meta.total;
        const nextTotalPages = Math.max(
          1,
          payload.meta.totalPages || Math.ceil(nextTotal / ITEMS_PER_PAGE)
        );
        setCenters(
          payload.data
            .map(mapSearchGameCenterToListItem)
            .slice(0, ITEMS_PER_PAGE)
        );
        setTotalItems(nextTotal);
        setCurrentPage(payload.meta.page || pageParam);
        setTotalPages(nextTotalPages);
        setFacets(payload.facets);
        setResolvedGames(payload.resolvedGames);
        setSuggestions(payload.suggestions ?? []);
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setError("خطا در دریافت نتایج جست‌وجوی گیمنت‌ها");
        setCenters([]);
        setTotalItems(0);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchSearchResults();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    selectedCity,
    cityParam,
    neighborhoodParam,
    isCityReady,
    needsCatalogResolution,
    queryParam,
    gameParam,
    gameIdParam,
    gameSlugParam,
    deviceTypeParam,
    categoryParam,
    stationTypeParam,
    resolvedDevice.deviceType,
    resolvedDevice.isDiscounted,
    isOpenParam,
    hasDiscountParam,
    sortParam,
    pageParam,
    reloadToken,
    initialCenters.length,
  ]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const updateQueryParams = (
    updates: Record<string, string | null | undefined>
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if ("deviceType" in updates || "category" in updates) {
      params.delete("device");
      params.delete("stationType");
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (key === "category" && value === "all") ||
        (key === "deviceType" && value === "all") ||
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

  const handleSelectDeviceTab = (tab: { id: string; deviceType: string }) => {
    if (tab.id === "all") {
      updateQueryParams({ category: null, deviceType: null, stationType: null });
      return;
    }
    updateQueryParams({
      category: tab.id,
      deviceType: tab.deviceType || null,
      stationType: null,
    });
  };

  const handleApplySuggestion = (suggestion: ZeroResultSuggestionDto) => {
    if (suggestion.type === "DID_YOU_MEAN_GAME" && suggestion.suggestedValue) {
      updateQueryParams({
        q: null,
        gameId: null,
        gameSlug: null,
        game: suggestion.suggestedValue,
      });
      return;
    }
    if (suggestion.type === "NEARBY_CITY" && suggestion.suggestedValue) {
      setCity(suggestion.suggestedValue);
      updateQueryParams({
        city: suggestion.suggestedValue,
        neighborhood: null,
      });
      return;
    }
    if (suggestion.type === "RELAX_FILTER" && suggestion.filterKey) {
      const key = suggestion.filterKey;
      if (key === "deviceType" || key === "stationType") {
        updateQueryParams({ deviceType: null, category: null, stationType: null });
      } else if (key === "isOpen" || key === "status") {
        updateQueryParams({ isOpen: null });
      } else if (key === "hasDiscount") {
        updateQueryParams({ hasDiscount: null, category: categoryParam === "discounted" ? null : categoryParam });
      } else {
        updateQueryParams({ [key]: null });
      }
    }
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  const isFilteringActive = useMemo(() => {
    return Boolean(
      queryParam ||
        gameParam ||
        gameIdParam ||
        gameSlugParam ||
        neighborhoodParam ||
        deviceTypeParam ||
        (categoryParam && categoryParam !== "all") ||
        stationTypeParam ||
        isOpenParam ||
        hasDiscountParam ||
        sortParam !== "default"
    );
  }, [
    queryParam,
    gameParam,
    gameIdParam,
    gameSlugParam,
    neighborhoodParam,
    deviceTypeParam,
    categoryParam,
    stationTypeParam,
    isOpenParam,
    hasDiscountParam,
    sortParam,
  ]);

  const activeGameLabel = useMemo(() => {
    if (gameParam) return gameParam;
    if (resolvedGames.length > 0) {
      return resolvedGames[0].titleFa || resolvedGames[0].title;
    }
    return gameSlugParam || "";
  }, [gameParam, gameSlugParam, resolvedGames]);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-[calc(var(--bottom-bar-h)+1.5rem)] lg:pb-12">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => {
          setCity(city);
          updateQueryParams({ city, neighborhood: null });
        }}
      />

      <main className="flex-1 px-4 lg:px-8 flex flex-col gap-6 lg:gap-8 lg:pt-[var(--header-h)] pt-[var(--header-m-h)] max-w-[var(--max-app-width)] w-full mx-auto">
        <section className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-page-title text-[var(--text-white)]">
              مراکز بازی و گیم‌نت‌ها
            </h1>
            {!isLoading && !error && (
              <span className="text-secondary text-[var(--text-muted)]">
                {toPersianDigits(totalItems)} گیمنت
              </span>
            )}
          </div>

          {/* Active search / context chips */}
          {(queryParam || activeGameLabel || neighborhoodParam) && (
            <div className="flex flex-wrap items-center gap-2">
              {queryParam && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
                  <Icon name="search" size={14} />
                  <span>جست‌وجو: «{queryParam}»</span>
                  <button
                    type="button"
                    onClick={() => updateQueryParams({ q: null })}
                    aria-label="حذف عبارت جست‌وجو"
                    className="mr-0.5 hover:text-[var(--text-white)] cursor-pointer"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}

              {activeGameLabel && (gameParam || gameIdParam || gameSlugParam) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
                  <Icon name="gamepad" size={14} />
                  <span>بازی: {activeGameLabel}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQueryParams({ game: null, gameId: null, gameSlug: null })
                    }
                    aria-label="حذف فیلتر بازی"
                    className="mr-0.5 hover:text-[var(--text-white)] cursor-pointer"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}

              {neighborhoodParam && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]">
                  <Icon name="pin" size={14} />
                  <span>محله: {neighborhoodParam}</span>
                  <button
                    type="button"
                    onClick={() => updateQueryParams({ neighborhood: null })}
                    aria-label="حذف فیلتر محله"
                    className="mr-0.5 hover:text-[var(--text-white)] cursor-pointer"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}

              {isFilteringActive && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] px-2 py-1 cursor-pointer transition-colors"
                >
                  پاک کردن همه
                </button>
              )}
            </div>
          )}

          {/* Filter & Device Carousel Bar (Mobile & Desktop) */}
          <Carousel
            opts={{
              direction: "rtl",
              align: "start",
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            className="w-full"
            aria-label="فیلترهای گیم‌نت‌ها"
          >
            <CarouselContent className="-mr-2 py-0.5 cursor-grab active:cursor-grabbing select-none">
              <CarouselItem className="basis-auto pr-2">
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
              </CarouselItem>

              <CarouselItem className="basis-auto pr-2">
                <button
                  type="button"
                  onClick={() =>
                    updateQueryParams({ isOpen: isOpenParam ? null : "true" })
                  }
                  aria-pressed={isOpenParam}
                  className={cn(
                    "shrink-0 h-11 px-3.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer",
                    isOpenParam
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/50"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  )}
                >
                  <Icon name="clock" size={15} />
                  <span>باز است</span>
                </button>
              </CarouselItem>

              <CarouselItem className="basis-auto pr-2">
                <button
                  type="button"
                  onClick={() =>
                    updateQueryParams({
                      hasDiscount: hasDiscountParam ? null : "true",
                      category:
                        hasDiscountParam && categoryParam.toLowerCase() === "discounted"
                          ? null
                          : categoryParam || undefined,
                    })
                  }
                  aria-pressed={hasDiscountParam}
                  className={cn(
                    "shrink-0 h-11 px-3.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer",
                    hasDiscountParam
                      ? "bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary)]"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  )}
                >
                  <Icon name="tag" size={15} />
                  <span>تخفیف‌دار</span>
                </button>
              </CarouselItem>

              {deviceTabs.map((tab) => {
                const isAllTab = tab.id === "all";
                const isActive = isAllTab
                  ? !resolvedDevice.deviceType && !categoryParam && !stationTypeParam && !deviceTypeParam
                  : categoryParam === tab.id ||
                    Boolean(
                      resolvedDevice.matchedCatalogDevice?.id &&
                        resolvedDevice.matchedCatalogDevice.id === tab.id
                    ) ||
                    Boolean(
                      tab.deviceType &&
                        resolvedDevice.deviceType &&
                        tab.deviceType === resolvedDevice.deviceType &&
                        !resolvedDevice.matchedCatalogDevice
                    );

                const facetCount = tab.deviceType
                  ? facetCountByDeviceType.get(tab.deviceType)
                  : undefined;

                return (
                  <CarouselItem key={tab.id} className="basis-auto pr-2">
                    <button
                      type="button"
                      onClick={() => handleSelectDeviceTab(tab)}
                      aria-pressed={isActive}
                      className={cn(
                        "shrink-0 h-11 px-4 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer",
                        isActive
                          ? "bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary)]"
                          : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                      )}
                    >
                      <span>{tab.name}</span>
                      {typeof facetCount === "number" && facetCount > 0 && (
                        <span className="text-[11px] opacity-75">
                          ({toPersianDigits(facetCount)})
                        </span>
                      )}
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </section>

        {error ? (
          <ErrorState
            title="خطا در دریافت لیست گیمنت‌ها"
            description={error}
            onRetry={() => setReloadToken((prev) => prev + 1)}
          />
        ) : isLoading ? (
          <GamecentersGridSkeleton />
        ) : centers.length === 0 ? (
          <div className="flex flex-col items-center gap-5">
            <EmptyState
              title="گیمنتی یافت نشد"
              description="با توجه به فیلترهای انتخابی یا عبارت جست‌وجو، مرکزی پیدا نشد."
              actionLabel={isFilteringActive ? "پاک کردن فیلترها" : undefined}
              onAction={isFilteringActive ? handleClearFilters : undefined}
            />

            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion.type}-${idx}`}
                    type="button"
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                  >
                    <span>{suggestion.label}</span>
                    {typeof suggestion.estimatedCount === "number" &&
                      suggestion.estimatedCount > 0 && (
                        <span className="text-[var(--text-muted)]">
                          ({toPersianDigits(suggestion.estimatedCount)})
                        </span>
                      )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {centers.map((center) => (
                <DiscountedGamecenterCard key={center.id} center={center} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="صفحه‌بندی گیم‌نت‌ها"
                className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2"
              >
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="صفحه قبلی"
                  className={cn(
                    "h-10 px-3 rounded-card border text-xs font-bold inline-flex items-center gap-1 transition-colors",
                    currentPage <= 1
                      ? "border-[var(--border-subtle)] bg-[var(--bg-card)]/50 text-[var(--text-muted)] opacity-45 cursor-not-allowed"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                  )}
                >
                  <Icon name="back" size={15} />
                  <span className="hidden sm:inline">قبلی</span>
                </button>

                {paginationItems.map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      aria-hidden="true"
                      className="h-10 min-w-8 px-1 inline-flex items-center justify-center text-xs text-[var(--text-muted)] select-none"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handlePageChange(item)}
                      aria-label={`صفحه ${toPersianDigits(item)}`}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={cn(
                        "h-10 min-w-10 px-3 rounded-card border text-xs font-bold inline-flex items-center justify-center transition-colors",
                        item === currentPage
                          ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary cursor-default"
                          : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                      )}
                    >
                      {toPersianDigits(item)}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="صفحه بعدی"
                  className={cn(
                    "h-10 px-3 rounded-card border text-xs font-bold inline-flex items-center gap-1 transition-colors",
                    currentPage >= totalPages
                      ? "border-[var(--border-subtle)] bg-[var(--bg-card)]/50 text-[var(--text-muted)] opacity-45 cursor-not-allowed"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                  )}
                >
                  <span className="hidden sm:inline">بعدی</span>
                  <Icon name="back" size={15} className="rotate-180" />
                </button>
              </nav>
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
