"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomBar } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
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
  ) => {
    const params = new URLSearchParams(searchParams.toString());
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ q: searchInput.trim() });
  };

  const handleCategorySelect = (catId: string) => {
    updateQueryParams({ category: catId });
  };

  const handleSortSelect = (sortId: GamecenterFilterParams["sort"]) => {
    updateQueryParams({ sort: sortId });
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
  const newestCenters = useMemo(
    () => gamecentersPageService.getNewestCenters(allCenters),
    [allCenters],
  );
  const popularCenters = useMemo(
    () => gamecentersPageService.getPopularCenters(allCenters),
    [allCenters],
  );

  const filteredResults = useMemo(() => {
    return gamecentersPageService.filterCenters(allCenters, {
      q: queryParam,
      category: categoryParam,
      sort: sortParam,
      city: selectedCity,
    });
  }, [allCenters, queryParam, categoryParam, sortParam, selectedCity]);

  const activeCategoryName = CATEGORIES.find(
    (c) => c.id === categoryParam,
  )?.name;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-12">
      <Header
        locationName={selectedCity}
        unreadNotificationsCount={2}
        onCityChange={(city) => {
          setSelectedCity(city);
          updateQueryParams({ city });
        }}
      />

      <main className="flex-1 px-4 desk:px-6 lg:px-8 flex flex-col gap-6 lg:gap-8 pt-[var(--header-h)] max-w-[var(--max-app-width)] w-full mx-auto">
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

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="جست‌وجوی نام گیمنت، آدرس یا امکانات..."
                className="p-4 pr-10  w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]  text-xs text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
              <span className="absolute right-3 text-[var(--primary)] pointer-events-none">
                <Icon name="search" size={18} />
              </span>

              <div className="absolute left-2 flex items-center gap-1">
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      updateQueryParams({ q: null });
                    }}
                    className="h-7 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] rounded"
                  >
                    پاک کردن
                  </button>
                )}
                <button
                  type="submit"
                  className="h-8 w-8  flex items-center justify-center rounded bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </form>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 py-6">
            {Array.from({ length: 6 }).map((_, idx) => (
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
        ) : isFilteringActive ? (
          /* Dynamic View: If filtering is active, show Search Results Grid */
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                نتایج جست‌وجو{" "}
                <span className="text-xs font-normal text-[var(--text-muted)] mr-1">
                  ({toPersianDigits(filteredResults.length)} گیمنت)
                </span>
              </h2>

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
            </div>

            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredResults.map((item) => (
                  <DiscountedGamecenterCard key={item.id} center={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="هیچ گیمنتی با این مشخصات پیدا نشد"
                description="پیشنهاد می‌کنیم فیلترها را تغییر دهید یا عبارت دیگری را جست‌وجو کنید."
                actionLabel="پاک کردن فیلترها"
                onAction={handleClearFilters}
              />
            )}
          </section>
        ) : allCenters.length === 0 ? (
          <EmptyState
            title="هیچ گیمنتی ثبت نشده است"
            description="در حال حاضر اطلاعات گیمنتی برای نمایش وجود ندارد."
          />
        ) : (
          /* Default Browse View: Containers 1, 2, and 3 */
          <>
            {/* Container 1: Discounted Gamecenters Carousel */}
            {discountedCenters.length > 0 && (
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

            {/* Container 2: Newest Gamecenters */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
                  <h2 className="font-bold text-base text-[var(--text-white)]">
                    جدیدترین گیمنت‌ها
                  </h2>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  تازه‌ترین‌های افزوده شده
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {newestCenters.map((item) => (
                  <DiscountedGamecenterCard key={item.id} center={item} />
                ))}
              </div>
            </section>

            {/* Container 3: Most Popular Gamecenters */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
                  <h2 className="font-bold text-base text-[var(--text-white)]">
                    محبوب‌ترین گیمنت‌ها
                  </h2>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  بیشترین رضایت و رزرو
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {popularCenters.map((item) => (
                  <DiscountedGamecenterCard key={item.id} center={item} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomBar activeTab="home" />
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
