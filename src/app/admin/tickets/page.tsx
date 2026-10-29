"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function TicketsAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="تیکت‌های پشتیبانی"
        description="مدیریت، پاسخگویی و پیگیری درخواست‌های پشتیبانی کاربران و صاحبان گیمنت"
        iconName="ticket"
      />
    </AdminPageContainer>
  );
}
