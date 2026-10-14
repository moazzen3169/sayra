/** فقط Path نگه‌داری می‌شود، نه Domain */
const enc = encodeURIComponent;

export const ENDPOINTS = {
  auth: {
    otpRequest: "/auth/customer/otp/request",
    otpVerify: "/auth/customer/otp/verify",
    me: "/customer/me",
  },
  gamingCenter: {
    detail: (slug: string) => `/public/gamingCenters/${enc(slug)}`,
    availabilitySlots: (slug: string) => `/public/gamingCenters/${enc(slug)}/availability/slots`,
    ratings: (slug: string) => `/public/gamingCenters/${enc(slug)}/ratings`,
    media: (slug: string) => `/public/gamingCenters/${enc(slug)}/media`,
    links: (slug: string) => `/public/gamingCenters/${enc(slug)}/links`,
    addresses: (slug: string) => `/public/gamingCenters/${enc(slug)}/addresses`,
    stations: (gamingCenterId: string) => `/gamingCenters/${enc(gamingCenterId)}/stations`,
  },
  reservation: {
    create: (gamingCenterSlug: string) => `/public/gamingCenters/${enc(gamingCenterSlug)}/reservation`,
    list: "/customer/reservation",
    detail: (reservationId: string) => `/customer/reservation/${enc(reservationId)}`,
    cancel: (reservationId: string) => `/customer/reservation/${enc(reservationId)}/cancel`,
    rate: (reservationId: string) => `/customer/reservation/${enc(reservationId)}/ratings`,
    proposals: (reservationId: string) => `/customer/reservation/${enc(reservationId)}/proposals`,
    acceptProposal: (reservationId: string, proposalId: string) =>
      `/customer/reservation/${enc(reservationId)}/proposals/${enc(proposalId)}/accept`,
    rejectProposal: (reservationId: string, proposalId: string) =>
      `/customer/reservation/${enc(reservationId)}/proposals/${enc(proposalId)}/reject`,
  },
  payment: {
    init: (gamingCenterId: string, reservationId: string) =>
      `/gamingCenters/${enc(gamingCenterId)}/reservation/${enc(reservationId)}/payments/init`,
  },
} as const;