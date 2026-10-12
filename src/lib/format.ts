const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toPersianDigits = (value: string | number): string =>
  String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);

/** 230000 -> ۲۳۰,۰۰۰ */
export const formatPrice = (value: number): string =>
  toPersianDigits(value.toLocaleString("en-US"));