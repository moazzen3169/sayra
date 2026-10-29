"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function ReportsAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="گزارش‌ها و آمار"
        description="تحلیل عملکرد، گزارش‌های مالی، آمار رزروها و تحلیل رفتاری کاربران"
        iconName="calendar"
      />
    </AdminPageContainer>
  );
}
