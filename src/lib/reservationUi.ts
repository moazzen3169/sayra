import { APP_TIME_ZONE } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import type { PaymentState, ReservationStatus } from "@/types/reservation";

/* ---------- Status ---------- */

export const STATUS_UI: Record<ReservationStatus, { label: string; className: string }> = {
  PENDING: {
    label: "در انتظار تأیید",
    className: "bg-[var(--primary-muted)] text-[var(--primary)] border border-[var(--primary)]/30",
  },
  CONFIRMED: {
    label: "تأیید شده",
    className: "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30",
  },
  IN_PROGRESS: {
    label: "در حال انجام",
    className: "bg-[var(--primary)] text-on-primary border border-[var(--primary)]",
  },
  COMPLETED: {
    label: "انجام شده",
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
  return `${formatDayLabel(startIso)} از ساعت ${formatClock(startIso)} تا ${formatClock(endIso)}`;
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

const STATION_TYPE_LABELS: Record<string, string> = {
  PC: "کامپیوتر گیمینگ",
  PLAYSTATION: "پلی‌استیشن",
  XBOX: "ایکس‌باکس",
  SWITCH: "نینتندو سوییچ",
  VR: "واقعیت مجازی",
};

export const getStationTypeLabel = (type?: string) =>
  (type && STATION_TYPE_LABELS[type]) || type || "دستگاه";

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.",
  UNAUTHORIZED: "برای مشاهده این بخش ابتدا وارد حساب کاربری شوید.",
  FORBIDDEN: "شما به این بخش دسترسی ندارید.",
  NOT_FOUND: "مورد درخواستی پیدا نشد.",
  INVALID_TRANSITION: "در وضعیت فعلی رزرو، این عملیات امکان‌پذیر نیست.",
  VALIDATION_ERROR: "اطلاعات ارسال‌شده معتبر نیست.",
  CONFLICT: "تداخلی در درخواست شما وجود دارد.",
  SLOT_NOT_AVAILABLE: "این ساعت دیگر خالی نیست. لطفاً ساعت دیگری انتخاب کنید.",
  RESERVATION_OVERLAP: "این ساعت دیگر خالی نیست. لطفاً ساعت دیگری انتخاب کنید.",
  OVERLAP_CONFLICT: "این ساعت دیگر خالی نیست. لطفاً ساعت دیگری انتخاب کنید.",
  RESERVATION_START_TIME_IN_PAST: "زمان انتخاب‌شده گذشته است. لطفاً ساعت دیگری انتخاب کنید.",
  ONLINE_RESERVATION_DISABLED: "رزرو آنلاین برای این گیمنت فعال نیست.",
  IDEMPOTENCY_REQUEST_IN_PROGRESS: "درخواست قبلی شما در حال پردازش است. چند لحظه صبر کنید.",
  IDEMPOTENCY_KEY_REQUIRED: "ثبت رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_INVALID_LENGTH: "ثبت رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: "ثبت رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
};

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return ERROR_MESSAGES[e.code] ?? e.message;
  return "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
}

const SLOT_CONFLICT_CODES = new Set([
  "SLOT_NOT_AVAILABLE",
  "RESERVATION_OVERLAP",
  "OVERLAP_CONFLICT",
  "RESERVATION_START_TIME_IN_PAST",
]);

/** خطاهایی که یعنی Availability تغییر کرده و باید دوباره از Backend گرفته شود */
export const isSlotConflictError = (e: unknown): boolean =>
  e instanceof ApiError && SLOT_CONFLICT_CODES.has(e.code);