
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";

import {
  getAdminAccessToken,
  getBlogAccessToken,
} from "@/lib/token";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [authorized, setAuthorized] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const isBlogArea =
    pathname === "/admin/blog" ||
    pathname.startsWith("/admin/blog/");

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(false);
      return;
    }

    // Blog and Platform Admin have separate token stores.
    const token = isBlogArea
      ? getBlogAccessToken()
      : getAdminAccessToken();

    if (token) {
      setAuthorized(true);
      return;
    }

    setAuthorized(false);
    router.replace("/admin/login");

  }, [
    isLoginPage,
    isBlogArea,
    pathname,
    router,
  ]);

  // Listen for an expired or revoked Blog or Admin session.
  useEffect(() => {
    const handleBlogAuthExpired = () => {
      if (!isBlogArea) return;

      setAuthorized(false);
      router.replace("/admin/login?tab=blog");
    };

    const handleAdminAuthExpired = () => {
      if (isBlogArea) return;

      setAuthorized(false);
      router.replace("/admin/login");
    };

    window.addEventListener(
      "sayra:blog-auth-expired",
      handleBlogAuthExpired
    );
    window.addEventListener(
      "sayra:admin-auth-expired",
      handleAdminAuthExpired
    );

    return () => {
      window.removeEventListener(
        "sayra:blog-auth-expired",
        handleBlogAuthExpired
      );
      window.removeEventListener(
        "sayra:admin-auth-expired",
        handleAdminAuthExpired
      );
    };
  }, [isBlogArea, router]);

  // Login page is public.
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Wait until the correct token has been checked.
  if (!authorized) {
    return null;
  }

  return (
    <div
      className="w-full min-h-screen bg-body-bg text-text-white flex flex-col lg:flex-row"
      dir="rtl"
    >
      <AdminSidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() =>
          setIsMobileMenuOpen(false)
        }
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader
          onToggleMobileMenu={() =>
            setIsMobileMenuOpen((previous) => !previous)
          }
        />

        <main className="flex-1 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
