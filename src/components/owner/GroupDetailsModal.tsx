"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getPaymentLabel } from "@/lib/reservationUi";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: OwnerGroupBookingItem | null;
  single?: OwnerReservation | null;
}

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  isOpen,
  onClose,
  group,
  single,
}) => {
  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const title = isGroup ? "جزئیات کامل رزرو گروهی" : "جزئیات رزرو تکی";

  const customerName = isGroup
    ? group?.customerName
    : single?.customer?.fullName || single?.customerName;
  const customerPhone = isGroup
    ? group?.customerPhone
    : single?.customer?.phone || single?.customerPhone;

  const startTime = isGroup ? group?.startTime : single?.startTime;
  const endTime = isGroup ? group?.endTime : single?.endTime;
  const totalPrice = isGroup ? group?.totalPrice : single?.totalPrice;
  const status = isGroup ? group?.status : single?.status;
  const paymentState = isGroup ? group?.paymentState : single?.paymentState;
  const code = isGroup ? group?.reservationCode : single?.reservationCode;
  const centerName = isGroup ? group?.gamingCenterName : single?.gamingCenterName;

  const reservations = isGroup ? group?.reservations ?? [] : single ? [single] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-[560px]">
      <div className="flex flex-col gap-4 text-xs">
        {/* Customer Section */}
        <div className="bg-[var(--foreground)]/30 border border-[var(--border-subtle)] rounded-card p-3.5 flex flex-col gap-2">
          <span className="font-bold text-[var(--text-white)] text-sm">مشخصات مشتری</span>
          <div className="grid grid-cols-2 gap-2 text-[var(--text-muted)]">
            <div>
              <span>نام مشتری: </span>
              <strong className="text-[var(--text-white)]">{customerName || "ثبت نشده"}</strong>
            </div>
            <div>
              <span>شماره تماس: </span>
              <strong className="text-[var(--text-white)]" dir="ltr">
                {customerPhone ? toPersianDigits(customerPhone) : "ثبت نشده"}
              </strong>
            </div>
          </div>
        </div>

        {/* Booking Summary Section */}
        <div className="bg-[var(--foreground)]/30 border border-[var(--border-subtle)] rounded-card p-3.5 flex flex-col gap-2">
          <span className="font-bold text-[var(--text-white)] text-sm">اطلاعات زمان و وضعیت</span>
          <div className="grid grid-cols-2 gap-2 text-[var(--text-muted)]">
            <div>
              <span>زمان سانس: </span>
              <strong className="text-[var(--text-white)]">
                {startTime && endTime ? formatReservationWhen(startTime, endTime) : "—"}
              </strong>
            </div>
            <div>
              <span>وضعیت رزرو: </span>
              <strong className="text-[var(--primary)]">{status}</strong>
            </div>
            <div>
              <span>وضعیت پرداخت: </span>
              <strong className="text-[var(--text-white)]">{getPaymentLabel(paymentState || "PENDING")}</strong>
            </div>
            <div>
              <span>مبلغ کل: </span>
              <strong className="text-[var(--primary)] font-black text-sm">
                {formatPrice(totalPrice ?? 0)} تومان
              </strong>
            </div>
            {code && (
              <div>
                <span>کد پیگیری / رزرو: </span>
                <strong className="text-[var(--text-white)]">{toPersianDigits(String(code))}</strong>
              </div>
            )}
            {centerName && (
              <div>
                <span>نام مجموعه: </span>
                <strong className="text-[var(--text-white)]">{centerName}</strong>
              </div>
            )}
            {isGroup && group && (
              <div>
                <span>تعداد کل دستگاه‌ها: </span>
                <strong className="text-[var(--text-white)] font-bold">
                  {toPersianDigits(group.reservations.length)} دستگاه
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Selected Devices List */}
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[var(--text-white)] text-sm">
            دستگاه‌ها و ایستگاه‌های رزرو شده ({toPersianDigits(reservations.length)})
          </span>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {reservations.map((res, idx) => {
              const name = res.stationSnapshot?.name || "ایستگاه بازی";
              const type = res.stationSnapshot?.stationType || "PC";
              const hourly = res.stationSnapshot?.hourlyPrice;
              return (
                <div
                  key={res.id || idx}
                  className="p-2.5 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] flex items-center justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--text-white)]">{name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      نوع: {type} {hourly ? `• ساعتی ${formatPrice(hourly)} تومان` : ""}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-black text-[var(--primary)]">
                      {formatPrice(res.totalPrice ?? 0)} تومان
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      وضعیت: {res.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)] hover:opacity-80 transition-opacity"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};
