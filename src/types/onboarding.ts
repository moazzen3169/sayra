export interface OnboardingStartPayload {
  gameCenterName: string;
  managerFullName: string;
  managerPhone: string;
}

export interface OnboardingLocationPayload {
  provinceId: string;
  cityId: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface OnboardingWorkingHoursPayload {
  openingTime: string;
  closingTime: string;
  closedDays: number[];
  timezone: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface OnboardingTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface OnboardingCompletion {
  tokens: OnboardingTokens | null;
  gamingCenterId?: string;
  slug?: string;
  raw: Record<string, unknown>;
}

export type OnboardingPreview = Record<string, unknown>;

export type OnboardingStep = "info" | "otp" | "location" | "hours" | "preview" | "done";