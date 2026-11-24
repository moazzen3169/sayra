"use client";

import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  ArticleGamingCenterLink,
  ArticleGamingCenterMode,
  ArticleRankingSort,
  PublicGameCenterCard,
} from "@/types/blog";

const inputCls =
  "w-full rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3 py-2 text-xs text-[var(--text-white)] outline-none transition-colors focus:border-[var(--primary)]";
const labelCls =
  "mb-1 block text-[11px] font-bold text-[var(--text-muted)]";

export interface BlogGamingCentersFieldsetProps {
  mode: ArticleGamingCenterMode;
  onModeChange: (mode: ArticleGamingCenterMode) => void;
  rankingCity: string;
  onRankingCityChange: (v: string) => void;
  rankingNeighborhood: string;
  onRankingNeighborhoodChange: (v: string) => void;
  rankingDeviceType: string;
  onRankingDeviceTypeChange: (v: string) => void;
  rankingLimit: number;
  onRankingLimitChange: (v: number) => void;
  rankingMinReviews: string;
  onRankingMinReviewsChange: (v: string) => void;
  rankingBayesianM: string;
  onRankingBayesianMChange: (v: string) => void;
  rankingSort: ArticleRankingSort;
  onRankingSortChange: (v: ArticleRankingSort) => void;
  includeNewlyRegistered: boolean;
  onIncludeNewlyRegisteredChange: (v: boolean) => void;
  links: ArticleGamingCenterLink[];
  onLinksChange: (links: ArticleGamingCenterLink[]) => void;
}

export const BlogGamingCentersFieldset: React.FC<BlogGamingCentersFieldsetProps> = ({
  mode,
  onModeChange,
  rankingCity,
  onRankingCityChange,
  rankingNeighborhood,
  onRankingNeighborhoodChange,
  rankingDeviceType,
  onRankingDeviceTypeChange,
  rankingLimit,
  onRankingLimitChange,
  rankingMinReviews,
  onRankingMinReviewsChange,
  rankingBayesianM,
  onRankingBayesianMChange,
  rankingSort,
  onRankingSortChange,
  includeNewlyRegistered,
  onIncludeNewlyRegisteredChange,
  links,
  onLinksChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PublicGameCenterCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [centerInfoById, setCenterInfoById] = useState<
    Record<string, PublicGameCenterCard>
  >({});

  // Hydrate labels for already-linked IDs via single batch lookup against Express
  useEffect(() => {
    const missingIds = links
      .map((l) => l.gamingCenterId)
      .filter((id) => id && !centerInfoById[id]);
    if (missingIds.length === 0) return;

    const controller = new AbortController();
    const url = `${API_BASE_URL}${ENDPOINTS.publicGamecenters.list}?ids=${encodeURIComponent(
      missingIds.slice(0, 50).join(",")
    )}`;
    void fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = json?.data?.data;
        if (!Array.isArray(rows)) return;
        setCenterInfoById((prev) => {
          const next = { ...prev };
          for (const item of rows as PublicGameCenterCard[]) {
            if (item?.id) next[item.id] = item;
          }
          return next;
        });
      })
      .catch(() => {
        // Ignore transient lookup issues in admin helper UI
      });

    return () => controller.abort();
  }, [links, centerInfoById]);

  const handleSearch = async () => {
    setSearching(true);
    setSearchError(null);
    try {
      const qs = new URLSearchParams();
      if (searchTerm.trim()) qs.set("search", searchTerm.trim());
      if (rankingCity.trim()) qs.set("city", rankingCity.trim());
      qs.set("limit", "15");
      const res = await fetch(
        `${API_BASE_URL}${ENDPOINTS.publicGamecenters.list}?${qs.toString()}`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const rows: PublicGameCenterCard[] = Array.isArray(json?.data?.data)
        ? json.data.data
        : [];
      setSearchResults(rows);
      setCenterInfoById((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          if (row?.id) next[row.id] = row;
        }
        return next;
      });
    } catch {
      setSearchError(
        "امکان دریافت لیست گیم‌نت‌های فعال و تأییدشده از سایرا برقرار نشد."
      );
    } finally {
      setSearching(false);
    }
  };

  const addCenter = (center: PublicGameCenterCard) => {
    if (links.some((l) => l.gamingCenterId === center.id)) return;
    setCenterInfoById((prev) => ({ ...prev, [center.id]: center }));
    onLinksChange([
      ...links,
      {
        gamingCenterId: center.id,
        displayOrder: links.length,
        customDescription: "",
      },
    ]);
  };

  const removeCenter = (index: number) => {
    const next = links
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, displayOrder: idx }));
    onLinksChange(next);
  };

  const moveCenter = (from: number, to: number) => {
    if (to < 0 || to >= links.length) return;
    const copy = [...links];
    const [picked] = copy.splice(from, 1);
    copy.splice(to, 0, picked);
    onLinksChange(copy.map((item, idx) => ({ ...item, displayOrder: idx })));
  };

  const updateDescription = (index: number, customDescription: string) => {
    onLinksChange(
      links.map((item, idx) =>
        idx === index ? { ...item, customDescription } : item
      )
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-white)]">
            گیم‌نت‌های مرتبط (اتصال هوشمند سایرا)
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            اطلاعات متغیر مراکز (نام، قیمت، امتیاز و آدرس) در جنگو کپی نمی‌شود و زنده از API سایرا خوانده می‌شود.
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div>
        <label className={labelCls}>حالت اتصال گیم‌نت‌ها</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { value: "none", label: "بدون نمایش" },
              { value: "manual", label: "انتخاب دستی / تحریریه‌ای" },
              { value: "auto_ranking", label: "رتبه‌بندی خودکار Bayesian" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onModeChange(opt.value)}
              className={`rounded-card border px-3 py-2 text-xs font-bold transition-colors ${
                mode === opt.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--foreground)]/20 text-[var(--text-muted)] hover:text-[var(--text-white)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Ranking Config */}
      {mode === "auto_ranking" && (
        <div className="grid grid-cols-1 gap-3 rounded-card border border-[var(--border-subtle)]/70 bg-[var(--foreground)]/15 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>شهر (برای مقالات بهترین‌ها)</label>
            <input
              type="text"
              value={rankingCity}
              onChange={(e) => onRankingCityChange(e.target.value)}
              placeholder="مثلاً: تبریز"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>محله (اختیاری)</label>
            <input
              type="text"
              value={rankingNeighborhood}
              onChange={(e) => onRankingNeighborhoodChange(e.target.value)}
              placeholder="مثلاً: ولیعصر"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>نوع دستگاه (اختیاری)</label>
            <select
              value={rankingDeviceType}
              onChange={(e) => onRankingDeviceTypeChange(e.target.value)}
              className={inputCls}
            >
              <option value="">همه دستگاه‌ها</option>
              <option value="PC">PC</option>
              <option value="PLAYSTATION 5">PlayStation 5</option>
              <option value="PLAYSTATION 4">PlayStation 4</option>
              <option value="XBOX">Xbox</option>
              <option value="SWITCH">Nintendo Switch</option>
              <option value="VR">VR</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>معیار مرتب‌سازی</label>
            <select
              value={rankingSort}
              onChange={(e) =>
                onRankingSortChange(e.target.value as ArticleRankingSort)
              }
              className={inputCls}
            >
              <option value="bayesian">امتیاز Bayesian (پیشنهادی)</option>
              <option value="rating">میانگین امتیاز</option>
              <option value="reviews">تعداد نظرات معتبر</option>
              <option value="newest">جدیدترین</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>تعداد نمایش (Limit)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={rankingLimit}
              onChange={(e) =>
                onRankingLimitChange(
                  Math.max(1, Math.min(50, Number(e.target.value) || 10))
                )
              }
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>حداقل نظر معتبر (minReviews)</label>
            <input
              type="number"
              min={0}
              max={500}
              value={rankingMinReviews}
              onChange={(e) => onRankingMinReviewsChange(e.target.value)}
              placeholder="پیش‌فرض سیستم (مثلاً 3)"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>پارامتر m در Bayesian</label>
            <input
              type="number"
              min={0.5}
              max={500}
              step={0.5}
              value={rankingBayesianM}
              onChange={(e) => onRankingBayesianMChange(e.target.value)}
              placeholder="پیش‌فرض سیستم (مثلاً 3)"
              className={inputCls}
            />
          </div>

          <div className="flex items-end pb-1.5 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-white)]">
              <input
                type="checkbox"
                checked={includeNewlyRegistered}
                onChange={(e) =>
                  onIncludeNewlyRegisteredChange(e.target.checked)
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              <span>نمایش بخش مجزای «مراکز تازه‌ثبت‌شده»</span>
            </label>
          </div>
        </div>
      )}

      {/* Manual Picker + Editorial Notes (also usable as optional editorial notes in auto_ranking) */}
      {mode !== "none" && (
        <div className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)]/70 bg-[var(--foreground)]/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--text-white)]">
              {mode === "manual"
                ? "انتخاب دستی و ترتیب نمایش گیم‌نت‌ها"
                : "افزودن یادداشت تحریریه برای گیم‌نت‌ها (اختیاری)"}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {links.length} مرکز متصل‌شده
            </span>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="جستجوی نام گیم‌نت یا شهر در سایرا (فقط مراکز فعال و تأییدشده)..."
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching}
              className="shrink-0 rounded-card bg-[var(--primary)] px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
            >
              {searching ? "در حال جستجو..." : "جستجو در سایرا"}
            </button>
          </div>

          {searchError && (
            <p className="text-xs text-[var(--accent-red)]">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
              {searchResults.map((center) => {
                const alreadyLinked = links.some(
                  (l) => l.gamingCenterId === center.id
                );
                return (
                  <div
                    key={center.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded px-2.5 py-2 text-xs hover:bg-[var(--foreground)]/30"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--text-white)]">
                        {center.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {[center.city, center.neighborhood]
                          .filter(Boolean)
                          .join(" · ")}{" "}
                        | امتیاز: {center.rating.average.toFixed(1)} (
                        {center.rating.validReviewsCount} نظر)
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyLinked}
                      onClick={() => addCenter(center)}
                      className="rounded bg-[var(--primary)]/20 px-3 py-1 text-[11px] font-bold text-[var(--primary)] disabled:opacity-40"
                    >
                      {alreadyLinked ? "افزوده شد" : "+ افزودن"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Links List */}
          {links.length > 0 && (
            <div className="flex flex-col gap-2.5 pt-1">
              {links.map((link, index) => {
                const info = centerInfoById[link.gamingCenterId];
                return (
                  <div
                    key={link.gamingCenterId}
                    className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-[var(--primary)]/15 px-2 py-0.5 font-bold text-[var(--primary)]">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-[var(--text-white)]">
                          {info?.name || link.gamingCenterId}
                        </span>
                        {info?.city && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            ({info.city}
                            {info.neighborhood ? ` - ${info.neighborhood}` : ""})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveCenter(index, index - 1)}
                          disabled={index === 0}
                          className="rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:text-white disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCenter(index, index + 1)}
                          disabled={index === links.length - 1}
                          className="rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:text-white disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCenter(index)}
                          className="rounded px-2 py-1 text-xs text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                        >
                          حذف
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={link.customDescription || ""}
                      onChange={(e) => updateDescription(index, e.target.value)}
                      placeholder="توضیح اختصاصی تحریریه برای این گیم‌نت در این مقاله (اختیاری)..."
                      className={inputCls}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
