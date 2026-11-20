"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomBar, TabType } from "@/components/BottomBar";
import {
  DiscountedGamecenterCard,
  GamecenterCardSkeleton,
} from "@/components/DiscountedGamecenterCard";
import { BannerSlider } from "@/components/BannerSlider";
import { DeviceCategories } from "@/components/DeviceCategories";
import {
  mapCatalogDeviceToCategory,
  type DeviceCategory,
} from "@/lib/deviceCategories";
import { DiscountedCentersSection } from "@/components/DiscountedCentersSection";
import { CustomerExperienceSection } from "@/components/home/CustomerExperienceSection";
import { OwnerGrowthSection } from "@/components/home/OwnerGrowthSection";
import { GameCentersMap } from "@/components/map/GameCentersMap";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
import type { BannerItem, DiscountedCenter } from "@/types/home";
import type { BlogPostSummary } from "@/types/blog";
import { useCity } from "@/context/CityContext";

export interface HomePageClientProps {
  initialCity: string;
  initialBanners: BannerItem[];
  initialBannersLoaded: boolean;
  initialCategories: DeviceCategory[];
  initialCategoriesLoaded: boolean;
  initialCenters: GamecenterListItem[];
  initialCentersLoaded: boolean;
  initialDiscountedCenters: DiscountedCenter[];
  initialBlogPosts: BlogPostSummary[];
  initialBlogLoaded: boolean;
}

export const HomePageClient: React.FC<HomePageClientProps> = ({
  initialCity,
  initialBanners,
  initialBannersLoaded,
  initialCategories,
  initialCategoriesLoaded,
  initialCenters,
  initialCentersLoaded,
  initialDiscountedCenters,
  initialBlogPosts,
  initialBlogLoaded,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { selectedCity, isCityReady, setCity } = useCity();

  const [banners, setBanners] = useState<BannerItem[]>(
    initialBannersLoaded ? initialBanners : []
  );
  const [bannersLoading, setBannersLoading] = useState<boolean>(
    !initialBannersLoaded
  );

  // دستگاه‌ها و دسته‌بندی‌ها: واکشی از API /catalog/devices
  const [categories, setCategories] = useState<DeviceCategory[]>(
    initialCategoriesLoaded ? initialCategories : []
  );
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(
    !initialCategoriesLoaded
  );

  // گیمنت‌ها: تزریق اولیه از سرور برای شهر پیش‌فرض و به‌روزرسانی کلاینت در تغییر شهر
  const [centers, setCenters] = useState<GamecenterListItem[]>(
    initialCentersLoaded ? initialCenters : []
  );
  const [centersLoading, setCentersLoading] = useState<boolean>(
    !initialCentersLoaded
  );
  const [centersError, setCentersError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const skipInitialCentersFetchRef = useRef<boolean>(initialCentersLoaded);

  useEffect(() => {
    if (initialBannersLoaded && initialCategoriesLoaded) return;

    const controller = new AbortController();

    async function loadBanners() {
      if (initialBannersLoaded) return;
      try {
        setBannersLoading(true);
        const data = await homeService.getBanners(controller.signal);
        if (controller.signal.aborted) return;
        setBanners(data);
      } catch (err) {
        if (!controller.signal.aborted && !isAbortError(err)) {
          setBanners([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBannersLoading(false);
        }
      }
    }

    async function loadCatalogDevices() {
      if (initialCategoriesLoaded) return;
      try {
        setCategoriesLoading(true);
        const devices = await catalogService.listDevices(
          { isActive: true, limit: 50 },
          controller.signal
        );
        if (controller.signal.aborted) return;
        if (Array.isArray(devices) && devices.length > 0) {
          setCategories(devices.map(mapCatalogDeviceToCategory));
        }
      } catch (err) {
        if (!controller.signal.aborted && !isAbortError(err)) {
          // Safe empty fallback handled by DeviceCategories
        }
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadBanners();
    void loadCatalogDevices();

    return () => {
      controller.abort();
    };
  }, [initialBannersLoaded, initialCategoriesLoaded]);

  useEffect(() => {
    if (!isCityReady) return;

    if (
      skipInitialCentersFetchRef.current &&
      selectedCity === initialCity &&
      reloadToken === 0
    ) {
      skipInitialCentersFetchRef.current = false;
      return;
    }
    skipInitialCentersFetchRef.current = false;

    const controller = new AbortController();
    let active = true;

    async function loadCenters() {
      setCentersLoading(true);
      setCentersError(null);
      try {
        const data = await gamecentersPageService.loadAllCenters({
          city: selectedCity,
          page: 1,
          limit: 50,
          signal: controller.signal,
        });
        if (!active || controller.signal.aborted) return;
        setCenters(data);
      } catch (e) {
        if (!active || controller.signal.aborted || isAbortError(e)) return;
        setCenters([]);
        setCentersError(getErrorMessage(e));
      } finally {
        if (active && !controller.signal.aborted) {
          setCentersLoading(false);
        }
      }
    }

    void loadCenters();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCity, isCityReady, reloadToken, initialCity]);

  const popularCenters = useMemo(
    () => gamecentersPageService.getPopularCenters(centers),
    [centers]
  );

  const handleCategorySelect = (id: string) => {
    router.push(`/gamecenters?category=${encodeURIComponent(id)}`);
  };

  const skeletonRow = (
    <div
      className="flex gap-3 overflow-hidden -mx-4 lg:-mx-8 px-4 lg:px-8 pb-2"
      aria-busy="true"
    >
      <span className="sr-only">در حال بارگذاری</span>
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="w-[76%] min-w-[76%] shrink-0 sm:w-[240px] sm:min-w-[240px] lg:w-[260px] lg:min-w-[260px] flex flex-col"
        >
          <GamecenterCardSkeleton />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-[var(--bottom-bar-h)] lg:pb-0">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => setCity(city)}
      />

      <main className="flex-1 px-4 pb-4 lg:px-8 lg:pb-8 flex flex-col gap-6 lg:gap-8 pt-[var(--header-m-h)] lg:pt-[var(--header-h)]">
        {/* ۱. بنر */}
        {(bannersLoading || banners.length > 0) && (
          <section>
            <BannerSlider
              banners={banners}
              isLoading={bannersLoading}
              centerOnDesktop
              desktopSlideBasisClass="lg:basis-[70%]"
              aspectClassName="aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3/1]"
            />
          </section>
        )}

        {/* ۲. دسته‌ها */}
        {(categoriesLoading || categories.length > 0) && (
          <DeviceCategories
            categories={categories}
            isLoading={categoriesLoading}
            onSelectCategory={handleCategorySelect}
          />
        )}

        {/* ۳. گیمنت‌های تخفیف‌دار */}
        <DiscountedCentersSection
          city={selectedCity}
          enabled={isCityReady}
          initialItems={initialDiscountedCenters}
          initialCity={initialCity}
          initialLoaded={initialCentersLoaded}
        />

        {centersError && (
          <ErrorState
            title="بارگذاری گیمنت‌ها انجام نشد"
            description={centersError}
            onRetry={() => setReloadToken((v) => v + 1)}
          />
        )}

        {/* ۴. گیمنت‌های محبوب */}
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
              <div className="flex items-center justify-between gap-2">
                <SectionTitle
                  title="گیمنت‌های محبوب"
                  className="mb-0"
                />
                <div className="hidden sm:flex items-center gap-1 relative">
                  <CarouselPrevious
                    className="static translate-y-0 translate-x-0 w-11 h-11 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="قبلی"
                  />
                  <CarouselNext
                    className="static translate-y-0 translate-x-0 w-11 h-11 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="بعدی"
                  />
                </div>
              </div>

              {centersLoading ? (
                skeletonRow
              ) : (
                <div className="-mx-4 lg:-mx-8 px-4 lg:px-8 pb-2 select-none">
                  <CarouselContent className="gap-3 mr-0">
                    {popularCenters.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pr-0 basis-[76%] sm:basis-[240px] lg:basis-[260px] flex flex-col"
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

        {/* ۵. بخش مشتریان */}
        <CustomerExperienceSection />

        {/* ۶. نقشه گیمنت‌های متصل */}
        <GameCentersMap city={selectedCity} enabled={isCityReady} />

        {/* ۷. وبلاگ */}
        <HomeBlogSection
          initialPosts={initialBlogPosts}
          initialLoaded={initialBlogLoaded}
        />

        {/* ۸. بخش صاحبان گیمنت */}
        <OwnerGrowthSection />
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
      <Footer />
    </div>
  );
};
