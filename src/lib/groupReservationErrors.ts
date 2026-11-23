import type { GroupReservationError } from "@/types/gaming-center/group-reservation.types";

/**
 * Returns user-friendly Persian error messages for group reservation error codes.
 * Follows Sayra Design System §12.5 (never exposes raw backend error messages).
 */
export function getGroupReservationErrorMessage(
  error: GroupReservationError | { code?: string; message?: string; details?: unknown } | null | undefined
): string {
  if (!error) return "";

  const code = error.code ?? "";

  switch (code) {
    case "SLOT_NOT_AVAILABLE":
    case "RESERVATION_OVERLAP":
    case "OVERLAP_CONFLICT":
      return "این ساعت دیگر خالی نیست. ساعت دیگری انتخاب کنید.";
    case "RESERVATION_START_TIME_IN_PAST":
      return "این ساعت گذشته است.";
    case "LEAD_TIME_TOO_SHORT":
      return "این ساعت خیلی نزدیک است. ساعت دیگری انتخاب کنید.";
    case "ONLINE_RESERVATION_DISABLED":
      return "رزرو آنلاین این گیمنت فعال نیست.";
    case "IDEMPOTENCY_REQUEST_IN_PROGRESS":
      return "درخواست قبلی هنوز در حال بررسی است. چند لحظه صبر کنید.";
    case "IDEMPOTENCY_KEY_REQUIRED":
    case "IDEMPOTENCY_KEY_INVALID_LENGTH":
    case "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD":
      return "ثبت انجام نشد. دوباره تلاش کنید.";
    case "INVALID_TRANSITION":
      return "در وضعیت فعلی رزرو این کار ممکن نیست.";
    case "CANCELLATION_DEADLINE_EXCEEDED":
      return "امکان لغو رزرو وجود ندارد؛ کمتر از ۱۵ دقیقه تا زمان شروع رزرو باقی مانده است.";
    case "UNAUTHORIZED":
      return "برای ادامه وارد شوید.";
    case "FORBIDDEN":
      return "به این بخش دسترسی ندارید.";
    case "NOT_FOUND":
      return "موردی که دنبالش هستید پیدا نشد.";
    case "VALIDATION_ERROR":
      return "اطلاعات واردشده درست نیست.";
    case "NETWORK_ERROR":
    case "PROXY_NETWORK_ERROR":
      return "اتصال برقرار نشد. اینترنت را بررسی کنید.";
    case "STATION_NOT_FOUND_OR_INACTIVE":
      return "دستگاه انتخاب‌شده در دسترس نیست. دستگاه دیگری انتخاب کنید.";
    case "DUPLICATE_STATIONS_SELECTED":
      return "دستگاه‌های انتخاب‌شده تکراری هستند.";
    case "INVALID_DURATION":
      return "مدت زمان انتخاب‌شده با قوانین دستگاه همخوانی ندارد.";
    case "ACTIVE_RESERVATION_LIMIT_REACHED":
      return "سقف تعداد رزروهای فعال شما تکمیل شده است.";
    case "OTP_REQUIRED":
      return "برای ادامه وارد شوید.";
    default:
      if (code.startsWith("IDEMPOTENCY_")) {
        return "ثبت انجام نشد. دوباره تلاش کنید.";
      }
      return "مشکلی پیش آمد. دوباره تلاش کنید.";
  }
}
