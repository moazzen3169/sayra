"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function SettingsAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="تنظیمات سیستم"
        description="پیکربندی پارامترهای عمومی سیستم، درگاه‌های پرداخت و تنظیمات پلتفرم"
        iconName="info"
      />
    </AdminPageContainer>
  );
}
