"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";
import { UserLoginPanel } from "@/components/auth/UserLoginPanel";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const { login } = useAuth();

  const handleSuccess = (data: UnifiedAuthSuccessData) => {
    login(
      data.fullName,
      data.phone,
      data.accessToken,
      data.refreshToken,
      data.role || "USER",
      data.actorType,
      data.gamingCenterId
    );

    if (data.gamingCenterId) {
      try {
        localStorage.setItem("sayra_owner_center_id", data.gamingCenterId);
      } catch {
        // ignore
      }
    }

    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }

    // Role-based navigation if no explicit redirect URL was specified
    const roleUpper = (data.role || "").toUpperCase();
    if (roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN" || roleUpper === "PLATFORM_ADMIN") {
      router.replace("/admin");
    } else if (roleUpper === "MANAGER" || roleUpper === "STAFF" || roleUpper === "OWNER") {
      router.replace("/owner");
    } else {
      router.replace("/profile");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
      <ProfileHeader title="ورود یا ثبت‌نام" isSubpage={false} backUrl="/" />

      <main className="flex-1 px-4 pt-20 pb-4 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
        <UserLoginPanel onSuccess={handleSuccess} />
      </main>

      <BottomBar activeTab="profile" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-10">
          <ProfileHeader title="ورود یا ثبت‌نام" isSubpage={false} backUrl="/" />
          <main className="flex-1 px-4 pt-20 pb-4 flex flex-col gap-5 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0">
            <div className="w-full max-w-md lg:max-w-xl mx-auto flex flex-col gap-5 animate-pulse">
              <div className="h-6 bg-[var(--foreground)] rounded w-1/3" />
              <div className="h-4 bg-[var(--foreground)] rounded w-2/3" />
              <div className="h-11 bg-[var(--foreground)] rounded-card w-full" />
              <div className="h-12 bg-[var(--foreground)] rounded-card w-full" />
            </div>
          </main>
          <BottomBar activeTab="profile" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
