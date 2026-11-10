"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OwnerAuthModal } from "@/components/owner/OwnerAuthModal";
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
  refreshCenters: () => Promise<void>;
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
  const pathname = usePathname();
  const isPublicOwnerRoute = pathname === "/owner/new";
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

  const [reloadToken, setReloadToken] = useState<number>(0);

  const refreshCenters = async () => {
    setReloadToken((t) => t + 1);
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
      if (!isPublicOwnerRoute) {
        setAuthOpen(true);
      }
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
        const actorType = profile.actorType?.toUpperCase();
        if (role === "CUSTOMER" || actorType === "CUSTOMER") {
          setCenterError("حساب کاربری شما دسترسی به پنل مدیریت گیم‌نت ندارد.");
          setCenters([]);
          setCenter(null);
          setCenterId("");
          setIsCenterLoading(false);
          return;
        }

        // Verification status from backend if provided
        if (profile.verificationStatus) {
          setVerificationStatusState(profile.verificationStatus);
        }

        // Check if there is a center ID saved in localStorage (e.g., newly created center)
        let storedCenterId: string | null = null;
        try {
          storedCenterId = localStorage.getItem(OWNER_CENTER_KEY);
        } catch {
          storedCenterId = null;
        }

        // Resolve accessible centers
        let accessibleCenters: PublicCenter[] = [];

        // 1. Primary path: User is linked to a gamingCenter via gamingCenterId foreign key
        if (profile.gamingCenterId) {
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
        } else if (profile.gamingCenters && profile.gamingCenters.length > 0) {
          // Multi-center ref list if present
          accessibleCenters = profile.gamingCenters.map((gc) => ({
            id: gc.id,
            name: gc.name || "گیم‌نت",
            slug: gc.slug || gc.id,
            description: gc.description,
            isActive: gc.isActive ?? true,
          }));
        } else if (actorType === "USER" || role === "MANAGER" || role === "ADMIN") {
          // Fallback only for manager/admin/staff users if no direct center ID is bound
          const allCenters = await ownerService.listCenters(controller.signal).catch(() => []);
          accessibleCenters = allCenters;
        }

        // 2. If storedCenterId exists but is not yet in accessibleCenters (e.g. freshly created or profile lag),
        // attempt to fetch this specific center via GET /gamingCenters/{id} before giving up or clearing it!
        if (storedCenterId && !accessibleCenters.some((c) => c.id === storedCenterId)) {
          try {
            const fetchedStored = await ownerService.findCenter(storedCenterId, controller.signal);
            if (fetchedStored && (fetchedStored.id || fetchedStored.name)) {
              accessibleCenters = [
                ...accessibleCenters,
                {
                  id: fetchedStored.id || storedCenterId,
                  name: fetchedStored.name || "گیم‌نت",
                  slug: fetchedStored.slug || storedCenterId,
                  description: fetchedStored.description,
                  isActive: fetchedStored.isActive ?? true,
                },
              ];
            } else {
              // Center truly doesn't exist or not found
              try {
                localStorage.removeItem(OWNER_CENTER_KEY);
              } catch {
                // ignore
              }
              storedCenterId = null;
            }
          } catch (err: any) {
            const errStatus = err?.status;
            // Only clear storedCenterId if explicitly rejected (404/403)
            if (errStatus === 404 || errStatus === 403) {
              try {
                localStorage.removeItem(OWNER_CENTER_KEY);
              } catch {
                // ignore
              }
              storedCenterId = null;
            }
          }
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
        if (storedCenterId) {
          chosenCenter = accessibleCenters.find((c) => c.id === storedCenterId) ?? null;
        }

        // If stored center is not valid or not matching, default to the user's primary center
        if (!chosenCenter) {
          chosenCenter = (profile.gamingCenterId && accessibleCenters.find((c) => c.id === profile.gamingCenterId)) || accessibleCenters[0];
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
  }, [authLoading, isLoggedIn, logout, reloadToken]);

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

  // Hide the entire Owner UI on protected routes if unauthenticated
  const shouldRenderChildren = isPublicOwnerRoute || isLoggedIn;

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
        refreshCenters,
        ownerName: resolvedOwnerName,
        verificationStatus,
        verificationData,
        submitVerification,
        setVerificationStatus,
      }}
    >
      {shouldRenderChildren ? (
        children
      ) : (
        <Shell>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full p-6 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-2xl font-black">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-white)]">
                  ورود به پنل مدیریت گیم‌نت
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  برای دسترسی و مشاهده بخش‌های پنل مدیریت گیم‌نت، ابتدا باید وارد حساب کاربری خود شوید.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="w-full h-11 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-transform flex items-center justify-center"
                >
                  ورود به حساب کاربری
                </button>
              </div>
            </div>
          </div>
        </Shell>
      )}

      <OwnerAuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(fullName, phone, token, refreshToken, chosenCenterId, role) => {
          login(fullName, phone, token, refreshToken, role || "MANAGER");
          if (chosenCenterId) {
            try {
              localStorage.setItem(OWNER_CENTER_KEY, chosenCenterId);
            } catch {
              // ignore
            }
          }
          setAuthOpen(false);
        }}
      />
    </OwnerContext.Provider>
  );
};
