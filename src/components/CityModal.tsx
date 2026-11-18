"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModalShell } from "./ModalShell";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  locationService,
  type ProvinceItem,
  type CityItem,
} from "@/services/locationService";
import { isAbortError } from "@/lib/api/client";
import { DEFAULT_PROVINCE_ID, useCity } from "@/context/CityContext";

export interface CityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string, provinceId?: string) => void;
}

const normalizeText = (value: string) =>
  value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .trim()
    .toLowerCase();

function resolveInitialProvinceId(
  provinces: ProvinceItem[],
  preferredProvinceId: string
): string {
  if (provinces.length === 0) return "";
  const exact = provinces.find((p) => p.id === preferredProvinceId);
  if (exact) return exact.id;

  const eastAz = provinces.find(
    (p) =>
      p.id === DEFAULT_PROVINCE_ID ||
      normalizeText(p.name).includes("آذربایجان شرقی")
  );
  if (eastAz) return eastAz.id;

  return provinces[0].id;
}

export const CityModal: React.FC<CityModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}) => {
  const { selectedProvinceId } = useCity();

  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);
  const [provincesReloadToken, setProvincesReloadToken] = useState(0);

  const [activeProvinceId, setActiveProvinceId] = useState<string>("");

  const [cities, setCities] = useState<CityItem[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [citiesReloadToken, setCitiesReloadToken] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
  }, [isOpen]);

  // Fetch provinces when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    let active = true;

    setProvincesLoading(true);
    setProvincesError(null);

    locationService
      .getProvinces(controller.signal)
      .then((list) => {
        if (!active) return;
        setProvinces(list);
        setActiveProvinceId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return resolveInitialProvinceId(list, selectedProvinceId);
        });
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setProvincesError(
          (err as Error)?.message || "خطا در دریافت لیست استان‌ها"
        );
      })
      .finally(() => {
        if (active) setProvincesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, selectedProvinceId, provincesReloadToken]);

  // Fetch cities when activeProvinceId changes
  useEffect(() => {
    if (!isOpen || !activeProvinceId) return;

    const controller = new AbortController();
    let active = true;

    setCitiesLoading(true);
    setCitiesError(null);

    locationService
      .getCities(activeProvinceId, controller.signal)
      .then((list) => {
        if (!active) return;
        setCities(list);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setCities([]);
        setCitiesError(
          (err as Error)?.message || "خطا در دریافت لیست شهرها"
        );
      })
      .finally(() => {
        if (active) setCitiesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, activeProvinceId, citiesReloadToken]);

  const activeProvince = useMemo(
    () => provinces.find((p) => p.id === activeProvinceId),
    [provinces, activeProvinceId]
  );

  const filteredProvinces = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return provinces;
    return provinces.filter((p) =>
      normalizeText(p.name).includes(query)
    );
  }, [provinces, searchQuery]);

  const filteredCities = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return cities;
    // If user typed a province name, show all cities of the selected province
    if (
      activeProvince &&
      normalizeText(activeProvince.name).includes(query)
    ) {
      return cities;
    }
    return cities.filter((city) =>
      normalizeText(city.name).includes(query)
    );
  }, [cities, searchQuery, activeProvince]);

  const handleSelectCity = useCallback(
    (cityName: string) => {
      onSelectCity(cityName, activeProvinceId || undefined);
      setSearchQuery("");
      onClose();
    },
    [onSelectCity, activeProvinceId, onClose]
  );

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
        placeholder="جستوجوی شهر"
        aria-label="جستوجوی شهر"
        autoComplete="off"
        className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-11 pl-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
      />

      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            searchRef.current?.focus();
          }}
          aria-label="پاک کردن جستوجو"
          className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-card text-[var(--text-muted)] hover:text-[var(--text-white)] cursor-pointer"
        >
          <Icon name="close" size={16} />
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
        {/* Provinces Section */}
        <section className="mb-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-muted)]">
              انتخاب استان
            </h3>
            {provinces.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {provinces.length} استان
              </span>
            )}
          </div>

          {provincesLoading ? (
            <div className="flex flex-wrap gap-2" aria-busy="true">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-9 w-24 animate-pulse rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                />
              ))}
            </div>
          ) : provincesError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <span className="text-xs text-[var(--text-muted)]">
                {provincesError}
              </span>
              <button
                type="button"
                onClick={() => setProvincesReloadToken((v) => v + 1)}
                className="shrink-0 text-xs font-bold text-[var(--primary)]"
              >
                تلاش مجدد
              </button>
            </div>
          ) : filteredProvinces.length === 0 ? (
            <EmptyState title="استانی پیدا نشد" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredProvinces.map((province) => {
                const isActive = activeProvinceId === province.id;

                return (
                  <button
                    key={province.id}
                    type="button"
                    onClick={() => setActiveProvinceId(province.id)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-bold"
                        : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    }`}
                  >
                    {province.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Cities Section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-muted)]">
              {activeProvince
                ? `شهرهای استان ${activeProvince.name}`
                : "شهرها"}
            </h3>

            {!citiesLoading && !citiesError && (
              <span className="text-xs text-[var(--text-muted)]">
                {filteredCities.length} شهر
              </span>
            )}
          </div>

          {citiesLoading || provincesLoading ? (
            <div className="divide-y divide-[var(--border-subtle)]" aria-busy="true">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-card)]" />
                </div>
              ))}
            </div>
          ) : citiesError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-[var(--text-white)]">
                {citiesError}
              </p>
              <button
                type="button"
                onClick={() => setCitiesReloadToken((v) => v + 1)}
                className="mt-4 text-sm font-bold text-[var(--primary)]"
              >
                تلاش مجدد
              </button>
            </div>
          ) : filteredCities.length > 0 ? (
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

                      {activeProvince && (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {activeProvince.name}
                        </div>
                      )}
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[var(--text-white)]">
                شهری پیدا نشد
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {searchQuery.trim()
                  ? "عبارت جستجو را تغییر دهید یا استان دیگری انتخاب کنید."
                  : "برای این استان شهری ثبت نشده است."}
              </p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-sm font-bold text-[var(--primary)]"
                >
                  پاک کردن جستجو
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
};
