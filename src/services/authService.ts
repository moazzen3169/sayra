import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_DATA } from "@/lib/api/config";

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
  async getMe(): Promise<AuthUser> {
    if (USE_MOCK_DATA) {
      return { id: "user-1", phone: "09123456789", fullName: "کاربر سایرا" };
    }
    const { data } = await apiClient.get<AuthUser>(ENDPOINTS.auth.me);
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
    try {
      await apiClient.post(ENDPOINTS.auth.logout, undefined, { retryOnAuth: false });
    } catch {
      // Ignore network errors on logout
    }
  },
};
