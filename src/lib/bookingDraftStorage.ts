/**
 * مدیریت وضعیت موقت انتخاب رزرو و جریان پرداخت
 * با ذخیره‌سازی ایمن در sessionStorage برای حفظ انتخاب‌ها حین Refresh یا لاگین OTP.
 * اطلاعات حساس احراز هویت یا بانکی هرگز در storage ذخیره نمی‌شوند.
 */

export interface PersistedBookingDraft {
  gamingCenterId?: string;
  gamingCenterSlug: string;
  gamingCenterName: string;
  gamingCenterAddress?: string;
  selectedStationIds: string[];
  stationSnapshots: {
    id: string;
    name: string;
    hourlyPrice?: number;
    stationType?: string;
    catalogTitle?: string;
  }[];
  date: {
    id: string;
    dayName: string;
    dateStr: string;
    fullDate: string;
  };
  slots: {
    key: string;
    startTime: string;
    endTime?: string;
    startLabel: string;
    endLabel?: string;
    hourNumber: string;
  }[];
  durationHours: number;
  customer?: {
    fullName: string;
    phone: string;
    email?: string;
  };
  note?: string;
  reservationId?: string;
  grandTotal?: number;
  lastUpdated: number;
}

const STORAGE_KEY = "sayra_active_booking_draft";

export const bookingDraftStorage = {
  get(): PersistedBookingDraft | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedBookingDraft;
      // اعتبارسنجی انقضای درفت (حداکثر ۲ ساعت)
      if (Date.now() - (parsed.lastUpdated || 0) > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  set(draft: Omit<PersistedBookingDraft, "lastUpdated">): void {
    if (typeof window === "undefined") return;
    try {
      const item: PersistedBookingDraft = {
        ...draft,
        lastUpdated: Date.now(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    } catch {
      // ignore storage quota issues
    }
  },

  update(partial: Partial<PersistedBookingDraft>): void {
    const existing = this.get();
    if (!existing) return;
    this.set({
      ...existing,
      ...partial,
    });
  },

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
