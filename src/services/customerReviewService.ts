import { apiClient, ApiError, isAbortError } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { getMockGamecenterDetail } from "@/lib/mocks/gamecenter.mock";
import { gamingCenterService } from "@/services/gamecenterDetailService";
import type { Reservation } from "@/types/reservation";
import {
  ContractGapError,
  PublicRating,
  SubmitReservationRatingPayload,
} from "@/types/customerApi";

export interface SubmitReviewOptions {
  gamingCenterId?: string;
  gamingCenterSlug?: string;
  fallbackReservationIds?: string[];
}

export function isAlreadyRatedError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409) return true;
  if (error.code === "ALREADY_RATED" || error.code === "CONFLICT") return true;
  return /already.*rat|already.*review|قبلاً.*ثبت/i.test(error.message);
}

function buildRatingBody(payload: SubmitReservationRatingPayload) {
  return {
    rating: payload.rating,
    comment: payload.comment?.trim() ? payload.comment.trim() : undefined,
  };
}

function validateReviewPayload(
  reservationId: string,
  payload: SubmitReservationRatingPayload
) {
  if (!reservationId || !reservationId.trim()) {
    throw new Error("شناسه رزرو الزامی است.");
  }
  if (
    typeof payload.rating !== "number" ||
    !Number.isInteger(payload.rating) ||
    payload.rating < 1 ||
    payload.rating > 5
  ) {
    throw new Error("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");
  }
}

async function resolveSlugForReview(
  options?: SubmitReviewOptions
): Promise<string | undefined> {
  const directSlug = options?.gamingCenterSlug?.trim();
  if (directSlug) return directSlug;

  const centerId = options?.gamingCenterId?.trim();
  if (!centerId) return undefined;

  try {
    const center = await gamingCenterService.resolveGamingCenter(centerId);
    return center?.slug?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Service handling Customer Reviews & Ratings according to OpenAPI v1.0-LOCKED.
 *
 * Supported operations in OpenAPI v1.0-LOCKED:
 * 1. GET /public/gamingCenters/{slug}/ratings (Public list of ratings)
 * 2. POST /customer/reservation/{reservationId}/ratings (Submit review tied to customer reservation)
 * 3. POST /public/gamingCenters/{slug}/reservation/{reservationId}/ratings (Submit review tied to reservation)
 *
 * Unsupported operations (Contract Gaps):
 * 1. GET /customer/reviews or GET /customer/ratings (Listing all reviews submitted by the authenticated customer)
 * 2. PATCH/PUT /customer/ratings/{id} or /customer/reservation/{reservationId}/ratings (Editing an existing review)
 * 3. DELETE /customer/ratings/{id} (Deleting a review)
 * 4. POST /public/gamingCenters/{slug}/ratings (Creating a standalone review not tied to a reservation)
 */
export const customerReviewService = {
  /**
   * دریافت نظرات عمومی ثبت‌شده برای یک مرکز بازی
   * GET /public/gamingCenters/{slug}/ratings
   */
  async listPublicRatings(slug: string, signal?: AbortSignal): Promise<PublicRating[]> {
    if (!slug || !slug.trim()) {
      throw new Error("شناسه گیمنت ارسال نشده است.");
    }
    if (USE_MOCK_RESERVATIONS) {
      return getMockGamecenterDetail(slug).reviews as unknown as PublicRating[];
    }
    const response = await apiClient.get<PublicRating[] | { data?: PublicRating[] }>(
      ENDPOINTS.gamingCenter.ratings(slug.trim()),
      { signal }
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: PublicRating[] }).data)) {
      return (data as { data: PublicRating[] }).data;
    }
    return [];
  },

  /**
   * ثبت نظر و امتیاز برای رزرو انجام‌شده در پنل مشتری
   * POST /customer/reservation/{reservationId}/ratings
   * نیازمند هدر احراز هویت Bearer Token است.
   * ریتینگ الزامی بوده و باید عدد صحیح بین ۱ تا ۵ باشد.
   */
  async submitCustomerReview(
    reservationId: string,
    payload: SubmitReservationRatingPayload,
    options?: SubmitReviewOptions
  ): Promise<void> {
    validateReviewPayload(reservationId, payload);

    if (USE_MOCK_RESERVATIONS) {
      return;
    }

    const body = buildRatingBody(payload);
    const candidateIds = Array.from(
      new Set(
        [reservationId.trim(), ...(options?.fallbackReservationIds ?? []).map((id) => id.trim())].filter(
          Boolean
        )
      )
    );

    let resolvedSlug: string | undefined;
    let slugResolved = false;
    let lastError: unknown;

    for (const targetId of candidateIds) {
      try {
        await apiClient.post(ENDPOINTS.reservation.rate(targetId), body);
        return;
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) {
          throw err;
        }
        lastError = err;

        if (!slugResolved) {
          slugResolved = true;
          resolvedSlug = await resolveSlugForReview(options);
        }

        if (resolvedSlug) {
          try {
            await apiClient.post(
              ENDPOINTS.reservation.publicRate(resolvedSlug, targetId),
              body
            );
            return;
          } catch (publicErr) {
            if (!(publicErr instanceof ApiError) || publicErr.status !== 404) {
              throw publicErr;
            }
            lastError = publicErr;
          }
        }
      }
    }

    throw lastError;
  },

  /**
   * ثبت نظر از مسیر عمومی وابسته به مرکز و رزرو
   * POST /public/gamingCenters/{gamingCenterSlug}/reservation/{reservationId}/ratings
   */
  async submitPublicReservationReview(
    gamingCenterSlug: string,
    reservationId: string,
    payload: SubmitReservationRatingPayload
  ): Promise<void> {
    if (!gamingCenterSlug || !gamingCenterSlug.trim()) {
      throw new Error("شناسه گیمنت الزامی است.");
    }
    validateReviewPayload(reservationId, payload);

    if (USE_MOCK_RESERVATIONS) {
      return;
    }

    const url = ENDPOINTS.reservation.publicRate(
      gamingCenterSlug.trim(),
      reservationId.trim()
    );
    await apiClient.post(url, buildRatingBody(payload));
  },

  /**
   * بررسی نظرات ثبت‌شده در گیم‌نت‌ها برای تشخیص رزروهایی که قبلاً امتیاز گرفته‌اند
   * بر اساس فیلد reservationId در اسکیمای Rating از OpenAPI
   */
  async getRatedReservationIdsForReservations(
    reservations: Reservation[],
    signal?: AbortSignal
  ): Promise<Set<string>> {
    const ratedIds = new Set<string>();
    const completed = reservations.filter((r) => r.status === "COMPLETED");
    if (completed.length === 0 || USE_MOCK_RESERVATIONS) {
      return ratedIds;
    }

    const slugs = new Set<string>();
    const centerIdsToResolve = new Set<string>();

    for (const r of completed) {
      const directSlug = r.gamingCenterSlug?.trim() || r.gamingCenter?.slug?.trim();
      if (directSlug) {
        slugs.add(directSlug);
      } else if (r.gamingCenterId?.trim()) {
        centerIdsToResolve.add(r.gamingCenterId.trim());
      }
    }

    if (centerIdsToResolve.size > 0) {
      const resolved = await Promise.allSettled(
        Array.from(centerIdsToResolve).map((centerId) =>
          gamingCenterService.resolveGamingCenter(centerId, signal)
        )
      );
      for (const res of resolved) {
        if (res.status === "fulfilled" && res.value?.slug) {
          slugs.add(res.value.slug);
        }
      }
    }

    if (slugs.size === 0) {
      return ratedIds;
    }

    const ratingLists = await Promise.allSettled(
      Array.from(slugs).map((slug) =>
        customerReviewService.listPublicRatings(slug, signal)
      )
    );

    for (const res of ratingLists) {
      if (res.status === "rejected") {
        if (isAbortError(res.reason)) throw res.reason;
        continue;
      }
      for (const rating of res.value) {
        if (rating.reservationId && rating.status !== "DELETED") {
          ratedIds.add(rating.reservationId);
        }
      }
    }

    return ratedIds;
  },

  /**
   * مشاهده لیست نظرات منحصراً ارسال‌شده توسط مشتری لاگین‌شده
   * در نسخه v1.0-LOCKED اندپوینتی برای این کار وجود ندارد.
   */
  listCustomerReviewsUnsupported(): never {
    throw new ContractGapError(
      "CustomerReviewsList",
      "GET /customer/ratings or /customer/reviews is not defined in OpenAPI v1.0-LOCKED. Reviews can only be viewed in public center reviews."
    );
  },

  /**
   * ویرایش نظر ثبت‌شده توسط مشتری
   * در نسخه v1.0-LOCKED اندپوینتی برای ویرایش نظر وجود ندارد.
   */
  editCustomerReviewUnsupported(): never {
    throw new ContractGapError(
      "CustomerReviewEdit",
      "PATCH or PUT /customer/ratings/{id} is not defined in OpenAPI v1.0-LOCKED. Customer reviews cannot be modified after submission."
    );
  },

  /**
   * حذف نظر ثبت‌شده توسط مشتری
   * در نسخه v1.0-LOCKED اندپوینتی برای حذف نظر توسط مشتری وجود ندارد (فقط ادمین/مدیر گیمنت امکان تغییر وضعیت به DELETED دارد).
   */
  deleteCustomerReviewUnsupported(): never {
    throw new ContractGapError(
      "CustomerReviewDelete",
      "DELETE /customer/ratings/{id} is not defined in OpenAPI v1.0-LOCKED. Customers cannot delete submitted reviews."
    );
  },

  /**
   * ثبت نظر بدون رزرو مستقیم (Standalone Review)
   * در نسخه v1.0-LOCKED تمام نظرات منحصراً باید به یک رزرو مشخص متصل باشند.
   */
  submitStandaloneReviewUnsupported(): never {
    throw new ContractGapError(
      "CustomerStandaloneReview",
      "POST /public/gamingCenters/{slug}/ratings or unlinked review submission is not defined in OpenAPI v1.0-LOCKED. All reviews must be tied to a valid reservationId."
    );
  },
};
