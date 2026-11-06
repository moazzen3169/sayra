"use client";

import React from "react";
import { UnifiedAuthModal } from "@/components/auth/UnifiedAuthModal";
import type { UnifiedAuthSuccessData } from "@/components/auth/UnifiedAuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fullName: string, phone: string, token?: string, refreshToken?: string, gamingCenterId?: string, role?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
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
      title="ورود به حساب کاربری"
      description="ورود با پیامک (OTP) یا رمز عبور"
    />
  );
};
