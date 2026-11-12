"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { BannerSlider } from "@/components/BannerSlider";
import {
  DeviceCategories,
  type DeviceCategory,
  mapCatalogDeviceToCategory,
} from "@/components/DeviceCategories";
import { DiscountedCentersSection } from "@/components/DiscountedCentersSection";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { homeService } from "@/services/homeService";
import { catalogService } from "@/services/catalogService";
import {
  gamecentersPageService,
  type GamecenterListItem,
} from "@/services/gamecentersPageService";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { BannerItem } from "@/types/home";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>("ps5");
  const [selectedCity, setSelectedCity] = useState("تبریز");
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  // دستگاه‌ها و دسته‌بندی‌ها: واکشی از API /catalog/devices
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // گیمنت‌ها: فقط از API
  const [centers, setCenters] = useState<GamecenterListItem[]>([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [centersError, setCentersError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBanners() {
      try {
        setBannersLoading(true);
        const data = await homeService.getBanners(controller.signal);
        setBanners(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          // Silently handle service error (banner is not a critical section)
          setBanners([]);
        }
      } finally {
        setBannersLoading(false);
      }
    }

    async function loadCatalogDevices() {
      try {
        setCategoriesLoading(true);
        const devices = await catalogService.listDevices({ isActive: true }, controller.signal);
        if (Array.isArray(devices) && devices.length > 0) {
          const mapped = devices.map(mapCatalogDeviceToCategory);
          setCategories(mapped);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          // If catalog devices API fails or is empty, DeviceCategories defaults safely
        }
      } finally {
        setCategoriesLoading(false);
      }
    }

    loadBanners();
    loadCatalogDevices();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setCentersLoading(true);
    setCentersError(null);

    gamecentersPageService
      .loadAllCenters(controller.signal)
      .then((data) => {
        if (!active) return;
        setCenters(data);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCenters([]);
        setCentersError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setCentersLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const cityCenters = useMemo(
    () => gamecentersPageService.filterCenters(centers, { city: selectedCity }),
    [centers, selectedCity]
  );
  const popularCenters = useMemo(
    () => gamecentersPageService.getPopularCenters(cityCenters),
    [cityCenters]
  );
  const featuredCenters = useMemo(
    () => gamecentersPageService.getFeaturedCenters(cityCenters),
    [cityCenters]
  );

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    router.push(`/gamecenters?category=${encodeURIComponent(id)}`);
  };

  const skeletonRow = (
    <div className="flex gap-2 overflow-hidden pb-2" aria-busy="true">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] h-[280px] w-[220px] min-w-[220px] shrink-0 sm:w-[240px] sm:min-w-[240px] lg:w-[260px] lg:min-w-[260px]"
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => setSelectedCity(city)}
      />

      <main className="flex-1 p-4 flex flex-col gap-6 lg:gap-8 pt-[var(--header-m-h)]  desk:pt-[var(--header-h)]">
        {/* ۱. بخش اسلایدر بنرهای تبلیغاتی
            فقط در دسکتاپ (lg): کانتینر تمام‌عرض می‌ماند ولی هر اسلاید ۵۶٪ عرض می‌گیرد
            و اسلایدهای کناری هم دیده می‌شوند. برای ثابت ماندن ارتفاع،
            نسبت اسلاید از 4/1 به 2.24/1 (= 4 × 0.56) تغییر کرده است.
            موبایل و تبلت بدون تغییر هستند. */}
        <section>
          <BannerSlider
            banners={banners}
            isLoading={bannersLoading}
            centerOnDesktop
            desktopSlideBasisClass="lg:basis-[70%]"
            aspectClassName="aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3/1]"
          />
        </section>

        {/* ۲. بخش انواع دستگاه‌ها و پلتفرم‌های بازی (از API) */}
        <section>
          <DeviceCategories
            categories={categories.length > 0 ? categories : undefined}
            isLoading={categoriesLoading}
            selectedCategoryId={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </section>

        {/* ۳. بخش گیمنت‌های تخفیف‌دار */}
        <DiscountedCentersSection city={selectedCity} />

        {/* خطای دریافت لیست گیمنت‌ها */}
        {centersError && (
          <ErrorState
            title="بارگذاری گیمنت‌ها انجام نشد"
            description={centersError}
            onRetry={() => setReloadToken((v) => v + 1)}
          />
        )}

        {/* ۴. بخش گیمنت‌های محبوب و پربازدید */}
        {!centersError && (centersLoading || popularCenters.length > 0) && (
          <section className="flex flex-col gap-3">
            <Carousel
              opts={{
                direction: "rtl",
                align: "start",
                containScroll: "trimSnaps",
              }}
              className="w-full flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-[var(--text-white)]">
                  گیمنت‌های محبوب {selectedCity !== "تبریز" ? `(${selectedCity})` : ""}
                </h2>
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

              {centersLoading ? (
                skeletonRow
              ) : (
                <div className="-mx-4 desk:-mx-6 lg:-mx-8 px-4 desk:px-6 lg:px-8 pb-2 select-none">
                  <CarouselContent className="gap-2 -mr-2">
                    {popularCenters.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pr-2 basis-[220px] min-w-[220px] sm:basis-[240px] lg:basis-[260px] flex flex-col"
                      >
                        <DiscountedGamecenterCard center={item} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </div>
              )}
            </Carousel>
          </section>
        )}

        {/* ۵. بخش پیشنهاد ویژه و گیمنت‌های برتر سایرا */}
        {!centersError && !centersLoading && featuredCenters.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[var(--text-white)]">پیشنهاد ویژه سایرا</h2>
              <span className="text-xs text-[var(--text-muted)]">برترین کیفیت و امکانات</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {featuredCenters.map((item) => (
                <DiscountedGamecenterCard key={item.id} center={item} />
              ))}
            </div>
          </section>
        )}

        {/* ۶. چهار مقاله‌ی جدید وبلاگ در انتهای صفحه اصلی */}
        <HomeBlogSection />
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}