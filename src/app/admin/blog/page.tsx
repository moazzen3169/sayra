"use client";

import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

export default function BlogAdminPage() {
  return (
    <AdminPageContainer>
      <AdminPlaceholderPage
        title="مدیریت وبلاگ"
        description="ایجاد، ویرایش، انتشار و مدیریت مقالات و اخبار پلتفرم سایرا"
        iconName="edit"
      />
    </AdminPageContainer>
  );
}
