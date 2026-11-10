"use client";

import React from "react";
import type { DeviceCatalogItem } from "@/types/catalog";

export interface DeviceCategory {
  id: string;
  name: string;
  subtitle?: string;
  iconType?: "ps5" | "ps4" | "pc" | "steering" | "vr" | "xbox" | "billiards";
  imageUrl?: string | null;
  count?: number;
}

interface DeviceCategoriesProps {
  categories?: DeviceCategory[];
  isLoading?: boolean;
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
}

const defaultCategories: DeviceCategory[] = [
  { id: "ps5", name: "پلی استیشن ۵", iconType: "ps5" },
  { id: "ps4", name: "پلی استیشن ۴", iconType: "ps4" },
  { id: "pc", name: "کامپیوتر", iconType: "pc" },
  { id: "xbox", name: "ایکس باکس", iconType: "xbox" },
  { id: "vr", name: "واقعیت مجازی", iconType: "vr" },
  { id: "billiards", name: "بیلیارد", iconType: "billiards" },
  { id: "steering", name: "فرمان بازی", iconType: "steering" },
];

const imageMap: Record<NonNullable<DeviceCategory["iconType"]>, string> = {
  ps5: "/img/PS5.png",
  ps4: "/img/PS4.png",
  pc: "/img/pc.png",
  xbox: "/img/xbox.png",
  vr: "/img/vr.png",
  billiards: "/img/bilyard.png",
  steering: "/img/Racing-Wheel.png",
};

/**
 * نگاشت خودکار آیتم‌های دریافت شده از API به تصاویر و آیکون‌های متناسب
 */
export function mapCatalogDeviceToCategory(device: DeviceCatalogItem): DeviceCategory {
  const normalized = (device.name + " " + (device.deviceType || "")).toLowerCase();

  let iconType: DeviceCategory["iconType"] = "pc";
  if (normalized.includes("ps5") || normalized.includes("پلی‌استیشن ۵") || normalized.includes("پلی استیشن ۵")) {
    iconType = "ps5";
  } else if (normalized.includes("ps4") || normalized.includes("پلی‌استیشن ۴") || normalized.includes("پلی استیشن ۴")) {
    iconType = "ps4";
  } else if (normalized.includes("xbox") || normalized.includes("ایکس باکس") || device.deviceType === "XBOX") {
    iconType = "xbox";
  } else if (normalized.includes("vr") || normalized.includes("واقعیت مجازی") || device.deviceType === "VR") {
    iconType = "vr";
  } else if (normalized.includes("billiard") || normalized.includes("بیلیارد")) {
    iconType = "billiards";
  } else if (normalized.includes("wheel") || normalized.includes("steering") || normalized.includes("فرمان")) {
    iconType = "steering";
  } else if (device.deviceType === "PLAYSTATION") {
    iconType = "ps5";
  }

  return {
    id: device.id,
    name: device.name,
    iconType,
    imageUrl: device.coverImageUrl || undefined,
  };
}

import { AppImage } from "@/components/common/AppImage";

const CategoryIcon: React.FC<{
  iconType?: DeviceCategory["iconType"];
  imageUrl?: string | null;
}> = ({ iconType, imageUrl }) => {
  const fallbackSrc = iconType ? imageMap[iconType] : "/img/pc.png";

  return (
    <AppImage
      src={imageUrl || fallbackSrc}
      fallbackSrc={fallbackSrc}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-contain drop-shadow-xl"
      objectFit="contain"
    />
  );
};

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = defaultCategories,
  isLoading = false,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const displayList = categories.length > 0 ? categories : defaultCategories;

  return (
    <section
      dir="rtl"
      aria-label="دسته‌بندی دستگاه‌ها"
      className="w-full min-w-0"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
        <h2 className="text-base font-bold text-[var(--text-white)]">
          دسته‌بندی دستگاه‌ها
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-7" aria-busy="true">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className="mt-7 h-[100px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-7">
          {displayList.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(cat.id)}
                aria-pressed={isSelected}
                className={[
                  "group relative mt-7 flex min-w-0 flex-col items-center",
                  "justify-end overflow-visible rounded-2xl border",
                  "min-h-[100px] px-1 pb-3 pt-10",
                  "transition-colors duration-300 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[var(--primary)]",
                  "focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-[var(--bg-body)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-[0_0_0_1px_var(--primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.04]",
                ].join(" ")}
              >
                {/* تصویر بزرگ با بیرون‌زدگی کنترل‌شده */}
                <div
                  className={[
                    "pointer-events-none absolute -top-9 left-1/2 z-10",
                    "h-[88px] w-[88px] -translate-x-1/2",
                    "transition-transform duration-300",
                    "sm:-top-11 sm:h-[104px] sm:w-[104px]",
                    "lg:-top-12 lg:h-[112px] lg:w-[112px]",
                    isSelected
                      ? "-translate-x-1/2 -translate-y-1 scale-105"
                      : "group-hover:-translate-x-1/2 group-hover:-translate-y-1 group-hover:scale-105",
                  ].join(" ")}
                >
                  <CategoryIcon iconType={cat.iconType} imageUrl={cat.imageUrl} />
                </div>

                {/* فقط یک عنوان فارسی */}
                <span
                  className={[
                    "relative z-20 mt-2 w-full text-center",
                    "text-xs font-bold leading-5",
                    "whitespace-nowrap truncate px-1",
                    isSelected
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-white)]",
                  ].join(" ")}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
