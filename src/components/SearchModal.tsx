"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { RatingHeartIcon } from "@/components/ui/RatingHeartIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeImage } from "@/components/ui/SafeImage";
import { normalizeMediaUrl, PLACEHOLDERS } from "@/lib/media";
import { isAbortError } from "@/lib/api/client";
import {
  searchService,
  canonicalizeDeviceType,
  getDeviceTypeLabelFa,
} from "@/services/searchService";
import type { PublicSearchSuggestPayload } from "@/types/search";
import { ModalShell } from "./ModalShell";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
}

const RECENT_STORAGE_KEY = "sayra_recent_searches";
const SUGGEST_DEBOUNCE_MS = 220;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDeviceIconName(deviceType: string): "gamepad" | "monitor" | "vr" {
  const canonical = canonicalizeDeviceType(deviceType);
  if (canonical === "PC") return "monitor";
  if (canonical === "VR") return "vr";
  return "gamepad";
}

function SuggestSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <span className="sr-only">در حال جست‌وجو</span>
      {[1, 2].map((group) => (
        <div key={group} className="flex flex-col gap-2.5">
          <div className="h-3.5 w-20 animate-pulse rounded bg-[var(--foreground)]/70" />
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)]/60 bg-[var(--bg-card)]/60 p-3"
            >
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-[var(--foreground)]/70" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-[var(--foreground)]/70" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--foreground)]/50" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  selectedCity = "تبریز",
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  });

  const [suggestions, setSuggestions] = useState<PublicSearchSuggestPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const handleClose = () => {
    setQuery("");
    setSuggestions(null);
    setErrorMessage(null);
    setIsLoading(false);
    onClose();
  };

  const handleQueryChange = (nextValue: string) => {
    setQuery(nextValue);
    if (!nextValue.trim()) {
      setSuggestions(null);
      setErrorMessage(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setErrorMessage(null);
    }
  };

  // Debounced API call to GET /public/search/suggest
  useEffect(() => {
    if (!isOpen || !hasQuery) return;

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setIsLoading(true);
      setErrorMessage(null);

      searchService
        .suggest({
          q: trimmedQuery,
          city: selectedCity,
          limit: 6,
          signal: controller.signal,
        })
        .then((payload) => {
          if (!active) return;
          setSuggestions(payload);
          setErrorMessage(null);
        })
        .catch((err) => {
          if (!active || isAbortError(err)) return;
          setSuggestions(null);
          setErrorMessage("خطا در دریافت پیشنهادهای جست‌وجو");
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, hasQuery, trimmedQuery, selectedCity, retryToken]);

  const games = suggestions?.games ?? [];
  const gameCenters = suggestions?.gameCenters ?? [];
  const cities = suggestions?.locations?.cities ?? [];
  const neighborhoods = suggestions?.locations?.neighborhoods ?? [];
  const devices = suggestions?.devices ?? [];

  const totalResults =
    games.length +
    gameCenters.length +
    cities.length +
    neighborhoods.length +
    devices.length;
  const hasResults = totalResults > 0;

  const saveRecentSearch = (text: string) => {
    const value = text.trim();
    if (!value) return;

    setRecentSearches((previous) => {
      const next = [
        value,
        ...previous.filter(
          (item) => normalizeText(item) !== normalizeText(value)
        ),
      ].slice(0, 5);
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const navigateWithParams = (params: Record<string, string>, recentLabel?: string) => {
    if (recentLabel) {
      saveRecentSearch(recentLabel);
    }
    handleClose();
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v.trim()) sp.set(k, v.trim());
    });
    const qs = sp.toString();
    router.push(qs ? `/gamecenters?${qs}` : "/gamecenters");
  };

  const executeSearch = (text: string) => {
    const value = text.trim();
    if (!value) return;
    navigateWithParams({ q: value }, value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedQuery) {
      executeSearch(trimmedQuery);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions(null);
    setErrorMessage(null);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const headerTitle = (
    <form onSubmit={handleFormSubmit} className="relative min-w-0 flex-1">
      <div className="relative">
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
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="جست‌وجوی بازی، گیم‌نت، محله یا دستگاه…"
          autoComplete="off"
          className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-11 pl-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="پاک کردن جست‌وجو"
            className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-card text-[var(--text-muted)] hover:text-[var(--text-white)] cursor-pointer"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </form>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="جست‌وجو در سایرا"
      title={headerTitle}
      focusRef={inputRef}
    >
      <div className="mx-auto flex w-full max-w-[var(--max-mini-app-width)] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7">
        {/* Initial state */}
        {!hasQuery && (
          <>
            {recentSearches.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[var(--text-muted)]">
                    جست‌وجوهای اخیر
                  </h2>

                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      try {
                        window.localStorage.removeItem(RECENT_STORAGE_KEY);
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--primary)] cursor-pointer"
                  >
                    پاک کردن
                  </button>
                </div>

                <div className="flex flex-col">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => executeSearch(item)}
                      className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)]/70 py-2 text-right last:border-b-0 cursor-pointer hover:text-[var(--primary)] transition-colors"
                    >
                      <Icon
                        name="clock"
                        size={16}
                        className="text-[var(--text-muted)]"
                      />

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
            ) : (
              <EmptyState
                title="هر چیزی می‌خواهید جست‌وجو کنید"
                description="نام بازی (مثل فیفا ۲۶، GTA V)، نام گیم‌نت، محله، شهر یا نوع دستگاه (PS5، PC، VR) را بنویسید."
              />
            )}
          </>
        )}

        {/* Active search state */}
        {hasQuery && (
          <>
            {/* Quick action: Full search */}
            <button
              type="button"
              onClick={() => executeSearch(trimmedQuery)}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-muted)]/60 px-4 py-3 text-right transition-colors hover:border-[var(--primary)] cursor-pointer"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon name="search" size={18} className="text-[var(--primary)]" />
                <span className="truncate text-sm font-bold text-[var(--text-white)]">
                  مشاهده همه نتایج برای «{trimmedQuery}»
                </span>
              </div>
              <Icon
                name="arrow-left"
                size={16}
                className="text-[var(--primary)]"
              />
            </button>

            {isLoading && <SuggestSkeleton />}

            {!isLoading && errorMessage && (
              <EmptyState
                title={errorMessage}
                description="لطفاً اتصال اینترنت را بررسی کنید یا دوباره تلاش کنید."
                actionLabel="تلاش مجدد"
                onAction={() => setRetryToken((prev) => prev + 1)}
              />
            )}

            {!isLoading && !errorMessage && !hasResults && (
              <EmptyState
                title={`پیشنهاد مستقیمی برای «${trimmedQuery}» پیدا نشد`}
                description="می‌توانید جست‌وجوی کامل را در لیست گیم‌نت‌ها امتحان کنید."
                actionLabel="جست‌وجوی کامل"
                onAction={() => executeSearch(trimmedQuery)}
              />
            )}

            {!isLoading && !errorMessage && hasResults && (
              <div className="flex flex-col gap-6">
                {/* 1. Devices */}
                {devices.length > 0 && (
                  <section>
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <Icon name="gamepad" size={14} />
                      <span>دستگاه‌ها</span>
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {devices.map((device) => {
                        const canonical = canonicalizeDeviceType(device.type) || device.type;
                        const label = device.label || getDeviceTypeLabelFa(canonical);
                        return (
                          <button
                            key={device.type}
                            type="button"
                            onClick={() =>
                              navigateWithParams({ deviceType: canonical }, label)
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                          >
                            <Icon
                              name={getDeviceIconName(device.type)}
                              size={15}
                              className="text-[var(--primary)]"
                            />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 2. Games */}
                {games.length > 0 && (
                  <section>
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <Icon name="gamepad" size={14} />
                      <span>بازی‌ها</span>
                    </h2>
                    <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                      {games.map((game) => {
                        const displayTitle = game.titleFa || game.title;
                        const secondaryTitle =
                          game.titleEn &&
                          normalizeText(game.titleEn) !== normalizeText(displayTitle)
                            ? game.titleEn
                            : null;
                        const coverSrc = game.coverImageUrl
                          ? normalizeMediaUrl(game.coverImageUrl)
                          : "";

                        return (
                          <button
                            key={game.id}
                            type="button"
                            onClick={() =>
                              navigateWithParams(
                                {
                                  gameId: game.id,
                                  game: displayTitle,
                                },
                                displayTitle
                              )
                            }
                            className="group flex w-full items-center gap-3 py-3 text-right cursor-pointer"
                          >
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--primary)]">
                              {coverSrc ? (
                                <SafeImage
                                  src={coverSrc}
                                  alt={displayTitle}
                                  fill
                                  sizes="44px"
                                  fallbackSrc={PLACEHOLDERS.center}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Icon name="gamepad" size={20} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-bold text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
                                {displayTitle}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                {secondaryTitle && (
                                  <span className="truncate" dir="ltr">
                                    {secondaryTitle}
                                  </span>
                                )}
                                {game.supportedPlatforms.slice(0, 3).map((plat) => (
                                  <span
                                    key={plat}
                                    className="rounded bg-[var(--foreground)]/70 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]"
                                  >
                                    {getDeviceTypeLabelFa(plat)}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {game.centerCount > 0 && (
                              <span className="shrink-0 rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold text-[var(--primary)] border border-[var(--border-subtle)]">
                                {toPersianDigits(game.centerCount)} گیم‌نت
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 3. Game Centers */}
                {gameCenters.length > 0 && (
                  <section>
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <Icon name="home" size={14} />
                      <span>گیم‌نت‌ها</span>
                    </h2>

                    <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                      {gameCenters.map((center) => {
                        const locationText = [center.city, center.neighborhood]
                          .filter(Boolean)
                          .join("، ");
                        const coverSrc = center.coverUrl
                          ? normalizeMediaUrl(center.coverUrl)
                          : "";
                        const href =
                          center.detailUrl ||
                          `/gamecenter/${encodeURIComponent(center.slug || center.id)}`;

                        return (
                          <Link
                            key={center.id}
                            href={href}
                            onClick={() => {
                              saveRecentSearch(center.name);
                              handleClose();
                            }}
                            className="group flex items-center gap-3 py-3"
                          >
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--primary)]">
                              {coverSrc ? (
                                <SafeImage
                                  src={coverSrc}
                                  alt={center.name}
                                  fill
                                  sizes="44px"
                                  fallbackSrc={PLACEHOLDERS.center}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Icon name="home" size={20} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate text-sm font-bold text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
                                  {center.name}
                                </h3>
                                {center.isOpenNow && (
                                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    باز است
                                  </span>
                                )}
                              </div>

                              {locationText && (
                                <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                                  {locationText}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 text-left">
                              {center.ratingAverage > 0 && (
                                <div className="flex items-center justify-end gap-1 text-xs font-bold text-[var(--text-white)]">
                                  <RatingHeartIcon size={14} />
                                  <span>{toPersianDigits(center.ratingAverage.toFixed(1))}</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 4. Locations (Cities & Neighborhoods) */}
                {(cities.length > 0 || neighborhoods.length > 0) && (
                  <section>
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                      <Icon name="pin" size={14} />
                      <span>شهرها و محله‌ها</span>
                    </h2>

                    <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                      {cities.map((cityItem) => (
                        <button
                          key={`city-${cityItem.name}`}
                          type="button"
                          onClick={() =>
                            navigateWithParams({ city: cityItem.name }, cityItem.name)
                          }
                          className="group flex w-full items-center gap-3 py-3 text-right cursor-pointer"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--primary)]">
                            <Icon name="pin" size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors">
                              {cityItem.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">شهر</p>
                          </div>
                          {cityItem.count > 0 && (
                            <span className="shrink-0 text-xs text-[var(--text-muted)]">
                              {toPersianDigits(cityItem.count)} گیم‌نت
                            </span>
                          )}
                        </button>
                      ))}

                      {neighborhoods.map((nb) => (
                        <button
                          key={`nb-${nb.city}-${nb.name}`}
                          type="button"
                          onClick={() =>
                            navigateWithParams(
                              { city: nb.city, neighborhood: nb.name },
                              `${nb.name}، ${nb.city}`
                            )
                          }
                          className="group flex w-full items-center gap-3 py-3 text-right cursor-pointer"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--primary)]">
                            <Icon name="pin" size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors">
                              {nb.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              محله در {nb.city}
                            </p>
                          </div>
                          {nb.count > 0 && (
                            <span className="shrink-0 text-xs text-[var(--text-muted)]">
                              {toPersianDigits(nb.count)} گیم‌نت
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
};
