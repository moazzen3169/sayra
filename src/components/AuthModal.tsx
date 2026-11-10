"use client";

import React from "react";
import { UnifiedAuthModal } from "@/components/auth/UnifiedAuthModal";
import type { UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  onSuccess: (fullName: string, phone: string, token?: string, refreshToken?: string, gamingCenterId?: string, role?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialPhone,
  onSuccess,
}) => {
  const handleSuccess = (data: UnifiedAuthSuccessData) => {
    onSuccess(
      data.fullName,
      data.phone,
      data.accessToken,
      data.refreshToken,
      data.gamingCenterId,
      data.role
    );
  };

  return (
    <UnifiedAuthModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={handleSuccess}
      title="ورود یا ثبت‌نام"
      description="ورود و ثبت‌نام سریع با پیامک یک‌بار مصرف (OTP)"
      initialPhone={initialPhone}
    />
  );
};
