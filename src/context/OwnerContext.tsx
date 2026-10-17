"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { OwnerMe, PublicCenter } from "@/types/owner";

const OWNER_CENTER_KEY = "sayra_owner_center_id";

interface OwnerContextType {
  me: OwnerMe;
  centerId: string;
  center: PublicCenter | null;
  ownerName: string;
}

const OwnerContext = createContext<OwnerContextType | null>(null);

export const useOwner = (): OwnerContextType => {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error("useOwner must be used inside OwnerProvider");
  return ctx;
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)]">{children}</div>
);

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading: authLoading, login, user } = useAuth();

  const [me, setMe] = useState<OwnerMe | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [center, setCenter] = useState<PublicCenter | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "need-center" | "error">("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        const m = await ownerService.getMe();
        if (!active) return;
        setMe(m);

        let id: string | null = m.gamingCenterId ?? m.gamingCenters?.[0]?.id ?? null;
        if (!id) {
          try {
            id = localStorage.getItem(OWNER_CENTER_KEY);
          } catch {
            id = null;
          }
        }
        if (!id) {
          setState("need-center");
          return;
        }

        setCenterId(id);
        const c = await ownerService.findCenter(id, controller.signal);
        if (!active) return;
        setCenter(c);
        setState("ready");
      } catch (e) {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setState("error");
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, isLoggedIn, reload]);

  const retry = () => {
    setState("loading");
    setReload((v) => v + 1);
  };

  const saveCenterId = (e: React.FormEvent) => {
    e.preventDefault();
    const id = draftId.trim();
    if (!id) return;
    try {
      localStorage.setItem(OWNER_CENTER_KEY, id);
    } catch {
      // ignore
    }
    retry();
  };

  /* ---------- Gates ---------- */

  if (authLoading || (isLoggedIn && state === "loading")) {
    return (
      <Shell>
        <div className="p-4 flex flex-col gap-4 animate-pulse">
          <div className="h-12 rounded-card bg-[var(--bg-card)]" />
          <div className="h-44 rounded-card bg-[var(--bg-card)]" />
          <div className="h-24 rounded-card bg-[var(--bg-card)]" />
        </div>
      </Shell>
    );
  }

  if (!isLoggedIn) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
          <h2 className="text-base font-black">ورود به پنل صاحب گیمنت</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            برای مدیریت گیمنت ابتدا وارد حساب خود شوید.
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="h-12 px-8 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm"
          >
            ورود / ثبت‌نام
          </button>
        </div>
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={(fullName, phone, token) => {
            login(fullName, phone, token);
            setAuthOpen(false);
          }}
        />
      </Shell>
    );
  }

  if (state === "error") {
    return (
      <Shell>
        <div className="m-4 p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-bold text-[var(--accent-red)]">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="h-10 px-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold"
          >
            تلاش دوباره
          </button>
        </div>
      </Shell>
    );
  }

  if (state === "need-center") {
    return (
      <Shell>
        <form onSubmit={saveCenterId} className="m-4 p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-3">
          <h2 className="text-base font-black">شناسه گیمنت</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            پاسخ API شناسه گیمنت شما را برنگرداند. شناسه (gamingCenterId) را وارد کنید.
          </p>
          <input
            value={draftId}
            onChange={(e) => setDraftId(e.target.value)}
            dir="ltr"
            className="h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none"
          />
          <button type="submit" className="h-11 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm">
            ذخیره و ادامه
          </button>
        </form>
      </Shell>
    );
  }

  if (!me || !centerId) return null;

  return (
    <OwnerContext.Provider
      value={{
        me,
        centerId,
        center,
        ownerName: me.fullName || user?.fullName || "صاحب گیمنت",
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
};