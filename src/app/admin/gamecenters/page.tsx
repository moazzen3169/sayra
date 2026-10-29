"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function GamecentersAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="مدیریت گیمنت‌ها"
        description="مشاهده، تایید، ویرایش و مدیریت وضعیت گیمنت‌های عضو پلتفرم"
        iconName="gamepad"
      />
    </AdminPageContainer>
  );
}
