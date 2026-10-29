"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function AdsAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="مدیریت تبلیغات"
        description="تنظیم بنرهای تبلیغاتی، اولویت‌های نمایش و جایگاه‌های ویژه سایت"
        iconName="tag"
      />
    </AdminPageContainer>
  );
}
