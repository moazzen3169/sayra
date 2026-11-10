"use client";

import { useState, useCallback, useRef } from "react";
import { groupReservationApi } from "@/services/gaming-center/group-reservation.api";
import type {
  GroupReservation,
  GroupReservationPayload,
  GroupReservationCheckoutPayload,
  GroupReservationCheckoutResponse,
} from "@/types/gaming-center/group-reservation.types";
import { ApiError } from "@/lib/api/client";

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sayra-group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useGroupReservation(gamingCenterSlug: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
    details?: unknown;
  } | null>(null);
  const [reservation, setReservation] = useState<GroupReservation | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<GroupReservationCheckoutResponse | null>(null);

  // Preserve idempotency key across retries of the same logical reservation
  const idempotencyKeyRef = useRef<string | null>(null);

  const getOrCreateIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey();
    }
    return idempotencyKeyRef.current;
  };

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = null;
  };

  /**
   * روند جدید پرداخت آنلاین (Payment-First Flow):
   * فراخوانی checkout جهت رزرو موقت (BookingHold) و هدایت به درگاه
   */
  const checkout = useCallback(
    async (payload: GroupReservationCheckoutPayload): Promise<GroupReservationCheckoutResponse> => {
      if (isSubmitting) {
        throw new Error("یک درخواست ثبت در حال پردازش است.");
      }

      setIsSubmitting(true);
      setError(null);

      const key = getOrCreateIdempotencyKey();

      try {
        const result = await groupReservationApi.checkoutGroupReservation(
          gamingCenterSlug,
          payload,
          key
        );

        setCheckoutResult(result);
        resetIdempotencyKey();
        return result;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
          });
        } else {
          setError({
            code: "CLIENT_ERROR",
            message: (err as Error)?.message || "خطای ناشناخته در فرآیند ثبت هولد و پرداخت",
          });
        }
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [gamingCenterSlug, isSubmitting]
  );

  const submit = useCallback(
    async (payload: GroupReservationPayload): Promise<GroupReservation> => {
      if (isSubmitting) {
        throw new Error("یک درخواست ثبت در حال پردازش است.");
      }

      setIsSubmitting(true);
      setError(null);

      const key = getOrCreateIdempotencyKey();

      try {
        const result = await groupReservationApi.submitGroupReservation(
          gamingCenterSlug,
          payload,
          key
        );

        setReservation(result);
        // Successful submission -> reset key for any subsequent separate booking
        resetIdempotencyKey();
        return result;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
          });
        } else {
          setError({
            code: "CLIENT_ERROR",
            message: (err as Error)?.message || "خطای ناشناخته در ثبت رزرو گروهی",
          });
        }
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [gamingCenterSlug, isSubmitting]
  );

  return {
    checkout,
    submit,
    isSubmitting,
    error,
    reservation,
    checkoutResult,
    resetError: () => setError(null),
    resetReservation: () => setReservation(null),
  };
}
