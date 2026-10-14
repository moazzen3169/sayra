import { APP_TIME_ZONE } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import type { PaymentState, ReservationStatus } from "@/types/reservation";

/* ---------- Status ---------- */

export const STATUS_UI: Record<ReservationStatus, { label: string; className: string }> = {
  PENDING: {
    label: "درحال انتظار",
    className: "bg-[var(--primary-muted)] text-[var(--primary)] border border-[var(--primary)]/30",
  },
  CONFIRMED: {
    label: "تایید شد!",
    className: "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30",
  },
  IN_PROGRESS: {
    label: "درحال انجام",
    className: "bg-[var(--primary)] text-[#101014] border border-[var(--primary)]",
  },
  COMPLETED: {
    label: "تکمیل شده!",
    className: "bg-[var(--foreground)] text-[var(--text-white)] border border-[var(--border-color)]",
  },
  CANCELED: {
    label: "لغو شده",
    className: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30",
  },
  NO_SHOW: {
    label: "عدم حضور",
    className: "bg-[var(--foreground)] text-[var(--accent-red)] border border-[var(--border-color)]",
  },
};

export function getStatusUi(status: string) {
  return (
    STATUS_UI[status as ReservationStatus] ?? {
      label: status,
      className: "bg-[var(--foreground)] text-[var(--text-white)] border border-[var(--border-color)]",
    }
  );
}

const PAYMENT_LABELS: Record<PaymentState, string> = {
  UNPAID: "پرداخت نشده",
  PENDING: "در انتظار پرداخت",
  PARTIALLY_PAID: "پرداخت ناقص",
  PAID: "پرداخت شده",
  REFUNDED: "بازگشت وجه",
  OVERPAID: "پرداخت بیش از مبلغ",
  FAILED: "پرداخت ناموفق",
  CANCELED: "لغو شده",
};

export const getPaymentLabel = (state: string) => PAYMENT_LABELS[state as PaymentState] ?? state;

/* ---------- Date / Time (Timezone-aware) ---------- */

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const clockFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const jalaliFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const keyToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Math.round(
    (keyToUtc(dayKeyFmt.format(d)) - keyToUtc(dayKeyFmt.format(new Date()))) / 86_400_000
  );
  if (diff === 0) return "امروز";
  if (diff === 1) return "فردا";
  if (diff === -1) return "دیروز";
  return jalaliFmt.format(d);
}

export function formatClock(iso: string, alwaysMinutes = false): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = clockFmt.formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  if (!alwaysMinutes && m === "00") return toPersianDigits(Number(h));
  return toPersianDigits(`${h}:${m}`);
}

/** مثال: «امروز از ساعت ۱۳ الی ۱۴» */
export function formatReservationWhen(startIso: string, endIso: string): string {
  return `${formatDayLabel(startIso)} از ساعت ${formatClock(startIso)} الی ${formatClock(endIso)}`;
}

/* ---------- Misc ---------- */

export function stationImageFor(stationType?: string): string {
  switch (stationType) {
    case "PLAYSTATION":
      return "/img/PS5.webp";
    case "XBOX":
      return "/img/xbox.webp";
    default:
      return "/img/pc.webp";
  }
}

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.",
  UNAUTHORIZED: "برای مشاهده این بخش ابتدا وارد حساب کاربری شوید.",
  FORBIDDEN: "شما به این بخش دسترسی ندارید.",
  NOT_FOUND: "رزرو موردنظر پیدا نشد.",
  INVALID_TRANSITION: "در وضعیت فعلی رزرو، این عملیات امکان‌پذیر نیست.",
  VALIDATION_ERROR: "اطلاعات ارسال‌شده معتبر نیست.",
  CONFLICT: "تداخلی در درخواست شما وجود دارد.",
};

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return ERROR_MESSAGES[e.code] ?? e.message;
  return "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
}