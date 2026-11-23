"use client";

import React from "react";
import Link from "next/link";
import {
  mapCatalogDeviceToCategory,
  type DeviceCategory,
} from "@/lib/deviceCategories";

export { mapCatalogDeviceToCategory, type DeviceCategory };

interface DeviceCategoriesProps {
  categories?: DeviceCategory[];
  isLoading?: boolean;
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
}

const imageMap: Record<NonNullable<DeviceCategory["iconType"]>, string> = {
  ps5: "/img/ps5.png",
  ps4: "/img/ps4.png",
  pc: "/img/pc.png",
  xbox: "/img/xbox.png",
  vr: "/img/vr.png",
  billiards: "/img/bilyard.png",
  steering: "/img/Racing-Wheel.png",
};

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
      width={112}
      height={112}
      sizes="112px"
      className="h-full w-full object-contain drop-shadow-xl"
      objectFit="contain"
    />
  );
};

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = [],
  isLoading = false,
  selectedCategoryId,
  onSelectCategory,
}) => {
  if (!isLoading && categories.length === 0) return null;
  const displayList = categories;

  return (
    <section
      dir="rtl"
      aria-label="دسته‌بندی دستگاه‌ها"
      className="w-full min-w-0"
    >
      <div className="mb-6 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
        <h2 className="text-base font-bold text-[var(--text-white)]">
          دسته‌بندی دستگاه‌ها
        </h2>
      </div>

      {isLoading ? (
        <div aria-busy="true">
          <span className="sr-only">در حال بارگذاری</span>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="relative mt-7 flex min-w-0 flex-col items-center justify-end overflow-visible rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] min-h-[100px] px-1 pb-3 pt-10"
              >
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 h-[68px] w-[68px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden sm:-top-9 sm:h-[80px] sm:w-[80px] lg:-top-10 lg:h-[88px] lg:w-[88px]">
                  <div className="h-full w-full animate-pulse bg-[var(--foreground)]/60" />
                </div>
                <div className="mt-2 flex h-5 w-full items-center justify-center">
                  <div className="h-3.5 w-14 sm:w-16 animate-pulse rounded-child bg-[var(--foreground)]/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-7">
          {displayList.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const href = `/gamecenters?category=${encodeURIComponent(cat.id)}`;

            return (
              <Link
                key={cat.id}
                href={href}
                onClick={(e) => {
                  if (onSelectCategory) {
                    e.preventDefault();
                    onSelectCategory(cat.id);
                  }
                }}
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
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
