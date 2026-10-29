"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { Icon, IconName } from "@/components/ui/Icon";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
}

const MOCK_GAMING_CENTERS = [
  {
    id: "gc-1",
    name: "گیمنت گرگدن",
    location: "تبریز، ولیعصر، روبروی کتابخانه",
    city: "تبریز",
    rating: 4.8,
    hourlyPrice: 230000,
    tags: ["PS5", "PC", "VIP", "بوفه", "فرکانس ۲۴۰"],
  },
  {
    id: "gc-2",
    name: "گیم‌کلاب سایبرسکی",
    location: "تبریز، آبرسان، پاساژ نسیم",
    city: "تبریز",
    rating: 4.6,
    hourlyPrice: 190000,
    tags: ["PS5", "Xbox", "بازی گروهی"],
  },
  {
    id: "gc-3",
    name: "مجموعه گیمینگ وی‌آر پلاس",
    location: "تبریز، شاهگلی، فلکه خیام",
    city: "تبریز",
    rating: 4.9,
    hourlyPrice: 280000,
    tags: ["VR", "واقعیت مجازی", "PS5"],
  },
  {
    id: "gc-4",
    name: "گیمنت اختصاصی وی‌آی‌پی گرگدن",
    location: "تبریز، ولیعصر، بعد از میدان معلم",
    city: "تبریز",
    rating: 4.9,
    hourlyPrice: 250000,
    tags: ["VIP", "اتاق فرمان", "RTX 4090"],
  },
  {
    id: "gc-5",
    name: "مرکز بازی‌های رایانه‌ای ماتریکس",
    location: "تبریز، رشدیه، بلوار بهارستان",
    city: "تبریز",
    rating: 4.7,
    hourlyPrice: 210000,
    tags: ["PC", "فرکانس ۳۶۰", "شبکه‌ای"],
  },
];

const DEVICES: { id: string; name: string; keywords: string; icon: IconName }[] = [
  {
    id: "dev-ps5-vip",
    name: "کنسول پلی‌استیشن ۵ پرو",
    keywords: "ps5 پلی استیشن پلی‌استیشن کنسول",
    icon: "gamepad",
  },
  {
    id: "dev-pc-gaming",
    name: "کامپیوتر گیمینگ",
    keywords: "pc کامپیوتر سیستم گیمینگ کارت گرافیک",
    icon: "monitor",
  },
  {
    id: "dev-vr",
    name: "واقعیت مجازی",
    keywords: "vr هدست واقعیت مجازی متا کوئست",
    icon: "vr",
  },
  {
    id: "dev-xbox",
    name: "ایکس‌باکس",
    keywords: "xbox ایکس باکس کنسول",
    icon: "gamepad",
  },
  {
    id: "dev-steering",
    name: "فرمان بازی",
    keywords: "فرمان ریسینگ رانندگی شبیه ساز steering wheel",
    icon: "gamepad",
  },
];

const GAMES = [
  "EA Sports FC 25",
  "Call of Duty: Modern Warfare III",
  "GTA V",
  "Dota 2",
  "Mortal Kombat 1",
  "Tekken 8",
  "Counter-Strike 2",
];

const QUICK_SEARCHES = ["گیمنت نزدیک من", "پلی‌استیشن ۵", "کامپیوتر گیمینگ"];

const INITIAL_RECENTS = ["گیمنت گرگدن", "پلی‌استیشن ۵", "کامپیوتر گیمینگ"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  selectedCity = "تبریز",
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] =
    useState<string[]>(INITIAL_RECENTS);

  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = normalizeText(query);
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const filteredCenters = useMemo(() => {
    if (!hasQuery) return [];

    return MOCK_GAMING_CENTERS.filter((center) => {
      const matchesCity =
        normalizeText(center.city) === normalizeText(selectedCity);

      const searchableText = normalizeText(
        `${center.name} ${center.location} ${center.tags.join(" ")}`,
      );

      return matchesCity && searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, hasQuery, selectedCity]);

  const filteredDevices = useMemo(() => {
    if (!hasQuery) return [];

    return DEVICES.filter((device) =>
      normalizeText(`${device.name} ${device.keywords}`).includes(
        normalizedQuery,
      ),
    );
  }, [normalizedQuery, hasQuery]);

  const filteredGames = useMemo(() => {
    if (!hasQuery) return [];

    return GAMES.filter((game) =>
      normalizeText(game).includes(normalizedQuery),
    );
  }, [normalizedQuery, hasQuery]);

  const hasResults =
    filteredCenters.length > 0 ||
    filteredDevices.length > 0 ||
    filteredGames.length > 0;

  const saveRecentSearch = (text: string) => {
    const value = text.trim();
    if (!value) return;

    setRecentSearches((previous) =>
      [
        value,
        ...previous.filter(
          (item) => normalizeText(item) !== normalizeText(value),
        ),
      ].slice(0, 5),
    );
  };

  const executeSearch = (text: string) => {
    const value = text.trim();
    if (!value) return;
    saveRecentSearch(value);
    onClose();
    router.push(`/gamecenters?q=${encodeURIComponent(value)}`);
  };

  const selectSuggestion = (text: string) => {
    executeSearch(text);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      executeSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-body)]"
      role="dialog"
      aria-modal="true"
      aria-label="جست‌وجو در سایرا"
    >
      {/* Search bar */}
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
        <form onSubmit={handleFormSubmit} className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن جست‌وجو"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-white)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>

          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>

            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="دنبال چی می‌گردی؟"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-11 pl-10 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
            />

            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="پاک کردن جست‌وجو"
                className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-[var(--text-white)]"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="h-10 px-4 rounded-card bg-[var(--primary)] text-on-primary font-bold text-xs shrink-0 hover:bg-[var(--primary-hover)] transition-colors"
          >
            جست‌وجو
          </button>
        </form>
      </header>

      {/* Search content */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-5 sm:px-6 sm:py-7">
          {/* Initial state: recent and only three suggestions */}
          {!hasQuery && (
            <>
              {recentSearches.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[var(--text-muted)]">
                      جست‌وجوهای اخیر
                    </h2>

                    <button
                      type="button"
                      onClick={() => setRecentSearches([])}
                      className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
                    >
                      پاک کردن
                    </button>
                  </div>

                  <div className="flex flex-col">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => selectSuggestion(item)}
                        className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)]/70 py-2 text-right last:border-b-0"
                      >
                        <svg
                          className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" d="M12 7v5l3 2" />
                        </svg>

                        <span className="flex-1 text-sm text-[var(--text-white)]">
                          {item}
                        </span>

                        <span className="text-xs text-[var(--text-muted)]">
                          جست‌وجو
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="mb-3 text-xs font-bold text-[var(--text-muted)]">
                  پیشنهاد برای شروع
                </h2>

                <div className="flex flex-wrap gap-2">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Results state */}
          {hasQuery && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  نتایج جست‌وجو برای
                  <span className="mr-1 font-bold text-[var(--text-white)]">
                    «{query.trim()}»
                  </span>
                </p>

                <span className="text-xs text-[var(--text-muted)]">
                  {toPersianDigits(
                    filteredCenters.length +
                      filteredDevices.length +
                      filteredGames.length,
                  )}{" "}
                  نتیجه
                </span>
              </div>

              {!hasResults && (
                <div className="flex flex-col items-center py-14 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--text-muted)]">
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                    </svg>
                  </div>

                  <h2 className="text-sm font-bold text-[var(--text-white)]">
                    نتیجه‌ای پیدا نشد
                  </h2>

                  <p className="mt-2 max-w-xs text-xs leading-6 text-[var(--text-muted)]">
                    عبارت جست‌وجو را کوتاه‌تر کن یا با کلمه دیگری امتحان کن.
                  </p>
                </div>
              )}

              {/* Gaming centers */}
              {filteredCenters.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-bold text-[var(--text-muted)]">
                    گیمنت‌ها
                  </h2>

                  <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                    {filteredCenters.map((center) => (
                      <Link
                        key={center.id}
                        href={`/gamecenter/${center.id}`}
                        onClick={() => {
                          saveRecentSearch(query);
                          onClose();
                        }}
                        className="group flex items-center gap-3 py-3.5"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--primary)]">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M16 14v.01M16 17v.01"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
                            {center.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                            {center.location}
                          </p>
                        </div>

                        <div className="shrink-0 text-left">
                          <div className="text-xs font-bold text-[var(--text-white)] flex items-center gap-1 justify-end">
                            <Icon name="star" size={14} className="text-[var(--accent-star)] fill-[var(--accent-star)]" />
                            <span>{toPersianDigits(center.rating)}</span>
                          </div>

                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatPrice(center.hourlyPrice)} تومان
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Devices */}
              {filteredDevices.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-bold text-[var(--text-muted)]">
                    دستگاه‌ها
                  </h2>

                  <div className="flex flex-col">
                    {filteredDevices.map((device) => (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() => selectSuggestion(device.name)}
                        className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)]/70 py-2.5 text-right last:border-b-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--primary)]">
                          <Icon name={device.icon} size={20} />
                        </span>

                        <span className="flex-1 text-sm font-medium text-[var(--text-white)]">
                          {device.name}
                        </span>

                        <span className="text-xs text-[var(--text-muted)]">
                          جست‌وجو
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Games */}
              {filteredGames.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-bold text-[var(--text-muted)]">
                    بازی‌ها
                  </h2>

                  <div className="flex flex-col">
                    {filteredGames.map((game) => (
                      <button
                        key={game}
                        type="button"
                        onClick={() => selectSuggestion(game)}
                        className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)]/70 py-2.5 text-right last:border-b-0"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--primary)]">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.7}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 12h4m-2-2v4m7-3h.01M18 13h.01M7 6h10a4 4 0 014 4v5a3 3 0 01-5.2 2l-1.3-1.5h-4l-1.3 1.5A3 3 0 013 15v-5a4 4 0 014-4z"
                            />
                          </svg>
                        </span>

                        <span className="flex-1 text-sm text-[var(--text-white)]">
                          {game}
                        </span>

                        <span className="text-xs text-[var(--text-muted)]">
                          جست‌وجو
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
