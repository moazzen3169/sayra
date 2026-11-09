import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { getStationPrice, stationTypeLabel } from "@/lib/ownerStations";
import type { GameStationInfo } from "@/services/gamingCenterService";

interface StationsTableProps {
  stations: GameStationInfo[];
  onEdit: (station: GameStationInfo) => void;
  onDelete: (station: GameStationInfo) => void;
}

const iconBtn =
  "flex h-11 w-11 items-center justify-center rounded-card text-[var(--text-muted)] transition-colors hover:bg-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <Badge variant={active ? "success" : "neutral"}>{active ? "فعال" : "غیرفعال"}</Badge>
);

export const StationsTable: React.FC<StationsTableProps> = ({ stations, onEdit, onDelete }) => (
  <div className="overflow-x-auto rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]">
    <table className="w-full text-right text-sm">
      <thead className="bg-[var(--foreground)]/20 text-xs text-[var(--text-muted)]">
        <tr>
          <th scope="col" className="px-4 py-3 font-bold">نام دستگاه</th>
          <th scope="col" className="hidden px-4 py-3 font-bold md:table-cell">نوع</th>
          <th scope="col" className="hidden px-4 py-3 font-bold md:table-cell">وضعیت</th>
          <th scope="col" className="px-4 py-3 font-bold">قیمت ساعتی</th>
          <th scope="col" className="w-24 px-2 py-3">
            <span className="sr-only">عملیات</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-subtle)]">
        {stations.map((s) => {
          const active = s.isActive !== false;
          const price = getStationPrice(s);
          return (
            <tr key={s.id} className="transition-colors hover:bg-[var(--foreground)]/10">
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-white)]">{s.name}</span>
                    {s.isVip && <Badge variant="neutral">VIP</Badge>}
                  </div>
                  {/* در موبایل نوع و وضعیت زیر نام نمایش داده می‌شود */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] md:hidden">
                    <span>{stationTypeLabel(s.stationType)}</span>
                    <StatusBadge active={active} />
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-xs text-[var(--text-muted)] md:table-cell">
                {stationTypeLabel(s.stationType)}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <StatusBadge active={active} />
              </td>
              <td className="px-4 py-3">
                {price === null ? (
                  <span className="text-xs text-[var(--text-muted)]">ثبت نشده</span>
                ) : (
                  <span className="font-bold text-[var(--text-white)]">
                    {formatPrice(price)}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">تومان</span>
                  </span>
                )}
              </td>
              <td className="px-2 py-1">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(s)}
                    aria-label={`ویرایش ${s.name}`}
                    className={`${iconBtn} hover:text-[var(--text-white)]`}
                  >
                    <Icon name="edit" size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    aria-label={`حذف ${s.name}`}
                    className={`${iconBtn} hover:text-[var(--accent-red)]`}
                  >
                    <Icon name="trash" size={20} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);