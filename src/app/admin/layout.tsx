import type { Metadata } from "next";
import React from "react";
import { AdminLayoutClient } from "@/components/admin/layout/AdminLayoutClient";

export const metadata: Metadata = {
  title: "پنل مدیریت سیستم | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
