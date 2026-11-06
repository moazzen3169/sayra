"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UnifiedAuthForm, UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";
import { useAuth } from "@/context/AuthContext";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleSuccess = (data: UnifiedAuthSuccessData) => {
    setRoleError(null);
    const roleUpper = (data.role || "").toUpperCase();

    // Check if role is authorized for admin panel
    if (!ADMIN_ROLES.has(roleUpper)) {
      setRoleError("این حساب به پنل مدیریت دسترسی ندارد. لطفاً با حساب مدیر سامانه وارد شوید.");
      return;
    }

    login(
      data.fullName || "مدیر سامانه",
      data.phone,
      data.accessToken,
      data.refreshToken,
      "ADMIN"
    );

    router.replace("/admin");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 py-8">
      <div className="w-full max-w-[440px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-5 shadow-2xl">
        {roleError && (
          <div
            role="alert"
            className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold leading-relaxed"
          >
            {roleError}
          </div>
        )}

        <UnifiedAuthForm
          onSuccess={handleSuccess}
          title="ورود به پنل مدیریت سامانه"
          description="ورود ادمین و مدیران با پیامک (OTP) یا رمز عبور"
          initialMode="password"
        />
      </div>
    </main>
  );
}
