
import React from "react";

export interface DeviceCategory {
  id: string;
  name: string;
  subtitle?: string;
  iconType:
    | "ps5"
    | "ps4"
    | "pc"
    | "steering"
    | "vr"
    | "xbox"
    | "billiards";
  count?: number;
}

interface DeviceCategoriesProps {
  categories?: DeviceCategory[];
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

const imageMap: Record<DeviceCategory["iconType"], string> = {
  ps5: "/img/PS5.png",
  ps4: "/img/PS4.png",
  pc: "/img/pc.png",
  xbox: "/img/xbox.png",
  vr: "/img/vr.png",
  billiards: "/img/bilyard.png",
  steering: "/img/Racing-Wheel.png",
};

const CategoryIcon: React.FC<{
  iconType: DeviceCategory["iconType"];
}> = ({ iconType }) => (
  <img
    src={imageMap[iconType]}
    alt=""
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    className="h-full w-full object-contain drop-shadow-xl"
  />
);

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = defaultCategories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section
      dir="rtl"
      aria-label="دسته‌بندی دستگاه‌ها"
      className="w-full min-w-0"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
        <h2 className="text-base font-black text-[var(--text-white)]">
          دسته‌بندی دستگاه‌ها
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-7">
        {categories.map((cat) => {
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
                "transition-colors duration-300",
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
                <CategoryIcon iconType={cat.iconType} />
              </div>

              {/* فقط یک عنوان فارسی */}
              <span
                className={[
                  "relative z-20 mt-2 w-full text-center",
                  "text-[11px] font-extrabold leading-5",
                  "sm:text-xs lg:text-[13px]",
                  "whitespace-nowrap",
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
    </section>
  );
};
