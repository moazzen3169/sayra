"use client";

import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ErrorState } from "@/components/ui/ErrorState";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BannerSlider } from "@/components/BannerSlider";
import {
  DevicePicker,
  categoryKey,
} from "@/components/gamecenter/DevicePicker";
import { DeviceSelectModal } from "@/components/gamecenter/DeviceSelectModal";
import { GroupBookingSheet } from "@/components/gamecenter/GroupBookingSheet";
import { GamesMarquee } from "@/components/gamecenter/GamesMarquee";
import { GamecenterInfoCard } from "@/components/gamecenter/GamecenterInfoCard";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { useDeviceCategories } from "@/hooks/gaming-center/use-device-categories";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getEffectiveStationPricing } from "@/lib/stationPricing";
import {
  formatDayLabel,
  getErrorMessage,
  isCenterReservationDisabled,
} from "@/lib/reservationUi";
import { loadGamecenterDetail } from "@/services/gamecenterDetailService";
import { stationApi } from "@/services/gaming-center/station.api";
import type { GamecenterDetail } from "@/types/gamecenter";
import type { BannerItem } from "@/types/home";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { PLACEHOLDERS } from "@/lib/media";
import { cn } from "@/lib/utils";

const GALLERY_ASPECT = "aspect-[2/1] lg:aspect-[16/10]";

const scrollToId = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

const GameCenterDetailSkeleton: React.FC = () => (
  <div
    className="px-4 lg:p-6 relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 lg:items-start"
    aria-busy="true"
  >
    <span className="sr-only">در حال بارگذاری</span>
    <aside className="flex flex-col gap-4 min-w-0 lg:order-2 w-full">
      <Skeleton className={`w-full ${GALLERY_ASPECT}`} />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="hidden lg:block h-36 w-full" />
    </aside>

    <div className="flex flex-col gap-6 min-w-0 mt-6 lg:mt-0 lg:order-1 w-full">
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export default function GameCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: gamingCenterSlug } = use(params);
  return (
    <GameCenterDetailContent
      key={gamingCenterSlug}
      gamingCenterSlug={gamingCenterSlug}
    />
  );
}

function GameCenterDetailContent({
  gamingCenterSlug,
}: {
  gamingCenterSlug: string;
}) {
  const { selectedCity, setCity } = useCity();
  const router = useRouter();
  const { user } = useAuth();

  const [detail, setDetail] = useState<GamecenterDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const {
    categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useDeviceCategories(gamingCenterSlug);

  const [selection, setSelection] = useState<Record<string, PhysicalStation[]>>({});
  const [activeCategory, setActiveCategory] = useState<DeviceCategory | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const reservationDisabled = useMemo(
    () => isCenterReservationDisabled(detail?.center),
    [detail]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    loadGamecenterDetail(gamingCenterSlug, controller.signal)
      .then((d) => {
        if (active) {
          setDetail(d);
          setLoadError(null);
        }
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setLoadError(getErrorMessage(e));
        setDetail(null);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterSlug, reloadToken]);

  const selectedStations = useMemo(
    () => Object.values(selection).flat(),
    [selection]
  );
  const deviceCount = selectedStations.length;
  const hourly = selectedStations.reduce(
    (a, s) => a + getEffectiveStationPricing(s).finalHourlyPrice,
    0
  );

  const handleSelectionChange = useCallback(
    (key: string, stations: PhysicalStation[]) => {
      if (reservationDisabled) return;
      setSelection((prev) => {
        const copy = { ...prev };
        if (stations.length === 0) delete copy[key];
        else copy[key] = stations;
        return copy;
      });
    },
    [reservationDisabled]
  );

  const handleOpenCategory = useCallback(
    async (category: DeviceCategory) => {
      if (reservationDisabled) return;
      const key = categoryKey(category);

      if (category.deviceCount === 1) {
        const existing = selection[key] ?? [];
        if (existing.length > 0) {
          handleSelectionChange(key, []);
          return;
        }
        try {
          const filter = category.catalogId
            ? { catalogDeviceId: category.catalogId, limit: 1 }
            : { stationType: category.deviceType, limit: 1 };
          const res = await stationApi.getPhysicalStations(gamingCenterSlug, filter);
          if (res.stations.length === 1) {
            handleSelectionChange(key, [res.stations[0]]);
            return;
          }
        } catch {
          // Fallback to opening the modal
        }
      }

      setActiveCategory(category);
    },
    [reservationDisabled, selection, gamingCenterSlug, handleSelectionChange]
  );

  const galleryItems: BannerItem[] = useMemo(() => {
    const images = detail?.images ?? [];
    if (images.length === 0) {
      return [
        {
          id: "fallback-gallery",
          imageUrl: PLACEHOLDERS.gallery,
          alt: detail?.center.name || "تصویر گیمنت",
        },
      ];
    }
    return images.map((img) => ({
      id: img.id,
      imageUrl: img.url,
      alt: img.alt || detail?.center.name || "تصویر گیمنت",
    }));
  }, [detail]);

  const rating = useMemo(() => {
    const list = detail?.reviews ?? [];
    if (list.length === 0) return null;
    return {
      avg: list.reduce((a, r) => a + r.rating, 0) / list.length,
      count: list.length,
    };
  }, [detail]);

  const title = detail?.center.name ?? "گیمنت";
  const address = detail?.address ?? "";
  const reviews = detail?.reviews ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 4);
  const showMobileBar = Boolean(detail) && !reservationDisabled && deviceCount > 0;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/gamecenters");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] lg:pb-12",
        showMobileBar ? "pb-32" : "pb-8"
      )}
    >
      <Header
        hideOnMobile
        locationName={selectedCity}
        onCityChange={(city) => setCity(city)}
      />
      <PageHeader title={title} onBack={handleBack} className="lg:hidden" />

      <main className="flex-1 lg:pt-[var(--header-h)] flex flex-col gap-6 pt-3">
        {!detail && !loadError && <GameCenterDetailSkeleton />}

        {loadError && (
          <div className="px-4 py-8 max-w-lg mx-auto w-full">
            <ErrorState
              title="بارگذاری انجام نشد"
              description={loadError}
              onRetry={() => setReloadToken((v) => v + 1)}
            />
          </div>
        )}

        {detail && (
          <div className="px-4 lg:p-6 relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 lg:items-start">
            {/* موبایل: گالری + اطلاعات؛ دسکتاپ: ستون کناری */}
            <aside className="flex flex-col gap-4 min-w-0 lg:order-2">
              {galleryItems.length > 0 && (
                <BannerSlider
                  banners={galleryItems}
                  fallbackSrc={PLACEHOLDERS.gallery}
                  aspectClassName={GALLERY_ASPECT}
                  ariaLabel="گالری تصاویر گیمنت"
                />
              )}

              <GamecenterInfoCard
                title={title}
                address={address}
                rating={rating}
                onScrollTo={scrollToId}
              />

              {/* سایدبار دسکتاپ */}
              <div className="hidden lg:flex sticky top-20 self-start flex-col gap-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 w-full">
                {deviceCount > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-card-title text-[var(--text-white)]">
                      {toPersianDigits(deviceCount)} دستگاه
                    </span>
                    <span className="text-key-number text-[var(--primary)]">
                      {formatPrice(hourly)}{" "}
                      <span className="text-xs font-normal text-[var(--text-white)]">
                        تومان / ساعت
                      </span>
                    </span>
                    <span className="text-secondary text-[var(--text-muted)]">
                      برآورد
                    </span>
                  </div>
                ) : (
                  <span className="text-secondary text-[var(--text-muted)]">
                    دستگاهی انتخاب نشده
                  </span>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  disabled={reservationDisabled || deviceCount === 0}
                  onClick={() => setIsSheetOpen(true)}
                  className="w-full"
                >
                  ادامه
                </Button>
              </div>
            </aside>

            {/* ستون اصلی: دستگاه‌ها ← بازی‌ها ← نظرات */}
            <div className="flex flex-col gap-8 min-w-0 mt-4 lg:mt-0 lg:order-1">
              <section id="stations" className="flex flex-col gap-3 scroll-mt-20">
                <SectionTitle title="دستگاه" className="mb-0" />

                {reservationDisabled && (
                  <InlineAlert variant="error">
                    رزرو آنلاین این گیمنت فعال نیست.
                  </InlineAlert>
                )}

                <DevicePicker
                  categories={categories}
                  isLoading={isCategoriesLoading}
                  error={categoriesError}
                  onRetry={refetchCategories}
                  selection={selection}
                  onOpen={handleOpenCategory}
                  reservationDisabled={reservationDisabled}
                />
              </section>

              {detail.games.length > 0 && (
                <section id="games" className="flex flex-col gap-3 scroll-mt-20">
                  <SectionTitle title="بازی‌ها" className="mb-0" />
                  <GamesMarquee games={detail.games} />
                </section>
              )}

              <section id="reviews" className="flex flex-col gap-3 scroll-mt-20">
                <SectionTitle title="نظرات" className="mb-0" />
                {reviews.length === 0 ? (
                  <p className="rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 text-center text-secondary text-[var(--text-muted)]">
                    هنوز نظری ثبت نشده
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
                      {visibleReviews.map((r) => (
                        <article
                          key={r.id}
                          className="bg-[var(--bg-card)] rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-child bg-[var(--foreground)] text-[var(--primary)] font-bold text-xs flex items-center justify-center leading-none">
                                {r.author[0]}
                              </span>
                              <span className="text-card-title text-[var(--text-white)] truncate">
                                {r.author}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-white)] shrink-0">
                              <Icon
                                name="star"
                                size={16}
                                filled
                                className="text-[var(--accent-star)]"
                              />
                              <span>{toPersianDigits(r.rating)}</span>
                            </span>
                          </div>
                          {r.comment && (
                            <p className="text-body text-[var(--text-muted)] leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                          {r.createdAt && (
                            <span className="text-secondary text-[var(--text-muted)]">
                              {formatDayLabel(r.createdAt)}
                            </span>
                          )}
                        </article>
                      ))}
                    </div>
                    {reviews.length > 4 && (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => setShowAllReviews((v) => !v)}
                        className="self-center"
                      >
                        {showAllReviews
                          ? "دیدن کمتر"
                          : `مشاهده همه ${toPersianDigits(reviews.length)} نظر`}
                      </Button>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {showMobileBar && (
        <StickyActionBar
          className="lg:hidden"
          info={
            <div className="flex flex-col gap-0.5">
              <span className="text-card-title text-[var(--text-white)]">
                {toPersianDigits(deviceCount)} دستگاه
              </span>
              <span className="text-secondary text-[var(--primary)]">
                {formatPrice(hourly)} تومان / ساعت
              </span>
            </div>
          }
          actionLabel="ادامه"
          onAction={() => setIsSheetOpen(true)}
        />
      )}

      {activeCategory && !reservationDisabled && (
        <DeviceSelectModal
          gamingCenterSlug={gamingCenterSlug}
          category={activeCategory}
          selected={selection[categoryKey(activeCategory)] ?? []}
          onChange={(stations) =>
            handleSelectionChange(categoryKey(activeCategory), stations)
          }
          onClose={() => setActiveCategory(null)}
          onContinue={() => {
            setActiveCategory(null);
            setIsSheetOpen(true);
          }}
        />
      )}

      {isSheetOpen && detail && !reservationDisabled && selectedStations.length > 0 && (
        <GroupBookingSheet
          gamingCenterId={detail.center.id}
          gamingCenterSlug={gamingCenterSlug}
          gamingCenterName={detail.center.name}
          gamingCenterAddress={detail.address}
          stations={selectedStations}
          initialCustomer={
            user ? { fullName: user.fullName, phone: user.phone } : undefined
          }
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </div>
  );
}
