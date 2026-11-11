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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  gamecentersPageService,
  GamecenterListItem,
  GamecenterFilterParams,
} from "@/services/gamecentersPageService";
import { toPersianDigits } from "@/lib/format";

const CATEGORIES = [
  { id: "all", name: "همه دستگاه‌ها" },
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

function GamecentersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL query state
  const queryParam = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "all";
  const sortParam =
    (searchParams.get("sort") as GamecenterFilterParams["sort"]) || "default";
  const cityParam = searchParams.get("city") || "تبریز";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const [searchInput, setSearchInput] = useState(queryParam);
  const [selectedCity, setSelectedCity] = useState(cityParam);

  // Live centers state
  const [allCenters, setAllCenters] = useState<GamecenterListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real centers from API
  useEffect(() => {
    const controller = new AbortController();

    async function fetchCenters() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await gamecentersPageService.loadAllCenters(controller.signal);
        setAllCenters(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError((err as Error)?.message || "خطا در دریافت لیست گیمنت‌ها");
          setAllCenters([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCenters();

    return () => {
      controller.abort();
    };
  }, []);

  // Sync search input if query param changes in URL
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  // Sync city state if city param changes
  useEffect(() => {
    setSelectedCity(cityParam);
  }, [cityParam]);

  // Update query params helper
  const updateQueryParams = (
    updates: Record<string, string | null | undefined>,
    resetPage = false
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (resetPage) {
      params.delete("page");
    }
    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (key === "category" && value === "all") ||
        (key === "sort" && value === "default") ||
        (key === "page" && value === "1")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ q: searchInput.trim() }, true);
  };

  const handleCategorySelect = (catId: string) => {
    updateQueryParams({ category: catId }, true);
  };

  const handleSortSelect = (sortId: GamecenterFilterParams["sort"]) => {
    updateQueryParams({ sort: sortId }, true);
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage > 1 ? String(newPage) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    router.push(pathname);
  };

  const isFilteringActive = useMemo(() => {
    return Boolean(
      queryParam ||
      (categoryParam && categoryParam !== "all") ||
      sortParam !== "default",
    );
  }, [queryParam, categoryParam, sortParam]);

  // Data queries derived from real data
  const discountedCenters = useMemo(
    () => gamecentersPageService.getDiscountedCenters(allCenters),
    [allCenters],
  );

  // Filtered centers based on current filter/search/city/sort
  const filteredCenters = useMemo(() => {
    return gamecentersPageService.filterCenters(allCenters, {
      q: queryParam,
      category: categoryParam,
      sort: sortParam,
      city: selectedCity,
    });
  }, [allCenters, queryParam, categoryParam, sortParam, selectedCity]);

  // Pagination calculation (12 items per page)
  const totalItems = filteredCenters.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCenters = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCenters.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCenters, safeCurrentPage]);

  const activeCategoryName = CATEGORIES.find(
    (c) => c.id === categoryParam,
  )?.name;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-12">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => {
          setSelectedCity(city);
          updateQueryParams({ city }, true);
        }}
      />

      <main className="flex-1 px-4 desk:px-6 lg:px-8 flex flex-col gap-6 lg:gap-8  desk:pt-[var(--header-h)] pt-[var(--header-m-h)] max-w-[var(--max-app-width)] w-full mx-auto">
        {/* Page Heading & Search Controls */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-[var(--text-white)] flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
              گیمنت‌ها
            </h1>
            <p className="text-xs text-[var(--text-muted)] pr-3">
              رزرو آنلاین برترین گیم‌نت‌ها و گیم‌کلاب‌های {selectedCity}
            </p>
          </div>


          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {CATEGORIES.map((cat) => {
              const isActive =
                categoryParam === cat.id ||
                (cat.id === "all" && !categoryParam);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] shadow-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--primary)]/60"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Sort & Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]/60">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                مرتب‌سازی:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {SORT_OPTIONS.map((sortOpt) => {
                  const isActive =
                    sortParam === sortOpt.id ||
                    (sortOpt.id === "default" && !sortParam);
                  return (
                    <button
                      key={sortOpt.id}
                      type="button"
                      onClick={() => handleSortSelect(sortOpt.id)}
                      className={`h-8 px-3 rounded-card text-xs font-medium transition-colors border ${
                        isActive
                          ? "bg-[var(--foreground)] text-[var(--primary)] border-[var(--primary)]/50"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                      }`}
                    >
                      {sortOpt.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear All Filters Button */}
            {isFilteringActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-[var(--accent-red)] hover:underline flex items-center gap-1 shrink-0 mr-auto"
              >
                <span>پاک کردن فیلترها</span>
                <span className="text-xs">×</span>
              </button>
            )}
          </div>
        </section>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] h-64"
              />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="خطا در دریافت لیست گیمنت‌ها"
            description={error}
            onRetry={() => {
              setIsLoading(true);
              setError(null);
              gamecentersPageService
                .loadAllCenters()
                .then(setAllCenters)
                .catch((e) => setError(e?.message || "خطا در برقراری ارتباط"))
                .finally(() => setIsLoading(false));
            }}
          />
        ) : allCenters.length === 0 ? (
          <EmptyState
            title="هیچ گیمنتی ثبت نشده است"
            description="در حال حاضر اطلاعات گیمنتی برای نمایش وجود ندارد."
          />
        ) : (
          /* Main Content: Discounted Carousel (on page 1 when no filter) + Paginated 4-columns Grid */
          <>
            {/* Optional Top Carousel: Discounted Gamecenters on first page when not actively filtered */}
            {!isFilteringActive && safeCurrentPage === 1 && discountedCenters.length > 0 && (
              <section className="flex flex-col gap-3 rounded-card p-4 bg-primary text-[var(--text-black)] shadow-lg">
                <Carousel
                  opts={{
                    direction: "rtl",
                    align: "start",
                    containScroll: "trimSnaps",
                  }}
                  className="w-full flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Icon
                          name="info"
                          size={20}
                          className="text-[var(--text-black)]"
                        />
                        <h2 className="font-bold text-base text-[var(--text-black)]">
                          گیمنت‌های تخفیف‌دار
                        </h2>
                      </div>
                      <p className="text-xs text-[var(--text-black)] pr-7">
                        رزرو با قیمت ویژه و محدود
                      </p>
                    </div>

                    <div className="flex items-center gap-1 relative h-8 bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
                      <CarouselPrevious
                        className="static translate-y-0 translate-x-0 w-7 h-7 rounded bg-[var(--foreground)]/60 border-none text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="قبلی"
                      />
                      <CarouselNext
                        className="static translate-y-0 translate-x-0 w-7 h-7 rounded bg-[var(--foreground)]/60 border-none text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="بعدی"
                      />
                    </div>
                  </div>

                  <div className="-mx-4 px-4 pb-2 select-none">
                    <CarouselContent className="gap-2 -mr-2">
                      {discountedCenters.map((item) => (
                        <CarouselItem
                          key={item.id}
                          className="pr-2 basis-[220px] sm:basis-[240px] lg:basis-[260px] flex flex-col min-w-[220px] sm:min-w-[240px]"
                        >
                          <DiscountedGamecenterCard center={item} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </div>
                </Carousel>
              </section>
            )}

            {/* Paginated Gamecenters Section */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
                  <h2 className="font-bold text-base text-[var(--text-white)]">
                    {isFilteringActive ? "نتایج جست‌وجو" : "همه گیمنت‌ها"}
                  </h2>
                  <span className="text-xs text-[var(--text-muted)] mr-1">
                    ({toPersianDigits(totalItems)} گیمنت)
                  </span>
                </div>

                {isFilteringActive && (
                  <div className="flex flex-wrap gap-1.5">
                    {queryParam && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--foreground)] text-xs text-[var(--text-white)]">
                        عبارت: «{queryParam}»
                      </span>
                    )}
                    {categoryParam && categoryParam !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--foreground)] text-xs text-[var(--primary)] font-bold">
                        دستگاه: {activeCategoryName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {paginatedCenters.length > 0 ? (
                <>
                  {/* Desktop: 4 cards per row (lg:grid-cols-4), tablet: 2 (sm:grid-cols-2), mobile: 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {paginatedCenters.map((item) => (
                      <DiscountedGamecenterCard key={item.id} center={item} />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[var(--border-subtle)]">
                      <span className="text-xs text-[var(--text-muted)]">
                        نمایش صفحه {toPersianDigits(safeCurrentPage)} از {toPersianDigits(totalPages)} ({toPersianDigits(totalItems)} گیمنت)
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                          disabled={safeCurrentPage <= 1}
                          className="h-8 px-3 text-xs"
                        >
                          قبلی
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                            // Show first page, last page, current page, and pages adjacent to current page
                            const isAdjacent = Math.abs(pNum - safeCurrentPage) <= 1;
                            const isFirst = pNum === 1;
                            const isLast = pNum === totalPages;

                            if (!isAdjacent && !isFirst && !isLast) {
                              if (pNum === safeCurrentPage - 2 || pNum === safeCurrentPage + 2) {
                                return (
                                  <span key={`ellipsis-${pNum}`} className="w-6 text-center text-xs text-[var(--text-muted)]">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }

                            return (
                              <button
                                key={pNum}
                                type="button"
                                onClick={() => handlePageChange(pNum)}
                                className={`w-8 h-8 rounded-card text-xs font-bold transition-colors cursor-pointer ${
                                  pNum === safeCurrentPage
                                    ? "bg-[var(--primary)] text-on-primary shadow-sm"
                                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-white hover:border-[var(--primary)]/50"
                                }`}
                              >
                                {toPersianDigits(pNum)}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
                          disabled={safeCurrentPage >= totalPages}
                          className="h-8 px-3 text-xs"
                        >
                          بعدی
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="هیچ گیمنتی با این مشخصات پیدا نشد"
                  description="پیشنهاد می‌کنیم فیلترها را تغییر دهید یا عبارت دیگری را جست‌وجو کنید."
                  actionLabel="پاک کردن فیلترها"
                  onAction={handleClearFilters}
                />
              )}
            </section>
          </>
        )}
      </main>

      <BottomBar activeTab="gamecenters" />
    </div>
  );
}

export default function GamecentersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-body)] text-xs text-[var(--text-muted)]">
          در حال بارگذاری...
        </div>
      }
    >
      <GamecentersContent />
    </Suspense>
  );
}
