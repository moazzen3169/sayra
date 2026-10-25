import { formatPrice, toPersianDigits } from "@/lib/format";

/**
 * فرمت نمایش نشان/بج تخفیف
 * PERCENTAGE -> «۲۵٪ تخفیف»
 * FIXED_AMOUNT -> «۵۰,۰۰۰ تومان تخفیف»
 */
export function formatDiscountBadge(
  valueType: "PERCENTAGE" | "FIXED_AMOUNT",
  value: number
): string {
  if (valueType === "PERCENTAGE") {
    return `${toPersianDigits(value)}٪ تخفیف`;
  }
  return `${formatPrice(value)} تومان تخفیف`;
}
