import { APP_TIME_ZONE } from "@/lib/api/config";
import { toPersianDigits } from "@/lib/format";
import type { BlogSort } from "@/types/blog";

export const BLOG_SORT_OPTIONS: { id: BlogSort; label: string }[] = [
  { id: "newest", label: "جدیدترین" },
  { id: "oldest", label: "قدیمی‌ترین" },
  { id: "popular", label: "پربازدیدترین" },
  { id: "shortest", label: "کوتاه‌ترین زمان مطالعه" },
];

export const DEFAULT_BLOG_SORT: BlogSort = "newest";

export function parseBlogSort(value: string | null | undefined): BlogSort {
  return BLOG_SORT_OPTIONS.some((o) => o.id === value)
    ? (value as BlogSort)
    : DEFAULT_BLOG_SORT;
}

export const getBlogSortLabel = (sort: BlogSort): string =>
  BLOG_SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "";

const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** مثال: «۲ آبان ۱۴۰۵» */
export function formatBlogDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** مثال: «۵ دقیقه» */
export const formatReadingMinutes = (minutes: number): string =>
  `${toPersianDigits(minutes)} دقیقه`;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** نرمال‌سازی متن برای جستجو: حروف عربی، نیم‌فاصله و ارقام فارسی/عربی */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}