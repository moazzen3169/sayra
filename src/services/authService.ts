import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_DATA } from "@/lib/api/config";
import { ContractGapError } from "@/types/customerApi";

export interface AuthUser {
  id: string;
  phone: string;
  fullName?: string;
  phoneVerifiedAt?: string;
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
    if (USE_MOCK_DATA) return;
    await apiClient.post(ENDPOINTS.auth.otpRequest, { phone });
  },

  /**
   * Verify customer OTP according to OpenAPI:
   * POST /auth/customer/otp/verify
   * Body: { phone: string, code: string }
   * Response Envelope: { success: true, data: { accessToken, refreshToken?, user? } }
   */
  async verifyOtp(phone: string, code: string): Promise<AuthVerifyResponse> {
    if (USE_MOCK_DATA) {
      return {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: { id: "user-1", phone, fullName: "کاربر تست" },
      };
    }
    const { data } = await apiClient.post<AuthVerifyResponse>(ENDPOINTS.auth.otpVerify, {
      phone,
      code,
    });
    return data;
  },

  /**
   * Get current customer profile according to OpenAPI:
   * GET /customer/me
   */
  async getMe(signal?: AbortSignal): Promise<AuthUser> {
    if (USE_MOCK_DATA) {
      return { id: "user-1", phone: "09123456789", fullName: "کاربر سایرا" };
    }
    const { data } = await apiClient.get<AuthUser>(ENDPOINTS.auth.me, { signal });
    return data;
  },

  /**
   * Refresh token according to OpenAPI:
   * POST /auth/refresh
   * Body: { refreshToken: string }
   */
  async refresh(refreshToken: string): Promise<AuthRefreshResponse> {
    if (USE_MOCK_DATA) {
      return { accessToken: "mock-new-access-token" };
    }
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
    if (USE_MOCK_DATA) return;
    await apiClient.post(ENDPOINTS.auth.logout, undefined, { retryOnAuth: false });
  },

  /**
   * ویرایش مشخصات پروفایل مشتری (نام، تلفن، و ...)
   * در نسخه v1.0-LOCKED هیچ متد PATCH یا PUT برای /customer/me وجود ندارد.
   */
  updateProfileUnsupported(): never {
    throw new ContractGapError(
      "CustomerProfileUpdate",
      "PATCH /customer/me is not supported in OpenAPI v1.0-LOCKED."
    );
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

    const response = await apiClient.post<any>(ENDPOINTS.auth.userPasswordLogin, payload, {
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
};
