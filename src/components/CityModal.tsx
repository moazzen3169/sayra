"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalShell } from "./ModalShell";

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
    setSearchQuery("");
  }, [isOpen]);

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

  const headerTitle = (
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
        ref={searchRef}
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="نام شهر یا استان را بنویس..."
        aria-label="جستجوی شهر یا استان"
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-11 pl-10 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
      />

      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            searchRef.current?.focus();
          }}
          aria-label="پاک کردن جستجو"
          className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-[var(--text-white)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="انتخاب شهر"
      title={headerTitle}
      focusRef={searchRef}
    >
      <div className="mx-auto w-full max-w-[var(--max-mini-app-width)] px-4 py-5 sm:px-6 sm:py-7">
        {!searchQuery.trim() && (
          <section className="mb-7">
            <h3 className="mb-3 text-xs font-bold text-[var(--text-muted)]">
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
                    className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
            <h3 className="text-xs font-bold text-[var(--text-muted)]">
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
                            : "font-medium text-[var(--text-white)]"
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
              <p className="text-sm font-medium text-[var(--text-white)]">
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
    </ModalShell>
  );
};