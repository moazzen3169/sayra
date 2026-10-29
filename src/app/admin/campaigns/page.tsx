"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function CampaignsAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="کمپین‌ها و تخفیف‌ها"
        description="تعریف کدهای تخفیف سراسری، کمپین‌های مناسبتی و پیشنهادهای ویژه"
        iconName="star"
      />
    </AdminPageContainer>
  );
}
