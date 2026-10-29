"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function UsersAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="مدیریت کاربران"
        description="مشاهده لیست کاربران، وضعیت حساب‌ها، سوابق رزرو و سطح دسترسی‌ها"
        iconName="user"
      />
    </AdminPageContainer>
  );
}
