import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_DATA } from "@/lib/api/config";
import { ContractGapError } from "@/types/customerApi";

export interface AuthUser {
  id: string;
  phone: string;
  fullName?: string;
  phoneVerifiedAt?: string;
  role?: string;
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

export const authService = {
  /**
   * Request OTP for customer according to OpenAPI:
   * POST /auth/customer/otp/request
   * Body: { phone: string }
   */
  async requestOtp(phone: string): Promise<void> {
    await apiClient.post(ENDPOINTS.auth.otpRequest, { phone });
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
   * Get current customer profile according to OpenAPI:
   * GET /customer/me
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
   * ویرایش مشخصات پروفایل مشتری لاگین‌شده
   * PATCH /customer/me
   * Body: { fullName: string }
   */
  async updateProfile(data: { fullName?: string }): Promise<AuthUser> {
    const payload: { fullName?: string } = {};
    if (data.fullName !== undefined) {
      payload.fullName = data.fullName.trim();
    }
    const response = await apiClient.patch<AuthUser>(ENDPOINTS.auth.me, payload);
    return response.data;
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

  /**
   * ورود اختصاصی مدیر سامانه (Platform Admin) با ایمیل و رمز عبور
   * POST /auth/platform-admin/login
   */
  async loginPlatformAdminWithEmail(
    email: string,
    password: string
  ): Promise<UserLoginResponse> {
    const trimmedEmail = email.trim().toLowerCase();
    const payload = {
      email: trimmedEmail,
      phone: trimmedEmail,
      password,
    };

    const endpoint = ENDPOINTS.auth.userPasswordLogin || "/auth/platform-admin/login";
    const response = await apiClient.post<any>(endpoint, payload, {
      retryOnAuth: false,
    });

    const resData = response.data;
    const tokens = resData?.tokens || resData;
    const accessToken = tokens?.accessToken || resData?.accessToken || "";
    const refreshToken = tokens?.refreshToken || resData?.refreshToken;
    const user = resData?.user || resData?.admin || resData?.data?.user;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user?.id || "admin-user",
        phone: user?.phone || trimmedEmail,
        fullName: user?.fullName || user?.name || "مدیر سامانه",
        role: user?.role || "ADMIN",
        gamingCenterId: user?.gamingCenterId,
      },
    };
  },
};
