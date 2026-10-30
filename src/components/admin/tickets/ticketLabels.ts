import type { AdminTicket } from "@/types/admin";

export type TicketBadgeVariant = "danger" | "warning" | "success" | "neutral";

export const TICKET_STATUS_LABEL: Record<AdminTicket["status"], string> = {
  OPEN: "باز",
  PENDING: "در حال بررسی",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};

export const TICKET_STATUS_VARIANT: Record<AdminTicket["status"], TicketBadgeVariant> = {
  OPEN: "danger",
  PENDING: "warning",
  ANSWERED: "success",
  CLOSED: "neutral",
};

export const TICKET_PRIORITY_LABEL: Record<AdminTicket["priority"], string> = {
  LOW: "عادی",
  MEDIUM: "متوسط",
  HIGH: "فوری",
};

export const TICKET_CATEGORY_LABEL: Record<AdminTicket["category"], string> = {
  TECHNICAL: "پشتیبانی فنی",
  FINANCIAL: "امور مالی و پرداخت",
  SALES: "خدمات و رزروها",
  ACCOUNT: "حساب کاربری",
  GENERAL: "عمومی",
};

export const SENDER_ROLE_LABEL: Record<"USER" | "OWNER", string> = {
  USER: "کاربر عادی",
  OWNER: "صاحب گیمنت",
};

export const USER_ROLE_LABEL: Record<"USER" | "OWNER" | "ADMIN", string> = {
  USER: "کاربر عادی",
  OWNER: "صاحب گیمنت",
  ADMIN: "مدیر سیستم",
};