import { formatPrice, toPersianDigits } from "@/lib/format";

export function formatDiscountBadge(
  valueType: "PERCENTAGE" | "FIXED_AMOUNT",
  value: number
): string {
  if (valueType === "PERCENTAGE") {
    return `${toPersianDigits(value)}٪ تخفیف`;
  }
  return `${formatPrice(value)} تومان تخفیف`;
}
