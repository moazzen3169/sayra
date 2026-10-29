import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";

export interface AuthUser {
  id: string;
  phone: string;
  fullName?: string;
}

export interface AuthVerifyResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

export const authService = {
  async requestOtp(phone: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    try {
      await apiClient.post(ENDPOINTS.auth.otpRequest, { phone });
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) return;
      throw e;
    }
  },

  async verifyOtp(phone: string, code: string): Promise<AuthVerifyResponse> {
    if (USE_MOCK_RESERVATIONS) {
      return {
        accessToken: "mock-access-token",
        user: { id: "user-1", phone, fullName: "کاربر تست" },
      };
    }
    try {
      const { data } = await apiClient.post<AuthVerifyResponse>(ENDPOINTS.auth.otpVerify, {
        phone,
        code,
      });
      return data;
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) {
        return {
          accessToken: "mock-access-token",
          user: { id: "user-1", phone, fullName: "کاربر تست" },
        };
      }
      throw e;
    }
  },

  async getMe(): Promise<AuthUser> {
    if (USE_MOCK_RESERVATIONS) {
      return { id: "user-1", phone: "09123456789", fullName: "کاربر سایرا" };
    }
    try {
      const { data } = await apiClient.get<AuthUser>(ENDPOINTS.auth.me);
      return data;
    } catch (e) {
      if (USE_MOCK_RESERVATIONS) {
        return { id: "user-1", phone: "09123456789", fullName: "کاربر سایرا" };
      }
      throw e;
    }
  },
};
