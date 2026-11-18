"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { stationTypeLabel } from "@/lib/ownerStations";
import { getErrorMessage } from "@/lib/reservationUi";
import { catalogService } from "@/services/catalogService";
import { normalizeFilterText } from "@/services/gamecentersPageService";
import { ownerGamesService } from "@/services/ownerGamesService";
import type { GameCatalogItem } from "@/types/catalog";

const platformsOf = (game?: GameCatalogItem): string =>
  game?.supportedPlatforms?.length
    ? game.supportedPlatforms.map((p) => stationTypeLabel(String(p))).join("، ")
    : "—";

/* ---------- جدول بازی‌های گیمنت ---------- */

interface GamesSectionProps {
  centerId: string;
  canEdit?: boolean;
  onNotify: (message: string) => void;
}

export const GamesSection: React.FC<GamesSectionProps> = ({ centerId, canEdit = true, onNotify }) => {
  const router = useRouter();
  const [games, setGames] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogGames, setCatalogGames] = useState<GameCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
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

  // فقط برای نمایش تصویر/پلتفرم بازی‌های ثبت‌شده‌ی گیمنت؛ نبودنش جدول را خراب نمی‌کند
  const hasGames = Boolean(games && games.length > 0);
  useEffect(() => {
    if (!hasGames) return;
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
  }, [hasGames]);

  const rows = useMemo(() => {
    const byTitle = new Map(catalogGames.map((g) => [normalizeFilterText(g.title), g]));
    const allRows = (games ?? []).map((title) => ({
      title,
      catalog: byTitle.get(normalizeFilterText(title)),
    }));
    const q = normalizeFilterText(search);
    if (!q) return allRows;
    return allRows.filter((r) => {
      const matchTitle = normalizeFilterText(r.title).includes(q);
      const matchGenre = r.catalog?.genre ? normalizeFilterText(r.catalog.genre).includes(q) : false;
      const matchPlatforms = r.catalog?.supportedPlatforms
        ? normalizeFilterText(r.catalog.supportedPlatforms.join(" ")).includes(q)
        : false;
      return matchTitle || matchGenre || matchPlatforms;
    });
  }, [games, catalogGames, search]);

  const retry = () => {
    setGames(null);
    setError(null);
    setReload((v) => v + 1);
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
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="بازی‌های گیم‌نت"
        subtitle={games ? `${toPersianDigits(games.length)} بازی پشتیبانی‌شده` : undefined}
        action={
          <Button
            onClick={() => router.push("/owner/stations/games/new")}
            disabled={!canEdit}
          >
            <span className="flex items-center gap-1.5">
              <Icon name="plus" size={16} />
              <span>افزودن بازی</span>
            </span>
          </Button>
        }
      />

      {!canEdit && (
        <p className="text-xs text-[var(--text-muted)]">
          افزودن و ویرایش بازی‌ها بعد از تأیید احراز هویت گیم‌نت فعال می‌شود.
        </p>
      )}

      {games && games.length > 5 && (
        <Input
          aria-label="جستجوی بازی"
          placeholder="جستجوی نام بازی، ژانر یا پلتفرم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

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
          actionLabel={canEdit ? "افزودن بازی از کاتالوگ" : undefined}
          onAction={canEdit ? () => router.push("/owner/stations/games/new") : undefined}
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
                      disabled={!canEdit}
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingTitle(title);
                      }}
                      aria-label={`حذف ${title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-card text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    </section>
  );
};