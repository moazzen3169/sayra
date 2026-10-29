"use client";

import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { BannerSlider } from "@/components/BannerSlider";
import { AuthModal } from "@/components/AuthModal";
import {
  PaymentSuccessModal,
  ReservationSummaryDetails,
} from "@/components/PaymentSuccessModal";
import { DevicePicker } from "@/components/gamecenter/DevicePicker";
import { GamesMarquee } from "@/components/gamecenter/GamesMarquee";
import {
  BookingSheet,
  type BookingSelection,
} from "@/components/gamecenter/BookingSheet";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import {
  groupStations,
  type BookingItem,
  type BookingLine,
  type CartEntry,
} from "@/lib/devices";
import { formatPrice, toPersianDigits } from "@/lib/format";
import {
  formatDayLabel,
  getErrorMessage,
  isSlotConflictError,
  mapsUrl,
} from "@/lib/reservationUi";
import {
  gamingCenterService,
  loadGamecenterDetail,
} from "@/services/gamecenterDetailService";
import { itemKey, submitBooking } from "@/services/bookingService";
import type { GamecenterDetail } from "@/types/gamecenter";
import type { BannerItem } from "@/types/home";
import type { Reservation } from "@/types/reservation";
import { GamecenterInfoCard } from "@/components/gamecenter/GamecenterInfoCard";

/* ---------- Helpers ---------- */

/** اطلاعات یک تلاش ثبت؛ بین مرحله‌ی ورود و ساخت رزرو نگه داشته می‌شود */
interface PendingBooking {
  items: BookingItem[];
  summary: ReservationSummaryDetails;
}

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
  <div className="flex items-center justify-between gap-3">
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
    {hint && (
      <span className="text-xs text-[var(--text-muted)] shrink-0">
        {hint}
      </span>
    )}
  </div>
);

/* ---------- Booking CTA (mobile bar / desktop card) ---------- */

interface BookingCtaProps {
  lines: BookingLine[];
  deviceCount: number;
  hourly: number;
  onPick: () => void;
  onBook: () => void;
  variant: "bar" | "card";
}

const BookingCta: React.FC<BookingCtaProps> = ({
  lines,
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
        {toPersianDigits(deviceCount)} دستگاه انتخاب شده
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
      دستگاه‌های موردنظر را انتخاب کنید
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
        رزرو آنلاین
      </h3>

      {has && (
        <ul className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
          {lines.map((l) => (
            <li
              key={l.group.key}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-[var(--text-white)] font-bold truncate">
                {l.group.label}
              </span>
              <span className="shrink-0">
                {toPersianDigits(l.qty)} عدد
                {l.extra > 0 ? ` • +${toPersianDigits(l.extra)} دسته` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {info}
      {button}

      <ol className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-3">
        <li>۱. نوع و تعداد دستگاه را انتخاب کنید</li>
        <li>۲. روز و ساعت‌ها را انتخاب کنید</li>
        <li>۳. رزرو را ثبت کنید</li>
      </ol>
    </aside>
  );
};

/* ---------- Page ---------- */

export default function GameCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: gamingCenterSlug } = use(params);
  const { isLoggedIn, user, login } = useAuth();

  // Data
  const [detail, setDetail] = useState<GamecenterDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Cart: key = نوع دستگاه
  const [cart, setCart] = useState<Record<string, CartEntry>>({});

  // Booking
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(
    null,
  );
  const submittingRef = useRef(false);
  // بین تلاش‌های مجدد ثابت می‌مانند تا رزرو تکراری ساخته نشود
  const keysRef = useRef<Map<string, string>>(new Map());
  const doneRef = useRef<Map<string, Reservation>>(new Map());

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successDetails, setSuccessDetails] =
    useState<ReservationSummaryDetails | null>(null);

  // UI
  const [showStickyTitle, setShowStickyTitle] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyTitle(window.scrollY > 180);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const groups = useMemo(() => groupStations(detail?.stations ?? []), [detail]);

  const lines: BookingLine[] = useMemo(
    () =>
      groups.flatMap((g) => {
        const e = cart[g.key];
        return e && e.qty > 0
          ? [{ group: g, qty: e.qty, extra: g.isConsole ? e.extra : 0 }]
          : [];
      }),
    [groups, cart],
  );

  const deviceCount = lines.reduce((a, l) => a + l.qty, 0);
  // برآورد ساعتی (قیمت نهایی را Backend بعد از ثبت اعلام می‌کند)
  const hourly = lines.reduce(
    (a, l) =>
      a +
      l.qty *
        (l.group.minPrice + l.extra * (l.group.extraControllerPrice ?? 0)),
    0,
  );

  const handleQtyChange = useCallback(
    (key: string, qty: number) => {
      const g = groups.find((x) => x.key === key);
      if (!g) return;
      const next = Math.max(0, Math.min(qty, g.capacity));
      setCart((prev) => {
        const copy = { ...prev };
        if (next <= 0) delete copy[key];
        else copy[key] = { qty: next, extra: prev[key]?.extra ?? 0 };
        return copy;
      });
    },
    [groups],
  );

  const handleExtraChange = useCallback(
    (key: string, extra: number) => {
      const g = groups.find((x) => x.key === key);
      if (!g) return;
      const next = Math.max(0, Math.min(extra, g.maxExtra));
      setCart((prev) =>
        prev[key] ? { ...prev, [key]: { ...prev[key], extra: next } } : prev,
      );
    },
    [groups],
  );

  const galleryItems: BannerItem[] = useMemo(
    () =>
      (detail?.images ?? []).map((img) => ({
        id: img.id,
        imageUrl: img.url,
        alt: img.alt,
      })),
    [detail],
  );

  const rating = useMemo(() => {
    const list = detail?.reviews ?? [];
    if (list.length === 0) return null;
    return {
      avg: list.reduce((a, r) => a + r.rating, 0) / list.length,
      count: list.length,
    };
  }, [detail]);

  const openSheet = useCallback(() => {
    setSubmitError(null);
    setProgress(null);
    setIsSheetOpen(true);
  }, []);

  /**
   * ثبت رزروها در Backend. قیمت و وضعیت نهایی فقط از پاسخ Backend می‌آید.
   * TODO: بعد از مشخص شدن ساختار Response مربوط به Payment Init (OpenAPI)،
   * همین‌جا Payment Init صدا زده شود. فعلاً در حالت واقعی به صفحه‌ی رزرو(ها) می‌رویم
   * تا paymentState را از Backend ببینند.
   */
  const finalizeBooking = async (
    booking: PendingBooking,
    customer: { fullName: string; phone: string },
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setProgress({ done: 0, total: booking.items.length });

    try {
      const created = await submitBooking({
        gamingCenterSlug,
        items: booking.items,
        customer,
        gamingCenterName: detail?.center.name,
        gamingCenterAddress: detail?.address,
        keys: keysRef.current,
        done: doneRef.current,
        onProgress: (done, total) => setProgress({ done, total }),
      });

      keysRef.current = new Map();
      doneRef.current = new Map();
      setPendingBooking(null);
      setIsSheetOpen(false);

      if (USE_MOCK_RESERVATIONS) {
        const single = created.length === 1 ? created[0] : null;
        setSuccessDetails({
          ...booking.summary,
          reservationId: single?.id,
          trackingCode: single?.reservationCode,
          grandTotal: created.reduce((a, r) => a + r.totalPrice, 0),
        });
        setIsSuccessOpen(true);
      } else if (created.length === 1) {
        router.push(`/reservations/${encodeURIComponent(created[0].id)}`);
      } else {
        router.push("/reservations");
      }
    } catch (e) {
      const doneCount = booking.items.filter((it) =>
        doneRef.current.has(itemKey(it)),
      ).length;
      let msg = getErrorMessage(e);
      if (doneCount > 0) {
        msg += ` (${toPersianDigits(doneCount)} از ${toPersianDigits(booking.items.length)} رزرو قبلاً ثبت شده و تکرار نمی‌شود؛ می‌توانید دوباره ثبت را بزنید.)`;
      }
      setSubmitError(msg);
      // Availability تغییر کرده: لیست ساعت‌ها دوباره از Backend گرفته می‌شود
      if (isSlotConflictError(e)) setSlotsRefreshKey((k) => k + 1);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const handleConfirm = ({ date, slots, items }: BookingSelection) => {
    const devicesSummary = lines
      .map(
        (l) =>
          `${toPersianDigits(l.qty)} عدد ${l.group.label}` +
          (l.extra > 0
            ? ` (با ${toPersianDigits(l.extra)} دسته اضافه برای هر دستگاه)`
            : ""),
      )
      .join("، ");

    const booking: PendingBooking = {
      items,
      summary: {
        gameCenterTitle: detail?.center.name,
        dateStr: date.dateStr,
        dayName: date.dayName,
        timeSlots: slots.map((s) =>
          s.endLabel ? `${s.startLabel} تا ${s.endLabel}` : s.startLabel,
        ),
        totalHours: slots.length,
        devicesSummary,
      },
    };

    setPendingBooking(booking);

    if (isLoggedIn && user) {
      finalizeBooking(booking, { fullName: user.fullName, phone: user.phone });
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = (
    fullName: string,
    phone: string,
    token?: string,
  ) => {
    login(fullName, phone, token);
    setIsAuthModalOpen(false);
    if (pendingBooking) finalizeBooking(pendingBooking, { fullName, phone });
  };

  const title = detail?.center.name ?? "گیمنت";
  const address = detail?.address ?? "";
  const reviews = detail?.reviews ?? [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-32 lg:pb-12">
      <GamecenterDetailHeader
        title={title}
        location={address}
        showDetails={showStickyTitle}
        onBackClick={() => router.back()}
        onNotificationClick={() => {}}
      />

      <main className="flex-1 mt-13 flex flex-col gap-6 pt-3">
        {/* Loading */}
        {!detail && !loadError && (
          <div
            className="px-4 desk:px-6 lg:px-8 flex flex-col gap-4 animate-pulse"
            aria-busy="true"
          >
            <div
              className={`w-full rounded-card bg-[var(--bg-card)] ${GALLERY_ASPECT}`}
            />
            <div className="h-6 w-1/2 rounded bg-[var(--bg-card)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--bg-card)]" />
            <div className="h-28 rounded-card bg-[var(--bg-card)]" />
            <div className="h-28 rounded-card bg-[var(--bg-card)]" />
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="mx-4 desk:mx-6 lg:mx-8 mt-6 p-6 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-bold text-[var(--accent-red)]">
              {loadError}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReloadToken((v) => v + 1)}
                className="h-10 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold"
              >
                تلاش دوباره
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-10 px-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold"
              >
                بازگشت به خانه
              </button>
            </div>
          </div>
        )}

        {detail && (
          <div className="px-4 desk:p-6 relative flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_450px] lg:gap-8 lg:items-start">
            {/* ===== Sidebar column ( گالری در بالا + جزییات گیمنت در زیر آن ) ===== */}
            <aside className="flex flex-col gap-5 min-w-0 lg:order-2 desk:bg-[var(--bg-card)] rounded-[14px] desk:p-2">
              {/* Gallery */}
              {galleryItems.length > 0 && (
                <div className="w-full">
                  <BannerSlider
                    banners={galleryItems}
                    aspectClassName={GALLERY_ASPECT}
                    ariaLabel="گالری تصاویر گیمنت"
                  />
                </div>
              )}

              {/* Info Details */}
              <GamecenterInfoCard
                title={title}
                address={address}
                rating={rating}
                gamesCount={detail.games.length}
                reviewsCount={reviews.length}
                onScrollTo={scrollToId}
              />

              {/* Desktop booking card embedded in sidebar below info */}
              <BookingCta
                variant="card"
                lines={lines}
                deviceCount={deviceCount}
                hourly={hourly}
                onPick={() => scrollToId("stations")}
                onBook={openSheet}
              />
            </aside>

            {/* ===== Main column ( سمت راست: ابتدا دستگاه ها، سپس بازی ها و نظرات ) ===== */}
            <div className="flex flex-col gap-8 min-w-0 mt-6 lg:mt-0 lg:order-1">
              {/* Step 1: devices */}
              <section
                id="stations"
                className="flex flex-col gap-3 scroll-mt-20"
              >
                <SectionTitle
                  step={1}
                  title="انتخاب دستگاه"
                  hint="دستگاه‌های موردنظر برای رزرو را انتخاب کنید"
                />
                <DevicePicker
                  groups={groups}
                  cart={cart}
                  onQtyChange={handleQtyChange}
                  onExtraChange={handleExtraChange}
                />
              </section>

              {/* Horizontal divider */}
              <hr className="border-[var(--border-subtle)] my-1" />

              {/* Games */}
              {detail.games.length > 0 && (
                <section
                  id="games"
                  className="flex flex-col gap-3 scroll-mt-20"
                >
                  <SectionTitle
                    title="بازی‌های نصب‌شده"
                    hint={`${toPersianDigits(detail.games.length)} بازی`}
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
                    هنوز نظری برای این گیمنت ثبت نشده است.
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
                            <span className="text-xs text-[var(--text-subtle)]">
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
                        className="self-center h-9 px-5 rounded-full border border-[var(--border-color)] text-xs font-bold text-[var(--text-white)] hover:border-[var(--primary)]"
                      >
                        {showAllReviews
                          ? "نمایش کمتر"
                          : `نمایش همه ${toPersianDigits(reviews.length)} نظر`}
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
          lines={lines}
          deviceCount={deviceCount}
          hourly={hourly}
          onPick={() => scrollToId("stations")}
          onBook={openSheet}
        />
      )}

      {/* Booking sheet: روز + ساعت‌ها + ثبت در یک مرحله */}
      {isSheetOpen && lines.length > 0 && (
        <BookingSheet
          gamingCenterSlug={gamingCenterSlug}
          lines={lines}
          isSubmitting={isSubmitting}
          submitError={submitError}
          progress={progress}
          refreshKey={slotsRefreshKey}
          onClose={() => setIsSheetOpen(false)}
          onConfirm={handleConfirm}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* فقط در حالت Mock؛ در حالت واقعی وضعیت پرداخت از Backend خوانده می‌شود */}
      <PaymentSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          setSuccessDetails(null);
          setCart({});
        }}
        details={successDetails}
      />
    </div>
  );
}
