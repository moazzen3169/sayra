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

  /* ---------- پنل صاحب گیمنت ---------- */
  owner: {
    me: "/auth/me",
    centers: "/gamingCenters",
    reservations: (c: string) => `/gamingCenters/${enc(c)}/reservation`,
    proposeTime: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/propose-time`,
    /** مطابق OpenAPI: start/stop با reservation (مفرد) و pause/resume با reservations (جمع) */
    session: (c: string, r: string, action: "start" | "stop" | "pause" | "resume") =>
      action === "pause" || action === "resume"
        ? `/gamingCenters/${enc(c)}/reservations/${enc(r)}/sessions/${action}`
        : `/gamingCenters/${enc(c)}/reservation/${enc(r)}/sessions/${action}`,
    settings: (c: string) => `/gamingCenters/${enc(c)}/settings`,
    siteSettings: (c: string) => `/gamingCenters/${enc(c)}/site-settings`,
    stations: (c: string) => `/gamingCenters/${enc(c)}/stations`,
    mediaUpload: (c: string) => `/gamingCenters/${enc(c)}/media/upload`,
    ratingStatus: (c: string, ratingId: string) =>
      `/gamingCenters/${enc(c)}/ratings/${enc(ratingId)}/status`,
    analyticsSummary: (c: string) => `/gamingCenters/${enc(c)}/analytics/summary`,
    commissions: (c: string) => `/gamingCenters/${enc(c)}/commissions`,
    tickets: "/tickets",
    ticket: (id: string) => `/tickets/${enc(id)}`,
    ticketMessages: (id: string) => `/tickets/${enc(id)}/messages`,
    ticketAttachments: (id: string) => `/tickets/${enc(id)}/attachments`,
  },
} as const;