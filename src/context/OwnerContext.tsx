"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { ownerService } from "@/services/ownerService";
import type { OwnerMe, OwnerVerificationData, PublicCenter, VerificationStatus } from "@/types/owner";

const OWNER_CENTER_KEY = "sayra_owner_center_id";
const OWNER_VERIFICATION_KEY = "sayra_owner_verification";

interface OwnerContextType {
  me: OwnerMe | null;
  centerId: string;
  center: PublicCenter | null;
  centers: PublicCenter[];
  selectCenter: (centerId: string) => void;
  isCenterLoading: boolean;
  centerError: string | null;
  ownerName: string;
  verificationStatus: VerificationStatus;
  verificationData: OwnerVerificationData | null;
  submitVerification: (data: OwnerVerificationData) => void;
  setVerificationStatus: (status: VerificationStatus) => void;
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
  const { isLoggedIn, isLoading: authLoading, login, logout, user } = useAuth();

  const [me, setMe] = useState<OwnerMe | null>(null);
  const [centers, setCenters] = useState<PublicCenter[]>([]);
  const [centerId, setCenterId] = useState<string>("");
  const [center, setCenter] = useState<PublicCenter | null>(null);
  const [isCenterLoading, setIsCenterLoading] = useState<boolean>(true);
  const [centerError, setCenterError] = useState<string | null>(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [verificationStatus, setVerificationStatusState] = useState<VerificationStatus>("APPROVED");
  const [verificationData, setVerificationData] = useState<OwnerVerificationData | null>(null);

  // Read saved verification from localStorage on mount (for draft/view until backend endpoints arrive)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OWNER_VERIFICATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status) setVerificationStatusState(parsed.status);
        if (parsed.data) setVerificationData(parsed.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const submitVerification = (data: OwnerVerificationData) => {
    setVerificationData(data);
    setVerificationStatusState("PENDING");
    try {
      localStorage.setItem(
        OWNER_VERIFICATION_KEY,
        JSON.stringify({ status: "PENDING", data })
      );
    } catch {
      // ignore
    }
  };

  const setVerificationStatus = (status: VerificationStatus) => {
    setVerificationStatusState(status);
    try {
      localStorage.setItem(
        OWNER_VERIFICATION_KEY,
        JSON.stringify({ status, data: verificationData })
      );
    } catch {
      // ignore
    }
  };

  // Center selection function with validation against authorized centers
  const selectCenter = (newCenterId: string) => {
    if (!newCenterId) return;
    const match = centers.find((c) => c.id === newCenterId);
    if (!match) {
      setCenterError("گیم‌نت انتخاب شده معتبر نیست یا به آن دسترسی ندارید.");
      return;
    }
    setCenterId(newCenterId);
    setCenter(match);
    setCenterError(null);
    try {
      localStorage.setItem(OWNER_CENTER_KEY, newCenterId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      setIsCenterLoading(false);
      setMe(null);
      setCenters([]);
      setCenter(null);
      setCenterId("");
      setCenterError("برای دسترسی به پنل مدیریت باید وارد حساب کاربری خود شوید.");
      setAuthOpen(true);
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function loadOwnerAndCenters() {
      setIsCenterLoading(true);
      setCenterError(null);

      try {
        const profile = await ownerService.getMe(controller.signal);
        if (!active) return;
        setMe(profile);

        // Security check: Customer accounts cannot access Owner panel
        const role = profile.role?.toUpperCase();
        if (role === "CUSTOMER") {
          setCenterError("حساب کاربری شما دسترسی به پنل مدیریت گیم‌نت ندارد.");
          setIsCenterLoading(false);
          return;
        }

        // Verification status from backend if provided
        if (profile.verificationStatus) {
          setVerificationStatusState(profile.verificationStatus);
        }

        // Resolve accessible centers
        let accessibleCenters: PublicCenter[] = [];

        // 1. Direct centers on profile
        if (profile.gamingCenters && profile.gamingCenters.length > 0) {
          accessibleCenters = profile.gamingCenters.map((gc) => ({
            id: gc.id,
            name: gc.name || "گیم‌نت",
            slug: gc.slug || gc.id,
            description: gc.description,
            isActive: gc.isActive ?? true,
          }));
        } else if (profile.gamingCenterId) {
          // Profile has single center ID
          const fetchedCenter = await ownerService.findCenter(profile.gamingCenterId, controller.signal).catch(() => null);
          if (fetchedCenter) {
            accessibleCenters = [fetchedCenter];
          } else {
            accessibleCenters = [{
              id: profile.gamingCenterId,
              name: "گیم‌نت",
              slug: profile.gamingCenterId,
              isActive: true,
            }];
          }
        } else {
          // Fetch centers list from backend
          const allCenters = await ownerService.listCenters(controller.signal).catch(() => []);
          // If profile has ownerId or center relationships
          accessibleCenters = allCenters;
        }

        if (!active) return;
        setCenters(accessibleCenters);

        if (accessibleCenters.length === 0) {
          setCenterError("هیچ مرکز بازی فعالی برای این حساب کاربری یافت نشد.");
          setCenter(null);
          setCenterId("");
          setIsCenterLoading(false);
          return;
        }

        // Validate localStorage center ID against accessible centers
        let chosenCenter: PublicCenter | null = null;
        let storedCenterId: string | null = null;
        try {
          storedCenterId = localStorage.getItem(OWNER_CENTER_KEY);
        } catch {
          storedCenterId = null;
        }

        if (storedCenterId) {
          chosenCenter = accessibleCenters.find((c) => c.id === storedCenterId) ?? null;
          if (!chosenCenter) {
            // Stored center is not accessible/valid for this user! Clear it.
            try {
              localStorage.removeItem(OWNER_CENTER_KEY);
            } catch {
              // ignore
            }
          }
        }

        if (!chosenCenter) {
          chosenCenter = accessibleCenters[0];
          try {
            localStorage.setItem(OWNER_CENTER_KEY, chosenCenter.id);
          } catch {
            // ignore
          }
        }

        setCenterId(chosenCenter.id);
        setCenter(chosenCenter);
        setIsCenterLoading(false);
      } catch (err: any) {
        if (!active || isAbortError(err)) return;

        const status = err?.status;
        if (status === 401) {
          logout();
          setCenterError("نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.");
          setAuthOpen(true);
        } else if (status === 403) {
          setCenterError("دسترسی غیرمجاز. شما مجوز دسترسی به این بخش را ندارید.");
        } else {
          setCenterError(err?.message || "خطا در دریافت اطلاعات مالک و مرکز بازی.");
        }
        setMe(null);
        setCenters([]);
        setCenter(null);
        setCenterId("");
        setIsCenterLoading(false);
      }
    }

    loadOwnerAndCenters();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, isLoggedIn, logout]);

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

  // Real owner display name resolution
  const resolvedOwnerName =
    verificationData?.ownerName ||
    me?.fullName ||
    user?.fullName ||
    "";

  return (
    <OwnerContext.Provider
      value={{
        me,
        centerId,
        center,
        centers,
        selectCenter,
        isCenterLoading,
        centerError,
        ownerName: resolvedOwnerName,
        verificationStatus,
        verificationData,
        submitVerification,
        setVerificationStatus,
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
