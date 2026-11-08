import type { GroupReservationError } from "@/types/gaming-center/group-reservation.types";

/**
 * Returns user-friendly Persian error messages for group reservation backend error codes.
 */
export function getGroupReservationErrorMessage(
  error: GroupReservationError | { code?: string; message?: string; details?: unknown } | null | undefined
): string {
  if (!error) return "";

  const code = error.code;
  const rawMsg = error.message;

  switch (code) {
    case "VALIDATION_ERROR":
      return rawMsg || "اطلاعات ارسالی نامعتبر است. لطفاً ورودی‌ها را بررسی کنید.";
    case "STATION_NOT_FOUND_OR_INACTIVE":
      return "یک یا چند دستگاه انتخاب‌شده دیگر در دسترس یا فعال نمی‌باشند.";
    case "DUPLICATE_STATIONS_SELECTED":
      return "دستگاه‌های انتخاب‌شده تکراری می‌باشند. لطفاً انتخاب‌های خود را بازبینی فرمایید.";
    case "SLOT_NOT_AVAILABLE":
    case "RESERVATION_OVERLAP":
      return "متأسفانه یک یا چند دستگاه در این بازه زمانی توسط کاربر دیگری رزرو شده است. لطفاً ساعت یا دستگاه دیگری را انتخاب نمایید.";
    case "RESERVATION_START_TIME_IN_PAST":
      return "زمان شروع رزرو باید در آینده باشد. لطفاً ساعت جدیدی را انتخاب کنید.";
    case "INVALID_DURATION":
      return rawMsg || "مدت زمان رزرو با قوانین دستگاه‌های انتخابی همخوانی ندارد.";
    case "ACTIVE_RESERVATION_LIMIT_REACHED":
      return "سقف تعداد رزروهای فعال شما به پایان رسیده است.";
    case "OTP_REQUIRED":
      return "جهت نهایی‌سازی رزرو، تأیید شماره موبایل با پیامک اعتبارسنجی الزامی است.";
    case "ONLINE_RESERVATION_DISABLED":
      return "رزرو آنلاین در حال حاضر برای این گیمنت غیرفعال است.";
    case "NOT_FOUND":
      return "گیمنت یا دستگاه مورد نظر یافت نشد.";
    case "INTERNAL_ERROR":
      return "خطای غیرمنتظره در سرور رخ داده است. لطفاً مجدداً تلاش نمایید.";
    default:
      return rawMsg || "خطایی در انجام عملیات رخ داد.";
  }
}
