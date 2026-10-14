/** فقط Path نگه‌داری می‌شود، نه Domain */
const enc = encodeURIComponent;

export const ENDPOINTS = {
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
} as const;