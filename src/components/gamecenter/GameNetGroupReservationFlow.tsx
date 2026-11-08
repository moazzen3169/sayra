"use client";

import React, { useState, useEffect } from "react";
import { useDeviceCategories } from "@/hooks/gaming-center/use-device-categories";
import { useGamingCenterStations } from "@/hooks/gaming-center/use-gaming-center-stations";
import { DeviceCategorySelector } from "./DeviceCategorySelector";
import { PhysicalStationList } from "./PhysicalStationList";
import { GroupBookingModal } from "./GroupBookingModal";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import type { GroupReservation } from "@/types/gaming-center/group-reservation.types";
import { toPersianDigits, formatPrice } from "@/lib/format";

interface GameNetGroupReservationFlowProps {
  gamingCenterSlug: string;
  gamingCenterName: string;
  initialCustomer?: { fullName: string; phone: string; email?: string };
  requireOtp?: boolean;
  onSuccess: (reservation: GroupReservation) => void;
  onRequestOtp?: (phone: string) => void;
}

export const GameNetGroupReservationFlow: React.FC<GameNetGroupReservationFlowProps> = ({
  gamingCenterSlug,
  gamingCenterName,
  initialCustomer,
  requireOtp,
  onSuccess,
  onRequestOtp,
}) => {
  const {
    categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useDeviceCategories(gamingCenterSlug);

  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | null>(null);
  const [selectedStations, setSelectedStations] = useState<PhysicalStation[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Auto-select first category if none selected
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Query stations based on selected category:
  // If catalogId is not null -> query via catalogDeviceId
  // If catalogId is null -> query via stationType (never send catalogDeviceId=null)
  const stationFilter = React.useMemo(() => {
    if (!selectedCategory) return {};
    if (selectedCategory.catalogId) {
      return { catalogDeviceId: selectedCategory.catalogId, limit: 100 };
    }
    return { stationType: selectedCategory.deviceType, limit: 100 };
  }, [selectedCategory]);

  const {
    stations,
    isLoading: isStationsLoading,
    error: stationsError,
    refetch: refetchStations,
  } = useGamingCenterStations(gamingCenterSlug, stationFilter);

  // When switching categories: clear selected stations to prevent submitting stations from earlier categories
  const handleSelectCategory = (cat: DeviceCategory) => {
    if (
      selectedCategory?.catalogId !== cat.catalogId ||
      selectedCategory?.deviceType !== cat.deviceType
    ) {
      setSelectedCategory(cat);
      setSelectedStations([]);
    }
  };

  const handleToggleStation = (station: PhysicalStation) => {
    setSelectedStations((prev) => {
      const exists = prev.some((s) => s.id === station.id);
      if (exists) {
        return prev.filter((s) => s.id !== station.id);
      } else {
        return [...prev, station];
      }
    });
  };

  const selectedStationIds = selectedStations.map((s) => s.id);
  const totalHourlyRate = selectedStations.reduce((sum, s) => sum + s.hourlyPrice, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Category selection */}
      <DeviceCategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        isLoading={isCategoriesLoading}
        error={categoriesError}
        onRetry={refetchCategories}
      />

      {/* Physical station selection */}
      {selectedCategory && (
        <PhysicalStationList
          stations={stations}
          selectedStationIds={selectedStationIds}
          onToggleStation={handleToggleStation}
          isLoading={isStationsLoading}
          error={stationsError}
          onRetry={refetchStations}
        />
      )}

      {/* Floating or fixed selection action bar when at least 1 station selected */}
      {selectedStations.length > 0 && (
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--primary)]/40 p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 text-right w-full sm:w-auto">
            <span className="text-sm font-bold text-[var(--text-white)]">
              {toPersianDigits(selectedStations.length)} دستگاه انتخاب شده
            </span>
            <div className="flex items-baseline gap-1 text-xs text-[var(--text-muted)]">
              <span>مجموع ساعتی:</span>
              <span className="text-sm font-black text-[var(--primary)]">
                {formatPrice(totalHourlyRate)}
              </span>
              <span>تومان / ساعت</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedStations([])}
              className="h-11 px-4 rounded-card bg-[var(--foreground)]/50 hover:bg-[var(--foreground)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors"
            >
              پاک کردن
            </button>

            <button
              type="button"
              onClick={() => setIsBookingModalOpen(true)}
              className="flex-1 sm:flex-none h-11 px-6 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <span>ادامه فرآیند رزرو گروهی</span>
              <span>←</span>
            </button>
          </div>
        </div>
      )}

      {/* Group Booking Modal */}
      {isBookingModalOpen && (
        <GroupBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          gamingCenterSlug={gamingCenterSlug}
          gamingCenterName={gamingCenterName}
          selectedStations={selectedStations}
          initialCustomer={initialCustomer}
          requireOtp={requireOtp}
          onSuccess={(res) => {
            setIsBookingModalOpen(false);
            setSelectedStations([]);
            onSuccess(res);
          }}
          onRequestOtp={onRequestOtp}
        />
      )}
    </div>
  );
};
