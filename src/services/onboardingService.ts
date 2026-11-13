import { apiClient } from "@/lib/api/client";
import { cleanPhoneNumber } from "@/lib/format";
import type {
  LocationOption,
  OnboardingCompletion,
  OnboardingLocationPayload,
  OnboardingPreview,
  OnboardingStartPayload,
  OnboardingTokens,
  OnboardingWorkingHoursPayload,
} from "@/types/onboarding";

/**
 * مسیرها نسبت به API_BASE_URL (که apiClient اضافه می‌کند).
 * TODO: به ENDPOINTS.onboarding منتقل شود.
 */
const base = (id: string) => `/onboarding/${encodeURIComponent(id)}`;
const PATHS = {
  start: "/onboarding/start",
  verifyOtp: "/onboarding/otp/verify",
  location: (id: string) => `${base(id)}/location`,
  workingHours: (id: string) => `${base(id)}/working-hours`,
  preview: (id: string) => `${base(id)}/preview`,
  complete: (id: string) => `${base(id)}/complete`,
  // تأییدنشده: مسیرهای lookup استان/شهر
  provinces: "/locations/provinces",
  cities: (provinceId: string) => `/locations/provinces/${encodeURIComponent(provinceId)}/cities`,
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** بازکردن envelope به شکل { success, data } */
function unwrap(data: unknown): Record<string, unknown> {
  const root = asRecord(data);
  return asRecord(root?.data) ?? root ?? {};
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function extractTokens(body: Record<string, unknown>): OnboardingTokens | null {
  const holder = asRecord(body.tokens) ?? body;
  const accessToken = pickString(holder, ["accessToken", "access"]);
  if (!accessToken) return null;
  return { accessToken, refreshToken: pickString(holder, ["refreshToken", "refresh"]) };
}

function toOptions(data: unknown): LocationOption[] {
  const root = asRecord(data);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(root?.data)
      ? (root?.data as unknown[])
      : Array.isArray(root?.items)
        ? (root?.items as unknown[])
        : [];
  const out: LocationOption[] = [];
  for (const item of list) {
    const rec = asRecord(item);
    const id = pickString(rec, ["id"]);
    const name = pickString(rec, ["name", "title", "faName"]);
    if (id && name) out.push({ id, name });
  }
  return out;
}

export const onboardingService = {
  /** مرحله ۱: ساخت یا ادامهٔ draft و ارسال OTP به شمارهٔ مدیر */
  async start(payload: OnboardingStartPayload, signal?: AbortSignal): Promise<{ onboardingId: string }> {
    const res = await apiClient.post<unknown>(
      PATHS.start,
      {
        gameCenterName: payload.gameCenterName.trim(),
        managerFullName: payload.managerFullName.trim(),
        managerPhone: cleanPhoneNumber(payload.managerPhone),
      },
      { signal, retryOnAuth: false }
    );
    const body = unwrap(res.data);
    const onboardingId = pickString(body, ["onboardingId", "id"]);
    if (!onboardingId) {
      throw new Error("شناسه فرایند ثبت از سرور دریافت نشد. دوباره تلاش کنید.");
    }
    return { onboardingId };
  },

  /** مرحله ۲: تأیید OTP */
  async verifyOtp(onboardingId: string, code: string, signal?: AbortSignal): Promise<void> {
    await apiClient.post(PATHS.verifyOtp, { onboardingId, code: code.trim() }, { signal, retryOnAuth: false });
  },

  async getProvinces(signal?: AbortSignal): Promise<LocationOption[]> {
    const res = await apiClient.get<unknown>(PATHS.provinces, { signal, retryOnAuth: false });
    return toOptions(res.data);
  },

  async getCities(provinceId: string, signal?: AbortSignal): Promise<LocationOption[]> {
    const res = await apiClient.get<unknown>(PATHS.cities(provinceId), { signal, retryOnAuth: false });
    return toOptions(res.data);
  },

  /** مرحله ۳ */
  async saveLocation(onboardingId: string, payload: OnboardingLocationPayload, signal?: AbortSignal): Promise<void> {
    await apiClient.put(
      PATHS.location(onboardingId),
      { ...payload, address: payload.address.trim() },
      { signal, retryOnAuth: false }
    );
  },

  /** مرحله ۴ */
  async saveWorkingHours(
    onboardingId: string,
    payload: OnboardingWorkingHoursPayload,
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.put(PATHS.workingHours(onboardingId), payload, { signal, retryOnAuth: false });
  },

  /** مرحله ۶ */
  async getPreview(onboardingId: string, signal?: AbortSignal): Promise<OnboardingPreview> {
    const res = await apiClient.get<unknown>(PATHS.preview(onboardingId), { signal, retryOnAuth: false });
    return unwrap(res.data);
  },

  /** مرحله ۷: فقط پس از تأیید صریح کاربر */
  async complete(onboardingId: string, signal?: AbortSignal): Promise<OnboardingCompletion> {
    const res = await apiClient.post<unknown>(
      PATHS.complete(onboardingId),
      { confirmation: true },
      { signal, retryOnAuth: false }
    );
    const body = unwrap(res.data);
    const center = asRecord(body.gamingCenter) ?? asRecord(body.center);
    return {
      tokens: extractTokens(body),
      gamingCenterId: pickString(center, ["id"]) ?? pickString(body, ["gamingCenterId"]),
      slug: pickString(center, ["slug"]) ?? pickString(body, ["slug"]),
      raw: body,
    };
  },
};