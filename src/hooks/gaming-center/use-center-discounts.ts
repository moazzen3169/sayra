"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAbortError } from "@/lib/api/client";
import {
  discountSelectionKey,
  getStationOriginalHourlyPrice,
  mergeAvailableDiscounts,
  pickDefaultDiscount,
  pickRepresentativeStations,
  type DiscountStationLike,
} from "@/lib/discountSelection";
import { discountSelectionApi } from "@/services/gaming-center/discount-selection.api";
import type {
  AvailableDiscountItem,
  CalculateDiscountSelectionResponse,
} from "@/types/gaming-center/discount-selection.types";

export interface UseCenterDiscountsParams {
  gamingCenterId?: string | null;
  stations?: DiscountStationLike[];
  selectedStations?: DiscountStationLike[];
  customerAccountId?: string | null;
}

export interface UseCenterDiscountsResult {
  discounts: AvailableDiscountItem[];
  selectedDiscount: AvailableDiscountItem | null;
  selectedKey: string | null;
  recommendedKey: string | null;
  queriedStationIds: string[];
  calculation: CalculateDiscountSelectionResponse | null;
  isLoading: boolean;
  isSelecting: boolean;
  selectDiscount: (item: AvailableDiscountItem) => void;
}

interface DiscountFetchState {
  centerId: string;
  discounts: AvailableDiscountItem[];
  recommendedKey: string | null;
  queriedStationIds: string[];
}

export function useCenterDiscounts({
  gamingCenterId,
  stations = [],
  selectedStations = [],
  customerAccountId,
}: UseCenterDiscountsParams): UseCenterDiscountsResult {
  const [fetchState, setFetchState] = useState<DiscountFetchState | null>(null);
  const [manualSelection, setManualSelection] = useState<{
    centerId: string;
    key: string;
  } | null>(null);
  const [calculationState, setCalculationState] = useState<{
    centerId: string;
    data: CalculateDiscountSelectionResponse;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const selectAbortRef = useRef<AbortController | null>(null);

  const targetStations = useMemo(() => {
    if (selectedStations.length > 0) {
      return selectedStations.filter(
        (s) => Boolean(s?.id) && getStationOriginalHourlyPrice(s) > 0
      );
    }
    return pickRepresentativeStations(stations, 6);
  }, [selectedStations, stations]);

  const targetStationsSignature = useMemo(
    () =>
      targetStations
        .map((s) => `${s.id}:${getStationOriginalHourlyPrice(s)}`)
        .sort()
        .join("|"),
    [targetStations]
  );

  useEffect(() => {
    if (!gamingCenterId || targetStations.length === 0) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    (async () => {
      await Promise.resolve();
      if (!active) return;
      setIsLoading(true);

      try {
        const settled = await Promise.allSettled(
          targetStations.map(async (st) => {
            const basePrice = getStationOriginalHourlyPrice(st);
            const response = await discountSelectionApi.getAvailableDiscounts(
              gamingCenterId,
              {
                stationId: st.id,
                basePrice,
                durationMinutes: 60,
                customerAccountId: customerAccountId || undefined,
              },
              controller.signal
            );
            return { stationId: st.id, response };
          })
        );

        if (!active) return;

        const fulfilled = settled
          .filter(
            (
              r
            ): r is PromiseFulfilledResult<{
              stationId: string;
              response: Awaited<
                ReturnType<typeof discountSelectionApi.getAvailableDiscounts>
              >;
            }> => r.status === "fulfilled"
          )
          .map((r) => r.value);

        if (fulfilled.length === 0) {
          setFetchState({
            centerId: gamingCenterId,
            discounts: [],
            recommendedKey: null,
            queriedStationIds: [],
          });
          return;
        }

        const merged = mergeAvailableDiscounts(fulfilled);
        setFetchState({
          centerId: gamingCenterId,
          discounts: merged.discounts,
          recommendedKey: merged.recommendedKey,
          queriedStationIds: merged.queriedStationIds,
        });
      } catch (err) {
        if (!active || isAbortError(err)) return;
        setFetchState({
          centerId: gamingCenterId,
          discounts: [],
          recommendedKey: null,
          queriedStationIds: [],
        });
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterId, targetStationsSignature, customerAccountId, targetStations]);

  const activeState =
    gamingCenterId &&
    targetStations.length > 0 &&
    fetchState?.centerId === gamingCenterId
      ? fetchState
      : null;

  const discounts = useMemo(() => activeState?.discounts ?? [], [activeState]);
  const recommendedKey = activeState?.recommendedKey ?? null;
  const queriedStationIds = useMemo(
    () => activeState?.queriedStationIds ?? [],
    [activeState]
  );

  const selectedKey = useMemo(() => {
    if (discounts.length === 0) return null;
    if (
      gamingCenterId &&
      manualSelection?.centerId === gamingCenterId &&
      discounts.some(
        (d) => discountSelectionKey(d.type, d.id) === manualSelection.key
      )
    ) {
      return manualSelection.key;
    }
    const def = pickDefaultDiscount(discounts, recommendedKey);
    return def ? discountSelectionKey(def.type, def.id) : null;
  }, [discounts, gamingCenterId, manualSelection, recommendedKey]);

  const selectedDiscount = useMemo(() => {
    if (!selectedKey) return null;
    return (
      discounts.find((d) => discountSelectionKey(d.type, d.id) === selectedKey) ??
      null
    );
  }, [discounts, selectedKey]);

  const calculation =
    gamingCenterId && calculationState?.centerId === gamingCenterId
      ? calculationState.data
      : null;

  const selectDiscount = useCallback(
    (item: AvailableDiscountItem) => {
      if (!gamingCenterId) return;
      const key = discountSelectionKey(item.type, item.id);
      setManualSelection({ centerId: gamingCenterId, key });

      if (targetStations.length === 0) return;

      selectAbortRef.current?.abort();
      const controller = new AbortController();
      selectAbortRef.current = controller;

      const primaryStation = targetStations[0];
      const basePrice = targetStations.reduce(
        (sum, st) => sum + getStationOriginalHourlyPrice(st),
        0
      );

      setIsSelecting(true);
      discountSelectionApi
        .selectDiscount(
          gamingCenterId,
          {
            stationId: primaryStation.id,
            basePrice,
            customerAccountId: customerAccountId || undefined,
            selectedDiscountId: item.id,
            selectedType: item.type,
            code: item.code ?? undefined,
          },
          controller.signal
        )
        .then((res) => {
          if (!controller.signal.aborted) {
            setCalculationState({ centerId: gamingCenterId, data: res });
          }
        })
        .catch(() => {
          // Graceful fallback to local item breakdown
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSelecting(false);
          }
        });
    },
    [gamingCenterId, targetStations, customerAccountId]
  );

  useEffect(() => {
    return () => {
      selectAbortRef.current?.abort();
    };
  }, []);

  return {
    discounts,
    selectedDiscount,
    selectedKey,
    recommendedKey,
    queriedStationIds,
    calculation,
    isLoading,
    isSelecting,
    selectDiscount,
  };
}
