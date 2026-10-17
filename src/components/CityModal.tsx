"use client";

import React, { useState, useMemo } from "react";

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
  { id: "kish", name: "کیش", popular: true, province: "هرمزگان" },
  { id: "bandarabbas", name: "بندرعباس", popular: false, province: "هرمزگان" },
];

export const CityModal: React.FC<CityModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return CITIES;
    const q = searchQuery.trim().toLowerCase();
    return CITIES.filter(
      (c) => c.name.includes(q) || c.province.includes(q)
    );
  }, [searchQuery]);

  const popularCities = useMemo(() => {
    return CITIES.filter((c) => c.popular);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-5 flex flex-col gap-4 max-h-[85vh] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-[var(--text-white)]">انتخاب شهر</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام شهر یا استان..."
            className="w-full h-11 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] px-10 text-sm text-[var(--text-white)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--primary)] transition-colors"
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-white)] text-xs"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Popular Cities Quick Select */}
        {!searchQuery && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)]">شهرهای پرتردد</span>
            <div className="flex flex-wrap gap-2">
              {popularCities.map((city) => {
                const isSelected = selectedCity === city.name;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onSelectCity(city.name);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)] shadow-sm"
                        : "bg-[var(--foreground)]/30 text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cities List */}
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[40vh] pr-1">
          <span className="text-xs font-bold text-[var(--text-muted)] mb-1">همه شهرها</span>
          {filteredCities.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              شهری با این مشخصات یافت نشد.
            </div>
          ) : (
            filteredCities.map((city) => {
              const isSelected = selectedCity === city.name;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelectCity(city.name);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-card text-right transition-colors border ${
                    isSelected
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 font-bold"
                      : "bg-[var(--foreground)]/10 text-[var(--text-white)] border-transparent hover:bg-[var(--foreground)]/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{city.name}</span>
                    <span className="text-[11px] text-[var(--text-subtle)]">({city.province})</span>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
