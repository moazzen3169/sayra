import React from "react";
import { toPersianDigits } from "@/lib/format";

export interface DeviceCategory {
  id: string;
  name: string;
  subtitle?: string;
  iconType: "ps5" | "ps4" | "pc" | "steering" | "vr" | "xbox";
  count?: number;
}

interface DeviceCategoriesProps {
  categories?: DeviceCategory[];
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
}

const defaultCategories: DeviceCategory[] = [
  { id: "ps5", name: "پلی‌استیشن ۵", subtitle: "PS5", iconType: "ps5", count: 42 },
  { id: "pc", name: "پی‌سی گیمینگ", subtitle: "PC Gaming", iconType: "pc", count: 28 },
  { id: "steering", name: "فرمان بازی", subtitle: "Driving Simulator", iconType: "steering", count: 15 },
  { id: "ps4", name: "پلی‌استیشن ۴", subtitle: "PS4", iconType: "ps4", count: 35 },
  { id: "vr", name: "واقعیت مجازی", subtitle: "VR Headset", iconType: "vr", count: 12 },
  { id: "xbox", name: "ایکس‌باکس", subtitle: "Xbox Series", iconType: "xbox", count: 18 },
];

const CategoryIcon: React.FC<{ type: DeviceCategory["iconType"]; className?: string }> = ({
  type,
  className = "w-6 h-6",
}) => {
  switch (type) {
    case "ps5":
    case "ps4":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v14M9 5v14M4 8h16a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
        </svg>
      );
    case "pc":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "steering":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 3v6m-9 3h6m6 0h6m-3.5 6L14 14" />
        </svg>
      );
    case "vr":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16a2 2 0 012 2v4a2 2 0 01-2 2h-4l-2 2-2-2H4a2 2 0 01-2-2v-4a2 2 0 012-2z" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
        </svg>
      );
    case "xbox":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l8 8M16 8l-8 8" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
        </svg>
      );
  }
};

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = defaultCategories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-base text-[var(--text-white)]">انواع دستگاه و پلتفرم‌ها</h2>
        <span className="text-xs text-[var(--text-muted)]">انتخاب بر اساس کنسول</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.id)}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-card border transition-all text-center ${
                isSelected
                  ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-color)] text-[var(--text-white)]"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-[var(--primary)] text-[#101014]"
                    : "bg-[var(--foreground)]/50 text-[var(--text-white)]"
                }`}
              >
                <CategoryIcon type={cat.iconType} className="w-6 h-6" />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-bold line-clamp-1">{cat.name}</span>
                {cat.count !== undefined && (
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {toPersianDigits(cat.count)} گیمنت
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
