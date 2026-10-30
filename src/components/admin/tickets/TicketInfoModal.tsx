"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { adminService } from "@/services/adminService";
import type {
  AdminGamecenter,
  AdminTicket,
  AdminUser,
  AdminUserReservation,
} from "@/types/admin";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_VARIANT,
  USER_ROLE_LABEL,
} from "./ticketLabels";

interface TicketInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AdminTicket;
  admins: AdminUser[];
  onAssign: (adminId: string | null) => Promise<void>;
}

interface LoadedInfo {
  key: string;
  user: AdminUser | null;
  gamecenter: AdminGamecenter | null;
  reservation: AdminUserReservation | null;
  failed: boolean;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <span className="shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
    <div className="min-w-0 break-words text-left font-bold text-[var(--text-white)]">
      {children}
    </div>
  </div>
);

const Section: React.FC<{
  title: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, action, children }) => (
  <section className="flex flex-col gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-4">
    <div className="mb-1 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-white)]">
        <Icon name={icon} size={16} className="text-[var(--primary)]" />
        <span>{title}</span>
      </h3>
      {action}
    </div>
    <div className="flex flex-col divide-y divide-[var(--border-subtle)]/60">{children}</div>
  </section>
);

const SectionSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-4">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

export function TicketInfoModal({
  isOpen,
  onClose,
  ticket,
  admins,
  onAssign,
}: TicketInfoModalProps) {
  const [info, setInfo] = useState<LoadedInfo | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<string>(ticket.assignedAdminId ?? "");
  const [isAssigning, setIsAssigning] = useState(false);

  const key = `${ticket.id}|${ticket.userId ?? ""}|${ticket.gamecenterId ?? ""}`;

  // اطلاعات فقط هنگام باز بودن مودال و با یک درخواست جداگانه گرفته می‌شود
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    Promise.all([
      ticket.userId ? adminService.getUserById(ticket.userId) : Promise.resolve(null),
      ticket.gamecenterId
        ? adminService.getGamecenterById(ticket.gamecenterId)
        : Promise.resolve(null),
      ticket.userId && ticket.reservationId
        ? adminService.getUserReservations(ticket.userId)
        : Promise.resolve([] as AdminUserReservation[]),
    ])
      .then(([user, gamecenter, reservations]) => {
        if (!active) return;
        const reservation =
          reservations.find((r) => r.id === ticket.reservationId) ?? null;
        setInfo({ key, user, gamecenter, reservation, failed: false });
      })
      .catch(() => {
        if (!active) return;
        setInfo({ key, user: null, gamecenter: null, reservation: null, failed: true });
      });

    return () => {
      active = false;
    };
  }, [isOpen, key, ticket.userId, ticket.gamecenterId, ticket.reservationId]);

  if (!isOpen) return null;

  const loading = !info || info.key !== key;
  const data = !loading ? info : null;
  const assignChanged = selectedAdmin !== (ticket.assignedAdminId ?? "");

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssign(selectedAdmin || null);
    } catch {
      // پیام خطا در صفحه‌ی اصلی نمایش داده می‌شود
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="اطلاعات کامل تیکت"
      className="max-w-[640px]"
    >
      <div className="flex flex-col gap-4">
        {data?.failed && (
          <div className="flex items-center gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]">
            <Icon name="alert" size={16} />
            <span>دریافت برخی اطلاعات انجام نشد. دوباره مودال را باز کنید.</span>
          </div>
        )}

        {/* ارسال‌کننده */}
        {ticket.userId &&
          (loading ? (
            <SectionSkeleton />
          ) : (
            <Section
              title="ارسال‌کننده"
              icon="user"
              action={
                <Link
                  href={`/admin/users/${ticket.userId}`}
                  className="text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  مشاهده پروفایل
                </Link>
              }
            >
              <Row label="نام و نام خانوادگی">
                {data?.user?.fullName ?? ticket.userName ?? "نامشخص"}
              </Row>
              <Row label="نقش">
                {data?.user
                  ? USER_ROLE_LABEL[data.user.role]
                  : ticket.userRole
                  ? USER_ROLE_LABEL[ticket.userRole]
                  : "نامشخص"}
              </Row>
              <Row label="شماره همراه">
                <span dir="ltr">{data?.user?.phone ?? ticket.userPhone ?? "ثبت نشده"}</span>
              </Row>
              {data?.user?.email && (
                <Row label="ایمیل">
                  <span dir="ltr">{data.user.email}</span>
                </Row>
              )}
              {data?.user && (
                <>
                  <Row label="وضعیت حساب">
                    <Badge variant={data.user.isActive ? "success" : "danger"}>
                      {data.user.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </Row>
                  <Row label="تاریخ ثبت‌نام">{data.user.createdAt}</Row>
                </>
              )}
            </Section>
          ))}

        {/* گیمنت */}
        {ticket.gamecenterId &&
          (loading ? (
            <SectionSkeleton />
          ) : (
            <Section
              title="گیمنت مرتبط"
              icon="gamepad"
              action={
                <Link
                  href={`/admin/gamecenters/${ticket.gamecenterId}`}
                  className="text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  مشاهده گیمنت
                </Link>
              }
            >
              <Row label="نام گیمنت">
                {data?.gamecenter?.name ?? ticket.gamecenterName ?? "نامشخص"}
              </Row>
              {data?.gamecenter && (
                <>
                  <Row label="شهر">{data.gamecenter.city}</Row>
                  <Row label="آدرس">{data.gamecenter.address}</Row>
                  <Row label="مسئول">
                    {data.gamecenter.ownerName}
                    <span className="mr-2 text-xs font-normal text-[var(--text-muted)]" dir="ltr">
                      {data.gamecenter.ownerPhone}
                    </span>
                  </Row>
                  <Row label="وضعیت">
                    <Badge variant={data.gamecenter.isActive ? "success" : "danger"}>
                      {data.gamecenter.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </Row>
                </>
              )}
            </Section>
          ))}

        {/* رزرو */}
        {(ticket.reservationId || ticket.reservationCode) &&
          (loading ? (
            <SectionSkeleton />
          ) : (
            <Section title="رزرو مرتبط" icon="calendar">
              <Row label="کد رزرو">
                <span dir="ltr">
                  {data?.reservation?.reservationCode ?? ticket.reservationCode ?? "نامشخص"}
                </span>
              </Row>
              {data?.reservation ? (
                <>
                  <Row label="دستگاه">{data.reservation.deviceName}</Row>
                  <Row label="تاریخ و ساعت">
                    {data.reservation.date}، {data.reservation.timeSlot}
                  </Row>
                  <Row label="مبلغ">
                    {data.reservation.amount.toLocaleString("fa-IR")} تومان
                  </Row>
                  <Row label="وضعیت رزرو">
                    <StatusBadge status={data.reservation.status} />
                  </Row>
                </>
              ) : (
                <p className="py-2 text-xs text-[var(--text-muted)]">
                  جزئیات بیشتری برای این رزرو در دسترس نیست.
                </p>
              )}
            </Section>
          ))}

        {!ticket.userId && !ticket.gamecenterId && !ticket.reservationId && (
          <p className="rounded-card border border-dashed border-[var(--border-color)] p-4 text-center text-xs text-[var(--text-muted)]">
            این تیکت به کاربر، گیمنت یا رزرو خاصی متصل نیست.
          </p>
        )}

        {/* مشخصات تیکت */}
        <Section title="مشخصات تیکت" icon="ticket">
          <Row label="شناسه">
            <span dir="ltr">#{ticket.id}</span>
          </Row>
          <Row label="وضعیت">
            <Badge variant={TICKET_STATUS_VARIANT[ticket.status]}>
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
          </Row>
          <Row label="اولویت">{TICKET_PRIORITY_LABEL[ticket.priority]}</Row>
          <Row label="دسته‌بندی">{TICKET_CATEGORY_LABEL[ticket.category]}</Row>
          <Row label="تاریخ ثبت">{ticket.createdAt}</Row>
          <Row label="آخرین بروزرسانی">{ticket.lastUpdate}</Row>
        </Section>

        {/* ارجاع */}
        <Section title="مسئول رسیدگی" icon="user">
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              aria-label="انتخاب مسئول تیکت"
              disabled={isAssigning}
              className="h-11 flex-1 cursor-pointer rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3 text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
            >
              <option value="" className="bg-[var(--bg-card)]">
                بدون مسئول
              </option>
              {admins.map((adm) => (
                <option key={adm.id} value={adm.id} className="bg-[var(--bg-card)]">
                  {adm.fullName}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              onClick={handleAssign}
              isLoading={isAssigning}
              disabled={!assignChanged}
            >
              ثبت ارجاع
            </Button>
          </div>
          {!assignChanged && (
            <p className="pt-2 text-xs text-[var(--text-muted)]">
              برای ارجاع، مسئول دیگری انتخاب کنید.
            </p>
          )}
        </Section>

        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-3">
          <Button variant="secondary" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
}