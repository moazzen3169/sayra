"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function OwnersAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="احراز هویت صاحبان گیمنت"
        description="بررسی مدارک، احراز هویت و تایید حساب‌های کاربری مدیران گیمنت‌ها"
        iconName="check"
      />
    </AdminPageContainer>
  );
}
