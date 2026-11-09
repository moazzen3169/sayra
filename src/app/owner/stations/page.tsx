"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { GamesSection } from "@/components/owner/stations/GamesSection";
import {
  AddStationModal,
  DeleteStationModal,
  EditStationModal,
} from "@/components/owner/stations/StationModals";
import { StationsTable } from "@/components/owner/stations/StationsTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import {
  buildStationGroups,
  stationGroupKey,
  stationTypeLabel,
} from "@/lib/ownerStations";
import { getErrorMessage, stationImageFor } from "@/lib/reservationUi";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services/catalogService";
import { normalizeFilterText } from "@/services/gamecentersPageService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import { ownerService } from "@/services/ownerService";
import type { DeviceCatalogItem } from "@/types/catalog";

export default function OwnerStationsPage() {
  const { centerId, isCenterLoading, verificationStatus } = useOwner();
  const canEdit = verificationStatus === "APPROVED";

  // داده‌ها
  const [stations, setStations] = useState<GameStationInfo[] | null>(null);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);

  // فیلتر و رابط
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // مودال‌ها (هر لحظه فقط یکی)
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GameStationInfo | null>(null);
  const [deleting, setDeleting] = useState<GameStationInfo | null>(null);

  // لیست دستگاه‌های گیمنت از GET /gamingCenters/{id}/stations
  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    let active = true;

    ownerService
      .listStations(centerId, controller.signal)
      .then((data) => {
        if (!active) return;
        setStations(Array.isArray(data) ? data : []);
        setStationsError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setStationsError(getErrorMessage(e));
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, reload]);

  // کاتالوگ دستگاه‌ها از GET /catalog/devices (نام و تصویر دسته‌ها + گزینه‌های افزودن)
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    catalogService
      .listDevices({ isActive: true, limit: 100 }, controller.signal)
      .then((items) => {
        if (!active) return;
        setCatalogDevices(items);
        setCatalogError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCatalogError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [catalogReload]);

  // پیام موفقیت کوتاه
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const groups = useMemo(
    () => buildStationGroups(stations ?? [], catalogDevices),
    [stations, catalogDevices]
  );
  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === selectedKey) ?? null,
    [groups, selectedKey]
  );

  const visibleStations = useMemo(() => {
    let list = stations ?? [];
    if (selectedGroup) {
      list = list.filter((s) => stationGroupKey(s) === selectedGroup.key);
    }
    const q = normalizeFilterText(search);
    if (q) {
      list = list.filter((s) =>
        normalizeFilterText(`${s.name} ${stationTypeLabel(s.stationType)}`).includes(q)
      );
    }
    return list;
  }, [stations, selectedGroup, search]);

  const hasFilter = !!selectedGroup || !!search.trim();

  const refresh = useCallback(() => setReload((v) => v + 1), []);

  const handleSaved = (message: string) => {
    setAddOpen(false);
    setEditing(null);
    setDeleting(null);
    setToast(message);
    refresh();
  };

  const retryStations = () => {
    setStations(null);
    setStationsError(null);
    refresh();
  };

  const clearFilters = () => {
    setSelectedKey(null);
    setSearch("");
  };

  if (!centerId && !isCenterLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
        <OwnerPageHeader title="دستگاه‌ها و بازی‌ها" backUrl="/owner" />
        <main className="mt-16 flex-1 px-4 py-8">
          <EmptyState
            title="گیمنتی پیدا نشد"
            description="ابتدا گیمنت خود را ثبت کنید، سپس دستگاه‌ها و بازی‌ها را مدیریت کنید."
          />
        </main>
      </div>
    );
  }

  const showSkeleton = stations === null && !stationsError;
  const hasStations = (stations?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-12 text-[var(--text-white)]">
      <OwnerPageHeader title="دستگاه‌ها و بازی‌ها" backUrl="/owner" />

      {toast && (
        <div className="pointer-events-none fixed inset-x-4 top-20 z-60 mx-auto max-w-md">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-center gap-2 rounded-card border border-[var(--accent-green)]/40 bg-[var(--bg-card)] p-3 text-xs font-bold text-[var(--accent-green)] shadow-2xl"
          >
            <Icon name="check" size={16} />
            <span>{toast}</span>
          </div>
        </div>
      )}

      <main className="mx-auto mt-16 flex w-full max-w-[var(--max-mini-app-width)] flex-1 flex-col gap-8 px-4 py-4 lg:px-0">
        {/* ===== کاتالوگ دستگاه‌ها ===== */}
        <section className="flex flex-col gap-3">
          <SectionTitle
            title="کاتالوگ دستگاه‌ها"
            subtitle="یک کاتالوگ را انتخاب کنید تا دستگاه‌هایش در جدول پایین نمایش داده شود"
          />

          {catalogError && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
              <span>نام و تصویر بعضی کاتالوگ‌ها بارگذاری نشد.</span>
              <button
                type="button"
                onClick={() => {
                  setCatalogLoading(true);
                  setCatalogReload((v) => v + 1);
                }}
                className="h-11 shrink-0 px-2 font-bold text-[var(--primary)] underline"
              >
                تلاش دوباره
              </button>
            </div>
          )}

          {showSkeleton && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px]" />
              ))}
            </div>
          )}

          {hasStations && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <button
                type="button"
                aria-pressed={!selectedGroup}
                onClick={() => setSelectedKey(null)}
                className={cn(
                  "flex items-center gap-3 rounded-card border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  !selectedGroup
                    ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-[var(--foreground)]/50 text-[var(--text-muted)]">
                  <Icon name="monitor" size={24} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-bold">همه دستگاه‌ها</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {toPersianDigits(stations?.length ?? 0)} دستگاه
                  </span>
                </span>
              </button>

              {groups.map((g) => {
                const active = selectedGroup?.key === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedKey(active ? null : g.key)}
                    className={cn(
                      "flex items-center gap-3 rounded-card border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                    )}
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-card bg-[var(--foreground)]/50">
                      <SafeImage
                        src={g.coverImageUrl || stationImageFor(g.deviceType)}
                        alt=""
                        fallbackSrc={PLACEHOLDERS.center}
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-bold">{g.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {toPersianDigits(g.count)} دستگاه
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== جدول دستگاه‌ها ===== */}
        <section className="flex flex-col gap-3">
          <SectionTitle
            title={selectedGroup ? `دستگاه‌های «${selectedGroup.name}»` : "همه دستگاه‌ها"}
            subtitle={
              stations ? `${toPersianDigits(visibleStations.length)} دستگاه` : undefined
            }
            action={
              <Button onClick={() => setAddOpen(true)} disabled={!canEdit}>
                <span className="flex items-center gap-1.5">
                  <Icon name="plus" size={16} />
                  <span>افزودن دستگاه</span>
                </span>
              </Button>
            }
          />

          {!canEdit && (
            <p className="text-xs text-[var(--text-muted)]">
              افزودن دستگاه بعد از تأیید احراز هویت گیمنت فعال می‌شود.
            </p>
          )}

          {hasStations && (
            <Input
              aria-label="جستجوی دستگاه"
              placeholder="جستجوی نام دستگاه"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          {showSkeleton && (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          )}

          {stationsError && (
            <ErrorState
              title="بارگذاری دستگاه‌ها انجام نشد"
              description={stationsError}
              onRetry={retryStations}
            />
          )}

          {stations && !stationsError && stations.length === 0 && (
            <EmptyState
              title="هنوز دستگاهی ثبت نشده"
              description="با افزودن اولین دستگاه، گیمنت شما برای رزرو آنلاین آماده می‌شود."
            />
          )}

          {hasStations && !stationsError && visibleStations.length === 0 && (
            <EmptyState
              title="دستگاهی پیدا نشد"
              description="فیلتر یا عبارت جستجو را تغییر دهید."
              actionLabel={hasFilter ? "حذف فیلتر" : undefined}
              onAction={hasFilter ? clearFilters : undefined}
            />
          )}

          {visibleStations.length > 0 && !stationsError && (
            <StationsTable
              stations={visibleStations}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          )}
        </section>

        {/* ===== بازی‌های گیمنت ===== */}
        {centerId && <GamesSection centerId={centerId} onNotify={setToast} />}
      </main>

      {addOpen && centerId && (
        <AddStationModal
          centerId={centerId}
          catalogDevices={catalogDevices}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onRetryCatalog={() => {
            setCatalogLoading(true);
            setCatalogReload((v) => v + 1);
          }}
          initialMode={selectedGroup && !selectedGroup.catalogId ? "custom" : "catalog"}
          initialCatalogId={selectedGroup?.catalogId ?? undefined}
          initialStationType={selectedGroup?.deviceType}
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
          onChanged={refresh}
        />
      )}

      {editing && centerId && (
        <EditStationModal
          centerId={centerId}
          station={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && centerId && (
        <DeleteStationModal
          centerId={centerId}
          station={deleting}
          onClose={() => setDeleting(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}