"use client";

import React from "react";
import { UnifiedAuthForm, UnifiedAuthSuccessData } from "./UnifiedAuthForm";

export interface UserLoginPanelProps {
  onSuccess: (data: UnifiedAuthSuccessData) => void;
  title?: string;
  description?: string;
  initialMode?: "otp" | "password";
  initialPhone?: string;
}

/**
 * Shared background-less, simple inline login panel matching the profile page
 * unauthenticated layout across all screen sizes.
 */
export const UserLoginPanel: React.FC<UserLoginPanelProps> = ({
  onSuccess,
  title = "ورود یا ثبت‌نام",
  description = "",
  initialMode = "otp",
  initialPhone = "",
}) => {
  return (
    <div className="w-full max-w-md lg:max-w-xl mx-auto flex flex-col gap-5">
      <UnifiedAuthForm
        onSuccess={onSuccess}
        title={title}
        description={description}
        initialMode={initialMode}
        initialPhone={initialPhone}
      />
    </div>
  );
};
