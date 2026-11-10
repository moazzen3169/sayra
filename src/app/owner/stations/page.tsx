"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { GamesSection } from "@/components/owner/stations/GamesSection";
import { StationCategoryGrid } from "@/components/owner/stations/StationCategoryGrid";
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
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import {
  buildStationGroups,
  stationGroupKey,
  stationTypeLabel,
} from "@/lib/ownerStations";
import { getErrorMessage } from "@/lib/reservationUi";
import { catalogService } from "@/services/catalogService";
import { normalizeFilterText } from "@/services/gamecentersPageService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import { ownerService } from "@/services/ownerService";
import type { DeviceCatalogItem } from "@/types/catalog";

export default function OwnerStationsPage() {
  // گیمنت از روی توکن کاربر توسط OwnerContext تشخیص داده می‌شود
  const { centerId, center, isCenterLoading, verificationStatus } = useOwner();
  const canEdit = verificationStatus === "APPROVED";

  // داده‌ها
  const [stations, setStations] = useState<GameStationInfo[] | null>(null);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);

  // رابط
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const tableRef = useRef<HTMLElement>(null);

  // مودال‌ها (هر لحظه فقط یکی)
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GameStationInfo | null>(null);
  const [deleting, setDeleting] = useState<GameStationInfo | null>(null);

  // دستگاه‌های گیمنت: GET /gamingCenters/{id}/stations
  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();
    let active = true;

    ownerService
      .listStations(centerId, controller.signal)
      .then((data: any) => {
        if (!active) return;
        let stationList: GameStationInfo[] = [];
        if (Array.isArray(data)) {
          stationList = data;
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.data)) stationList = data.data;
          else if (data.data && typeof data.data === "object" && Array.isArray(data.data.data)) {
            stationList = data.data.data;
          } else if (Array.isArray(data.stations)) {
            stationList = data.stations;
          } else if (Array.isArray(data.items)) {
            stationList = data.items;
          }
        }
        setStations(stationList);
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

  // کاتالوگ: برای نام و تصویر دسته‌ها و گزینه‌های افزودن
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

  // با انتخاب دسته، صفحه به جدول می‌رود (برای موبایل)
  useEffect(() => {
    if (selectedKey) {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedKey]);

  const groups = useMemo(
    () => buildStationGroups(stations ?? [], catalogDevices),
    [stations, catalogDevices]
  );
  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === selectedKey) ?? null,
    [groups, selectedKey]
  );

  const groupStations = useMemo(
    () =>
      selectedGroup
        ? (stations ?? []).filter((s) => stationGroupKey(s) === selectedGroup.key)
        : [],
    [stations, selectedGroup]
  );

  const visibleStations = useMemo(() => {
    const q = normalizeFilterText(search);
    if (!q) return groupStations;
    return groupStations.filter((s) =>
      normalizeFilterText(`${s.name} ${stationTypeLabel(s.stationType)}`).includes(q)
    );
  }, [groupStations, search]);

  const refresh = useCallback(() => setReload((v) => v + 1), []);

  const retryCatalog = () => {
    setCatalogLoading(true);
    setCatalogReload((v) => v + 1);
  };

  const retryStations = () => {
    setStations(null);
    setStationsError(null);
    refresh();
  };

  const handleSelect = (key: string | null) => {
    setSelectedKey(key);
    setSearch("");
  };

  const handleSaved = (message: string) => {
    setAddOpen(false);
    setEditing(null);
    setDeleting(null);
    setToast(message);
    refresh();
  };

  if (!centerId && !isCenterLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
        <OwnerPageHeader title="دستگاه‌ها" backUrl="/owner" />
        <main className="mt-16 flex-1 px-4 py-8">
          <EmptyState
            title="گیمنتی پیدا نشد"
            description="ابتدا گیمنت خود را ثبت کنید، سپس دستگاه‌ها را مدیریت کنید."
          />
        </main>
      </div>
    );
  }

  const showSkeleton = stations === null && !stationsError;
  const hasStations = (stations?.length ?? 0) > 0 && !stationsError;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-12 text-[var(--text-white)]">
      <OwnerPageHeader title="دستگاه‌ها" backUrl="/owner" />

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
        {/* ===== مرحله ۱: دسته‌های دستگاه ===== */}
        <section className="flex flex-col gap-4">
          <SectionTitle
            title="دسته‌های دستگاه"
            subtitle={center?.name ? `دستگاه‌های ${center.name}` : undefined}
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

          {catalogError && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-muted)]">
              <span>نام و تصویر بعضی دسته‌ها بارگذاری نشد.</span>
              <button
                type="button"
                onClick={retryCatalog}
                className="h-11 shrink-0 px-2 font-bold text-[var(--primary)] underline"
              >
                تلاش دوباره
              </button>
            </div>
          )}

          {showSkeleton && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
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

          {hasStations && (
            <StationCategoryGrid
              groups={groups}
              selectedKey={selectedGroup?.key ?? null}
              onSelect={handleSelect}
            />
          )}
        </section>

        {/* ===== مرحله ۲: جدول دستگاه‌های دسته‌ی انتخاب‌شده ===== */}
        {hasStations && (
          <section ref={tableRef} className="flex scroll-mt-20 flex-col gap-4">
            {selectedGroup ? (
              <>
                <SectionTitle
                  title={`دستگاه‌های «${selectedGroup.name}»`}
                  subtitle={`${toPersianDigits(groupStations.length)} دستگاه`}
                  action={
                    <Button variant="ghost" onClick={() => handleSelect(null)}>
                      بستن جدول
                    </Button>
                  }
                />

                {groupStations.length > 5 && (
                  <Input
                    aria-label="جستجوی دستگاه"
                    placeholder="جستجوی نام دستگاه"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                )}

                {visibleStations.length === 0 ? (
                  <EmptyState
                    title="دستگاهی پیدا نشد"
                    description="عبارت جستجو را تغییر دهید."
                    actionLabel={search ? "پاک کردن جستجو" : undefined}
                    onAction={search ? () => setSearch("") : undefined}
                  />
                ) : (
                  <StationsTable
                    stations={visibleStations}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                )}
              </>
            ) : (
              <p className="rounded-card border border-dashed border-[var(--border-color)] p-6 text-center text-xs leading-6 text-[var(--text-muted)]">
                یکی از دسته‌های بالا را انتخاب کنید تا دستگاه‌های آن نمایش داده شود.
              </p>
            )}
          </section>
        )}

        {/* ===== مرحله ۳: کاتالوگ و جدول بازی‌های گیم‌نت ===== */}
        {centerId && (
          <GamesSection
            centerId={centerId}
            canEdit={canEdit}
            onNotify={(msg) => setToast(msg)}
          />
        )}
      </main>

      {addOpen && centerId && (
        <AddStationModal
          centerId={centerId}
          catalogDevices={catalogDevices}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onRetryCatalog={retryCatalog}
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