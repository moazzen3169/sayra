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
import { BannerSlider } from "@/components/BannerSlider";
import {
  PaymentSuccessModal,
  ReservationSummaryDetails,
} from "@/components/PaymentSuccessModal";
import {
  DevicePicker,
  categoryKey,
} from "@/components/gamecenter/DevicePicker";
import { DeviceSelectModal } from "@/components/gamecenter/DeviceSelectModal";
import { GroupBookingSheet } from "@/components/gamecenter/GroupBookingSheet";
import { GamesMarquee } from "@/components/gamecenter/GamesMarquee";
import { GamecenterInfoCard } from "@/components/gamecenter/GamecenterInfoCard";
import { useAuth } from "@/context/AuthContext";
import { useDeviceCategories } from "@/hooks/gaming-center/use-device-categories";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatDayLabel, getErrorMessage } from "@/lib/reservationUi";
import { loadGamecenterDetail } from "@/services/gamecenterDetailService";
import type { GamecenterDetail } from "@/types/gamecenter";
import type { BannerItem } from "@/types/home";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import type { PhysicalStation } from "@/types/gaming-center/station.types";
import { PLACEHOLDERS } from "@/lib/media";

/* ---------- Helpers ---------- */

const GALLERY_ASPECT = "aspect-[2/1] sm:aspect-[2.2/1] lg:aspect-[16/10]";

const scrollToId = (id: string) =>
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

const SectionTitle: React.FC<{
  step?: number;
  title: string;
  hint?: string;
}> = ({ step, title, hint }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 min-w-0">
      {step ? (
        <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--primary)] text-on-primary text-xs font-bold flex items-center justify-center pt-0.5">
          {toPersianDigits(step)}
        </span>
      ) : (
        <span className="h-5 w-1 rounded-full bg-[var(--primary)]" />
      )}
      <h2 className="text-base font-bold text-[var(--text-white)] truncate">
        {title}
      </h2>
    </div>
    {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
  </div>
);

/* ---------- Booking CTA (mobile bar / desktop card) ---------- */

interface BookingCtaProps {
  summary: { key: string; label: string; count: number }[];
  deviceCount: number;
  hourly: number;
  onPick: () => void;
  onBook: () => void;
  variant: "bar" | "card";
}

const BookingCta: React.FC<BookingCtaProps> = ({
  summary,
  deviceCount,
  hourly,
  onPick,
  onBook,
  variant,
}) => {
  const has = deviceCount > 0;

  const info = has ? (
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-[var(--text-muted)]">
        {toPersianDigits(deviceCount)} دستگاه انتخاب کردی
      </span>
      <span className="text-base font-black text-[var(--primary)]">
        {formatPrice(hourly)}{" "}
        <span className="text-xs font-normal text-[var(--text-white)]">
          تومان / ساعت
        </span>
      </span>
    </div>
  ) : (
    <span className="text-xs font-bold text-[var(--text-muted)]">
      دستگاهتو انتخاب کن
    </span>
  );

  const button = (
    <button
      type="button"
      onClick={has ? onBook : onPick}
      className={`h-12 rounded-card font-bold text-sm transition-all active:scale-[0.98] ${
        has
          ? "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary"
          : "bg-[var(--foreground)] text-[var(--text-white)]"
      } ${variant === "bar" ? "px-5 shrink-0" : "w-full"}`}
    >
      {has ? "انتخاب روز و ساعت" : "انتخاب دستگاه"}
    </button>
  );

  if (variant === "bar") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none lg:hidden">
        <div className="w-full max-w-[var(--max-app-width)] bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 pointer-events-auto shadow-2xl">
          {info}
          {button}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex sticky top-20 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto flex-col gap-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 w-full">
      <h3 className="text-sm font-bold text-[var(--text-white)]">
        رزرو سریع و آنلاین
      </h3>

      {has && (
        <ul className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
          {summary.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-white)] font-bold truncate">
                {s.label}
              </span>
              <span className="shrink-0">{toPersianDigits(s.count)} عدد</span>
            </li>
          ))}
        </ul>
      )}

      {info}
      {button}

      <ol className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-3">
        <li>۱. دستگاه یا بازی رو انتخاب کن</li>
        <li>۲. زمان خالی رو مشخص کن</li>
        <li>۳. با خیال راحت رزرو کن</li>
      </ol>
    </aside>
  );
};

/* ---------- Page Skeleton (Strict Layout Alignment) ---------- */

const GameCenterDetailSkeleton: React.FC = () => (
  <div
    className="px-4 desk:p-6 relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-8 lg:items-start animate-pulse"
    aria-busy="true"
  >
    {/* Sidebar column skeleton */}
    <aside className="flex flex-col gap-5 min-w-0 lg:order-2 desk:bg-[var(--bg-card)] rounded-[14px] desk:p-2 w-full">
      <div className={`w-full rounded-card bg-[var(--bg-card)] ${GALLERY_ASPECT}`} />
      <div className="flex flex-col gap-3 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5">
        <div className="h-6 w-3/4 rounded bg-[var(--bg-body)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--bg-body)]" />
        <div className="h-10 w-full rounded bg-[var(--bg-body)] mt-2" />
      </div>
      <div className="hidden lg:flex flex-col gap-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 w-full">
        <div className="h-5 w-1/3 rounded bg-[var(--bg-body)]" />
        <div className="h-12 w-full rounded bg-[var(--bg-body)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--bg-body)]" />
      </div>
    </aside>

    {/* Main column skeleton */}
    <div className="flex flex-col gap-8 min-w-0 mt-6 lg:mt-0 lg:order-1 w-full">
      {/* Device Picker Carousel Skeleton */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--bg-card)]" />
          <div className="h-5 w-32 rounded bg-[var(--bg-card)]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3"
            >
              <div className="aspect-[4/3] w-full rounded-card bg-[var(--bg-body)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--bg-body)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--bg-body)]" />
              <div className="mt-2 h-11 w-full rounded bg-[var(--bg-body)]" />
            </div>
          ))}
        </div>
      </section>

      <hr className="border-[var(--border-subtle)] my-1" />

      {/* Games Marquee Skeleton */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-[var(--bg-card)]" />
          <div className="h-5 w-28 rounded bg-[var(--bg-card)]" />
        </div>
        <div className="h-24 w-full rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]" />
      </section>

      {/* Reviews Skeleton */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-[var(--bg-card)]" />
          <div className="h-5 w-24 rounded bg-[var(--bg-card)]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5"
            />
          ))}
        </div>
      </section>
    </div>
  </div>
);

/* ---------- Page ---------- */

export default function GameCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [selectedCity, setSelectedCity] = useState("تبریز");

  const router = useRouter();
  const { id: gamingCenterSlug } = use(params);
  const { user } = useAuth();

  // Data
  const [detail, setDetail] = useState<GamecenterDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // کاتالوگ دسته‌بندی دستگاه‌ها (API)
  const {
    categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useDeviceCategories(gamingCenterSlug);

  // دستگاه‌های انتخاب‌شده به تفکیک دسته
  const [selection, setSelection] = useState<
    Record<string, PhysicalStation[]>
  >({});
  const [activeCategory, setActiveCategory] = useState<DeviceCategory | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Modals
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successDetails, setSuccessDetails] =
    useState<ReservationSummaryDetails | null>(null);

  // UI
  const [showAllReviews, setShowAllReviews] = useState(false);

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
    [selection],
  );
  const deviceCount = selectedStations.length;
  // برآورد ساعتی (قیمت نهایی را Backend بعد از ثبت اعلام می‌کند)
  const hourly = selectedStations.reduce(
    (a, s) => a + (s.hourlyPrice || 0),
    0,
  );

  const summary = useMemo(
    () =>
      categories
        .map((c) => ({
          key: categoryKey(c),
          label: c.name,
          count: selection[categoryKey(c)]?.length ?? 0,
        }))
        .filter((s) => s.count > 0),
    [categories, selection],
  );

  const handleSelectionChange = useCallback(
    (key: string, stations: PhysicalStation[]) => {
      setSelection((prev) => {
        const copy = { ...prev };
        if (stations.length === 0) delete copy[key];
        else copy[key] = stations;
        return copy;
      });
    },
    [],
  );

  const galleryItems: BannerItem[] = useMemo(() => {
    const images = detail?.images ?? [];
    if (images.length === 0) {
      return [
        {
          id: "fallback-gallery",
          imageUrl: PLACEHOLDERS.gallery,
          alt: detail?.center.name
            ? `تصویر گالری ${detail.center.name}`
            : "تصویر گیمنت",
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

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-32 lg:pb-12">
      <Header
        locationName={selectedCity}
        onCityChange={(city) => setSelectedCity(city)}
      />

      <main className="flex-1 pt-[var(--header-h)] flex flex-col gap-6 pt-3">
        {/* Loading (Zero Layout Shift Skeleton) */}
        {!detail && !loadError && <GameCenterDetailSkeleton />}

        {/* Error */}
        {loadError && (
          <div className="mx-4 desk:mx-6 lg:mx-8 mt-6 p-8 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col items-center gap-4 text-center max-w-lg mx-auto shadow-lg">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-red)]/15 flex items-center justify-center text-[var(--accent-red)]">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-[var(--text-white)]">
                ارتباط با سرور برقرار نشد
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {loadError}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setReloadToken((v) => v + 1)}
                className="h-11 px-6 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                تلاش دوباره
              </button>
              <button
                type="button"
                onClick={() => router.push("/gamecenters")}
                className="h-11 px-6 rounded-card bg-[var(--foreground)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)] transition-all cursor-pointer"
              >
                مشاهده بقیه گیم‌نت‌ها
              </button>
            </div>
          </div>
        )}

        {detail && (
          <div className="px-4 desk:p-6 relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-8 lg:items-start">
            {/* ===== Sidebar column ===== */}
            <aside className="flex flex-col gap-5 min-w-0 lg:order-2 desk:bg-[var(--bg-card)] rounded-[14px] desk:p-2">
              {galleryItems.length > 0 && (
                <div className="w-full">
                  <BannerSlider
                    banners={galleryItems}
                    fallbackSrc={PLACEHOLDERS.gallery}
                    aspectClassName={GALLERY_ASPECT}
                    ariaLabel="گالری تصاویر گیمنت"
                  />
                </div>
              )}

              <GamecenterInfoCard
                title={title}
                address={address}
                rating={rating}
                gamesCount={detail.games.length}
                reviewsCount={reviews.length}
                onScrollTo={scrollToId}
              />

              <BookingCta
                variant="card"
                summary={summary}
                deviceCount={deviceCount}
                hourly={hourly}
                onPick={() => scrollToId("stations")}
                onBook={() => setIsSheetOpen(true)}
              />
            </aside>

            {/* ===== Main column ===== */}
            <div className="flex flex-col gap-8 min-w-0 mt-6 lg:mt-0 lg:order-1">
              {/* Step 1: devices */}
              <section
                id="stations"
                className="flex flex-col gap-4 scroll-mt-20"
              >
                <SectionTitle
                  step={1}
                  title="انتخاب دستگاه"
                  hint="دستگاهت رو انتخاب کن و رزرو رو شروع کن"
                />
                <DevicePicker
                  categories={categories}
                  isLoading={isCategoriesLoading}
                  error={categoriesError}
                  onRetry={refetchCategories}
                  selection={selection}
                  onOpen={setActiveCategory}
                />
              </section>

              <hr className="border-[var(--border-subtle)] my-1" />

              {/* Games */}
              {detail.games.length > 0 && (
                <section
                  id="games"
                  className="flex flex-col gap-3 scroll-mt-20"
                >
                  <SectionTitle
                    title="بازی‌های موجود"
                    hint={`${toPersianDigits(detail.games.length)} بازی آماده اجرا`}
                  />
                  <GamesMarquee games={detail.games} />
                </section>
              )}

              {/* Reviews */}
              <section
                id="reviews"
                className="flex flex-col gap-3 scroll-mt-20"
              >
                <SectionTitle title="نظرات کاربران" />
                {reviews.length === 0 ? (
                  <p className="rounded-card border border-dashed border-[var(--border-color)] p-6 text-center text-xs text-[var(--text-muted)]">
                    هنوز هیچ نظری برای این گیم‌نت ثبت نشده، بعد از بازی اولین نفری باش که نظر میده!
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
                      {visibleReviews.map((r) => (
                        <article
                          key={r.id}
                          className="bg-[var(--bg-card)] rounded-card p-3.5 border border-[var(--border-subtle)] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 shrink-0 rounded-child bg-[var(--foreground)] text-[var(--primary)] font-bold text-xs flex items-center justify-center pt-0.5">
                                {r.author[0]}
                              </span>
                              <span className="text-xs font-bold truncate">
                                {r.author}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[var(--accent-star)]">
                              ★ {toPersianDigits(r.rating)}
                            </span>
                          </div>
                          {r.comment && (
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                          {r.createdAt && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {formatDayLabel(r.createdAt)}
                            </span>
                          )}
                        </article>
                      ))}
                    </div>
                    {reviews.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllReviews((v) => !v)}
                        className="self-center h-11 px-5 rounded-full border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)]"
                      >
                        {showAllReviews
                          ? "دیدن کمتر"
                          : `مشاهده همه ${toPersianDigits(reviews.length)} نظر`}
                      </button>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom bar */}
      {detail && (
        <BookingCta
          variant="bar"
          summary={summary}
          deviceCount={deviceCount}
          hourly={hourly}
          onPick={() => scrollToId("stations")}
          onBook={() => setIsSheetOpen(true)}
        />
      )}

      {/* مودال تمام‌صفحه‌ی انتخاب دستگاه‌های یک دسته */}
      {activeCategory && (
        <DeviceSelectModal
          gamingCenterSlug={gamingCenterSlug}
          category={activeCategory}
          selected={selection[categoryKey(activeCategory)] ?? []}
          onChange={(stations) =>
            handleSelectionChange(categoryKey(activeCategory), stations)
          }
          onClose={() => setActiveCategory(null)}
        />
      )}

      {/* مودال تمام‌صفحه‌ی انتخاب روز و ساعت + ثبت رزرو گروهی */}
      {isSheetOpen && detail && selectedStations.length > 0 && (
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
          onSuccess={(groupRes) => {
            setIsSheetOpen(false);
            setSuccessDetails({
              gameCenterTitle: detail.center.name,
              reservationId: groupRes.id,
              trackingCode: groupRes.trackingCode || groupRes.id,
              grandTotal: groupRes.totalPrice,
              devicesSummary: groupRes.items
                ?.map((it) => it.stationName || "دستگاه")
                .join("، "),
              totalHours: Math.round(groupRes.durationMinutes / 60),
              dateStr: new Date(groupRes.startTime).toLocaleDateString(
                "fa-IR",
              ),
            });
            setIsSuccessOpen(true);
          }}
        />
      )}

      {/* مدال تایید موفقیت ثبت رزرو */}
      <PaymentSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          setSuccessDetails(null);
          setSelection({});
        }}
        details={successDetails}
      />
    </div>
  );
}
