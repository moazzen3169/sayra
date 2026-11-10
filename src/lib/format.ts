const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toPersianDigits = (value: string | number): string =>
  String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);

export const toEnglishDigits = (value: string | number): string =>
  String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** 230000 -> ۲۳۰,۰۰۰ */
export const formatPrice = (value: number): string =>
  toPersianDigits(value.toLocaleString("en-US"));

/**
 * پاکسازی و نرمال‌سازی شماره تلفن به ساختار ثابت ۱۱ رقمی (09000000000)
 * - تبدیل اعداد فارسی/عربی به انگلیسی
 * - حذف کاراکترهای غیرعددی
 * - تبدیل پیشوندهای +98, 0098, 98 یا 9 بدون صفر به 09xxxxxxxx
 */
export const cleanPhoneNumber = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  let digits = toEnglishDigits(String(value)).replace(/\D/g, "");

  // هندل کردن پیشوندهای بین‌المللی ایران
  if (digits.startsWith("0098") && digits.length === 14) {
    digits = "0" + digits.slice(4);
  } else if (digits.startsWith("98") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("9")) {
    digits = "0" + digits;
  }

  return digits;
};

/**
 * بررسی ساختار معتبر شماره تلفن همراه ایران:
 * - دقیقاً ۱۱ رقم
 * - شروع با 09
 * - بدون +98
 * ساختار درست: 09000000000
 */
export const isValidIranPhone = (value: string | number | null | undefined): boolean => {
  const cleaned = cleanPhoneNumber(value);
  return /^09\d{9}$/.test(cleaned);
};

/**
 * فرمت شماره تلفن برای نمایش با حفظ ساختار ۱۱ رقمی استاندارد
 * در صورت نیاز به نمایش با ارقام فارسی، persianDigits = true قرار داده می‌شود.
 */
export const formatPhoneDisplay = (
  value: string | number | null | undefined,
  persianDigits = false
): string => {
  const cleaned = cleanPhoneNumber(value);
  if (!cleaned) return "";
  return persianDigits ? toPersianDigits(cleaned) : cleaned;
};
