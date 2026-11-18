"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { BottomBar, TabType } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { BannerSlider } from "@/components/BannerSlider";
import {
  DeviceCategories,
  type DeviceCategory,
  mapCatalogDeviceToCategory,
} from "@/components/DeviceCategories";
import { DiscountedCentersSection } from "@/components/DiscountedCentersSection";
import { CustomerExperienceSection } from "@/components/home/CustomerExperienceSection";
import { OwnerGrowthSection } from "@/components/home/OwnerGrowthSection";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CardSkeleton } from "@/components/ui/Skeleton";
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
import { useCity } from "@/context/CityContext";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { selectedCity, isCityReady, setCity } = useCity();
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
    if (!isCityReady) return;

    const controller = new AbortController();
    let active = true;

    setCentersLoading(true);
    setCentersError(null);

    gamecentersPageService
      .loadAllCenters({ city: selectedCity, signal: controller.signal })
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
  }, [selectedCity, isCityReady, reloadToken]);

  const popularCenters = useMemo(
    () => gamecentersPageService.getPopularCenters(centers),
    [centers]
  );

  const handleCategorySelect = (id: string) => {
    router.push(`/gamecenters?category=${encodeURIComponent(id)}`);
  };

  const skeletonRow = (
    <div className="flex gap-3 overflow-hidden pb-2" aria-busy="true">
      <span className="sr-only">در حال بارگذاری</span>
      {Array.from({ length: 4 }).map((_, idx) => (
        <CardSkeleton
          key={idx}
          className="w-[240px] min-w-[240px] shrink-0 lg:w-[260px] lg:min-w-[260px]"
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-[var(--bottom-bar-h)] lg:pb-0">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => setCity(city)}
      />

      <main className="flex-1 p-4 flex flex-col gap-6 lg:gap-8 pt-[var(--header-m-h)] lg:pt-[var(--header-h)]">
        {/* ۱. بنر */}
        <section>
          <BannerSlider
            banners={banners}
            isLoading={bannersLoading}
            centerOnDesktop
            desktopSlideBasisClass="lg:basis-[70%]"
            aspectClassName="aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3/1]"
          />
        </section>

        {/* ۲. دسته‌ها */}
        {(categoriesLoading || categories.length > 0) && (
          <section>
            <DeviceCategories
              categories={categories}
              isLoading={categoriesLoading}
              onSelectCategory={handleCategorySelect}
            />
          </section>
        )}

        {/* ۳. گیمنت‌های تخفیف‌دار */}
        <DiscountedCentersSection city={selectedCity} enabled={isCityReady} />

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
                  <CarouselContent className="gap-3 -mr-3">
                    {popularCenters.map((item) => (
                      <CarouselItem
                        key={item.id}
                        className="pr-3 basis-[76%] sm:basis-[240px] lg:basis-[260px] flex flex-col"
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

        {/* ۶. وبلاگ */}
        <HomeBlogSection />

        {/* ۷. بخش صاحبان گیمنت */}
        <OwnerGrowthSection />
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
      <Footer />
    </div>
  );
}