"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SafeImage } from "@/components/ui/SafeImage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import { STATION_TYPE_LABELS, stationTypeLabel } from "@/lib/ownerStations";
import { getErrorMessage } from "@/lib/reservationUi";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services/catalogService";
import { normalizeFilterText } from "@/services/gamecentersPageService";
import { ownerGamesService } from "@/services/ownerGamesService";
import { ownerService } from "@/services/ownerService";
import type { GameCatalogItem, GameCatalogQueryParams } from "@/types/catalog";

const platformsOf = (game?: GameCatalogItem): string =>
  game?.supportedPlatforms?.length
    ? game.supportedPlatforms.map((p) => stationTypeLabel(String(p))).join("، ")
    : "—";

/* ---------- انتخاب بازی از کاتالوگ ---------- */

interface GamePickerModalProps {
  centerId: string;
  addedTitles: Set<string>;
  onClose: () => void;
  onAdded: (allGames: string[] | null, count: number) => void;
}

const GamePickerModal: React.FC<GamePickerModalProps> = ({
  centerId,
  addedTitles,
  onClose,
  onAdded,
}) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [platform, setPlatform] = useState("ALL");
  const [items, setItems] = useState<GameCatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setItems(null);
    setError(null);

    catalogService
      .listGames(
        {
          limit: 60,
          isActive: true,
          search: debounced || undefined,
          platform:
            platform === "ALL" ? undefined : (platform as GameCatalogQueryParams["platform"]),
        },
        controller.signal
      )
      .then((res) => {
        if (active) setItems(res);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debounced, platform, retry]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    if (saving || selected.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await ownerService.addGamesFromCatalog(centerId, selected);
      const all = Array.isArray(res.allGames)
        ? res.allGames.filter((g): g is string => typeof g === "string")
        : null;
      onAdded(all && all.length > 0 ? all : null, selected.length);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={saving ? () => {} : onClose}
      title="انتخاب بازی از کاتالوگ"
      className="max-w-[720px]"
    >
      <div className="flex flex-col gap-4">
        <Input
          aria-label="جستجوی بازی"
          placeholder="جستجوی نام بازی"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div role="group" aria-label="فیلتر پلتفرم" className="flex gap-2 overflow-x-auto pb-1">
          {[["ALL", "همه"], ...Object.entries(STATION_TYPE_LABELS)].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={platform === value}
              onClick={() => setPlatform(value)}
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

        {items === null && !error && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            title="بارگذاری کاتالوگ انجام نشد"
            description={error}
            onRetry={() => setRetry((v) => v + 1)}
          />
        )}

        {items && items.length === 0 && (
          <EmptyState
            title="بازی‌ای پیدا نشد"
            description="عبارت جستجو را کوتاه‌تر کنید یا پلتفرم دیگری را انتخاب کنید."
          />
        )}

        {items && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((game) => {
              const added = addedTitles.has(normalizeFilterText(game.title));
              const isSelected = selected.includes(game.id);
              return (
                <button
                  key={game.id}
                  type="button"
                  disabled={added}
                  aria-pressed={isSelected}
                  onClick={() => toggle(game.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-card border p-2 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    added
                      ? "cursor-not-allowed border-[var(--border-subtle)] opacity-60"
                      : isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                        : "border-[var(--border-subtle)] bg-[var(--foreground)]/20 hover:border-[var(--border-color)]"
                  )}
                >
                  <span className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40">
                    <SafeImage
                      src={game.coverImageUrl || ""}
                      alt=""
                      fallbackSrc={PLACEHOLDERS.center}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-on-primary"
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
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold text-[var(--text-white)]">
                      {game.title}
                    </span>
                    <span className="truncate text-xs text-[var(--text-muted)]">
                      {platformsOf(game)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] pt-3">
          {saveError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
            >
              <Icon name="alert" size={16} className="mt-1" />
              <span>{saveError}</span>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              size="lg"
              isLoading={saving}
              disabled={selected.length === 0}
              onClick={handleSave}
              className="sm:flex-1"
            >
              {selected.length > 0
                ? `افزودن ${toPersianDigits(selected.length)} بازی`
                : "بازی‌ها را انتخاب کنید"}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={saving}>
              انصراف
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/* ---------- جدول بازی‌های گیمنت ---------- */

interface GamesSectionProps {
  centerId: string;
  onNotify: (message: string) => void;
}

export const GamesSection: React.FC<GamesSectionProps> = ({ centerId, onNotify }) => {
  const [games, setGames] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogGames, setCatalogGames] = useState<GameCatalogItem[]>([]);
  const [reload, setReload] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deletingTitle, setDeletingTitle] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // بازی‌های انتخاب‌شده‌ی همین گیمنت
  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    let active = true;

    ownerGamesService
      .listCenterGames(centerId, controller.signal)
      .then((list) => {
        if (!active) return;
        setGames(list);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, reload]);

  // فقط برای نمایش تصویر/پلتفرم بازی‌ها؛ نبودنش جدول را خراب نمی‌کند
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    catalogService
      .listGames({ isActive: true, limit: 100 }, controller.signal)
      .then((res) => {
        if (active) setCatalogGames(res);
      })
      .catch(() => {
        if (active) setCatalogGames([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const rows = useMemo(() => {
    const byTitle = new Map(catalogGames.map((g) => [normalizeFilterText(g.title), g]));
    return (games ?? []).map((title) => ({
      title,
      catalog: byTitle.get(normalizeFilterText(title)),
    }));
  }, [games, catalogGames]);

  const addedTitles = useMemo(
    () => new Set((games ?? []).map((g) => normalizeFilterText(g))),
    [games]
  );

  const retry = () => {
    setGames(null);
    setError(null);
    setReload((v) => v + 1);
  };

  const handleAdded = (all: string[] | null, count: number) => {
    setPickerOpen(false);
    onNotify(`${toPersianDigits(count)} بازی به گیمنت اضافه شد.`);
    if (all) setGames(all);
    else setReload((v) => v + 1);
  };

  const handleRemoveGame = async () => {
    if (!deletingTitle || !games || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const updated = await ownerGamesService.removeCenterGame(centerId, deletingTitle, games);
      setGames(updated);
      onNotify(`بازی «${deletingTitle}» حذف شد.`);
      setDeletingTitle(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title="بازی‌های گیمنت"
        subtitle={games ? `${toPersianDigits(games.length)} بازی` : undefined}
        action={
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>
            <span className="flex items-center gap-1.5">
              <Icon name="plus" size={16} />
              <span>افزودن بازی</span>
            </span>
          </Button>
        }
      />

      {games === null && !error && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {error && (
        <ErrorState title="بارگذاری بازی‌ها انجام نشد" description={error} onRetry={retry} />
      )}

      {games && !error && games.length === 0 && (
        <EmptyState
          title="هنوز بازی‌ای اضافه نشده"
          description="بازی‌ها را از کاتالوگ انتخاب کنید تا برای مشتریان نمایش داده شوند."
        />
      )}

      {games && !error && games.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <table className="w-full text-right text-sm">
            <thead className="bg-[var(--foreground)]/20 text-xs text-[var(--text-muted)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">بازی</th>
                <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">پلتفرم</th>
                <th scope="col" className="hidden px-4 py-3 font-bold md:table-cell">ژانر</th>
                <th scope="col" className="w-16 px-4 py-3 font-bold">
                  <span className="sr-only">عملیات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map(({ title, catalog }) => (
                <tr key={title} className="hover:bg-[var(--foreground)]/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-14 w-11 shrink-0 overflow-hidden rounded-card bg-[var(--foreground)]/40">
                        <SafeImage
                          src={catalog?.coverImageUrl || ""}
                          alt=""
                          fallbackSrc={PLACEHOLDERS.center}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-bold text-[var(--text-white)]">{title}</span>
                        <span className="truncate text-xs text-[var(--text-muted)] sm:hidden">
                          {platformsOf(catalog)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[var(--text-muted)] sm:table-cell">
                    {platformsOf(catalog)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[var(--text-muted)] md:table-cell">
                    {catalog?.genre || "—"}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingTitle(title);
                      }}
                      aria-label={`حذف ${title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-card text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-[var(--accent-red)] transition-colors"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingTitle && (
        <Modal
          isOpen
          onClose={() => {
            if (!isDeleting) {
              setDeletingTitle(null);
              setDeleteError(null);
            }
          }}
          title="حذف بازی از گیم‌نت"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-7 text-[var(--text-white)]">
              آیا از حذف بازی «{deletingTitle}» از فهرست بازی‌های گیم‌نت اطمینان دارید؟
            </p>

            {deleteError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
              >
                <Icon name="alert" size={16} className="mt-1" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                size="lg"
                isLoading={isDeleting}
                onClick={handleRemoveGame}
                className="border-transparent bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red)]/90 sm:flex-1"
              >
                حذف بازی
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setDeletingTitle(null)}
                disabled={isDeleting}
              >
                انصراف
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pickerOpen && (
        <GamePickerModal
          centerId={centerId}
          addedTitles={addedTitles}
          onClose={() => setPickerOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </section>
  );
};