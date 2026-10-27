import { toPersianDigits } from "@/lib/format";
import { isSlotConflictError } from "@/lib/reservationUi";
import type { BookingItem } from "@/lib/devices";
import { reservationService } from "@/services/reservationService";
import type { Reservation } from "@/types/reservation";

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export const itemKey = (item: BookingItem) => `${item.station.id}|${item.startTime}`;

interface SubmitParams {
  gamingCenterSlug: string;
  items: BookingItem[];
  customer: { fullName: string; phone: string };
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  /** کلید Idempotency هر (دستگاه + ساعت)؛ بین تلاش‌های مجدد ثابت می‌ماند */
  keys: Map<string, string>;
  /** رزروهای ساخته‌شده؛ در تلاش مجدد دوباره ساخته نمی‌شوند */
  done: Map<string, Reservation>;
  onProgress?: (done: number, total: number) => void;
}

/**
 * ⚠️ API فعلی هر رزرو را فقط برای یک Station و یک startTime می‌پذیرد (بدون endTime و بدون دسته‌ی اضافه).
 * پس هر «دستگاه × ساعت» یک رزرو جداگانه است و دسته‌ی اضافه در فیلد note می‌رود.
 * اگر بک‌اند endpoint چنددستگاهی/چندساعته داد، فقط همین تابع عوض می‌شود.
 */
export async function submitBooking(params: SubmitParams): Promise<Reservation[]> {
  const { items, keys, done } = params;
  const results: Reservation[] = [];

  for (const item of items) {
    const k = itemKey(item);
    let reservation = done.get(k);

    if (!reservation) {
      let key = keys.get(k);
      if (!key) {
        key = createIdempotencyKey();
        keys.set(k, key);
      }

      try {
        reservation = await reservationService.create(
          {
            gamingCenterSlug: params.gamingCenterSlug,
            idempotencyKey: key,
            stationId: item.station.id,
            startTime: item.startTime,
            customer: params.customer,
            ...(item.extraControllers > 0
              ? { note: `دسته اضافه: ${toPersianDigits(item.extraControllers)}` }
              : {}),
          },
          {
            gamingCenterName: params.gamingCenterName,
            gamingCenterAddress: params.gamingCenterAddress,
            stationName: item.station.name,
            stationType: item.station.stationType,
            hourlyPrice: item.station.hourlyPrice,
            totalHours: 1,
            totalPrice: item.station.hourlyPrice + item.extraControllers * item.extraUnitPrice,
          }
        );
      } catch (e) {
        // اگر Slot دیگر آزاد نیست، کلید قبلی دیگر معنی ندارد
        if (isSlotConflictError(e)) keys.delete(k);
        throw e;
      }
      done.set(k, reservation);
    }

    results.push(reservation);
    params.onProgress?.(results.length, items.length);
  }

  return results;
}