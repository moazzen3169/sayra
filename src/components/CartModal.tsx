"use client";

import React from "react";
import Image from "next/image";
import { formatPrice, toPersianDigits } from "@/lib/format";

export interface DeviceOption {
  id: string;
  name: string;
  type: string;
  isConsole: boolean;
  pricePerHour: number;
  image: string;
  availableCount: number;
}

export interface CartItem {
  device: DeviceOption;
  quantity: number;
  extraControllersCount: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (deviceId: string, delta: number) => void;
  onRemoveItem: (deviceId: string) => void;
  onUpdateExtraControllers?: (deviceId: string) => void;
  onProceedToDateTime: () => void;
  extraControllerPricePerHour?: number;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateExtraControllers,
  onProceedToDateTime,
  extraControllerPricePerHour = 30000,
}) => {
  if (!isOpen) return null;

  // Calculate totals per hour
  const totalDeviceCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const totalPricePerHour = cartItems.reduce((acc, item) => {
    const base = item.device.pricePerHour * item.quantity;
    const extra = item.extraControllersCount * extraControllerPricePerHour;
    return acc + base + extra;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-[780px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card p-4 sm:p-5 flex flex-col gap-4 max-h-[85vh] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-[var(--text-white)]">سبد رزرو</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--foreground)] text-[var(--primary)] font-bold">
              {toPersianDigits(totalDeviceCount)} دستگاه
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1 scrollbar-thin">
          {cartItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
              <p>سبد رزرو شما خالی است.</p>
              <p className="text-[11px] text-[var(--text-subtle)]">لطفاً از لیست دستگاه‌ها حداقل یک دستگاه انتخاب کنید.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemPricePerHour =
                item.device.pricePerHour * item.quantity +
                item.extraControllersCount * extraControllerPricePerHour;

              return (
                <div
                  key={item.device.id}
                  className="bg-[var(--foreground)]/40 rounded-card p-3 border border-[var(--border-subtle)] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 shrink-0 bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
                        <Image
                          src={item.device.image}
                          alt={item.device.name}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-extrabold text-[var(--text-white)]">
                          {item.device.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          هر ساعت: {formatPrice(item.device.pricePerHour)} تومان
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.device.id)}
                      className="p-1.5 rounded-lg text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 text-xs font-bold transition-colors flex items-center gap-1"
                      title="حذف از سبد"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">حذف</span>
                    </button>
                  </div>

                  {/* Extras / Quantity row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/60 text-xs">
                    {item.device.isConsole ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          دسته اضافه: <strong className="text-[var(--primary)]">{toPersianDigits(item.extraControllersCount)}</strong>
                        </span>
                        {onUpdateExtraControllers && (
                          <button
                            type="button"
                            onClick={() => onUpdateExtraControllers(item.device.id)}
                            className="text-[10px] text-[var(--primary)] underline hover:opacity-80 font-bold px-1"
                          >
                            تغییر
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--text-subtle)]">سیستم گیمینگ</span>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 bg-[var(--bg-card)] rounded-card p-1 border border-[var(--border-color)]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.device.id, -1)}
                        className="w-7 h-7 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-sm hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[var(--primary)]">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.device.id, 1)}
                        disabled={item.quantity >= item.device.availableCount}
                        className="w-7 h-7 rounded-lg bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pre-Invoice Footer */}
        {cartItems.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-1.5 bg-[var(--foreground)]/30 rounded-card p-3 border border-[var(--border-subtle)]">
              <div className="text-xs font-extrabold text-[var(--text-white)] mb-1">پیش‌فاکتور (مبلغ بر اساس ساعت):</div>
              {cartItems.map((item) => {
                const subtotal = item.device.pricePerHour * item.quantity;
                const extraSubtotal = item.extraControllersCount * extraControllerPricePerHour;
                return (
                  <div key={item.device.id} className="flex justify-between text-[11px] text-[var(--text-muted)]">
                    <span>
                      {toPersianDigits(item.quantity)}× {item.device.name}
                      {item.extraControllersCount > 0 ? ` (+${toPersianDigits(item.extraControllersCount)} دسته)` : ""}
                    </span>
                    <span className="font-bold text-[var(--text-white)]">
                      {formatPrice(subtotal + extraSubtotal)} تومان / ساعت
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between text-xs font-black pt-2 border-t border-[var(--border-subtle)] text-[var(--primary)] mt-1">
                <span>جمع کل ساعتی:</span>
                <span>{formatPrice(totalPricePerHour)} تومان / ساعت</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToDateTime}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>انتخاب تاریخ و رزرو</span>
              <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
