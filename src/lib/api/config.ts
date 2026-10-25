/** تنها جایی که Base URL و تنظیمات محیطی تعریف می‌شود */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://playnest-demo.style.dev/api/v1"
).replace(/\/+$/, "");

/** Timezone نمایش تاریخ/ساعت؛ باید با Contract بک‌اند هماهنگ باشد */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Tehran";

export const USE_MOCK_RESERVATIONS = process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS !== "false";

export const ACCESS_TOKEN_KEY = "sayra_access_token";
