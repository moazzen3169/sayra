"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGamingCenterStations } from "@/hooks/gaming-center/use-gaming-center-stations";
import { isAbortError } from "@/lib/api/client";
import {
  clearExtraControllersForStations,
  getExtraSelectionHourlyTotal,
  getTotalSelectedExtraCount,
  setStationExtraControllerQuantity,
  type ExtraControllerSelectionMap,
} from "@/lib/extraControllers";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import { stationApi } from "@/services/gaming-center/station.api";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type {
  PhysicalStation,
  StationExtraController,
} from "@/types/gaming-center/station.types";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { PLACEHOLDERS } from "@/lib/media";
import { cn } from "@/lib/utils";

interface DeviceSelectModalProps {
  gamingCenterSlug: string;
  category: DeviceCategory;
  /** دستگاه‌های انتخاب‌شده‌ی این دسته */
  selected: PhysicalStation[];
  onChange: (stations: PhysicalStation[]) => void;
  extraSelection: ExtraControllerSelectionMap;
  onExtraSelectionChange: (next: ExtraControllerSelectionMap) => void;
  onClose: () => void;
  onContinue?: () => void;
}

export const DeviceSelectModal: React.FC<DeviceSelectModalProps> = ({
  gamingCenterSlug,
  category,
  selected,
  onChange,
  extraSelection,
  onExtraSelectionChange,
  onClose,
  onContinue,
}) => {
  const filter = useMemo(
    () =>
      category.catalogId
        ? { catalogDeviceId: category.catalogId, limit: 100 }
        : { stationType: category.deviceType, limit: 100 },
    [category]
  );

  const { stations: rawStations, isLoading, hasFetched, error, refetch } =
    useGamingCenterStations(gamingCenterSlug, filter);

  const stations = useMemo(
    () =>
      [...rawStations].sort((a, b) =>
        a.name.localeCompare(b.name, "fa", { numeric: true })
      ),
    [rawStations]
  );

  const [extraByStation, setExtraByStation] = useState<
    Record<string, StationExtraController[]>
  >({});

  const stationIdsKey = useMemo(
    () => stations.map((s) => s.id).join(","),
    [stations]
  );

  useEffect(() => {
    if (stations.length === 0) return;
    let active = true;
    const controller = new AbortController();

    Promise.all(
      stations.map(async (st) => {
        try {
          const list = await stationApi.getStationExtraControllers(
            gamingCenterSlug,
            st.id,
            undefined,
            controller.signal
          );
          return { id: st.id, list };
        } catch (err) {
          if (isAbortError(err)) throw err;
          return {
            id: st.id,
            list: Array.isArray(st.extraControllers) ? st.extraControllers : [],
          };
        }
      })
    )
      .then((results) => {
        if (!active) return;
        const map: Record<string, StationExtraController[]> = {};
        for (const r of results) {
          map[r.id] = r.list.filter((c) => c.isActive !== false && (c.availableQuantity ?? c.quantity) > 0);
        }
        setExtraByStation(map);
      })
      .catch(() => {
        // ignore abort
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterSlug, stationIdsKey, stations]);

  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (
      hasFetched &&
      !autoSelectedRef.current &&
      stations.length === 1 &&
      selected.length === 0
    ) {
      autoSelectedRef.current = true;
      onChange([stations[0]]);
    }
  }, [hasFetched, stations, selected.length, onChange]);

  const selectedIds = selected.map((s) => s.id);
  const count = selected.length;
  const has = count > 0;
  const extraCount = getTotalSelectedExtraCount(extraSelection, selected);
  const extraHourly = getExtraSelectionHourlyTotal(extraSelection, selected);
  const hourly =
    selected.reduce((sum, s) => {
      const { finalHourlyPrice } = getEffectiveStationPricing(s);
      return sum + finalHourlyPrice;
    }, 0) + extraHourly;
  const allSelected =
    stations.length > 0 && stations.every((s) => selectedIds.includes(s.id));

  const toggle = (st: PhysicalStation) => {
    if (selectedIds.includes(st.id)) {
      onChange(selected.filter((s) => s.id !== st.id));
      onExtraSelectionChange(clearExtraControllersForStations(extraSelection, [st.id]));
    } else {
      onChange([...selected, st]);
    }
  };

  const handleExtraQtyChange = (
    st: PhysicalStation,
    ctrl: StationExtraController,
    nextQty: number
  ) => {
    if (nextQty > 0 && !selectedIds.includes(st.id)) {
      onChange([...selected, st]);
    }
    onExtraSelectionChange(
      setStationExtraControllerQuantity(extraSelection, st.id, ctrl, nextQty)
    );
  };

  const selectAll = () => {
    const rest = selected.filter((s) => !stations.some((x) => x.id === s.id));
    onChange([...rest, ...stations]);
  };

  const clearAll = () => {
    const removedIds = stations.map((s) => s.id);
    onChange(selected.filter((s) => !removedIds.includes(s.id)));
    onExtraSelectionChange(clearExtraControllersForStations(extraSelection, removedIds));
  };

  const showSkeleton = isLoading || (!hasFetched && !error);

  const headerAction =
    !showSkeleton && !error && stations.length > 1 ? (
      <button
        type="button"
        onClick={allSelected ? clearAll : selectAll}
        className="flex h-11 items-center px-2 text-xs font-bold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card cursor-pointer"
      >
        {allSelected ? "حذف انتخاب" : "انتخاب همه"}
      </button>
    ) : undefined;

  const footer = (
    <StickyActionBar
      inDialog
      info={
        has ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-card-title text-[var(--text-white)]">
              {toPersianDigits(count)} دستگاه
              {extraCount > 0 ? ` · ${toPersianDigits(extraCount)} دسته اضافی` : ""}
            </span>
            <span className="text-secondary text-[var(--primary)]">
              {formatPrice(hourly)} تومان / ساعت
            </span>
          </div>
        ) : (
          <span className="text-secondary text-[var(--text-muted)]">
            دستگاهی انتخاب نشده
          </span>
        )
      }
      actionLabel="ادامه"
      onAction={() => (onContinue ? onContinue() : onClose())}
      disabled={!has}
    />
  );

  return (
    <FullScreenDialog
      isOpen={true}
      onClose={onClose}
      title={category.name}
      headerAction={headerAction}
      footer={footer}
    >
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 py-6">
        {showSkeleton && (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            aria-busy="true"
          >
            <span className="sr-only">در حال بارگذاری</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!showSkeleton && error && (
          <ErrorState
            title="دستگاه‌ها بارگذاری نشد"
            description={error}
            onRetry={refetch}
          />
        )}

        {!showSkeleton && !error && stations.length === 0 && (
          <EmptyState title="دستگاهی در این دسته نیست" />
        )}

        {!showSkeleton && !error && stations.length > 0 && (
          <div
            role="group"
            aria-label={category.name}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {stations.map((st) => {
              const active = selectedIds.includes(st.id);
              const {
                originalHourlyPrice,
                finalHourlyPrice,
                discountPercentage,
                hasDiscount,
              } = getEffectiveStationPricing(st);
              const stationExtras = extraByStation[st.id] ?? [];

              return (
                <div
                  key={st.id}
                  className={cn(
                    "flex flex-col justify-between gap-3 rounded-card border p-3 text-right transition-colors duration-150",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(st)}
                    className="flex flex-col gap-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidd">
                      <SafeImage
                        src={st.coverImageUrl || category.coverImageUrl || ""}
                        alt={st.name}
                        fallbackSrc={PLACEHOLDERS.center}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />

                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors z-10",
                          active
                            ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                            : "border-[var(--border-color)] bg-[var(--bg-body)]/60 text-transparent"
                        )}
                      >
                        <Icon name="check" size={16} strokeWidth={2} />
                      </span>

                      {hasDiscount && (
                        <div className="absolute right-2 top-2 z-10">
                          <Badge variant="primary">
                            {discountPercentage
                              ? `${toPersianDigits(discountPercentage)}٪`
                              : "تخفیف"}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-card-title text-[var(--text-white)]">
                          {st.name}
                        </h3>
                        {st.isVip && <Badge variant="neutral">VIP</Badge>}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-1.5">
                        {hasDiscount ? (
                          <>
                            <span className="text-card-title text-[var(--primary)]">
                              {formatPrice(finalHourlyPrice)}
                            </span>
                            <span className="text-secondary text-[var(--text-muted)] line-through">
                              {formatPrice(originalHourlyPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-card-title text-[var(--text-white)]">
                            {formatPrice(finalHourlyPrice)}
                          </span>
                        )}
                        <span className="text-secondary text-[var(--text-muted)]">
                          تومان / ساعت
                        </span>
                      </div>

                      {st.minRentHours > 1 && (
                        <span className="text-secondary text-[var(--text-muted)]">
                          حداقل {toPersianDigits(st.minRentHours)} ساعت
                        </span>
                      )}
                    </div>
                  </button>

                  {stationExtras.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        دسته اضافی
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {stationExtras.map((ctrl) => {
                          const selectedQty =
                            extraSelection[st.id]?.[ctrl.id]?.quantity ?? 0;
                          const maxAvail = Math.max(
                            0,
                            ctrl.availableQuantity ?? ctrl.quantity ?? 0
                          );
                          const isSelected = selectedQty > 0;
                          return (
                            <div
                              key={ctrl.id}
                              className={cn(
                                "flex flex-col gap-1.5 rounded-child border p-2 transition-colors",
                                isSelected
                                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/5"
                                  : "border-[var(--border-subtle)] bg-[var(--bg-body)]/50"
                              )}
                            >
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <span className="truncate text-xs font-bold text-[var(--text-white)]">
                                  {ctrl.controllerType}
                                </span>
                                {maxAvail === 0 && (
                                  <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
                                    ناموجود
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {formatPrice(ctrl.hourlyPrice)} تومان/ساعت
                              </span>
                              {maxAvail > 0 && (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 p-0.5">
                                  <button
                                    type="button"
                                    disabled={selectedQty <= 0}
                                    aria-label={`کاهش ${ctrl.controllerType}`}
                                    onClick={() =>
                                      handleExtraQtyChange(st, ctrl, selectedQty - 1)
                                    }
                                    className="flex h-7 w-8 items-center justify-center rounded-md bg-[var(--foreground)]/40 text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/70 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <Icon name="minus" size={14} />
                                  </button>
                                  <span
                                    className={cn(
                                      "min-w-5 text-center text-xs font-bold",
                                      isSelected
                                        ? "text-[var(--primary)]"
                                        : "text-[var(--text-muted)]"
                                    )}
                                  >
                                    {toPersianDigits(selectedQty)}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={selectedQty >= maxAvail}
                                    aria-label={`افزایش ${ctrl.controllerType}`}
                                    onClick={() =>
                                      handleExtraQtyChange(st, ctrl, selectedQty + 1)
                                    }
                                    className="flex h-7 w-8 items-center justify-center rounded-md bg-[var(--foreground)]/40 text-[var(--text-white)] transition-colors hover:bg-[var(--foreground)]/70 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <Icon name="plus" size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FullScreenDialog>
  );
};
