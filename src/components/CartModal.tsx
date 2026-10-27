"use client";

import React from "react";
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
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[780px] lg:max-w-[640px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-4 sm:p-5 flex flex-col gap-4 max-h-[85vh] lg:max-h-[88vh] shadow-2xl relative overflow-hidden"
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
            <h3 className="text-base font-black text-[var(--text-white)]">خلاصه سبد رزرو</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-[#101014] font-black">
              {toPersianDigits(totalDeviceCount)} دستگاه
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Minimal Cart Items Summary List */}
        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[45vh] pr-0.5">
          {cartItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
              <p>سبد رزرو شما خالی است.</p>
              <p className="text-[11px] text-[var(--text-subtle)]">لطفاً از لیست دستگاه‌ها حداقل یک دستگاه انتخاب کنید.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemSubtotal =
                item.device.pricePerHour * item.quantity +
                item.extraControllersCount * extraControllerPricePerHour;

              return (
                <div
                  key={item.device.id}
                  className="bg-[var(--foreground)]/30 rounded-card p-3 border border-[var(--border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--border-color)] transition-all"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[var(--text-white)] truncate">
                        {item.device.name}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md border border-[var(--primary)]/20 shrink-0">
                        {toPersianDigits(item.quantity)} عدد
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                      <span>
                        مبلغ ساعتی: <strong className="text-[var(--text-white)]">{formatPrice(itemSubtotal)}</strong> تومان
                      </span>
                      {item.device.isConsole && item.extraControllersCount > 0 && (
                        <span className="text-[var(--primary)] font-semibold flex items-center gap-1">
                          • {toPersianDigits(item.extraControllersCount)} دسته اضافه
                          {onUpdateExtraControllers && (
                            <button
                              type="button"
                              onClick={() => onUpdateExtraControllers(item.device.id)}
                              className="text-[10px] text-[var(--primary)] underline hover:opacity-80 font-bold mr-1"
                            >
                              تغییر
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Minimal Quantity & Remove Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-[var(--bg-card)] rounded-card p-1 border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.device.id, -1)}
                        className="w-6 h-6 rounded-md bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-xs hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-black text-[var(--primary)]">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.device.id, 1)}
                        disabled={item.quantity >= item.device.availableCount}
                        className="w-6 h-6 rounded-md bg-[var(--foreground)] text-[var(--text-white)] flex items-center justify-center font-black text-xs disabled:opacity-30 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.device.id)}
                      className="p-1.5 rounded-lg text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors"
                      title="حذف"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Concise Pre-Invoice Footer */}
        {cartItems.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-[var(--text-muted)] font-medium">جمع کل قیمت (ساعتی):</span>
              <div className="flex items-center gap-1 font-black text-base text-[var(--primary)]">
                <span>{formatPrice(totalPricePerHour)}</span>
                <span className="text-xs text-[var(--text-white)] font-normal">تومان / ساعت</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToDateTime}
              className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <span>تایید و انتخاب زمان رزرو</span>
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
