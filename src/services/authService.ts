import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_DATA } from "@/lib/api/config";
import { cleanPhoneNumber, isValidIranPhone, toEnglishDigits } from "@/lib/format";
import { ContractGapError } from "@/types/customerApi";

/**
 * مسیرهای پروفایل کاربر و مشتری طبق OpenAPI:
 * - کاربر احرازشده (Staff/Manager/Admin/User): GET/PATCH /auth/me
 * - مشتری: GET/PATCH /customer/me
 */

export interface AuthUser {
  id: string;
  phone: string;
  fullName?: string;
  phoneVerifiedAt?: string;
  role?: string;
  actorType?: string;
  actorId?: string;
  gamingCenterId?: string;
  sessionId?: string;
}

export interface AuthVerifyResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface AuthRefreshResponse {
  accessToken: string;
}

export interface UserGamingCenterOption {
  id: string;
  name: string;
}

export interface UserOtpVerifyResponse {
  gamingCenters: UserGamingCenterOption[];
}

export interface UserLoginResponse {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    phone: string;
    role?: string;
    gamingCenterId?: string;
    name?: string;
    fullName?: string;
  };
}

export interface PlatformAdminProfile {
  id: string;
  username?: string | null;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
  isSuperuser?: boolean;
  totpEnabled?: boolean;
  totpSetupCompleted?: boolean;
  totpEnabledAt?: string | null;
  totpLastUsedAt?: string | null;
  lastLogin?: string | null;
  role?: string;
  actorType?: string;
}

export type PlatformAdminChallengeStatus =
  | "TOTP_REQUIRED"
  | "TOTP_SETUP_REQUIRED";

export interface PlatformAdminChallengeResponse {
  status: PlatformAdminChallengeStatus;
  requiresTwoFactor: boolean;
  requiresTwoFactorSetup: boolean;
  challengeToken?: string;
  setupToken?: string;
  expiresIn?: number;
  admin?: PlatformAdminProfile;
}

export interface PlatformAdminAuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  usedRecoveryCode?: boolean;
  remainingRecoveryCodes?: number;
  admin?: PlatformAdminProfile;
}

export interface PlatformAdminAuthenticatorDevice {
  id: string;
  label: string;
  issuer?: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  isPrimary?: boolean;
  verifiedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string;
}

export interface PlatformAdmin2faSetupRequest {
  setupToken?: string;
  currentPassword?: string;
  currentTotpCode?: string;
  label?: string;
  mode?: "INITIAL" | "ADD" | "REPLACE";
}

export interface PlatformAdmin2faSetupResponse {
  deviceId: string;
  label?: string;
  mode?: "INITIAL" | "ADD" | "REPLACE";
  secret: string;
  manualEntryKey?: string;
  otpauthUrl: string;
  qrCodeDataUrl?: string;
  qrCodeSvg?: string;
  issuer?: string;
  accountName?: string;
  digits?: number;
  period?: number;
  algorithm?: string;
  expiresIn?: number;
}

export interface PlatformAdmin2faConfirmRequest {
  setupToken?: string;
  deviceId?: string;
  code: string;
  mode?: "INITIAL" | "ADD" | "REPLACE";
}

export interface PlatformAdmin2faConfirmResponse {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  admin?: PlatformAdminProfile;
  recoveryCodes?: string[];
  device?: PlatformAdminAuthenticatorDevice;
  totpEnabled?: boolean;
  replaced?: boolean;
}

export interface PlatformAdmin2faStatusResponse {
  totpEnabled: boolean;
  totpSetupCompleted: boolean;
  totpEnabledAt?: string | null;
  totpLastUsedAt?: string | null;
  devices: PlatformAdminAuthenticatorDevice[];
  recoveryCodesRemaining: number;
  activeSessionsCount: number;
}

export interface PlatformAdminSessionItem {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  mfaVerifiedAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface PlatformAdminRecoveryCodesResponse {
  recoveryCodes: string[];
  count: number;
}

function normalizePlatformAdminProfile(
  raw: Record<string, unknown> | undefined,
  fallbackIdentifier?: string
): PlatformAdminProfile {
  return {
    id: String(raw?.id ?? "platform-admin"),
    username: (raw?.username as string | null | undefined) ?? null,
    fullName: String(raw?.fullName ?? raw?.name ?? "مدیر سامانه"),
    phone:
      (raw?.phone as string | null | undefined) ??
      (fallbackIdentifier || null),
    email: (raw?.email as string | null | undefined) ?? null,
    isActive: typeof raw?.isActive === "boolean" ? raw.isActive : undefined,
    isSuperuser:
      typeof raw?.isSuperuser === "boolean" ? raw.isSuperuser : undefined,
    totpEnabled:
      typeof raw?.totpEnabled === "boolean" ? raw.totpEnabled : undefined,
    totpSetupCompleted:
      typeof raw?.totpSetupCompleted === "boolean"
        ? raw.totpSetupCompleted
        : undefined,
    totpEnabledAt: (raw?.totpEnabledAt as string | null | undefined) ?? null,
    totpLastUsedAt: (raw?.totpLastUsedAt as string | null | undefined) ?? null,
    lastLogin: (raw?.lastLogin as string | null | undefined) ?? null,
    role: String(raw?.role ?? "PLATFORM_ADMIN"),
    actorType: String(raw?.actorType ?? "PLATFORM_ADMIN"),
  };
}

function extractAdminTokensPayload(
  resData: Record<string, unknown> | undefined
): PlatformAdminAuthTokensResponse {
  const tokens = (resData?.tokens as Record<string, unknown> | undefined) ?? resData;
  const accessToken = String(
    tokens?.accessToken ?? resData?.accessToken ?? ""
  );
  const refreshToken =
    (tokens?.refreshToken as string | undefined) ??
    (resData?.refreshToken as string | undefined);
  const rawAdmin =
    (resData?.admin as Record<string, unknown> | undefined) ??
    (resData?.user as Record<string, unknown> | undefined);

  return {
    accessToken,
    refreshToken,
    sessionId: resData?.sessionId as string | undefined,
    usedRecoveryCode: Boolean(resData?.usedRecoveryCode),
    remainingRecoveryCodes:
      typeof resData?.remainingRecoveryCodes === "number"
        ? resData.remainingRecoveryCodes
        : undefined,
    admin: rawAdmin ? normalizePlatformAdminProfile(rawAdmin) : undefined,
  };
}

export const authService = {
  /**
   * Request OTP for customer according to OpenAPI:
   * POST /auth/customer/otp/request
   * Body: { phone: string }
   */
  async requestOtp(phone: string): Promise<void> {
    await apiClient.post(ENDPOINTS.auth.otpRequest, { phone });
  },


  async loginAdmin(
  username: string,
  password: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const response = await apiClient.post<any>(
    "/api/auth/admin-login/",
    { username, password },
    { retryOnAuth: false }
  );

  const responseData = response.data;
  const tokenData = responseData?.data ?? responseData;

  const accessToken = tokenData?.access;
  const refreshToken = tokenData?.refresh;

  if (!accessToken || !refreshToken) {
    throw new Error("پاسخ ورود مدیر فاقد توکن معتبر است.");
  }

  return {
    accessToken,
    refreshToken,
  };
},

  /**
   * Verify customer OTP according to OpenAPI:
   * POST /auth/customer/otp/verify
   * Body: { phone: string, code: string }
   * Handles multiple backend response shapes:
   * - { success: true, data: { tokens: { accessToken, refreshToken }, user } }
   * - { success: true, data: { accessToken, refreshToken, user } }
   * - Direct tokens object
   */
  async verifyOtp(phone: string, code: string): Promise<AuthVerifyResponse> {
    const response = await apiClient.post<any>(ENDPOINTS.auth.otpVerify, {
      phone,
      code,
    });

    const resData = response.data;
    // Extract tokens from resData.tokens, resData.data.tokens, or resData directly
    const tokens =
      resData?.tokens ||
      resData?.data?.tokens ||
      (response.rawEnvelope as any)?.data?.tokens ||
      resData;

    const accessToken =
      tokens?.accessToken ||
      resData?.accessToken ||
      resData?.data?.accessToken ||
      "";
    const refreshToken =
      tokens?.refreshToken ||
      resData?.refreshToken ||
      resData?.data?.refreshToken;
    const user =
      resData?.user ||
      resData?.data?.user ||
      tokens?.user ||
      resData?.customer ||
      resData?.data?.customer;

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  /**
   * Get current user profile:
   * GET /auth/me
   */
  async getMe(signal?: AbortSignal): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>(ENDPOINTS.auth.me, { signal });
    return data;
  },

  /**
   * Refresh token according to OpenAPI:
   * POST /auth/refresh
   * Body: { refreshToken: string }
   */
  async refresh(refreshToken: string): Promise<AuthRefreshResponse> {
    const { data } = await apiClient.post<AuthRefreshResponse>(
      ENDPOINTS.auth.refresh,
      { refreshToken },
      { retryOnAuth: false }
    );
    return data;
  },

  /**
   * Logout user according to OpenAPI:
   * POST /auth/logout
   */
  async logout(): Promise<void> {
    await apiClient.post(ENDPOINTS.auth.logout, undefined, { retryOnAuth: false });
  },

  /**
   * ویرایش مشخصات پروفایل کاربر یا مشتری لاگین‌شده
   * - برای نقش‌های غیرمشتری (actorType === "USER" یا مدیر/پرسنل/ادمین): PATCH /auth/me
   * - برای مشتری: PATCH /customer/me و در صورت خطای 403/404/405، fallback خودکار به PATCH /auth/me
   * Body: { fullName: string } (۲ تا ۱۰۰ کاراکتر)
   *
   * خطاهای سرور عمداً بدون تغییر منتشر می‌شوند تا موفقیت جعلی نمایش داده نشود.
   */
  async updateProfile(
    data: { fullName?: string },
    options?: { actorType?: string; role?: string }
  ): Promise<AuthUser> {
    const payload: { fullName?: string } = {};
    if (data.fullName !== undefined) {
      const name = data.fullName.trim();
      if (name.length < 2 || name.length > 100) {
        throw new Error("نام باید بین ۲ تا ۱۰۰ کاراکتر باشد.");
      }
      payload.fullName = name;
    }

    const unwrap = (raw: unknown): AuthUser => {
      if (raw && typeof raw === "object" && "data" in raw && raw.data) {
        return raw.data as AuthUser;
      }
      return raw as AuthUser;
    };

    const actorUpper = String(options?.actorType ?? "").trim().toUpperCase();
    const roleUpper = String(options?.role ?? "").trim().toUpperCase();
    const isStaffOrUserActor =
      actorUpper === "USER" ||
      ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "MANAGER", "OWNER", "STAFF"].includes(roleUpper);

    if (isStaffOrUserActor) {
      const response = await apiClient.patch<AuthUser | { data?: AuthUser }>(
        ENDPOINTS.auth.me,
        payload
      );
      return unwrap(response.data);
    }

    try {
      const response = await apiClient.patch<AuthUser | { data?: AuthUser }>(
        ENDPOINTS.auth.customerMe,
        payload
      );
      return unwrap(response.data);
    } catch (err: unknown) {
      const errObj = err as { status?: number; response?: { status?: number } };
      const status = errObj?.status ?? errObj?.response?.status;
      if (status === 403 || status === 404 || status === 405) {
        const fallbackResponse = await apiClient.patch<AuthUser | { data?: AuthUser }>(
          ENDPOINTS.auth.me,
          payload
        );
        return unwrap(fallbackResponse.data);
      }
      throw err;
    }
  },

  /**
   * مدیریت و افزایش موجودی کیف پول کاربر
   * در نسخه v1.0-LOCKED هیچ اندپوینتی برای کیف پول تعریف نشده است.
   */
  walletUnsupported(): never {
    throw new ContractGapError(
      "CustomerWallet",
      "Customer wallet endpoints are not defined in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * ورود با کلمه عبور برای مشتریان عادی
   * در نسخه v1.0-LOCKED تنها ورود با OTP برای مشتریان تعریف شده است.
   */
  customerPasswordLoginUnsupported(): never {
    throw new ContractGapError(
      "CustomerPasswordLogin",
      "Customer password login is not supported in OpenAPI v1.0-LOCKED. Only passwordless OTP is supported."
    );
  },

  /**
   * ثبت‌نام مجزا برای مشتریان
   * در OpenAPI فرآیند ثبت‌نام و ورود از طریق ورود با شماره تلفن و OTP انجام می‌شود.
   */
  customerRegistrationUnsupported(): never {
    throw new ContractGapError(
      "CustomerRegistration",
      "Dedicated customer registration endpoint does not exist; authentication is handled via OTP request and verify."
    );
  },

  /**
   * بازیابی رمز عبور مشتریان
   * از آنجا که مشتریان سیستم کلمه عبور ندارند، بازیابی رمز عبور پشتیبانی نمی‌شود.
   */
  customerPasswordResetUnsupported(): never {
    throw new ContractGapError(
      "CustomerPasswordReset",
      "Password reset is not supported for customers as authentication is strictly passwordless OTP."
    );
  },

  /**
   * ورود با شبکه‌های اجتماعی (Social Login)
   */
  socialLoginUnsupported(): never {
    throw new ContractGapError(
      "SocialLogin",
      "Social login (Google, Apple, etc.) is not defined in OpenAPI v1.0-LOCKED."
    );
  },

  /* =========================================================================
     بخش پرسنل و مدیران مراکز بازی (Staff / Manager Flow)
     ========================================================================= */

  /**
   * درخواست OTP پرسنل / مدیر گیمنت
   * POST /auth/user/otp/request
   * Body: { phone: string }
   */
  async requestUserOtp(phone: string): Promise<void> {
    if (USE_MOCK_DATA) return;
    await apiClient.post(ENDPOINTS.auth.userOtpRequest, { phone });
  },

  /**
   * اعتبارسنجی کد یکبار مصرف پرسنل و دریافت مراکز فعال کاربر
   * POST /auth/user/otp/verify
   * Body: { phone: string, code: string }
   * Response Envelope: { success: true, data: { gamingCenters: [{ id, name }] } }
   */
  async verifyUserOtp(phone: string, code: string): Promise<UserOtpVerifyResponse> {
    if (USE_MOCK_DATA) {
      return {
        gamingCenters: [
          { id: "gc-mock-1", name: "شعبه مرکزی" },
          { id: "gc-mock-2", name: "شعبه ۲" },
        ],
      };
    }
    const response = await apiClient.post<any>(ENDPOINTS.auth.userOtpVerify, {
      phone,
      code,
    });
    const resData = response.data;
    if (resData && Array.isArray(resData.gamingCenters)) {
      return { gamingCenters: resData.gamingCenters };
    }
    if (Array.isArray(resData)) {
      return { gamingCenters: resData };
    }
    return { gamingCenters: [] };
  },

  /**
   * نهایی‌سازی ورود پرسنل با انتخاب شعبه
   * POST /auth/user/login/otp
   * Request Body: { phone: string, gamingCenterId?: string, code?: string }
   * Response Envelope: { success: true, data: { tokens: { accessToken, refreshToken }, user } } or { accessToken, refreshToken }
   */
  async loginUserWithOtp(
    phone: string,
    gamingCenterId?: string,
    code?: string
  ): Promise<UserLoginResponse> {
    if (USE_MOCK_DATA) {
      return {
        accessToken: "mock-user-access-token",
        refreshToken: "mock-user-refresh-token",
        user: {
          id: "mock-user-id",
          phone,
          role: "MANAGER",
          gamingCenterId: gamingCenterId || "gc-mock-1",
          name: "مدیر گیم‌نت",
        },
      };
    }

    const payload: Record<string, string> = { phone };
    if (gamingCenterId) payload.gamingCenterId = gamingCenterId;
    if (code) payload.code = code;

    const response = await apiClient.post<any>(ENDPOINTS.auth.userOtpLogin, payload, {
      retryOnAuth: false,
    });

    const resData = response.data;
    const tokens = resData?.tokens || resData;
    const accessToken = tokens?.accessToken || resData?.accessToken || "";
    const refreshToken = tokens?.refreshToken || resData?.refreshToken;
    const user = resData?.user || resData?.customer;

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  /**
   * ورود مستقیم پرسنل / مدیر با نام کاربری، رمز عبور و شناسه گیمنت
   * POST /auth/login
   * Body: { phone: string, password: string, gamingCenterId?: string }
   */
  async loginUserWithPassword(
    phone: string,
    password: string,
    gamingCenterId?: string
  ): Promise<UserLoginResponse> {
    if (USE_MOCK_DATA) {
      return {
        accessToken: "mock-password-access-token",
        refreshToken: "mock-password-refresh-token",
        user: {
          id: "mock-user-id",
          phone,
          role: "MANAGER",
          gamingCenterId: gamingCenterId || "gc-mock-1",
          name: "مدیر گیم‌نت",
        },
      };
    }

    const payload: Record<string, string> = {
      phone,
      password,
    };
    if (gamingCenterId) {
      payload.gamingCenterId = gamingCenterId;
    }

    const endpoint = ENDPOINTS.auth.platformAdminLogin || "/auth/login";
    const response = await apiClient.post<any>(endpoint, payload, {
      retryOnAuth: false,
    });

    const resData = response.data;
    const tokens = resData?.tokens || resData;
    const accessToken = tokens?.accessToken || resData?.accessToken || "";
    const refreshToken = tokens?.refreshToken || resData?.refreshToken;
    const user = resData?.user || resData?.customer;

    return {
      accessToken,
      refreshToken,
      user,
    };
  },

  /* =========================================================================
     بخش احراز هویت اختصاصی مدیر سامانه (Platform Admin + Mandatory 2FA)
     ========================================================================= */

  /**
   * مرحله ۱ ورود مدیر سامانه: اعتبارسنجی شناسه (نام کاربری / ایمیل / موبایل) و رمز عبور
   * POST /auth/platform-admin/login
   * در این مرحله هیچ Access Token دائمی صادر نمی‌شود؛ فقط challengeToken یا setupToken برگردانده می‌شود.
   */
  async loginPlatformAdmin(
    identifier: string,
    password: string
  ): Promise<PlatformAdminChallengeResponse> {
    const trimmed = toEnglishDigits(identifier).trim();
    const cleanPhone = cleanPhoneNumber(trimmed);
    const isPhone = isValidIranPhone(cleanPhone);
    const normalizedIdentifier = isPhone ? cleanPhone : trimmed;

    const payload: Record<string, string> = {
      identifier: normalizedIdentifier,
      username: normalizedIdentifier,
      password,
    };

    if (isPhone) {
      payload.phone = cleanPhone;
    } else if (trimmed.includes("@")) {
      payload.email = trimmed.toLowerCase();
    }

    const response = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.auth.platformAdmin.login,
      payload,
      {
        authScope: "admin",
        skipAuth: true,
        retryOnAuth: false,
        credentials: "include",
      }
    );

    const resData = response.data ?? {};
    const rawStatus = String(resData.status ?? "").toUpperCase();
    const setupToken =
      typeof resData.setupToken === "string" ? resData.setupToken : undefined;
    const challengeToken =
      typeof resData.challengeToken === "string"
        ? resData.challengeToken
        : undefined;

    const requiresTwoFactorSetup =
      rawStatus === "TOTP_SETUP_REQUIRED" ||
      Boolean(resData.requiresTwoFactorSetup) ||
      Boolean(setupToken && !challengeToken);

    const status: PlatformAdminChallengeStatus = requiresTwoFactorSetup
      ? "TOTP_SETUP_REQUIRED"
      : "TOTP_REQUIRED";

    const rawAdmin =
      (resData.admin as Record<string, unknown> | undefined) ??
      (resData.user as Record<string, unknown> | undefined);

    return {
      status,
      requiresTwoFactor:
        typeof resData.requiresTwoFactor === "boolean"
          ? resData.requiresTwoFactor
          : true,
      requiresTwoFactorSetup,
      challengeToken: challengeToken ?? (status === "TOTP_REQUIRED" ? setupToken : undefined),
      setupToken: setupToken ?? (status === "TOTP_SETUP_REQUIRED" ? challengeToken : undefined),
      expiresIn:
        typeof resData.expiresIn === "number" ? resData.expiresIn : undefined,
      admin: rawAdmin
        ? normalizePlatformAdminProfile(rawAdmin, normalizedIdentifier)
        : undefined,
    };
  },

  /**
   * مرحله ۲ (حالت دوم): تأیید ورود با کد ۶ رقمی TOTP یا Recovery Code یکبارمصرف
   * POST /auth/platform-admin/verify-2fa
   */
  async verifyPlatformAdmin2fa(payload: {
    challengeToken: string;
    code?: string;
    recoveryCode?: string;
  }): Promise<PlatformAdminAuthTokensResponse> {
    const body: Record<string, string> = {
      challengeToken: payload.challengeToken,
    };

    if (payload.code) {
      body.code = toEnglishDigits(payload.code).replace(/\D/g, "");
    } else if (payload.recoveryCode) {
      body.recoveryCode = toEnglishDigits(payload.recoveryCode).trim();
    }

    const response = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.auth.platformAdmin.verify2fa,
      body,
      {
        authScope: "admin",
        skipAuth: true,
        retryOnAuth: false,
        credentials: "include",
      }
    );

    return extractAdminTokensPayload(response.data);
  },

  /**
   * مرحله ۲a (راه‌اندازی اولیه اجباری یا افزودن/جایگزینی دستگاه جدید):
   * POST /auth/platform-admin/2fa/setup
   */
  async setupPlatformAdmin2fa(
    payload: PlatformAdmin2faSetupRequest
  ): Promise<PlatformAdmin2faSetupResponse> {
    const isInitialFlow = Boolean(payload.setupToken);
    const body: Record<string, string> = {};

    if (payload.setupToken) body.setupToken = payload.setupToken;
    if (payload.currentPassword) body.currentPassword = payload.currentPassword;
    if (payload.currentTotpCode) {
      body.currentTotpCode = toEnglishDigits(payload.currentTotpCode).replace(
        /\D/g,
        ""
      );
    }
    if (payload.label?.trim()) body.label = payload.label.trim();
    if (payload.mode) body.mode = payload.mode;

    const response = await apiClient.post<PlatformAdmin2faSetupResponse>(
      ENDPOINTS.auth.platformAdmin.setup2fa,
      body,
      {
        authScope: "admin",
        skipAuth: isInitialFlow,
        retryOnAuth: !isInitialFlow,
        credentials: "include",
      }
    );

    return response.data;
  },

  /**
   * مرحله ۲b (تأیید راه‌اندازی 2FA با اولین کد ۶ رقمی):
   * POST /auth/platform-admin/2fa/confirm
   */
  async confirmPlatformAdmin2fa(
    payload: PlatformAdmin2faConfirmRequest
  ): Promise<PlatformAdmin2faConfirmResponse> {
    const isInitialFlow = Boolean(payload.setupToken);
    const body: Record<string, string> = {
      code: toEnglishDigits(payload.code).replace(/\D/g, ""),
    };

    if (payload.setupToken) body.setupToken = payload.setupToken;
    if (payload.deviceId) body.deviceId = payload.deviceId;
    if (payload.mode) body.mode = payload.mode;

    const response = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.auth.platformAdmin.confirm2fa,
      body,
      {
        authScope: "admin",
        skipAuth: isInitialFlow,
        retryOnAuth: !isInitialFlow,
        credentials: "include",
      }
    );

    const resData = response.data ?? {};
    const extracted = extractAdminTokensPayload(resData);
    const recoveryCodes = Array.isArray(resData.recoveryCodes)
      ? resData.recoveryCodes.map(String)
      : undefined;

    return {
      accessToken: extracted.accessToken || undefined,
      refreshToken: extracted.refreshToken,
      sessionId: extracted.sessionId,
      admin: extracted.admin,
      recoveryCodes,
      device: resData.device as PlatformAdminAuthenticatorDevice | undefined,
      totpEnabled:
        typeof resData.totpEnabled === "boolean"
          ? resData.totpEnabled
          : undefined,
      replaced:
        typeof resData.replaced === "boolean" ? resData.replaced : undefined,
    };
  },

  /**
   * تمدید نشست مدیر سامانه (Refresh Token Rotation)
   * POST /auth/platform-admin/refresh
   */
  async refreshPlatformAdminSession(
    refreshToken?: string
  ): Promise<PlatformAdminAuthTokensResponse> {
    const response = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.auth.platformAdmin.refresh,
      refreshToken ? { refreshToken } : {},
      {
        authScope: "admin",
        skipAuth: true,
        retryOnAuth: false,
        credentials: "include",
      }
    );

    return extractAdminTokensPayload(response.data);
  },

  /**
   * خروج و ابطال نشست فعلی مدیر سامانه + پاک کردن کوکی playnest_admin_refresh
   * POST /auth/platform-admin/logout
   */
  async logoutPlatformAdmin(): Promise<void> {
    await apiClient.post(
      ENDPOINTS.auth.platformAdmin.logout,
      undefined,
      {
        authScope: "admin",
        retryOnAuth: false,
        credentials: "include",
      }
    );
  },

  /**
   * دریافت لیست نشست‌های فعال مدیر سامانه
   * GET /auth/platform-admin/sessions
   */
  async getPlatformAdminSessions(): Promise<PlatformAdminSessionItem[]> {
    const response = await apiClient.get<{
      sessions?: PlatformAdminSessionItem[];
    }>(ENDPOINTS.auth.platformAdmin.sessions, {
      authScope: "admin",
      credentials: "include",
    });

    const data = response.data;
    if (Array.isArray(data)) {
      return data as unknown as PlatformAdminSessionItem[];
    }
    return Array.isArray(data?.sessions) ? data.sessions : [];
  },

  /**
   * لغو تمام نشست‌های فعال مدیر سامانه
   * POST /auth/platform-admin/sessions/revoke-all
   */
  async revokeAllPlatformAdminSessions(): Promise<void> {
    await apiClient.post(
      ENDPOINTS.auth.platformAdmin.revokeAllSessions,
      undefined,
      {
        authScope: "admin",
        credentials: "include",
      }
    );
  },

  /**
   * دریافت وضعیت 2FA، دستگاه‌های متصل و تعداد کدهای بازیابی باقی‌مانده
   * GET /auth/platform-admin/2fa/status
   */
  async getPlatformAdmin2faStatus(): Promise<PlatformAdmin2faStatusResponse> {
    const response = await apiClient.get<PlatformAdmin2faStatusResponse>(
      ENDPOINTS.auth.platformAdmin.status2fa,
      {
        authScope: "admin",
        credentials: "include",
      }
    );

    return response.data;
  },

  /**
   * حذف دستگاه Authenticator ثانویه (نیازمند تأیید مجدد پسورد و کد TOTP)
   * DELETE /auth/platform-admin/2fa/devices/:deviceId
   */
  async deletePlatformAdmin2faDevice(
    deviceId: string,
    payload: { currentPassword: string; code: string }
  ): Promise<void> {
    await apiClient.delete(
      ENDPOINTS.auth.platformAdmin.delete2faDevice(deviceId),
      {
        authScope: "admin",
        credentials: "include",
        body: {
          currentPassword: payload.currentPassword,
          code: toEnglishDigits(payload.code).replace(/\D/g, ""),
        },
      }
    );
  },

  /**
   * تولید مجدد ۱۰ کد بازیابی یکبارمصرف (نیازمند تأیید مجدد پسورد و کد TOTP)
   * POST /auth/platform-admin/2fa/recovery-codes/regenerate
   */
  async regeneratePlatformAdminRecoveryCodes(payload: {
    currentPassword: string;
    code: string;
  }): Promise<PlatformAdminRecoveryCodesResponse> {
    const response = await apiClient.post<PlatformAdminRecoveryCodesResponse>(
      ENDPOINTS.auth.platformAdmin.regenerateRecoveryCodes,
      {
        currentPassword: payload.currentPassword,
        code: toEnglishDigits(payload.code).replace(/\D/g, ""),
      },
      {
        authScope: "admin",
        credentials: "include",
      }
    );

    return response.data;
  },

  /**
   * غیرفعال‌سازی 2FA و لغو تمام نشست‌های فعال (نیازمند تأیید مجدد پسورد و کد TOTP یا Recovery Code)
   * POST /auth/platform-admin/2fa/disable
   */
  async disablePlatformAdmin2fa(payload: {
    currentPassword: string;
    code?: string;
    recoveryCode?: string;
  }): Promise<void> {
    const body: Record<string, string> = {
      currentPassword: payload.currentPassword,
    };

    if (payload.code) {
      body.code = toEnglishDigits(payload.code).replace(/\D/g, "");
    } else if (payload.recoveryCode) {
      body.recoveryCode = toEnglishDigits(payload.recoveryCode).trim();
    }

    await apiClient.post(
      ENDPOINTS.auth.platformAdmin.disable2fa,
      body,
      {
        authScope: "admin",
        credentials: "include",
      }
    );
  },
};