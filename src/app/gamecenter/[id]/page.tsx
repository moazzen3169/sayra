"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { ExtraControllerModal } from "@/components/ExtraControllerModal";
import { CartModal, CartItem, DeviceOption } from "@/components/CartModal";
import { DateTimeModal } from "@/components/DateTimeModal";
import { AuthModal } from "@/components/AuthModal";
import { PaymentSuccessModal, ReservationSummaryDetails } from "@/components/PaymentSuccessModal";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { reservationService } from "@/services/reservationService";

const devicesData: DeviceOption[] = [
  {
    id: "pc",
    name: "کامپیوتر گیمینگ",
    type: "Computer",
    isConsole: false,
    pricePerHour: 180000,
    image: "/img/pc.webp",
    availableCount: 12,
  },
  {
    id: "ps5",
    name: "پلی استیشن ۵",
    type: "PS5",
    isConsole: true,
    pricePerHour: 220000,
    image: "/img/PS5.webp",
    availableCount: 8,
  },
  {
    id: "ps4",
    name: "پلی استیشن ۴",
    type: "PS4",
    isConsole: true,
    pricePerHour: 140000,
    image: "/img/PS4.webp",
    availableCount: 6,
  },
  {
    id: "xbox",
    name: "ایکس باکس سری ایکس",
    type: "Xbox",
    isConsole: true,
    pricePerHour: 190000,
    image: "/img/xbox.webp",
    availableCount: 5,
  },
];

const reviewsData = [
  {
    id: "r1",
    author: "علی محمدی",
    rating: 5,
    date: "۲ روز پیش",
    comment:
      "سیستم‌های بسیار قوی و مانیتورهای ۲۴۰ هرتز عالی بودن. برخورد پرسنل هم بسیار محترمانه بود.",
  },
  {
    id: "r2",
    author: "رضا کریمی",
    rating: 4.5,
    date: "۱ هفته پیش",
    comment:
      "صندلی‌های گیمینگ فوق‌العاده راحت. فقط کمی جای پارک سخت پیدا شد ولی در کل پیشنهاد میشه.",
  },
];

const EXTRA_CONTROLLER_PRICE_PER_HOUR = 30000;

/* ---------- Helpers ---------- */

/** خروجی DateTimeModal که برای ساخت رزرو لازم است */
interface ConfirmDetails {
  selectedDate: { id: string; dayName: string; dateStr: string };
  selectedSlots: { timeLabel: string; startHour: number }[];
  totalHours: number;
  grandTotal: number;
}

/** اطلاعات یک تلاش ثبت رزرو؛ بین مرحله ورود و ساخت رزرو نگه داشته می‌شود */
interface PendingBooking {
  idempotencyKey: string;
  startTime: string;
  totalHours: number;
  grandTotal: number;
  station: { id: string; name: string; stationType: string; hourlyPrice: number };
  summary: ReservationSummaryDetails;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** نگاشت موقت نوع دستگاه Mock به enum بک‌اند */
function toStationType(device: DeviceOption): string {
  if (device.type === "PS5" || device.type === "PS4") return "PLAYSTATION";
  if (device.type === "Xbox") return "XBOX";
  return "PC";
}

/**
 * ساخت زمان شروع از روز انتخابی ("day-N") و ساعت اولین اسلات.
 * موقت است تا زمانی که اسلات‌ها مستقیم از Availability API بیایند.
 */
function buildStartTime(dateId: string, startHour: number): string {
  const offset = Number(dateId.replace("day-", "")) || 0;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(startHour, 0, 0, 0);
  return d.toISOString();
}

export default function GameCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: gameCenterId } = use(params);
  const { isLoggedIn, user, login } = useAuth();

  // Basket State: list of selected devices with quantity and extra controllers
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Pending Reservation details stored during checkout flow
  const [pendingReservation, setPendingReservation] = useState<ReservationSummaryDetails | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);

  // Booking submit state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const submittingRef = useRef<boolean>(false);

  // Modals state
  const [pendingConsoleDevice, setPendingConsoleDevice] = useState<DeviceOption | null>(null);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState<boolean>(false);
  const [editingExtraDeviceId, setEditingExtraDeviceId] = useState<string | null>(null);

  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);
  const [isDateTimeModalOpen, setIsDateTimeModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState<boolean>(false);

  // Scroll detection for sticky header title
  const [showStickyTitle, setShowStickyTitle] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 180) {
        setShowStickyTitle(true);
      } else {
        setShowStickyTitle(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Device card interaction
  const handleSelectOrAddDevice = (dev: DeviceOption) => {
    const existing = cartItems.find((item) => item.device.id === dev.id);

    if (existing) {
      // If already in cart, open cart modal for minimal checkout/view
      setIsCartModalOpen(true);
    } else {
      if (dev.isConsole) {
        setPendingConsoleDevice(dev);
        setIsExtraModalOpen(true);
      } else {
        setCartItems((prev) => [
          ...prev,
          { device: dev, quantity: 1, extraControllersCount: 0 },
        ]);
      }
    }
  };

  const handleConfirmExtraControllers = (count: number) => {
    if (editingExtraDeviceId) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.device.id === editingExtraDeviceId
            ? { ...item, extraControllersCount: count }
            : item
        )
      );
      setEditingExtraDeviceId(null);
    } else if (pendingConsoleDevice) {
      setCartItems((prev) => [
        ...prev,
        {
          device: pendingConsoleDevice,
          quantity: 1,
          extraControllersCount: count,
        },
      ]);
      setPendingConsoleDevice(null);
    }
    setIsExtraModalOpen(false);
  };

  const handleUpdateQuantity = (deviceId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.device.id === deviceId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.device.availableCount) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveItem = (deviceId: string) => {
    setCartItems((prev) => prev.filter((item) => item.device.id !== deviceId));
  };

  const handleOpenEditExtraControllers = (deviceId: string) => {
    const item = cartItems.find((i) => i.device.id === deviceId);
    if (item) {
      setEditingExtraDeviceId(deviceId);
      setIsExtraModalOpen(true);
    }
  };

  const handleProceedToDateTime = () => {
    setIsCartModalOpen(false);
    setIsDateTimeModalOpen(true);
  };

  /**
   * ساخت رزرو در Backend و نمایش مودال موفقیت با reservationId.
   * TODO: در جریان واقعی، بعد از ساخت رزرو باید Payment Init انجام شود و مودال موفقیت
   * فقط بعد از تأیید پرداخت توسط Backend نمایش داده شود.
   */
  const finalizeReservation = async (
    booking: PendingBooking,
    customer: { fullName: string; phone: string }
  ) => {
    if (submittingRef.current) return; // جلوگیری از Submit تکراری
    submittingRef.current = true;
    setIsSubmitting(true);
    setBookingError(null);

    try {
      const created = await reservationService.create(
        {
          gamingCenterSlug: gameCenterId,
          idempotencyKey: booking.idempotencyKey,
          stationId: booking.station.id,
          startTime: booking.startTime,
          customer,
        },
        {
          gamingCenterName: booking.summary.gameCenterTitle,
          gamingCenterAddress: "تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه عمومی",
          stationName: booking.summary.devicesSummary ?? booking.station.name,
          stationType: booking.station.stationType,
          hourlyPrice: booking.station.hourlyPrice,
          totalHours: booking.totalHours,
          totalPrice: booking.grandTotal,
        }
      );

      setPendingReservation({
        ...booking.summary,
        reservationId: created.id,
        trackingCode: created.reservationCode,
      });
      setPendingBooking(null);
      setIsPaymentSuccessModalOpen(true);
    } catch (e) {
      setBookingError(getErrorMessage(e));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Called when user clicks "تکمیل و ثبت رزرو" in DateTimeModal
  const handleFinalConfirmReservation = (details: ConfirmDetails) => {
    setIsDateTimeModalOpen(false);

    const firstItem = cartItems[0];
    const firstSlot = details.selectedSlots[0];
    if (!firstItem || !firstSlot) return;

    const devicesSummary = cartItems
      .map(
        (item) =>
          `${toPersianDigits(item.quantity)} عدد ${item.device.name}` +
          (item.extraControllersCount > 0
            ? ` (با ${toPersianDigits(item.extraControllersCount)} دسته اضافه)`
            : "")
      )
      .join("، ");

    const hoursSummary = details.selectedSlots.map((s) => s.timeLabel);

    const booking: PendingBooking = {
      idempotencyKey: createIdempotencyKey(),
      startTime: buildStartTime(details.selectedDate.id, firstSlot.startHour),
      totalHours: details.totalHours,
      grandTotal: details.grandTotal,
      // توجه: API فعلی هر رزرو را فقط برای یک Station می‌پذیرد.
      // سبد چنددستگاهی نیاز به تصمیم محصولی دارد؛ فعلاً اولین دستگاه ارسال می‌شود.
      station: {
        id: firstItem.device.id, // TODO: stationId واقعی از Backend
        name: firstItem.device.name,
        stationType: toStationType(firstItem.device),
        hourlyPrice: firstItem.device.pricePerHour,
      },
      summary: {
        gameCenterTitle: "گیمنت اختصاصی گرگدن",
        dateStr: details.selectedDate.dateStr,
        dayName: details.selectedDate.dayName,
        timeSlots: hoursSummary,
        totalHours: details.totalHours,
        grandTotal: details.grandTotal,
        devicesSummary,
      },
    };

    setPendingBooking(booking);

    if (isLoggedIn && user) {
      // کاربر وارد شده است -> مستقیم رزرو ساخته می‌شود
      finalizeReservation(booking, { fullName: user.fullName, phone: user.phone });
    } else {
      // کاربر وارد نشده -> ابتدا ورود
      setIsAuthModalOpen(true);
    }
  };

  // Callback when OTP verification completes in AuthModal
  const handleAuthSuccess = (fullName: string, phone: string, token?: string) => {
    login(fullName, phone, token);
    setIsAuthModalOpen(false);
    if (pendingBooking) {
      finalizeReservation(pendingBooking, { fullName, phone });
    }
  };

  const totalSelectedDevicesCount = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      {/* Dedicated Sticky Header */}
      <GamecenterDetailHeader
        title="گیمنت اختصاصی گرگدن"
        location="تبریز، ولیعصر، بعد از میدان معلم"
        showDetails={showStickyTitle}
        onBackClick={() => router.back()}
        onNotificationClick={() => alert("اعلانات سایرا")}
        unreadNotificationsCount={2}
      />

      {/* Booking error banner */}
      {bookingError && (
        <div className="fixed top-16 left-0 right-0 z-[45] flex justify-center px-4 pt-3 pointer-events-none">
          <div className="w-full max-w-[780px] pointer-events-auto p-3 rounded-card bg-[var(--bg-card)] border border-[var(--accent-red)]/50 text-[var(--accent-red)] text-xs font-bold flex items-start justify-between gap-3 shadow-2xl">
            <span className="leading-relaxed">{bookingError}</span>
            <button
              type="button"
              onClick={() => setBookingError(null)}
              className="shrink-0 text-[var(--text-muted)] text-base leading-none"
              aria-label="بستن"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="px-5 py-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-white)] flex items-center gap-3">
            <span className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <span>در حال ثبت رزرو...</span>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col gap-5 mt-16">
        {/* Cover Image */}
        <div className="relative w-full aspect-[16/9] bg-[var(--foreground)]">
          <Image
            src="/img/gamnet-1.webp"
            alt="گیمنت گرگدن"
            fill
            className="object-cover"
            priority
          />
          <span className="absolute top-3 left-3 px-3 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black shadow-lg">
            ۲۵٪ تخفیف
          </span>
        </div>

        {/* Game Center Information */}
        <div className="px-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-[var(--text-white)]">
              گیمنت اختصاصی گرگدن
            </h1>
            <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold">
              <span>★ {toPersianDigits("4.8")}</span>
              <span className="text-[var(--text-muted)] font-normal">
                (۷۴۴ دیدگاه)
              </span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه عمومی
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => alert("مسیریابی روی نقشه")}
              className="flex-1 h-10 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] flex items-center justify-center gap-2 hover:bg-[var(--foreground)] transition-colors"
            >
              <svg
                className="w-4 h-4 text-[var(--primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>مسیریابی و آدرس</span>
            </button>

            <button
              type="button"
              onClick={() => alert("لیست بازی‌های موجود")}
              className="flex-1 h-10 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] flex items-center justify-center gap-2 hover:bg-[var(--foreground)] transition-colors"
            >
              <svg
                className="w-4 h-4 text-[var(--primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>لیست بازی‌ها</span>
            </button>
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-t border-[var(--border-subtle)] my-1" />

        {/* Device Selection & Quantity */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              دستگاه‌های موجود جهت رزرو
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              تعداد و نوع دستگاه را انتخاب کنید
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {devicesData.map((dev) => {
              const cartItem = cartItems.find((item) => item.device.id === dev.id);
              const isSelected = !!cartItem;

              return (
                <div
                  key={dev.id}
                  onClick={() => handleSelectOrAddDevice(dev)}
                  className={`relative w-full rounded-card p-3.5 bg-[var(--bg-card)] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[var(--primary)] shadow-[0_0_15px_rgba(255,255,61,0.12)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[var(--text-white)]">
                        {dev.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-[10px] font-black">
                          انتخاب شده ({toPersianDigits(cartItem.quantity)} عدد)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <span>ساعتی:</span>
                      <span className="font-extrabold text-[var(--primary)]">
                        {formatPrice(dev.pricePerHour)}
                      </span>
                      <span>تومان</span>
                    </div>

                    {/* Console extra controller badge if selected */}
                    {isSelected &&
                      dev.isConsole &&
                      cartItem.extraControllersCount > 0 && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-lg bg-[var(--foreground)] text-[var(--primary)] text-[11px] font-bold border border-[var(--primary)]/30">
                            +{toPersianDigits(cartItem.extraControllersCount)} دسته اضافه
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditExtraControllers(dev.id);
                            }}
                            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)] underline font-bold"
                          >
                            تغییر
                          </button>
                        </div>
                      )}

                    {/* Quantity controls inside selected card */}
                    {isSelected ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]"
                      >
                        <span className="text-xs font-bold text-[var(--text-white)]">
                          تعداد:
                        </span>
                        <div className="flex items-center gap-2 bg-[var(--foreground)]/60 rounded-card p-1 border border-[var(--border-color)]">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(dev.id, -1)}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] flex items-center justify-center font-black text-sm hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-[var(--primary)]">
                            {toPersianDigits(cartItem.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(dev.id, 1)}
                            disabled={cartItem.quantity >= dev.availableCount}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-40 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(dev.id)}
                          className="mr-auto text-[11px] text-[var(--accent-red)] hover:underline font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline">
                          + انتخاب جهت رزرو
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Device Image */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-[var(--foreground)]/40 rounded-child overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
                    <Image
                      src={dev.image}
                      alt={dev.name}
                      width={80}
                      height={80}
                      className="object-cover h-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-t border-[var(--border-subtle)] my-1" />

        {/* User Reviews Section */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              نظرات و امتیازات کاربران
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {reviewsData.map((rev) => (
              <div
                key={rev.id}
                className="w-full bg-[var(--bg-card)] rounded-card p-3.5 border border-[var(--border-subtle)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-child bg-[var(--foreground)] text-[var(--primary)] font-black text-xs flex items-center justify-center">
                      {rev.author[0]}
                    </div>
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      {rev.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[var(--primary)] font-bold">
                      ★ {toPersianDigits(rev.rating)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {rev.comment}
                </p>
                <span className="text-[var(--text-subtle)] text-[10px]">
                  • {rev.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Reservation Action Bar: ONLY displayed when at least one device is selected */}
      {totalSelectedDevicesCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="w-full max-w-[780px] bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-4 py-3 flex items-center justify-center pointer-events-auto shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>مشاهده و تایید سبد رزرو ({toPersianDigits(totalSelectedDevicesCount)} دستگاه)</span>
              <svg
                className="w-4 h-4 transform rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onUpdateExtraControllers={handleOpenEditExtraControllers}
        onProceedToDateTime={handleProceedToDateTime}
        extraControllerPricePerHour={EXTRA_CONTROLLER_PRICE_PER_HOUR}
      />

      {/* Date & Time Selection Modal */}
      <DateTimeModal
        isOpen={isDateTimeModalOpen}
        onClose={() => setIsDateTimeModalOpen(false)}
        cartItems={cartItems}
        gamingCenterSlug={gameCenterId}
        onConfirmReservation={handleFinalConfirmReservation}
        extraControllerPricePerHour={EXTRA_CONTROLLER_PRICE_PER_HOUR}
      />

      {/* Extra Controller Modal */}
      <ExtraControllerModal
        isOpen={isExtraModalOpen}
        onClose={() => {
          setIsExtraModalOpen(false);
          setPendingConsoleDevice(null);
          setEditingExtraDeviceId(null);
        }}
        onConfirm={handleConfirmExtraControllers}
        deviceName={
          editingExtraDeviceId
            ? cartItems.find((i) => i.device.id === editingExtraDeviceId)?.device.name || ""
            : pendingConsoleDevice?.name || ""
        }
        initialCount={
          editingExtraDeviceId
            ? cartItems.find((i) => i.device.id === editingExtraDeviceId)?.extraControllersCount || 0
            : 0
        }
        pricePerController={EXTRA_CONTROLLER_PRICE_PER_HOUR}
      />

      {/* Auth / Login Modal (Shown if user is not logged in) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={isPaymentSuccessModalOpen}
        onClose={() => {
          setIsPaymentSuccessModalOpen(false);
          setCartItems([]); // Clear cart upon successful reservation & payment
          setPendingReservation(null);
        }}
        details={pendingReservation}
      />
    </div>
  );
}