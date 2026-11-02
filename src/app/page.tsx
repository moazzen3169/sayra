"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { DiscountedGamecenterCard, GamecenterCardData } from "@/components/DiscountedGamecenterCard";
import { BannerSlider } from "@/components/BannerSlider";
import { DeviceCategories } from "@/components/DeviceCategories";
import { DiscountedCentersSection } from "@/components/DiscountedCentersSection";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { homeService } from "@/services/homeService";
import { gamingCenterService } from "@/services/gamingCenterService";
import { BannerItem } from "@/types/home";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>("ps5");
  const [selectedCity, setSelectedCity] = useState("تبریز");
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  const [centers, setCenters] = useState<GamecenterCardData[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBanners() {
      try {
        setBannersLoading(true);
        const data = await homeService.getBanners(controller.signal);
        setBanners(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setBanners([]);
        }
      } finally {
        setBannersLoading(false);
      }
    }

    async function loadCenters() {
      try {
        const response = await gamingCenterService.listGamingCenters(undefined, controller.signal);
        const mapped: GamecenterCardData[] = response.data.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          imageUrl: "/img/gamnet-1.webp",
          location: undefined,
          rating: undefined,
          reviewsCount: undefined,
          hourlyPrice: undefined,
        }));
        setCenters(mapped);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setCenters([]);
        }
      }
    }

    loadBanners();
    loadCenters();

    return () => {
      controller.abort();
    };
  }, []);

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    router.push(`/gamecenters?category=${encodeURIComponent(id)}`);
  };

  const popularCenters = centers.slice(0, 3);
  const featuredCenters = centers.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <Header
        locationName={selectedCity}
        unreadNotificationsCount={2}
        onCityChange={(city) => setSelectedCity(city)}
      />

      <main className="flex-1 p-4 flex flex-col gap-6 lg:gap-8 pt-[var(--header-h)]">
        {/* ۱. بخش اسلایدر بنرهای تبلیغاتی */}
        <section>
          <BannerSlider banners={banners} isLoading={bannersLoading} />
        </section>

        {/* ۲. بخش انواع دستگاه‌ها و پلتفرم‌های بازی */}
        <section>
          <DeviceCategories
            selectedCategoryId={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </section>

        {/* ۳. بخش گیمنت‌های تخفیف‌دار */}
        <DiscountedCentersSection city={selectedCity} />

        {/* ۴. بخش گیمنت‌های محبوب و پربازدید */}
        {popularCenters.length > 0 && (
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
            </Carousel>
          </section>
        )}

        {/* ۵. بخش پیشنهاد ویژه و گیمنت‌های برتر سایرا */}
        {featuredCenters.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[var(--text-white)]">پیشنهاد ویژه سایرا</h2>
              <span className="text-xs text-[var(--text-muted)]">برترین کیفیت و امکانات</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
