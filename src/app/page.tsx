"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { BannerSlider } from "@/components/BannerSlider";
import { DeviceCategories } from "@/components/DeviceCategories";
import { DiscountedCentersSection } from "@/components/DiscountedCentersSection";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { homeService } from "@/services/homeService";
import { BannerItem } from "@/types/home";

const popularCenters = [
  {
    id: "gc-1",
    name: "گیمنت گرگدن",
    imageUrl: "/img/gamnet-1.webp",
    location: "تبریز، ولیعصر، روبروی کتابخانه",
    rating: 4.8,
    reviewsCount: 744,
    hourlyPrice: 230000,
    discountPercent: 25,
  },
  {
    id: "gc-2",
    name: "گیم‌کلاب سایبرسکی",
    imageUrl: "/img/gamnet-2.webp",
    location: "تبریز، آبرسان، پاساژ نسیم",
    rating: 4.6,
    reviewsCount: 312,
    hourlyPrice: 190000,
    discountPercent: 15,
  },
  {
    id: "gc-3",
    name: "مجموعه گیمینگ وی‌آر پلاس",
    imageUrl: "/img/gamnet-3.webp",
    location: "تبریز، شاهگلی، فلکه خیام",
    rating: 4.9,
    reviewsCount: 520,
    hourlyPrice: 280000,
    discountPercent: 20,
  },
];

const featuredCenters = [
  {
    id: "f-1",
    name: "گیمنت اختصاصی وی‌آی‌پِی گرگدن",
    imageUrl: "/img/gamnet-4.webp",
    location: "تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه",
    rating: 4.9,
    reviewsCount: 980,
    hourlyPrice: 250000,
    discountPercent: 30,
  },
  {
    id: "f-2",
    name: "مرکز بازی‌های رایانه‌ای ماتریکس",
    imageUrl: "/img/gamnet-5.webp",
    location: "تبریز، رشدیه، بلوار بهارستان",
    rating: 4.7,
    reviewsCount: 410,
    hourlyPrice: 210000,
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>("ps5");
  const [selectedCity, setSelectedCity] = useState("تبریز");
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

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

    loadBanners();

    return () => {
      controller.abort();
    };
  }, []);

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
            onSelectCategory={(id) => setSelectedCategory(id)}
          />
        </section>

        {/* ۳. بخش گیمنت‌های تخفیف‌دار */}
        <DiscountedCentersSection city={selectedCity} />

        {/* ۴. بخش گیمنت‌های محبوب و پربازدید */}
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
              <h2 className="font-extrabold text-base text-[var(--text-white)]">
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

        {/* ۵. بخش پیشنهاد ویژه و گیمنت‌های برتر سایرا */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-[var(--text-white)]">پیشنهاد ویژه سایرا</h2>
            <span className="text-xs text-[var(--text-muted)]">برترین کیفیت و امکانات</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {featuredCenters.map((item) => (
              <DiscountedGamecenterCard key={item.id} center={item} />
            ))}
          </div>
        </section>
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
