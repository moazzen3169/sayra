"use client";

import React, { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { GamecenterCardBig } from "@/components/GamecenterCardBig";
import { GamecenterCardMini } from "@/components/GamecenterCardMini";
import { PromoBanner } from "@/components/PromoBanner";
import { DeviceCategories } from "@/components/DeviceCategories";

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
  const popularContainerRef = useRef<HTMLDivElement>(null);

  const scrollPopular = (direction: "left" | "right") => {
    if (popularContainerRef.current) {
      // Note: RTL layout means scrolling right/left movement might invert depending on browser,
      // scrollBy with negative or positive handles horizontal shifts smoothly.
      const scrollAmount = direction === "right" ? -200 : 200;
      popularContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      <Header
        locationName="تبریز"
        unreadNotificationsCount={2}
        onLocationClick={() => alert("انتخاب شهر")}
        onNotificationClick={() => alert("اعلانات سایرا")}
        onSearchClick={() => alert("جستجوی گیمنت و ایستگاه بازی")}
      />

      <main className="flex-1 px-4 py-3 flex flex-col gap-6 mt-[124px]">
        {/* ۱. بخش اطلاع‌رسانی تخفیف و بنر تبلیغاتی */}
        <section>
          <PromoBanner
            title="تخفیف ویژه اولی‌ها در سایرا"
            subtitle="تا ۳۰٪ تخفیف روی تمامی گیمنت‌های دارای PS5 و VIP"
            discountBadge="۳۰٪"
            buttonText="دریافت تخفیف و رزرو"
            onClick={() => alert("پیشنهاد تخفیف ویژه انتخاب شد")}
          />
        </section>

        {/* ۲. بخش انواع دستگاه‌ها و پلتفرم‌های بازی */}
        <section>
          <DeviceCategories
            selectedCategoryId={selectedCategory}
            onSelectCategory={(id) => setSelectedCategory(id)}
          />
        </section>

        {/* ۳. بخش گیمنت‌های محبوب و پربازدید */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-[var(--text-white)]">گیمنت‌های محبوب</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => scrollPopular("right")}
                  className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                  title="قبلی"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollPopular("left")}
                  className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                  title="بعدی"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                onClick={() => alert("مشاهده همه گیمنت‌ها")}
                className="text-xs font-bold text-[var(--primary)] hover:underline mr-1"
              >
                مشاهده همه
              </button>
            </div>
          </div>

          <div
            ref={popularContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none scroll-smooth"
          >
            {popularCenters.map((item) => (
              <GamecenterCardMini key={item.id} {...item} />
            ))}
          </div>
        </section>

        {/* ۴. بخش پیشنهاد ویژه و گیمنت‌های برتر سایرا */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-[var(--text-white)]">پیشنهاد ویژه سایرا</h2>
            <span className="text-xs text-[var(--text-muted)]">برترین کیفیت و امکانات</span>
          </div>

          <div className="flex flex-col gap-4">
            {featuredCenters.map((item) => (
              <GamecenterCardBig key={item.id} {...item} />
            ))}
          </div>
        </section>
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
