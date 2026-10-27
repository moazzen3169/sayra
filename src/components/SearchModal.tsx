"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { formatPrice, toPersianDigits } from "@/lib/format";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
}

// Mock database for search items across gaming centers, devices, and games
const MOCK_GAMING_CENTERS = [
  {
    id: "gc-1",
    name: "گیمنت گرگدن",
    location: "تبریز، ولیعصر، روبروی کتابخانه",
    city: "تبریز",
    rating: 4.8,
    hourlyPrice: 230000,
    type: "center",
    tags: ["PS5", "PC", "VIP", "بوفه", "فرکانس ۲۴۰"],
  },
  {
    id: "gc-2",
    name: "گیم‌کلاب سایبرسکی",
    location: "تبریز، آبرسان، پاساژ نسیم",
    city: "تبریز",
    rating: 4.6,
    hourlyPrice: 190000,
    type: "center",
    tags: ["PS5", "Xbox", "بازی گروهی"],
  },
  {
    id: "gc-3",
    name: "مجموعه گیمینگ وی‌آر پلاس",
    location: "تبریز، شاهگلی، فلکه خیام",
    city: "تبریز",
    rating: 4.9,
    hourlyPrice: 280000,
    type: "center",
    tags: ["VR", "واقعیت مجازی", "PS5"],
  },
  {
    id: "gc-4",
    name: "گیمنت اختصاصی وی‌آی‌پِی گرگدن",
    location: "تبریز، ولیعصر، بعد از میدان معلم",
    city: "تبریز",
    rating: 4.9,
    hourlyPrice: 250000,
    type: "center",
    tags: ["VIP", "اتاق فرمان", "RTX 4090"],
  },
  {
    id: "gc-5",
    name: "مرکز بازی‌های رایانه‌ای ماتریکس",
    location: "تبریز، رشدیه، بلوار بهارستان",
    city: "تبریز",
    rating: 4.7,
    hourlyPrice: 210000,
    type: "center",
    tags: ["PC", "فرکانس ۳۶۰", "شبکه‌ای"],
  },
];

const SUGGESTED_DEVICES = [
  { id: "dev-ps5-vip", name: "کنسول PS5 Pro / VIP", category: "پلی‌استیشن", count: "۱۲ ایستگاه فعّال", icon: "🎮" },
  { id: "dev-pc-gaming", name: "کامپیوتر گیمینگ High-End (RTX 4080)", category: "پی‌سی گیمینگ", count: "۲۸ ایستگاه فعّال", icon: "🖥️" },
  { id: "dev-vr", name: "هدست واقعیت مجازی Meta Quest 3", category: "واقعیت مجازی", count: "۶ ایستگاه فعّال", icon: "🥽" },
  { id: "dev-xbox", name: "کنسول Xbox Series X", category: "ایکس‌باکس", count: "۱۵ ایستگاه فعّال", icon: "🟢" },
  { id: "dev-steering", name: "فرمان بازی و صندلی ریسینگ Logitech", category: "شبیه‌ساز رانندگی", count: "۴ ایستگاه فعّال", icon: "🏎️" },
];

const POPULAR_GAMES = [
  "EA Sports FC 25 (FiFA)",
  "Call of Duty: Modern Warfare III",
  "GTA V / Online",
  "Dota 2 / League of Legends",
  "Mortal Kombat 1",
  "Tekken 8",
  "Counter-Strike 2",
];

const QUICK_SEARCH_TAGS = [
  "PS5 VIP",
  "کامپیوتر گیمینگ",
  "واقعیت مجازی VR",
  "اتاق خصوصی",
  "فرکانس ۲۴۰ هرتز",
  "بازی گروهی",
  "فرمان بازی",
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  selectedCity = "تبریز",
}) => {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "گیمنت گرگدن",
    "PS5 Pro",
    "کامپیوتر 360Hz",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filter centers based on query and selected city
  const filteredCenters = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return MOCK_GAMING_CENTERS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [query]);

  // Filter devices based on query
  const filteredDevices = useMemo(() => {
    if (!query.trim()) return SUGGESTED_DEVICES;
    const q = query.trim().toLowerCase();
    return SUGGESTED_DEVICES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Filter games based on query
  const filteredGames = useMemo(() => {
    if (!query.trim()) return POPULAR_GAMES;
    const q = query.trim().toLowerCase();
    return POPULAR_GAMES.filter((game) => game.toLowerCase().includes(q));
  }, [query]);

  if (!isOpen) return null;

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleSelectQuery = (text: string) => {
    setQuery(text);
    if (!recentSearches.includes(text)) {
      setRecentSearches((prev) => [text, ...prev.slice(0, 4)]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-body)] flex flex-col animate-fadeIn">
      {/* Search Header Bar */}
      <div className="sticky top-0 z-10 w-full max-w-[780px] lg:max-w-[880px] mx-auto bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-[var(--foreground)]/50 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors shrink-0"
          aria-label="بستن"
        >
          <svg className="w-5 h-5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام گیمنت، دستگاه، بازی..."
            className="w-full h-11 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] pr-10 pl-9 text-sm text-[var(--text-white)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          <svg
            className="w-5 h-5 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-white)] text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Search Results & Suggestions Body */}
      <div className="flex-1 w-full max-w-[780px] lg:max-w-[880px] mx-auto overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {/* Quick Search Chips */}
        {!query && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[var(--text-muted)]">دسته‌بندی‌ها و فیلترهای سریع</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectQuery(tag)}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center gap-1.5"
                >
                  <span className="text-[var(--primary)]">#</span>
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-muted)]">جستجوهای اخیر شما</span>
              <button
                type="button"
                onClick={handleClearRecent}
                className="text-[11px] font-bold text-[var(--text-subtle)] hover:text-[var(--primary)]"
              >
                پاک کردن تاریخچه
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectQuery(item)}
                  className="flex items-center justify-between p-2.5 rounded-card bg-[var(--bg-card)]/60 border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-right transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-[var(--text-white)]">
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" d="M12 7v5l3 3" />
                    </svg>
                    <span>{item}</span>
                  </div>
                  <svg className="w-4 h-4 text-[var(--text-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gaming Center Results */}
        {query && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[var(--text-white)]">
                گیمنت‌های پیشنهادی ({filteredCenters.length})
              </span>
            </div>

            {filteredCenters.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)]/40 rounded-card border border-[var(--border-subtle)]">
                گیمنتی با عبارت «{query}» یافت نشد.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredCenters.map((gc) => (
                  <Link
                    key={gc.id}
                    href={`/gamecenter/${gc.id}`}
                    onClick={onClose}
                    className="p-3.5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors truncate">
                          {gc.name}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md shrink-0">
                          ★ {toPersianDigits(gc.rating)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate">{gc.location}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {gc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold text-[var(--text-subtle)] bg-[var(--foreground)]/40 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-xs font-black text-[var(--primary)]">
                        {formatPrice(gc.hourlyPrice)} <span className="text-[10px] text-[var(--text-muted)] font-normal">تومان</span>
                      </span>
                      <span className="text-[11px] text-[var(--text-subtle)]">ساعتی</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Device & Platform Suggestions */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-extrabold text-[var(--text-white)]">
            ایستگاه‌ها و دستگاه‌های محبوب
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredDevices.map((dev) => (
              <button
                key={dev.id}
                type="button"
                onClick={() => handleSelectQuery(dev.name)}
                className="p-3 rounded-card bg-[var(--bg-card)]/80 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all flex items-center justify-between text-right group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl p-2 rounded-lg bg-[var(--foreground)]/40 shrink-0">{dev.icon}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors truncate">
                      {dev.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">{dev.category}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded-md shrink-0 mr-2">
                  {dev.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Games Suggestions */}
        <div className="flex flex-col gap-3 pb-8">
          <span className="text-xs font-extrabold text-[var(--text-white)]">
            بازی‌های پرطرفدار در گیمنت‌ها
          </span>

          <div className="flex flex-wrap gap-2">
            {filteredGames.map((game) => (
              <button
                key={game}
                type="button"
                onClick={() => handleSelectQuery(game)}
                className="px-3 py-2 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{game}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
