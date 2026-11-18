import { APP_TIME_ZONE } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import type { PaymentState, ReservationStatus } from "@/types/reservation";
import type { PublicGamingCenter } from "@/types/customerApi";

export const RESERVATION_DISABLED_MESSAGE =
  "رزرو آنلاین این گیمنت فعال نیست.";

export function isCenterReservationDisabled(center?: PublicGamingCenter | null): boolean {
  if (!center) return false;
  return (
    center.isActive === false ||
    center.allowOnlineBooking === false ||
    center.onlineReservationEnabled === false ||
    center.isReservationEnabled === false ||
    center.reservationEnabled === false ||
    center.bookingEnabled === false ||
    center.settings?.allowOnlineBooking === false ||
    center.settings?.onlineReservationEnabled === false
  );
}

/* ---------- Status ---------- */

export const STATUS_UI: Record<ReservationStatus, { label: string; className: string }> = {
  PENDING: {
    label: "در انتظار تأیید",
    className: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30",
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
      return "/img/ps5.png";
    case "XBOX":
      return "/img/xbox.png";
    default:
      return "/img/pc.png";
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
  NETWORK_ERROR: "اتصال برقرار نشد. اینترنت را بررسی کنید.",
  PROXY_NETWORK_ERROR: "اتصال برقرار نشد. اینترنت را بررسی کنید.",
  INVALID_RESPONSE: "مشکلی پیش آمد. دوباره تلاش کنید.",
  UNAUTHORIZED: "برای ادامه وارد شوید.",
  FORBIDDEN: "به این بخش دسترسی ندارید.",
  NOT_FOUND: "موردی که دنبالش هستید پیدا نشد.",
  INVALID_TRANSITION: "در وضعیت فعلی رزرو این کار ممکن نیست.",
  VALIDATION_ERROR: "اطلاعات واردشده درست نیست.",
  DB_REQUEST_FAILED: "مشکلی پیش آمد. دوباره تلاش کنید.",
  INTERNAL_ERROR: "مشکلی پیش آمد. دوباره تلاش کنید.",
  APP_ERROR: "مشکلی پیش آمد. دوباره تلاش کنید.",
  CONFLICT: "این درخواست با اطلاعات فعلی تداخل دارد.",
  RESERVATION_CANCEL_NOT_ALLOWED: "در وضعیت فعلی رزرو این کار ممکن نیست.",
  RESERVATION_ALREADY_CANCELLED: "این رزرو قبلاً لغو شده است.",
  RESERVATION_EXPIRED: "این ساعت گذشته است.",
  PROPOSAL_NOT_PENDING: "این پیشنهاد زمان قبلاً پاسخ داده شده یا منقضی شده است.",
  SLOT_NOT_AVAILABLE: "این ساعت دیگر خالی نیست. ساعت دیگری انتخاب کنید.",
  RESERVATION_OVERLAP: "این ساعت دیگر خالی نیست. ساعت دیگری انتخاب کنید.",
  OVERLAP_CONFLICT: "این ساعت دیگر خالی نیست. ساعت دیگری انتخاب کنید.",
  RESERVATION_START_TIME_IN_PAST: "این ساعت گذشته است.",
  LEAD_TIME_TOO_SHORT:
    "رزرو باید حداقل ۱۵ دقیقه پیش از زمان شروع انتخاب‌شده ثبت شود. لطفاً ساعتی با فاصله بیشتر (حداقل ۱۵ دقیقه بعد از الان) انتخاب کنید.",
  ONLINE_RESERVATION_DISABLED: "رزرو آنلاین این گیم‌نت در حال حاضر فعال نیست.",
  IDEMPOTENCY_REQUEST_IN_PROGRESS: "درخواست شما در حال پردازش است، لطفاً کمی صبر کنید.",
  IDEMPOTENCY_KEY_REQUIRED: "رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_INVALID_LENGTH: "رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: "ثبت رزرو با خطا روبرو شد. لطفاً دوباره امتحان کنید.",
  STATUS_TRANSITION_NOT_IMPLEMENTED: "این عملیات در حال حاضر توسط سرور پشتیبانی نمی‌شود.",
};

const GENERIC_NOT_FOUND = "مورد درخواستی پیدا نشد. اگر این خطا تکرار شد با پشتیبانی تماس بگیرید.";
const OTP_REJECTED = "کد تأیید نادرست است یا منقضی شده. کد جدید دریافت کنید.";
const GENERIC_ERROR = "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";

/** در محیط توسعه، کد و پیام خام سرور برای عیب‌یابی به متن اضافه می‌شود */
function withDevDetails(text: string, e: ApiError): string {
  if (process.env.NODE_ENV === "production") return text;
  return `${text} [${e.status} ${e.code}: ${e.message}]`;
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 502 || e.status === 503 || e.status === 504) {
      return withDevDetails("اتصال برقرار نشد. اینترنت را بررسی کنید.", e);
    }
    // ردّ OTP توسط سرور باید قبل از نگاشت عمومی ۴۰۱ تشخیص داده شود
    if (/otp/i.test(e.message)) {
      return withDevDetails(OTP_REJECTED, e);
    }
    const mapped = ERROR_MESSAGES[e.code];
    if (mapped) return withDevDetails(mapped, e);
    if (e.code?.startsWith("IDEMPOTENCY_")) {
      return withDevDetails("ثبت انجام نشد. دوباره تلاش کنید.", e);
    }
    if (e.status === 404) return withDevDetails(GENERIC_NOT_FOUND, e);
    return withDevDetails(GENERIC_ERROR, e);
  }
  return GENERIC_ERROR;
}

const SLOT_CONFLICT_CODES = new Set([
  "SLOT_NOT_AVAILABLE",
  "RESERVATION_OVERLAP",
  "OVERLAP_CONFLICT",
  "RESERVATION_START_TIME_IN_PAST",
  "LEAD_TIME_TOO_SHORT",
]);

/** خطاهایی که یعنی Availability تغییر کرده و باید دوباره از Backend گرفته شود */
export const isSlotConflictError = (e: unknown): boolean =>
  e instanceof ApiError && SLOT_CONFLICT_CODES.has(e.code);