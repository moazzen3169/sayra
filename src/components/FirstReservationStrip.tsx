import React from "react";
import { toPersianDigits } from "@/lib/format";

interface FirstReservationStripProps {
  discountPercent?: number;
  code?: string;
}

/** نوار تخفیف بالای تاریخچه. مقادیر پیش‌فرض طبق طرح‌اند؛ بهتر است بعداً از Backend بیایند. */
export const FirstReservationStrip: React.FC<FirstReservationStripProps> = ({
  discountPercent = 20,
  code = "#first20",
}) => (
  <div className="w-full rounded-card bg-[var(--text-white)] px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold text-[var(--bg-body)]">
    <span>{toPersianDigits(discountPercent)}٪ تخفیف برای اولین رزرو با کد</span>
    <span dir="ltr" className="rounded-full bg-[var(--bg-card)] text-[var(--text-white)] px-3 pt-1 pb-0.5">
      {code}
    </span>
  </div>
);