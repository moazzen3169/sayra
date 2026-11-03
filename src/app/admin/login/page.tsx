"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api/client";
import { toEnglishDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { setTokens } from "@/lib/token";
import { authService } from "@/services/authService";

/** نقش‌هایی که اجازه‌ی ورود به پنل مدیریت دارند. با مقدار واقعی OpenAPI تطبیق دهید. */
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export default function AdminLoginPage() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (cleanPhone: string): boolean => {
    let ok = true;
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setPhoneError("شماره موبایل را با ۱۱ رقم وارد کنید.");
      ok = false;
    } else {
      setPhoneError(undefined);
    }
    if (!password) {
      setPasswordError("رمز عبور را وارد کنید.");
      ok = false;
    } else {
      setPasswordError(undefined);
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const cleanPhone = toEnglishDigits(phone).replace(/\s/g, "");
    setFormError(null);
    if (!validate(cleanPhone)) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      // POST /auth/login  { phone, password }
      const res = await authService.loginUserWithPassword(cleanPhone, password);

      if (!res.accessToken) {
        setFormError("ورود انجام نشد. دوباره تلاش کنید.");
        return;
      }

      // اگر نقش برگشته و ادمین نیست، هیچ توکنی ذخیره نمی‌شود
      const role = res.user?.role?.toUpperCase();
      if (role && !ADMIN_ROLES.has(role)) {
        setFormError("این حساب به پنل مدیریت دسترسی ندارد.");
        return;
      }

      // هر دو توکن در localStorage؛ تمدید خودکار با apiClient انجام می‌شود
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.replace("/admin");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
        setFormError("شماره موبایل یا رمز عبور درست نیست.");
      } else {
        setFormError(getErrorMessage(err));
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 py-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-2 text-center border-b border-[var(--border-subtle)] pb-4">
          <div className="w-12 h-12 rounded-full bg-[var(--primary-muted)] text-[var(--primary)] flex items-center justify-center">
            <Icon name="user" size={24} />
          </div>
          <h1 className="text-page-title text-[var(--text-white)]">ورود به پنل مدیریت</h1>
          <p className="text-secondary text-[var(--text-muted)]">
            با شماره موبایل و رمز عبور وارد شوید.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2"
          >
            <Icon name="alert" size={16} />
            <span>{formError}</span>
          </div>
        )}

        <Input
          label="شماره موبایل"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          dir="ltr"
          placeholder="09123456789"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) setPhoneError(undefined);
          }}
          error={phoneError}
          disabled={loading}
          className="text-left"
        />

        <Input
          label="رمز عبور"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(undefined);
          }}
          error={passwordError}
          disabled={loading}
          className="text-left"
        />

        <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">
          ورود
        </Button>
      </form>
    </main>
  );
}