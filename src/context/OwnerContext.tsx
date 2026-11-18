"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OwnerAuthModal } from "@/components/owner/OwnerAuthModal";
import {
  OwnerAccessState,
  OwnerPanelSkeleton,
  type OwnerAccessVariant,
} from "@/components/owner/OwnerAccessView";
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

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isPublicOwnerRoute =
    pathname === "/owner/new" || pathname.startsWith("/owner/new/");
  const { isLoggedIn, isLoading: authLoading, login, logout, user } = useAuth();

  const [me, setMe] = useState<OwnerMe | null>(null);
  const [centers, setCenters] = useState<PublicCenter[]>([]);
  const [centerId, setCenterId] = useState<string>("");
  const [center, setCenter] = useState<PublicCenter | null>(null);
  const [isCenterLoading, setIsCenterLoading] = useState<boolean>(true);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<OwnerAccessVariant | null>(null);

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
      setAccessState("unauthenticated");
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
      setAccessState(null);

      try {
        const profile = await ownerService.getMe(controller.signal);
        if (!active) return;
        setMe(profile);

        // Security check: Customer accounts cannot access Owner panel
        const role = profile.role?.toUpperCase();
        const actorType = profile.actorType?.toUpperCase();
        if (role === "CUSTOMER" || actorType === "CUSTOMER") {
          setAccessState("forbidden");
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
          setAccessState("no_center");
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
        setAccessState(null);
        setIsCenterLoading(false);
      } catch (err: any) {
        if (!active || isAbortError(err)) return;

        const status = err?.status;
        if (status === 401) {
          logout();
          setAccessState("unauthenticated");
          setCenterError("نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.");
          setAuthOpen(true);
        } else if (status === 403) {
          setAccessState("forbidden");
          setCenterError("دسترسی غیرمجاز. شما مجوز دسترسی به این بخش را ندارید.");
        } else {
          setAccessState("error");
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

  if (!isPublicOwnerRoute && (authLoading || isCenterLoading)) {
    return (
      <OwnerPanelSkeleton statusText="در حال بارگذاری اطلاعات گیم‌نت..." />
    );
  }

  // Real owner display name resolution
  const resolvedOwnerName =
    verificationData?.ownerName ||
    me?.fullName ||
    user?.fullName ||
    "";

  // Strictly block protected Owner UI unless logged in, authorized, and a center is resolved
  const resolvedAccessBlock: OwnerAccessVariant | null = isPublicOwnerRoute
    ? null
    : !isLoggedIn
      ? "unauthenticated"
      : accessState
        ? accessState
        : !centerId
          ? "no_center"
          : null;

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
      {resolvedAccessBlock ? (
        <OwnerAccessState
          variant={resolvedAccessBlock}
          pathname={pathname}
          message={centerError}
          onLoginClick={
            resolvedAccessBlock === "unauthenticated"
              ? () => setAuthOpen(true)
              : undefined
          }
          onRetry={refreshCenters}
          isRetrying={isCenterLoading}
        />
      ) : (
        children
      )}

      <OwnerAuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(fullName, phone, token, refreshToken, chosenCenterId, role, actorType) => {
          login(fullName, phone, token, refreshToken, role || "MANAGER", actorType, chosenCenterId);
          if (chosenCenterId) {
            try {
              localStorage.setItem(OWNER_CENTER_KEY, chosenCenterId);
            } catch {
              // ignore
            }
          }
          setAuthOpen(false);
          setReloadToken((t) => t + 1);
        }}
      />
    </OwnerContext.Provider>
  );
};
