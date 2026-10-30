
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export interface CityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

const CITIES = [
  { id: "tabriz", name: "تبریز", popular: true, province: "آذربایجان شرقی" },
  { id: "tehran", name: "تهران", popular: true, province: "تهران" },
  { id: "isfahan", name: "اصفهان", popular: true, province: "اصفهان" },
  { id: "mashhad", name: "مشهد", popular: true, province: "خراسان رضوی" },
  { id: "shiraz", name: "شیراز", popular: true, province: "فارس" },
  { id: "karaj", name: "کرج", popular: true, province: "البرز" },
  { id: "ahvaz", name: "اهواز", popular: true, province: "خوزستان" },
  { id: "rasht", name: "رشت", popular: true, province: "گیلان" },
  { id: "kish", name: "کیش", popular: true, province: "هرمزگان" },
  { id: "qom", name: "قم", popular: false, province: "قم" },
  { id: "kerman", name: "کرمان", popular: false, province: "کرمان" },
  { id: "urmia", name: "ارومیه", popular: false, province: "آذربایجان غربی" },
  { id: "yazd", name: "یزد", popular: false, province: "یزد" },
  { id: "hamadan", name: "همدان", popular: false, province: "همدان" },
  { id: "zanjan", name: "زنجان", popular: false, province: "زنجان" },
  { id: "kermanshah", name: "کرمانشاه", popular: false, province: "کرمانشاه" },
  { id: "sari", name: "ساری", popular: false, province: "مازندران" },
  { id: "gorgan", name: "گرگان", popular: false, province: "گلستان" },
  { id: "arak", name: "اراک", popular: false, province: "مرکزی" },
  { id: "ardabil", name: "اردبیل", popular: false, province: "اردبیل" },
  { id: "qazvin", name: "قزوین", popular: false, province: "قزوین" },
  { id: "bandarabbas", name: "بندرعباس", popular: false, province: "هرمزگان" },
];

const normalizeText = (value: string) =>
  value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .trim()
    .toLowerCase();

export const CityModal: React.FC<CityModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 100);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  const filteredCities = useMemo(() => {
    const query = normalizeText(searchQuery);

    if (!query) return CITIES;

    return CITIES.filter((city) =>
      normalizeText(`${city.name} ${city.province}`).includes(query)
    );
  }, [searchQuery]);

  const popularCities = useMemo(
    () => CITIES.filter((city) => city.popular),
    []
  );

  const handleSelectCity = (city: string) => {
    onSelectCity(city);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-card)] text-[var(--text-white)] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-modal-title"
    >
      

      {/* Search */}
      <div className="shrink-0 flex gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative">
            <svg
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <circle cx="11" cy="11" r="7" />
              <path
                d="m20 20-4-4"
                strokeLinecap="round"
              />
            </svg>

            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="نام شهر یا استان را بنویس..."
              aria-label="جستجوی شهر یا استان"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--foreground)]/20 pr-12 pl-12 text-sm outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)]"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="پاک کردن جستجو"
                className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--foreground)]/10 hover:text-[var(--text-white)]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    d="m18 6-12 12M6 6l12 12"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن انتخاب شهر"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--foreground)]/10 hover:text-[var(--text-white)]"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="m18 6-12 12M6 6l12 12"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          {!searchQuery.trim() && (
            <section className="mb-7">
              <h3 className="mb-3 text-sm font-bold">
                شهرهای پرطرفدار
              </h3>

              <div className="flex flex-wrap gap-2">
                {popularCities.map((city) => {
                  const isSelected = selectedCity === city.name;

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectCity(city.name)}
                      aria-pressed={isSelected}
                      className={`rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border-subtle)] bg-[var(--foreground)]/10 hover:border-[var(--primary)]/50"
                      }`}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {searchQuery.trim() ? "نتایج جستجو" : "همه شهرها"}
              </h3>

              <span className="text-xs text-[var(--text-muted)]">
                {filteredCities.length} شهر
              </span>
            </div>

            {filteredCities.length > 0 ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filteredCities.map((city) => {
                  const isSelected = selectedCity === city.name;

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectCity(city.name)}
                      aria-pressed={isSelected}
                      className="flex w-full items-center justify-between gap-4 py-4 text-right transition-colors hover:bg-[var(--foreground)]/5"
                    >
                      <div className="min-w-0">
                        <div
                          className={`text-sm ${
                            isSelected
                              ? "font-bold text-[var(--primary)]"
                              : "font-medium"
                          }`}
                        >
                          {city.name}
                        </div>

                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {city.province}
                        </div>
                      </div>

                      {isSelected && (
                        <svg
                          className="h-5 w-5 shrink-0 text-[var(--primary)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          aria-label="شهر انتخاب‌شده"
                        >
                          <path
                            d="m5 12 4 4L19 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm font-medium">
                  شهری پیدا نشد
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  نام شهر یا استان را بررسی کن.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-sm font-bold text-[var(--primary)]"
                >
                  نمایش همه شهرها
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};