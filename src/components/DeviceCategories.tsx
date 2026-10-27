import React from "react";

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
  {
    id: "pc",
    name: "کامپیوتر",
    subtitle: "PC Gaming",
    iconType: "pc",
  },
  {
    id: "ps5",
    name: "پلی استیشن ۵",
    subtitle: "PS5",
    iconType: "ps5",
  },
  {
    id: "xbox",
    name: "ایکس باکس",
    subtitle: "Xbox Series",
    iconType: "xbox",
  },
];

const imageMap: Record<DeviceCategory["iconType"], string> = {
  ps5: "./img/cat-3.webp",
  ps4: "./img/cat-3.webp",
  pc: "./img/cat-1.webp",
  xbox: "./img/cat-2.webp",
  steering: "./img/PS5.webp",
  vr: "./img/PS5.webp",
};

const cardStyles: Record<string, { background: string; position: string }> = {
  pc: {
    background: "bg-[#ffff3d] ",
    position: "col-start-1 row-span-2 lg:col-start-auto lg:row-start-auto lg:row-span-1 lg:col-span-1",
  },
  ps5: {
    background: "bg-[#2f77b1] text-[#fff]",
    position: "col-start-2 row-start-1 lg:col-start-auto lg:row-start-auto lg:row-span-1 lg:col-span-1",
  },
  xbox: {
    background: "bg-[#0e7a0d] text-[#313131]",
    position: "col-start-2 row-start-2 lg:col-start-auto lg:row-start-auto lg:row-span-1 lg:col-span-1",
  },
};

export const DeviceCategories: React.FC<DeviceCategoriesProps> = ({
  categories = defaultCategories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <section dir="rtl" className="w-full">
      <div
        dir="ltr"
        className="grid grid-cols-2 grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 gap-2 h-[184px] sm:h-[210px] lg:h-[200px]"
      >
        {categories
          .filter((cat) => ["pc", "ps5", "xbox"].includes(cat.id))
          .map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const style = cardStyles[cat.id];
            const isPC = cat.id === "pc";

            if (!style) return null;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(cat.id)}
                aria-pressed={isSelected}
                className={[
                  "relative min-w-0 min-h-0 overflow-hidden",
                  "rounded-card border-2 transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-white",
                  style.position,
                  style.background,
                  isSelected
                    ? "border-transparent shadow-lg scale-[0.98]"
                    : "border-transparent hover:brightness-95",
                ].join(" ")}
              >
                {isPC ? (
                  <div
                    dir="rtl"
                    className="flex h-full flex-col items-center justify-between py-2"
                  >
                    <img
                      src={imageMap[cat.iconType]}
                      alt={cat.name}
                      className="  h-[72%] w-[88%] object-contain"
                    />

                    <span className="text-sm sm:text-base font-bold text-[#151515]">
                      {cat.name}
                    </span>
                  </div>
                ) : (
                  <div
                    dir="rtl"
                    className="flex h-full items-center justify-between gap-1 px-2 lg:flex-col lg:justify-between lg:py-2.5 lg:items-center"
                    >
                    <img
                      src={imageMap[cat.iconType]}
                      alt={cat.name}
                      className="  h-[85%] w-[38%] shrink-0 object-contain lg:h-[72%] lg:w-[88%]"
                    />
                    <span className="flex-1  text-center text-xs sm:text-sm font-black text-[#fff] lg:flex-none lg:text-sm">
                      {cat.name}
                    </span>

                  </div>
                )}
              </button>
            );
          })}
      </div>
    </section>
  );
};
