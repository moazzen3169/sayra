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
  PARTIALLY_PAID: "پرداخت بیعانه",
  PAID: "پرداخت شده",
  REFUNDED: "بازگشت وجه",
  OVERPAID: "پرداخت اضافی",
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

/**
 * دریافت عدد ساعت به صورت انگلیسی (مانند 12 13 14 15 16 17) بر اساس منطقه زمانی ایران
 */
export function formatSlotHourEnglish(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = clockFmt.formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  return String(Number(h));
}

/** مثال: «امروز از ساعت ۱۳ تا ۱۴» */
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
  NETWORK_ERROR: "اینترنت قطع است یا ارتباط با سرور برقرار نشد.",
  PROXY_NETWORK_ERROR: "پاسخی از سرور دریافت نشد. لطفاً چند لحظه بعد دوباره امتحان کنید.",
  INVALID_RESPONSE: "پاسخ سرور نامعتبر بود. لطفاً کمی بعد دوباره امتحان کنید.",
  UNAUTHORIZED: "برای ادامه، لطفاً وارد حسابتان شوید.",
  FORBIDDEN: "شما اجازه دسترسی به این بخش را ندارید.",
  NOT_FOUND: "موردی که دنبالش بودید پیدا نشد.",
  INVALID_TRANSITION: "در وضعیت فعلی امکان انجام این کار وجود ندارد.",
  VALIDATION_ERROR: "اطلاعات وارد شده کامل یا صحیح نیست.",
  DB_REQUEST_FAILED: "مشکلی در ذخیره اطلاعات پیش آمد. لطفاً دوباره تلاش کنید.",
  INTERNAL_ERROR: "مشکلی در سرور پیش آمده. لطفاً دقایقی دیگر دوباره امتحان کنید.",
  APP_ERROR: "خطایی پیش آمد. لطفاً دوباره تلاش کنید.",
  CONFLICT: "این درخواست با اطلاعات فعلی تداخل دارد.",
  RESERVATION_CANCEL_NOT_ALLOWED: "در وضعیت فعلی امکان لغو این رزرو وجود ندارد.",
  RESERVATION_ALREADY_CANCELLED: "این رزرو قبلاً لغو شده است.",
  RESERVATION_EXPIRED: "زمان این رزرو گذشته است.",
  PROPOSAL_NOT_PENDING: "این پیشنهاد زمان قبلاً پاسخ داده شده یا منقضی شده است.",
  SLOT_NOT_AVAILABLE: "این ساعت رزرو شده است. لطفاً ساعت دیگری انتخاب کنید.",
  RESERVATION_OVERLAP: "این زمان با رزرو دیگری هم‌پوشانی دارد. لطفاً زمان دیگری انتخاب کنید.",
  OVERLAP_CONFLICT: "این زمان پر است. لطفاً یک زمان خالی دیگر را انتخاب کنید.",
  RESERVATION_START_TIME_IN_PAST: "زمان انتخاب شده گذشته است. ساعت‌های بعدی را انتخاب کنید.",
  ONLINE_RESERVATION_DISABLED: "رزرو آنلاین این گیم‌نت در حال حاضر فعال نیست.",
  IDEMPOTENCY_REQUEST_IN_PROGRESS: "درخواست شما در حال پردازش است، لطفاً کمی صبر کنید.",
  IDEMPOTENCY_KEY_REQUIRED: "رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_INVALID_LENGTH: "رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: "ثبت رزرو با خطا روبرو شد. لطفاً دوباره امتحان کنید.",
  STATUS_TRANSITION_NOT_IMPLEMENTED: "این عملیات در حال حاضر توسط سرور پشتیبانی نمی‌شود.",
};

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 502) {
      return "خطای ارتباط با سرور (502). سرور موقتاً در دسترس نیست یا در حال بروزرسانی است.";
    }
    if (e.status === 503 || e.status === 504) {
      return "سرور پاسخگو نیست. لطفاً دقایقی بعد تلاش کنید.";
    }
    if (e.status === 404) {
      return "گیم‌نت مورد نظر پیدا نشد.";
    }
    return ERROR_MESSAGES[e.code] ?? e.message;
  }
  if (e instanceof Error && e.message) return e.message;
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
