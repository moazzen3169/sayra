"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import { STATION_TYPE_LABELS, stationTypeLabel } from "@/lib/ownerStations";
import { getErrorMessage } from "@/lib/reservationUi";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services/catalogService";
import { normalizeFilterText } from "@/services/gamecentersPageService";
import { ownerGamesService, type CenterGameItem } from "@/services/ownerGamesService";
import type { GameCatalogItem, GameCatalogQueryParams } from "@/types/catalog";

const platformsOf = (game?: GameCatalogItem): string =>
  game?.supportedPlatforms?.length
    ? game.supportedPlatforms.map((p) => stationTypeLabel(String(p))).join("، ")
    : "—";

export default function NewOwnerGamePage() {
  const router = useRouter();
  const { centerId, center, isCenterLoading } = useOwner();
  const canEdit = true;

  // بازی‌های فعلی گیمنت برای تشخیص موارد اضافه‌شده
  const [centerGames, setCenterGames] = useState<CenterGameItem[] | null>(null);
  const [centerGamesError, setCenterGamesError] = useState<string | null>(null);
  const [centerGamesReload, setCenterGamesReload] = useState(0);

  // کاتالوگ بازی‌ها
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [platform, setPlatform] = useState("ALL");
  const [items, setItems] = useState<GameCatalogItem[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // صفحه‌بندی سمت سرور (۱۸ بازی در صفحه: ۶ ردیف ۳تایی در موبایل، ۳ ردیف ۶تایی در دسکتاپ)
  const PAGE_SIZE = 18;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ذخیره
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    let active = true;

    ownerGamesService
      .listCenterGames(centerId, controller.signal)
      .then((list) => {
        if (!active) return;
        setCenterGames(list);
        setCenterGamesError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCenterGamesError(getErrorMessage(e));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, centerGamesReload]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(null);
      setCatalogError(null);
      setPage(1);
      setDebounced(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    catalogService
      .listGamesPaginated(
        {
          page,
          limit: PAGE_SIZE,
          isActive: true,
          search: debounced || undefined,
          platform:
            platform === "ALL" ? undefined : (platform as GameCatalogQueryParams["platform"]),
        },
        controller.signal
      )
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setTotalPages(Math.max(1, res.totalPages));
        setCatalogError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCatalogError(getErrorMessage(e));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debounced, platform, page, catalogRetry]);

  const addedIds = useMemo(
    () => new Set((centerGames ?? []).map((g) => g.id)),
    [centerGames]
  );

  const addedTitles = useMemo(
    () => new Set((centerGames ?? []).map((g) => normalizeFilterText(g.title))),
    [centerGames]
  );

  const safePage = Math.min(page, totalPages);

  const toggleCatalogGame = (id: string) => {
    setSaveError(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveCatalog = async () => {
    if (saving || !centerId || !canEdit || selectedIds.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await ownerGamesService.addGamesFromCatalog(centerId, selectedIds);
      const count = res.addedGames.length > 0 ? res.addedGames.length : selectedIds.length;
      const msg = `${toPersianDigits(count)} بازی به گیمنت اضافه شد.`;
      router.push(`/owner/stations?toast=${encodeURIComponent(msg)}`);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!centerId && !isCenterLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
        <OwnerPageHeader title="افزودن بازی" backUrl="/owner/stations" isSubpage />
        <main className="mx-auto mt-16 w-full max-w-[var(--max-mini-app-width)] flex-1 px-4 py-8">
          <EmptyState
            title="گیمنتی پیدا نشد"
            description="ابتدا گیمنت خود را ثبت کنید، سپس بازی‌ها را مدیریت کنید."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-20 text-[var(--text-white)]">
      <OwnerPageHeader title="افزودن بازی" backUrl="/owner/stations" isSubpage />

      <main className="mx-auto mt-16 flex w-full max-w-[var(--max-mini-app-width)] flex-1 flex-col gap-6 px-4 py-6 lg:px-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-extrabold text-[var(--text-white)]">
            افزودن بازی از کاتالوگ
          </h1>
          <p className="text-xs leading-6 text-[var(--text-muted)]">
            {center?.name
              ? `بازی‌های پشتیبانی‌شده در «${center.name}» را از کاتالوگ پلتفرم انتخاب کنید.`
              : "بازی‌های مورد نظر خود را از کاتالوگ پلتفرم انتخاب کنید."}
          </p>
        </div>

        {!canEdit && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-card border border-[var(--accent-yellow)]/40 bg-[var(--accent-yellow)]/10 p-4 text-xs font-bold leading-6 text-[var(--accent-yellow)]"
          >
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            <span>
              افزودن و ویرایش بازی‌ها بعد از تأیید احراز هویت گیمنت فعال می‌شود.
            </span>
          </div>
        )}

        {centerGamesError && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]">
            <span>فهرست بازی‌های فعلی گیمنت بارگذاری نشد.</span>
            <button
              type="button"
              onClick={() => {
                setCenterGamesError(null);
                setCenterGamesReload((v) => v + 1);
              }}
              className="h-9 px-2 text-[var(--text-white)] underline"
            >
              تلاش دوباره
            </button>
          </div>
        )}

        <section className="flex flex-col gap-4">
          <Input
            aria-label="جستجوی بازی"
            placeholder="جستجوی نام بازی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div role="group" aria-label="فیلتر پلتفرم" className="flex gap-2 overflow-x-auto pb-1">
            {[["ALL", "همه"], ...Object.entries(STATION_TYPE_LABELS)].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={platform === value}
                onClick={() => {
                  setItems(null);
                  setCatalogError(null);
                  setPage(1);
                  setPlatform(value);
                }}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors",
                  platform === value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                    : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--border-color)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {items === null && !catalogError && (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" aria-busy="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-card" />
              ))}
            </div>
          )}

          {catalogError && (
            <ErrorState
              title="بارگذاری کاتالوگ انجام نشد"
              description={catalogError}
              onRetry={() => {
                setItems(null);
                setCatalogError(null);
                setCatalogRetry((v) => v + 1);
              }}
            />
          )}

          {items && items.length === 0 && (
            <EmptyState
              title="بازی‌ای پیدا نشد"
              description="عبارت جستجو را کوتاه‌تر کنید یا پلتفرم دیگری را انتخاب کنید."
            />
          )}

          {items && items.length > 0 && (
            <>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {items.map((game) => {
                  const added =
                    addedIds.has(game.id) || addedTitles.has(normalizeFilterText(game.title));
                  const isSelected = selectedIds.includes(game.id);
                  return (
                    <button
                      key={game.id}
                      type="button"
                      disabled={added || !canEdit || saving}
                      aria-pressed={isSelected}
                      onClick={() => toggleCatalogGame(game.id)}
                      className={cn(
                        "group flex flex-col gap-2 text-right transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card",
                        added ? "cursor-not-allowed opacity-55" : "cursor-pointer"
                      )}
                    >
                      <span
                        className={cn(
                          "relative aspect-[3/4] w-full overflow-hidden rounded-card transition-all",
                          isSelected
                            ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg-body)]"
                            : "border border-[var(--border-subtle)] group-hover:border-[var(--border-color)]"
                        )}
                      >
                        <SafeImage
                          src={game.coverImageUrl || ""}
                          alt={game.title}
                          fallbackSrc={PLACEHOLDERS.center}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-on-primary shadow"
                          >
                            <Icon name="check" size={16} />
                          </span>
                        )}
                        {added && (
                          <span className="absolute bottom-2 right-2">
                            <Badge variant="neutral">اضافه شده</Badge>
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5 px-0.5">
                        <span className="truncate text-xs sm:text-sm font-bold text-[var(--text-white)]">
                          {game.title}
                        </span>
                        <span className="truncate text-[11px] sm:text-xs text-[var(--text-muted)]">
                          {platformsOf(game)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setItems(null);
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="h-10 px-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  صفحه قبل
                </button>

                <span className="text-xs font-bold text-[var(--text-muted)]">
                  صفحه {toPersianDigits(safePage)} از {toPersianDigits(totalPages)}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setItems(null);
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="h-10 px-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-white)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  صفحه بعد
                </button>
              </div>
            </>
          )}

          {/* نوار اقدام پایین صفحه */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]/95 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-[var(--max-mini-app-width)] flex-col gap-2 px-4 py-2.5 lg:px-0">
              {saveError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-2 text-xs font-bold text-[var(--accent-red)]"
                >
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="md"
                  isLoading={saving}
                  disabled={!canEdit || !centerId || selectedIds.length === 0}
                  onClick={handleSaveCatalog}
                  className="flex-1 h-10 text-xs"
                >
                  {selectedIds.length > 0
                    ? `افزودن ${toPersianDigits(selectedIds.length)} بازی`
                    : "بازی‌ها را انتخاب کنید"}
                </Button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    disabled={saving}
                    className="h-10 px-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 hover:bg-[var(--foreground)]/70 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    پاک کردن
                  </button>
                )}
                <Link
                  href="/owner/stations"
                  className="h-10 px-3.5 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 hover:bg-[var(--foreground)]/70 text-xs font-bold text-[var(--text-white)] flex items-center justify-center transition-colors shrink-0"
                >
                  انصراف
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
