"use client";

import React, { useState } from "react";
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

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      <Header
        locationName="تبریز"
        unreadNotificationsCount={2}
        onLocationClick={() => alert("انتخاب شهر")}
        onNotificationClick={() => alert("اعلانات سایرا")}
        onSearchClick={() => alert("جستجوی گیمنت و ایستگاه بازی")}
      />

      <main className="flex-1 px-4 py-3 flex flex-col gap-6">
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
            <button
              type="button"
              onClick={() => alert("مشاهده همه گیمنت‌ها")}
              className="text-xs font-bold text-[var(--primary)] hover:underline"
            >
              مشاهده همه
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
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
