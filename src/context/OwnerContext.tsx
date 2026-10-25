"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { ownerService } from "@/services/ownerService";
import type { OwnerMe, PublicCenter } from "@/types/owner";

const OWNER_CENTER_KEY = "sayra_owner_center_id";

const MOCK_OWNER_ME: OwnerMe = {
  id: "owner-demo-1",
  fullName: "صاحب گیمنت گرگدن",
  phone: "۰۹۱۲۳۴۵۶۷۸۹",
  gamingCenterId: "gc-1",
  subscriptionDaysLeft: 30,
};

const MOCK_CENTER: PublicCenter = {
  id: "gc-1",
  name: "گیمنت گرگدن",
  slug: "gergdan",
  description: "تبریز، ولیعصر، بعد از میدان معلم",
  isActive: true,
};

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

  const [me, setMe] = useState<OwnerMe>(MOCK_OWNER_ME);
  const [centerId, setCenterId] = useState<string>("gc-1");
  const [center, setCenter] = useState<PublicCenter | null>(MOCK_CENTER);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
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
        if (!id) id = "gc-1";

        setCenterId(id);
        const c = await ownerService.findCenter(id, controller.signal);
        if (!active) return;
        setCenter(c ?? MOCK_CENTER);
      } catch (e) {
        if (!active || isAbortError(e)) return;
        // Fallback to mock data on error so owner pages are always fully viewable/designable
        setMe((prev) => ({
          ...MOCK_OWNER_ME,
          fullName: user?.fullName || prev?.fullName || MOCK_OWNER_ME.fullName,
        }));
        setCenterId("gc-1");
        setCenter(MOCK_CENTER);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, isLoggedIn, user?.fullName]);

  if (authLoading) {
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

  const activeMe = me || MOCK_OWNER_ME;
  const activeCenterId = centerId || "gc-1";

  return (
    <OwnerContext.Provider
      value={{
        me: activeMe,
        centerId: activeCenterId,
        center: center || MOCK_CENTER,
        ownerName: activeMe.fullName || user?.fullName || "صاحب گیمنت",
      }}
    >
      {children}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(fullName, phone, token) => {
          login(fullName, phone, token);
          setAuthOpen(false);
        }}
      />
    </OwnerContext.Provider>
  );
};
