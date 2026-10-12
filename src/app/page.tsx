"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { GamecenterCardBig } from "@/components/GamecenterCardBig";
import { GamecenterCardMini } from "@/components/GamecenterCardMini";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(["1"]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const sampleBigGamecenters = [
    {
      id: "1",
      name: "گیمنت حرفه‌ای اینفینیتی (Infinity Club)",
      imageUrl: "/design/gamecenter-big.png",
      location: "تهران، سعادت‌آباد، خیابان سرو غربی",
      rating: 4.9,
      reviewsCount: 128,
      hourlyPrice: 85000,
      availableStations: ["PS5 Pro", "VIP PC RTX 4080", "Xbox Series X", "Steering Wheel"],
      isOpen: true,
    },
    {
      id: "2",
      name: "گیم‌سنتر سایبر پات (CyberSpot)",
      imageUrl: "/design/gamecenter-mini.png",
      location: "تهران، شهرک غرب، مرکز خرید گلستان",
      rating: 4.7,
      reviewsCount: 94,
      hourlyPrice: 70000,
      availableStations: ["PS5", "PC i7 Gen13", "VR Headset"],
      isOpen: true,
    },
  ];

  const sampleMiniGamecenters = [
    {
      id: "mini-1",
      name: "گیمنت آریا (Aria Gaming)",
      imageUrl: "/design/gamecenter-mini.png",
      location: "تهران، صادقیه",
      rating: 4.8,
      hourlyPrice: 65000,
      primaryStation: "PS5 VIP",
    },
    {
      id: "mini-2",
      name: "کلوپ ولکان (Volcan)",
      imageUrl: "/design/gamecenter-big.png",
      location: "تهران، ولنجک",
      rating: 4.6,
      hourlyPrice: 90000,
      primaryStation: "RTX 4090",
    },
    {
      id: "mini-3",
      name: "گیم سنتر ماتریس (Matrix Center)",
      imageUrl: "/design/gamecenter-mini.png",
      location: "تهران، نیاوران",
      rating: 4.9,
      hourlyPrice: 110000,
      primaryStation: "VIP Lounge",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-24">
      {/* 1. Header Component */}
      <Header
        locationName="تهران، سعادت‌آباد"
        unreadNotificationsCount={3}
        isLoggedIn={true}
        userName="امیرحسین"
        onNotificationClick={() => alert("اعلانات جدید")}
        onProfileClick={() => setActiveTab("profile")}
        onLocationClick={() => alert("انتخاب موقعیت مکانی")}
      />

      <main className="flex-1 px-4 py-4 flex flex-col gap-6">
        {/* Banner Section / Search Quick Bar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--foreground)] border border-[var(--border-color)] p-5">
          <div className="relative z-10 flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--primary)] px-2.5 py-1 rounded-md bg-[var(--primary-muted)] w-fit">
              سامانه هوشمند رزرو گیمنت
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-white)] leading-tight">
              بهترین سیستم‌های گیمینگ شهر رو آنلاین رزرو کن!
            </h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
              بدون معطلی، رزرو سریع PS5، PCهای گیمینگ و اتاق‌های VIP با پشتیبانی لحظه‌ای.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative mt-4">
            <input
              type="text"
              placeholder="جستجوی نام گیمنت، منطقه یا دستگاه (مثلاً PS5)..."
              className="w-full bg-[var(--bg-body)]/90 border border-[var(--border-color)] focus:border-[var(--primary)] rounded-xl py-3 pr-10 pl-4 text-xs text-[var(--text-white)] placeholder-[var(--text-subtle)] focus:outline-none transition-all shadow-inner"
            />
            <svg
              className="w-4 h-4 text-[var(--primary)] absolute right-3.5 top-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Color Palette Display / Design System Palette Preview */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <h2 className="font-extrabold text-sm text-[var(--text-white)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(255,255,61,0.8)]" />
              پالت رنگی پروژه (Design System Variables)
            </h2>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">max-width: 780px</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-[#101014] border border-white/10 text-[10px]">
              <span className="font-bold text-white">body-bg</span>
              <span className="font-mono text-gray-400">#101014</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-[#1F1F23] border border-white/10 text-[10px]">
              <span className="font-bold text-white">card-bg</span>
              <span className="font-mono text-gray-400">#1F1F23</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-[#35353B] border border-white/10 text-[10px]">
              <span className="font-bold text-white">foreground</span>
              <span className="font-mono text-gray-400">#35353B</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-[#FFFF3D] text-[#101014] text-[10px]">
              <span className="font-black">primary</span>
              <span className="font-mono font-bold">#FFFF3D</span>
            </div>
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-white text-black text-[10px]">
              <span className="font-black">text-white</span>
              <span className="font-mono font-bold">#FFFFFF</span>
            </div>
          </div>
        </section>

        {/* Section: Horizontal Slider for Mini Gamecenters */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-[var(--primary)]" />
              <h2 className="font-extrabold text-base text-[var(--text-white)]">
                گیمنت‌های محبوب منطقه شما
              </h2>
            </div>
            <button className="text-xs text-[var(--primary)] hover:underline font-bold">
              مشاهده همه
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {sampleMiniGamecenters.map((gc) => (
              <GamecenterCardMini
                key={gc.id}
                {...gc}
                onClick={(id) => alert(`انتخاب گیمنت مینی: ${id}`)}
              />
            ))}
          </div>
        </section>

        {/* Section: Big Gamecenters List */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-[var(--primary)]" />
              <h2 className="font-extrabold text-base text-[var(--text-white)]">
                پیشنهاد ویژه سایرا
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">مرتب‌سازی: بیشترین امتیاز</span>
          </div>

          <div className="flex flex-col gap-4">
            {sampleBigGamecenters.map((gc) => (
              <GamecenterCardBig
                key={gc.id}
                {...gc}
                isBookmarked={bookmarkedIds.includes(gc.id)}
                onBookmarkToggle={toggleBookmark}
                onClick={(id) => alert(`باز کردن صفحه گیمنت: ${id}`)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 2. BottomBar Component */}
      <BottomBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        activeBookingCount={1}
      />
    </div>
  );
}
