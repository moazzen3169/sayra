"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { getAccessToken } from "@/lib/token";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (getAccessToken()) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
      router.replace("/admin/login");
    }
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) return <>{children}</>;
  if (!authorized) return null;

  return (
    <div className="w-full min-h-screen bg-body-bg text-text-white flex flex-col lg:flex-row" dir="rtl">
      <AdminSidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}