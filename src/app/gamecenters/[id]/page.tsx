"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { ExtraControllerModal } from "@/components/ExtraControllerModal";
import { CartModal, CartItem, DeviceOption } from "@/components/CartModal";
import { DateTimeModal } from "@/components/DateTimeModal";
import { formatPrice, toPersianDigits } from "@/lib/format";

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

export default function GameCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: gameCenterId } = use(params);

  // Basket State: list of selected devices with quantity and extra controllers
  // Initially empty as requested: "تا زمانی که کاربر در جزییات گیمنت دستگاهی رو انتخاب نکرده دستگاه انتخاب شده ای نباشد"
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Modals state
  const [pendingConsoleDevice, setPendingConsoleDevice] = useState<DeviceOption | null>(null);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState<boolean>(false);
  const [editingExtraDeviceId, setEditingExtraDeviceId] = useState<string | null>(null);

  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);
  const [isDateTimeModalOpen, setIsDateTimeModalOpen] = useState<boolean>(false);

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
      // If already in cart, open cart modal to let user see or modify
      setIsCartModalOpen(true);
    } else {
      // Add new item to cart
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

  // Confirm extra controller modal for newly added console or editing existing
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

  // Cart quantity update
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

  // Cart remove item
  const handleRemoveItem = (deviceId: string) => {
    setCartItems((prev) => prev.filter((item) => item.device.id !== deviceId));
  };

  // Open extra controller edit from cart
  const handleOpenEditExtraControllers = (deviceId: string) => {
    const item = cartItems.find((i) => i.device.id === deviceId);
    if (item) {
      setEditingExtraDeviceId(deviceId);
      setIsExtraModalOpen(true);
    }
  };

  // Transition from Cart Modal to Date & Time Modal
  const handleProceedToDateTime = () => {
    setIsCartModalOpen(false);
    setIsDateTimeModalOpen(true);
  };

  // Final Reservation Handler from Date & Time Modal
  const handleFinalConfirmReservation = (details: {
    selectedDate: { dayName: string; dateStr: string };
    selectedSlots: { timeLabel: string }[];
    totalHours: number;
    grandTotal: number;
  }) => {
    setIsDateTimeModalOpen(false);

    const devicesSummary = cartItems
      .map(
        (item) =>
          `${toPersianDigits(item.quantity)} عدد ${item.device.name}` +
          (item.extraControllersCount > 0
            ? ` (با ${toPersianDigits(item.extraControllersCount)} دسته اضافه)`
            : "")
      )
      .join("، ");

    const hoursSummary = details.selectedSlots.map((s) => s.timeLabel).join("، ");

    alert(
      `رزرو نهایی گیمنت کد ${gameCenterId}\n\n` +
        `دستگاه‌های انتخابی: ${devicesSummary}\n` +
        `تاریخ: ${details.selectedDate.dayName} (${details.selectedDate.dateStr})\n` +
        `ساعات انتخاب‌شده (${toPersianDigits(details.totalHours)} ساعت): ${hoursSummary}\n` +
        `مبلغ کل: ${formatPrice(details.grandTotal)} تومان`
    );
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
        <div className=" " />

        {/* Device Selection & Quantity */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              انتخاب دستگاه‌ها
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              امکان انتخاب چندین نوع دستگاه
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
                  className={`relative w-full rounded-card p-3 bg-[var(--bg-card)] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[var(--primary)] shadow-[0_0_15px_rgba(255,255,61,0.12)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[var(--text-white)]">
                        {dev.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-[10px] font-black">
                          انتخاب شده ({toPersianDigits(cartItem.quantity)} عدد)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <span>قیمت هر ساعت:</span>
                      <span className="font-extrabold text-[var(--primary)]">
                        {formatPrice(dev.pricePerHour)}
                      </span>
                      <span>تومان</span>
                    </div>

                    {/* Console extra controller badge if selected */}
                    {isSelected &&
                      dev.isConsole &&
                      cartItem.extraControllersCount > 0 && (
                        <div className="flex items-center gap-2 mt-1">
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
                          + افزودن به رزرو
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Device Image */}
                  <div className="relative w-20 h-20 shrink-0 bg-[var(--foreground)]/40 rounded-child overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
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
        <div className=" " />

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
      {/* Without price or extra info, only one button to view reservation basket */}
      {totalSelectedDevicesCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="w-full max-w-[780px] bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-4 py-3 flex items-center justify-center pointer-events-auto shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>مشاهده سبد رزرو ({toPersianDigits(totalSelectedDevicesCount)} دستگاه)</span>
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
    </div>
  );
}
