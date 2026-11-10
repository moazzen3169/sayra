import React from "react";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import type { buildStationGroups } from "@/lib/ownerStations";
import { stationImageFor } from "@/lib/reservationUi";
import { cn } from "@/lib/utils";

export type StationGroup = ReturnType<typeof buildStationGroups>[number];

interface StationCategoryGridProps {
  groups: StationGroup[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

/** کارت دسته‌های دستگاه؛ هم‌شکل کارت‌های «انتخاب دستگاه» در صفحه‌ی عمومی گیمنت */
export const StationCategoryGrid: React.FC<StationCategoryGridProps> = ({
  groups,
  selectedKey,
  onSelect,
}) => (
  <div role="group" aria-label="دسته‌های دستگاه" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {groups.map((g) => {
      const active = selectedKey === g.key;
      return (
        <button
          key={g.key}
          type="button"
          aria-pressed={active}
          onClick={() => onSelect(active ? null : g.key)}
          className={cn(
            "flex flex-col gap-3 rounded-card border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            active
              ? "border-[var(--primary)] bg-[var(--primary-muted)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
          )}
        >
          <span className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-[var(--foreground)]/40">
            <SafeImage
              src={g.coverImageUrl || stationImageFor(g.deviceType)}
              alt=""
              fallbackSrc={PLACEHOLDERS.center}
              loading="lazy"
              draggable={false}
              className="h-full w-full object-contain p-3"
            />
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-on-primary"
              >
                <Icon name="check" size={16} />
              </span>
            )}
          </span>

          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-bold text-[var(--text-white)]">{g.name}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {toPersianDigits(g.count)} دستگاه
            </span>
          </span>
        </button>
      );
    })}
  </div>
);