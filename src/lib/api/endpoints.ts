/** فقط Path نگه‌داری می‌شود، نه Domain */
const enc = encodeURIComponent;

export const ENDPOINTS = {
  calendar: {
    days: "/iran-calendar/days",
  },
  auth: {
    otpRequest: "/auth/customer/otp/request",
    otpVerify: "/auth/customer/otp/verify",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    // Staff / Manager Auth APIs
    userOtpRequest: "/auth/customer/otp/request",
    userOtpVerify: "/auth/customer/otp/verify",
    userOtpLogin: "/auth/customer/login/otp",
    userPasswordLogin: "/auth/platform-admin/login",
    platformAdminLogin: "/auth/login",
  },
  gamingCenter: {
    list: "/gamingCenters",
    adminList: "/platform-admin/gaming-centers",
    adminStatus: (id: string) => `/platform-admin/gaming-centers/${enc(id)}/status`,
    detail: (slug: string) => `/public/gamingCenters/${enc(slug)}`,
    byId: (id: string) => `/gamingCenters/${enc(id)}`,
    availabilitySlots: (slug: string) => `/public/gamingCenters/${enc(slug)}/availability/slots`,
    ratings: (slug: string) => `/public/gamingCenters/${enc(slug)}/ratings`,
    media: (slug: string) => `/public/gamingCenters/${enc(slug)}/media`,
    links: (slug: string) => `/public/gamingCenters/${enc(slug)}/links`,
    addresses: (slug: string) => `/public/gamingCenters/${enc(slug)}/addresses`,
    stations: (gamingCenterId: string) => `/gamingCenters/${enc(gamingCenterId)}/stations`,
    publicStations: (slug: string) => `/gamingCenters/${enc(slug)}/stations`,
    deviceCategories: (slug: string) => `/gamingCenters/${enc(slug)}/device-categories`,
    groupReservations: (slug: string) => `/public/gamingCenters/${enc(slug)}/group-reservations`,
    groupReservationCheckout: (slug: string) =>
      `/public/gamingCenters/${enc(slug)}/group-reservations/checkout`,
    page: (slug: string, pageSlug: string) =>
      `/public/gamingCenters/${enc(slug)}/pages/${enc(pageSlug)}`,
  },
  reservation: {
    create: (gamingCenterSlug: string) => `/public/gamingCenters/${enc(gamingCenterSlug)}/reservation`,
    list: "/customer/reservation",
    detail: (reservationId: string) => `/customer/reservation/${enc(reservationId)}`,
    cancel: (reservationId: string) => `/customer/reservation/${enc(reservationId)}/cancel`,
    reschedule: (reservationId: string) => `/customer/reservation/${enc(reservationId)}/reschedule`,
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
    verifyGet: (gamingCenterId: string, reservationId: string) =>
      `/gamingCenters/${enc(gamingCenterId)}/reservation/${enc(reservationId)}/payments/verify`,
    verifyPost: (gamingCenterId: string, reservationId: string) =>
      `/gamingCenters/${enc(gamingCenterId)}/reservation/${enc(reservationId)}/payments/verify`,
    // روند جدید اعتبارسنجی پرداخت متمرکز: POST /payments/:paymentId/verify
    verifyPayment: (paymentId: string) => `/payments/${enc(paymentId)}/verify`,
    webhook: "/payments/webhook",
    status: (gamingCenterId: string, reservationId: string) =>
      `/gamingCenters/${enc(gamingCenterId)}/reservation/${enc(reservationId)}/payments/status`,
  },
  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    markRead: (id: string) => `/notifications/${enc(id)}/read`,
  },
  tickets: {
    list: "/tickets",
    create: "/tickets",
    detail: (id: string) => `/tickets/${enc(id)}`,
    messages: (id: string) => `/tickets/${enc(id)}/messages`,
    attachments: (id: string) => `/tickets/${enc(id)}/attachments`,
  },
  support: {
    tickets: "/support/tickets",
    ticketDetail: (id: string) => `/support/tickets/${enc(id)}`,
    ticketMessages: (id: string) => `/support/tickets/${enc(id)}/messages`,
    ticketAttachments: (id: string) => `/support/tickets/${enc(id)}/attachments`,
    ticketAssign: (id: string) => `/support/tickets/${enc(id)}/assign`,
    ticketStatus: (id: string) => `/support/tickets/${enc(id)}/status`,
  },
  adminTickets: {
    list: "/admin/tickets",
    statistics: "/admin/tickets/statistics",
    assign: (id: string) => `/admin/tickets/${enc(id)}/assign`,
    status: (id: string) => `/admin/tickets/${enc(id)}/status`,
  },
  platformAdmin: {
    settings: "/platform-admin/settings",
    mediaUpload: "/platform-admin/media/upload",
    reports: "/platform-admin/analytics/reports",
    operationsOverview: "/platform-admin/operations/overview",
    financialsOverview: "/platform-admin/financials/overview",
    auditLogs: "/platform-admin/audit-logs",
    gamingCenters: "/platform-admin/gaming-centers",
    gamingCenterStatus: (id: string) => `/platform-admin/gaming-centers/${enc(id)}/status`,
    users: "/platform-admin/users",
    userById: (id: string) => `/platform-admin/users/${enc(id)}`,
    userStatus: (id: string) => `/platform-admin/users/${enc(id)}/status`,
    userResetPassword: (id: string) => `/platform-admin/users/${enc(id)}/reset-password`,
    userRevokeSessions: (id: string) => `/platform-admin/users/${enc(id)}/revoke-sessions`,
    campaigns: "/platform-admin/campaigns",
    campaignById: (id: string) => `/platform-admin/campaigns/${enc(id)}`,
    adRequests: "/platform-admin/ad-requests",
    adRequestById: (id: string) => `/platform-admin/ad-requests/${enc(id)}`,
    adRequestStatus: (id: string) => `/platform-admin/ad-requests/${enc(id)}/status`,
    reservations: "/platform-admin/reservations",
    customers: "/platform-admin/customers",
  },
  waitlist: {
    list: "/customer/waitlist",
    create: "/customer/waitlist",
    offers: "/customer/waitlist/offers",
    acceptOffer: (offerId: string) => `/customer/waitlist/offers/${enc(offerId)}/accept`,
    rejectOffer: (offerId: string) => `/customer/waitlist/offers/${enc(offerId)}/reject`,
  },
  wallet: {
    status: "/customer/wallet",
    withdraw: "/customer/wallet/withdraw",
    withdrawals: "/customer/wallet/withdrawals",
    withdrawalDetail: (id: string) => `/customer/wallet/withdrawals/${enc(id)}`,
    transactions: "/customer/wallet/transactions",
    transactionDetail: (id: string) => `/customer/wallet/transactions/${enc(id)}`,
    // Platform Admin endpoints
    adminWithdrawals: "/platform-admin/withdrawals",
    adminOverdueWithdrawals: "/platform-admin/withdrawals/overdue",
    adminWithdrawalDetail: (id: string) => `/platform-admin/withdrawals/${enc(id)}`,
    adminApproveWithdrawal: (id: string) => `/platform-admin/withdrawals/${enc(id)}/approve`,
    adminRejectWithdrawal: (id: string) => `/platform-admin/withdrawals/${enc(id)}/reject`,
    adminWithdrawalPayment: (id: string) => `/platform-admin/withdrawals/${enc(id)}/payment`,
  },
  catalog: {
    devices: "/catalog/devices",
    deviceById: (id: string) => `/catalog/devices/${enc(id)}`,
    games: "/catalog/games",
    gameById: (id: string) => `/catalog/games/${enc(id)}`,
    adminDevices: "/platform-admin/catalog/devices",
    adminDeviceById: (id: string) => `/platform-admin/catalog/devices/${enc(id)}`,
    adminGames: "/platform-admin/catalog/games",
    adminGameById: (id: string) => `/platform-admin/catalog/games/${enc(id)}`,
  },

  /* ---------- پلتفرم وبلاگ سایرا (Blog Platform API) ---------- */
  blog: {
    articles: {
      list: "/articles/",
      create: "/articles/",
      detail: (slug: string) => `/articles/${enc(slug)}/`,
      update: (slug: string) => `/articles/${enc(slug)}/`,
      patch: (slug: string) => `/articles/${enc(slug)}/`,
      delete: (slug: string) => `/articles/${enc(slug)}/`,
      bySlug: (slug: string) => `/articles/slug/${enc(slug)}/`,
      counts: "/articles/counts/",
      publish: (slug: string) => `/articles/${enc(slug)}/publish/`,
      related: (slug: string) => `/articles/${enc(slug)}/related/`,
      sameCategory: (slug: string) => `/articles/${enc(slug)}/same-category/`,
      similar: (slug: string) => `/articles/${enc(slug)}/similar/`,
      blockDefinitions: "/articles/block-definitions/",
    },
    categories: {
      list: "/categories/",
      create: "/categories/",
      detail: (id: number | string) => `/categories/${enc(String(id))}/`,
      update: (id: number | string) => `/categories/${enc(String(id))}/`,
      patch: (id: number | string) => `/categories/${enc(String(id))}/`,
      delete: (id: number | string) => `/categories/${enc(String(id))}/`,
    },
    tags: {
      list: "/tags/",
      create: "/tags/",
      detail: (id: number | string) => `/tags/${enc(String(id))}/`,
      update: (id: number | string) => `/tags/${enc(String(id))}/`,
      patch: (id: number | string) => `/tags/${enc(String(id))}/`,
      delete: (id: number | string) => `/tags/${enc(String(id))}/`,
    },
    media: {
      list: "/media/",
      create: "/media/",
      detail: (id: number | string) => `/media/${enc(String(id))}/`,
      update: (id: number | string) => `/media/${enc(String(id))}/`,
      patch: (id: number | string) => `/media/${enc(String(id))}/`,
      delete: (id: number | string) => `/media/${enc(String(id))}/`,
    },
    authors: {
      list: "/authors/",
      create: "/authors/",
      detail: (user: number | string) => `/authors/${enc(String(user))}/`,
      update: (user: number | string) => `/authors/${enc(String(user))}/`,
      patch: (user: number | string) => `/authors/${enc(String(user))}/`,
      delete: (user: number | string) => `/authors/${enc(String(user))}/`,
    },
  },

  /* ---------- پنل صاحب گیمنت ---------- */
  owner: {
    me: "/auth/me",
    centers: "/gamingCenters",
    center: (c: string) => `/gamingCenters/${enc(c)}`,
    reservations: (c: string) => `/gamingCenters/${enc(c)}/reservation`,
    reservationDetail: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}`,
    confirmReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/confirm`,
    cancelReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/cancel`,
    rescheduleReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/reschedule`,
    startReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/start`,
    completeReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/complete`,
    noShowReservation: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/no-show`,
    proposeTime: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/propose-time`,
    proposals: (c: string, r: string) =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/proposals`,
    /** مطابق OpenAPI: تمامی مسیرهای سشن با ساختار مفرد /reservation/{r}/sessions/{action} هستند */
    session: (c: string, r: string, action: "start" | "stop" | "pause" | "resume") =>
      `/gamingCenters/${enc(c)}/reservation/${enc(r)}/sessions/${action}`,
    settings: (c: string) => `/gamingCenters/${enc(c)}/settings`,
    siteSettings: (c: string) => `/gamingCenters/${enc(c)}/site-settings`,
    stations: (c: string) => `/gamingCenters/${enc(c)}/stations`,
    stationsFromCatalog: (c: string) => `/gamingCenters/${enc(c)}/stations/from-catalog`,
    gamesFromCatalog: (c: string) => `/gamingCenters/${enc(c)}/stations/games/from-catalog`,
    stationDetail: (c: string, s: string) => `/gamingCenters/${enc(c)}/stations/${enc(s)}`,
    addresses: (c: string) => `/gamingCenters/${enc(c)}/addresses`,
    addressDetail: (c: string, a: string) => `/gamingCenters/${enc(c)}/addresses/${enc(a)}`,
    links: (c: string) => `/gamingCenters/${enc(c)}/links`,
    linkDetail: (c: string, l: string) => `/gamingCenters/${enc(c)}/links/${enc(l)}`,
    mediaUpload: (c: string) => `/gamingCenters/${enc(c)}/media/upload`,
    mediaPatch: (c: string, mediaId: string) => `/gamingCenters/${enc(c)}/media/${enc(mediaId)}`,
    ratingStatus: (c: string, ratingId: string) =>
      `/gamingCenters/${enc(c)}/ratings/${enc(ratingId)}/status`,
    analyticsSummary: (c: string) => `/gamingCenters/${enc(c)}/analytics/summary`,
    commissions: (c: string) => `/gamingCenters/${enc(c)}/commissions`,
    tickets: "/tickets",
    ticket: (id: string) => `/tickets/${enc(id)}`,
    ticketMessages: (id: string) => `/tickets/${enc(id)}/messages`,
    ticketAttachments: (id: string) => `/tickets/${enc(id)}/attachments`,
    discounts: (c: string) => `/gamingCenters/${enc(c)}/discounts`,
    discount: (c: string, id: string) => `/gamingCenters/${enc(c)}/discounts/${enc(id)}`,
    discountStatus: (c: string, id: string) => `/gamingCenters/${enc(c)}/discounts/${enc(id)}/status`,
  },
} as const;
