import React from "react";

export interface DeviceCategory {
  id: string;
  name: string;
  subtitle?: string;
  iconType: "ps5" | "ps4" | "pc" | "steering" | "vr" | "xbox" | "billiards";
  count?: number;
}

interface DeviceCategoriesProps {
  categories?: DeviceCategory[];
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
}

const defaultCategories: DeviceCategory[] = [
  {
    id: "ps5",
    name: "پلی استیشن ۵",
    subtitle: "PS5",
    iconType: "ps5",
  },
  {
    id: "ps4",
    name: "پلی استیشن ۴",
    subtitle: "PS4",
    iconType: "ps4",
  },
  {
    id: "pc",
    name: "کامپیوتر",
    subtitle: "PC Gaming",
    iconType: "pc",
  },
  {
    id: "xbox",
    name: "ایکس باکس",
    subtitle: "Xbox Series",
    iconType: "xbox",
  },
  {
    id: "vr",
    name: "واقعیت مجازی",
    subtitle: "VR",
    iconType: "vr",
  },
  {
    id: "billiards",
    name: "بیلیارد",
    subtitle: "Billiards",
    iconType: "billiards",
  },
  {
    id: "steering",
    name: "فرمان بازی",
    subtitle: "Racing Wheel",
    iconType: "steering",
  },
];

const imageMap: Record<string, string> = {
  ps5: "/img/PS5.webp",
  ps4: "/img/PS4.webp",
  pc: "/img/pc.webp",
  xbox: "/img/xbox.webp",
};

const CategoryIcon: React.FC<{ iconType: DeviceCategory["iconType"] }> = ({ iconType }) => {
  if (imageMap[iconType]) {
    return (
      <img
        src={imageMap[iconType]}
        alt=""
        className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0"
      />
    );
  }

  switch (iconType) {
    case "vr":
      return (
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--primary)] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-3a1 1 0 01-.8-.4l-1.4-1.86a1 1 0 00-.8-.34h-2a1 1 0 00-.8.34L8.8 16.6a1 1 0 01-.8.4H5a2 2 0 01-2-2V9z"
          />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
        </svg>
      );
    case "billiards":
      return (
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--primary)] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.25" />
          <text
            x="12"
            y="14"
            textAnchor="middle"
            fontSize="7"
            fontWeight="900"
            fill="currentColor"
            stroke="none"
          >
            8
          </text>
        </svg>
      );
    case "steering":
      return (
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--primary)] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path
            strokeLinecap="round"
            d="M12 3v6M3 12h6M15 12h6M6.34 17.66l4.24-4.24M17.66 17.66l-4.24-4.24"
          />
        </svg>
      );
    default:
      return null;
  }
};

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = defaultCategories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section dir="rtl" className="w-full">
      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {categories.map((cat, index) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.id)}
              aria-pressed={isSelected}
              className={[
                "flex flex-col items-center justify-center p-2.5 rounded-card transition-all duration-200 min-h-[84px] sm:min-h-[96px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white border",
                isSelected
                  ? "bg-[var(--primary)]/15 border-[var(--primary)] shadow-md text-[var(--primary)]"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--text-white)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 mb-1 shrink-0">
                <CategoryIcon iconType={cat.iconType} />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-center line-clamp-1">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
