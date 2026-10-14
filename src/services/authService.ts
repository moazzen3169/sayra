import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

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
    await apiClient.post(ENDPOINTS.auth.otpRequest, { phone });
  },

  async verifyOtp(phone: string, code: string): Promise<AuthVerifyResponse> {
    const { data } = await apiClient.post<AuthVerifyResponse>(ENDPOINTS.auth.otpVerify, {
      phone,
      code,
    });
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>(ENDPOINTS.auth.me);
    return data;
  },
};
