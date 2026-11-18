"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  gamecentersPageService,
  buildCenterSearchText,
  GamecenterListItem,
} from "@/services/gamecentersPageService";
import { ModalShell } from "./ModalShell";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity?: string;
}

const RECENT_STORAGE_KEY = "sayra_recent_searches";

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
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const [centers, setCenters] = useState<GamecenterListItem[]>([]);
  const [isLoadingCenters, setIsLoadingCenters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = normalizeText(query);
  const hasQuery = normalizedQuery.length > 0;

  // Load real centers on open using AbortController to prevent races
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setIsLoadingCenters(true);

    gamecentersPageService
      .loadAllCenters({ city: selectedCity, signal: controller.signal })
      .then((data) => {
        setCenters(data);
      })
      .catch((err) => {
        if ((err as Error)?.name !== "AbortError") {
          setCenters([]);
        }
      })
      .finally(() => {
        setIsLoadingCenters(false);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen, selectedCity]);

  // Reset query when opened
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
  }, [isOpen]);

  const filteredCenters = useMemo(() => {
    if (!hasQuery) return [];

    return centers.filter((center) => {
      const searchableText = buildCenterSearchText(center);

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, hasQuery, centers]);

  const hasResults = filteredCenters.length > 0;

  const saveRecentSearch = (text: string) => {
    const value = text.trim();
    if (!value) return;

    setRecentSearches((previous) => {
      const next = [
        value,
        ...previous.filter(
          (item) => normalizeText(item) !== normalizeText(value),
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
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستوجو"
          autoComplete="off"
          className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-11 pl-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="پاک کردن جستوجو"
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
      onClose={onClose}
      ariaLabel="جست‌وجو در سایرا"
      title={headerTitle}
      focusRef={inputRef}
    >
      <div className="mx-auto flex w-full max-w-[var(--max-mini-app-width)] flex-col gap-7 px-4 py-5 sm:px-6 sm:py-7">
        {/* Initial state */}
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

            {recentSearches.length === 0 && (
              <EmptyState title="جستوجویی ثبت نشده" />
            )}
          </>
        )}

        {/* Results state */}
        {hasQuery && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">
                نتایج جستوجو برای
                <span className="mr-1 font-bold text-[var(--text-white)]">
                  «{query.trim()}»
                </span>
              </p>

              <span className="text-xs text-[var(--text-muted)]">
                {toPersianDigits(filteredCenters.length)} نتیجه
              </span>
            </div>

            {!hasResults && !isLoadingCenters && (
              <EmptyState
                title={`نتیجه‌ای برای «${query.trim()}» پیدا نشد`}
                actionLabel="پاک کردن جستوجو"
                onAction={clearSearch}
              />
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

                        {center.location && (
                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                            {center.location}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-left">
                        {center.rating > 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs font-bold text-[var(--text-white)]">
                            <Icon
                              name="star"
                              size={14}
                              className="fill-[var(--accent-star)] text-[var(--accent-star)]"
                            />
                            <span>{toPersianDigits(center.rating)}</span>
                          </div>
                        )}

                        {center.hourlyPrice > 0 && (
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatPrice(center.hourlyPrice)} تومان
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
};