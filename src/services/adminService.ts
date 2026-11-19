import {
  AdminDashboardData,
  AdminGamecenter,
  AdminGamecenterInput,
  AdminUser,
  AdminUserInput,
  AdminTicket,
  AdminTicketMessage,
  CannedResponse,
  AdminReview,
  AdminUserReservation,
  AdminPaginatedResult,
  AdminListQueryParams,
  AdminOwnerVerification,
  AdminVerificationDocument,
  AdminVerificationReviewLog,
  AdminAdRequest,
  AdminCampaign,
  AdminCampaignInput,
  SiteSettings,
} from "@/types/admin";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { formatClock, formatDayLabel } from "@/lib/reservationUi";
import {
  extractMediaItems,
  extractMediaUrl,
  normalizeMediaUrl,
} from "@/lib/media";
import { cleanPhoneNumber } from "@/lib/format";
import type {
  BlogPostDetail,
  BlogPostStatus,
  AdminBlogPostInput,
  BlogCategory,
} from "@/types/blog";
import { blogApiService } from "@/services/blogApiService";
import {
  mapArticleDetailToUi,
  mapArticleListToSummary,
  mapCategoryToUi,
  mapAdminInputToCreateRequest,
  mapAdminInputToPatchRequest,
  mapUiStatusToApi,
} from "@/lib/mappers/blogMapper";
import type {
  ArticleDetailDto,
  ArticleListDto,
  ArticleListQueryParams,
  CategoryDto,
  CategoryRequestDto,
  PatchedCategoryRequestDto,
  TagDto,
  TagRequestDto,
  MediaCreateRequestDto,
  MediaDetailDto,
  AuthorProfileDto,
  BlockDefinitionDto,
  PatchedArticleCreateUpdateRequestDto,
  PostStatusApiEnum,
} from "@/types/blogApi";

/**
 * Safely extracts a string from a backend field that might be a primitive or an object.
 * Prevents React Error #31 ("Objects are not valid as a React child").
 */
function toSafeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate =
      obj.name ??
      obj.title ??
      obj.fullName ??
      obj.label ??
      obj.addressLine ??
      obj.address ??
      obj.city;
    if (typeof candidate === "string") return candidate;
    if (typeof candidate === "number") return String(candidate);
  }
  return fallback;
}

/**
 * Service for handling Admin Panel operations via real backend APIs.
 */

function mapApiTicketToAdminTicket(raw: any): AdminTicket {
  if (!raw) return raw;
  const createdAtFormatted = raw.createdAt
    ? `${formatDayLabel(raw.createdAt)} - ${formatClock(raw.createdAt, true)}`
    : "";
  const updatedAtFormatted = raw.updatedAt
    ? `${formatDayLabel(raw.updatedAt)} - ${formatClock(raw.updatedAt, true)}`
    : createdAtFormatted;

  const messages: AdminTicketMessage[] = Array.isArray(raw.messages)
    ? raw.messages.map((m: any) => ({
        id:
          m.id ||
          `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ticketId: m.ticketId || raw.id,
        senderId: m.senderId,
        senderName:
          m.senderType === "SUPPORT"
            ? "پشتیبانی سایرا"
            : raw.userName || "کاربر",
        senderRole:
          m.senderType === "SUPPORT" ? "ADMIN" : raw.userRole || "USER",
        message: m.text || m.message || "",
        attachment: m.attachment || null,
        createdAt: m.createdAt
          ? `${formatDayLabel(m.createdAt)} - ${formatClock(m.createdAt, true)}`
          : "",
      }))
    : [];

  return {
    id: raw.id,
    userId: raw.customerAccountId || raw.userId,
    userName: raw.userName || "کاربر سامانه",
    userPhone: raw.userPhone,
    userRole: raw.userRole || "USER",
    gamecenterId: raw.gamecenterId,
    gamecenterName: raw.gamecenterName,
    reservationId: raw.reservationId,
    reservationCode: raw.reservationCode,
    subject: raw.subject || "بدون عنوان",
    status: (raw.status || "OPEN") as AdminTicket["status"],
    priority: (raw.priority || "MEDIUM") as AdminTicket["priority"],
    category: (raw.category || "TECHNICAL") as AdminTicket["category"],
    assignedAdminId: raw.assignedToUserId || raw.assignedAdminId,
    assignedAdminName: raw.assignedAdminName,
    createdAt: createdAtFormatted,
    lastUpdate: updatedAtFormatted,
    messagesCount:
      typeof raw.messagesCount === "number"
        ? raw.messagesCount
        : messages.length,
    messages,
  };
}

function unwrapTicketsList(resData: unknown): any[] {
  if (Array.isArray(resData)) return resData;
  if (resData && typeof resData === "object") {
    const obj = resData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

export const adminService = {
  /**
   * Retrieves dashboard summary metrics, trends, pending action items, and recent reservations.
   */
  /**
   * دریافت اطلاعات داشبورد مدیریتی از طریق خلاصه آماری سرور:
   * GET /platform-admin/operations/overview یا آمار محلی
   */
  async getDashboardData(signal?: AbortSignal): Promise<AdminDashboardData> {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [opsRes, finRes, reportRes, reservationsRes, adsRes, verifsRes, ticketStatsRes] =
      await Promise.allSettled([
        apiClient.get<any>(ENDPOINTS.platformAdmin.operationsOverview, { signal }),
        apiClient.get<any>(ENDPOINTS.platformAdmin.financialsOverview, { signal }),
        apiClient.get<any>(ENDPOINTS.platformAdmin.reports, {
          query: { startDate: start.toISOString(), endDate: end.toISOString() },
          signal,
        }),
        apiClient.get<any>(ENDPOINTS.platformAdmin.reservations, {
          query: { page: 1, limit: 6 },
          signal,
        }),
        apiClient.get<any>(ENDPOINTS.platformAdmin.adRequests, {
          query: { status: "PENDING", page: 1, limit: 1 },
          signal,
        }),
        apiClient.get<any>(ENDPOINTS.platformAdmin.verifications, {
          query: { status: "PENDING", page: 1, limit: 1 },
          signal,
        }),
        apiClient.get<any>(ENDPOINTS.adminTickets.statistics, { signal }),
      ]);

    // If all core requests failed, propagate error
    if (
      opsRes.status === "rejected" &&
      finRes.status === "rejected" &&
      reportRes.status === "rejected"
    ) {
      throw opsRes.reason || reportRes.reason;
    }

    const opsData =
      opsRes.status === "fulfilled"
        ? opsRes.value?.data?.data || opsRes.value?.data || {}
        : {};
    const finData =
      finRes.status === "fulfilled"
        ? finRes.value?.data?.data || finRes.value?.data || {}
        : {};
    const reportData =
      reportRes.status === "fulfilled"
        ? reportRes.value?.data?.data || reportRes.value?.data || {}
        : {};
    const ticketStats =
      ticketStatsRes.status === "fulfilled"
        ? ticketStatsRes.value?.data?.data || ticketStatsRes.value?.data || {}
        : {};

    const usersCount =
      opsData.totalUsers ?? reportData.users?.totalUsers ?? null;
    const gamecentersCount =
      opsData.totalGamingCenters ??
      reportData.gamingCenters?.totalGamingCenters ??
      null;
    const totalReservations =
      opsData.totalReservations ??
      reportData.reservations?.totalReservations ??
      null;
    const completedReservations =
      opsData.completedReservations ??
      reportData.reservations?.completedReservations ??
      null;
    const grossBookingValue =
      finData.totalRevenue ??
      opsData.totalRevenue ??
      reportData.financials?.totalRevenue ??
      null;
    const netRevenue =
      finData.platformCommission ??
      reportData.financials?.platformCommission ??
      null;

    const stats: AdminDashboardData["stats"] = [
      {
        id: "users_count",
        title: "تعداد کاربران",
        value: usersCount !== null && usersCount !== undefined ? Number(usersCount).toLocaleString("fa-IR") : "---",
        iconName: "user",
      },
      {
        id: "gamecenters_count",
        title: "تعداد گیمنت‌ها",
        value: gamecentersCount !== null && gamecentersCount !== undefined ? Number(gamecentersCount).toLocaleString("fa-IR") : "---",
        iconName: "gamepad",
      },
      {
        id: "total_reservations",
        title: "تعداد کل رزروها",
        value: totalReservations !== null && totalReservations !== undefined ? Number(totalReservations).toLocaleString("fa-IR") : "---",
        iconName: "calendar",
      },
      {
        id: "completed_reservations",
        title: "رزروهای تکمیل‌شده",
        value: completedReservations !== null && completedReservations !== undefined ? Number(completedReservations).toLocaleString("fa-IR") : "---",
        iconName: "check",
      },
      {
        id: "gross_booking_value",
        title: "مبلغ کل رزروها (ناخالص)",
        value: grossBookingValue !== null && grossBookingValue !== undefined ? Number(grossBookingValue).toLocaleString("fa-IR") : "---",
        unit: grossBookingValue !== null && grossBookingValue !== undefined ? "تومان" : undefined,
        iconName: "wallet",
      },
      {
        id: "net_revenue",
        title: "درآمد خالص پلتفرم (کارمزد)",
        value: netRevenue !== null && netRevenue !== undefined ? Number(netRevenue).toLocaleString("fa-IR") : "---",
        unit: netRevenue !== null && netRevenue !== undefined ? "تومان" : undefined,
        iconName: "star",
      },
    ];

    const rawTimeSeries = Array.isArray(reportData.timeSeries)
      ? reportData.timeSeries
      : [];
    const reservationTrend: AdminDashboardData["reservationTrend"] = rawTimeSeries.map((pt: any) => ({
      label: pt.date ? formatDayLabel(pt.date) || String(pt.date) : "-",
      count: Number(pt.reservationCount ?? pt.reservationsCount ?? 0),
      amount: Number(pt.revenue ?? pt.totalAmount ?? 0),
    }));

    const rawReservations =
      reservationsRes.status === "fulfilled"
        ? unwrapTicketsList(reservationsRes.value?.data)
        : [];
    const recentReservations: AdminDashboardData["recentReservations"] =
      rawReservations.map((r: any) => ({
        id: String(r.id ?? ""),
        reservationCode: String(r.reservationCode || r.id || "-"),
        customerName: toSafeText(r.customer?.fullName || r.customerName, "کاربر"),
        customerPhone: cleanPhoneNumber(r.customer?.phone || r.customerPhone || "") || "-",
        gamecenterName: toSafeText(r.gamingCenter?.name || r.gamecenterName, "-"),
        deviceName: toSafeText(r.station?.name || r.station?.type || r.deviceName, "-"),
        date: r.reservationDate
          ? formatDayLabel(r.reservationDate)
          : r.startTime
            ? formatDayLabel(r.startTime)
            : "-",
        timeSlot: r.startTime
          ? `${formatClock(r.startTime, true)}${r.endTime ? ` تا ${formatClock(r.endTime, true)}` : ""}`
          : "-",
        amount: Number(r.finalPrice ?? r.totalPrice ?? r.amount ?? 0),
        status: (r.status || "PENDING") as any,
        paymentStatus: (r.payment?.status || "PENDING") as any,
      }));

    const pendingTicketsCount = Number(
      ticketStats.open ?? ticketStats.pending ?? ticketStats.openTickets ?? 0
    );
    const pendingAdsCount =
      adsRes.status === "fulfilled"
        ? Number(
            adsRes.value?.meta?.pagination?.total ??
              unwrapTicketsList(adsRes.value?.data).length
          )
        : 0;
    const pendingVerificationsCount =
      verifsRes.status === "fulfilled"
        ? Number(
            verifsRes.value?.meta?.pagination?.total ??
              verifsRes.value?.meta?.pagination?.totalItems ??
              unwrapTicketsList(verifsRes.value?.data).length
          )
        : 0;

    const pendingItems: AdminDashboardData["pendingItems"] = [];
    if (pendingVerificationsCount > 0) {
      pendingItems.push({
        id: "pending-verifications",
        title: "درخواست‌های احراز هویت گیم‌نت",
        subtitle: `${pendingVerificationsCount.toLocaleString("fa-IR")} درخواست در انتظار تایید`,
        type: "owner_verification",
        date: "اکنون",
        link: "/admin/owners",
        badgeText: `${pendingVerificationsCount.toLocaleString("fa-IR")} در انتظار`,
        badgeVariant: "warning",
      });
    }
    if (pendingTicketsCount > 0) {
      pendingItems.push({
        id: "pending-tickets",
        title: "تیکت‌های پشتیبانی باز",
        subtitle: `${pendingTicketsCount.toLocaleString("fa-IR")} تیکت در انتظار پاسخ`,
        type: "ticket",
        date: "اکنون",
        link: "/admin/tickets",
        badgeText: `${pendingTicketsCount.toLocaleString("fa-IR")} باز`,
        badgeVariant: "danger",
      });
    }
    if (pendingAdsCount > 0) {
      pendingItems.push({
        id: "pending-ads",
        title: "درخواست‌های تبلیغات در انتظار بررسی",
        subtitle: `${pendingAdsCount.toLocaleString("fa-IR")} درخواست جدید برای بررسی`,
        type: "gamecenter_review",
        date: "اکنون",
        link: "/admin/ads",
        badgeText: `${pendingAdsCount.toLocaleString("fa-IR")} در انتظار`,
        badgeVariant: "warning",
      });
    }

    return {
      stats,
      reservationTrend,
      pendingItems,
      recentReservations,
    };
  },

  // ==================== GAMECENTERS ====================

  /**
   * تبدیل شی خام دریافتی از اندپوینت‌های گیمنت به فرمت AdminGamecenter
   */
  mapRawGamingCenterToAdmin(raw: any): AdminGamecenter {
    if (!raw || typeof raw !== "object") return raw;
    const createdAtRaw = raw.createdAt || raw.created_at;
    const formattedCreatedAt = createdAtRaw
      ? formatDayLabel(String(createdAtRaw)) || String(createdAtRaw)
      : "-";

    const addresses = Array.isArray(raw.addresses) ? raw.addresses : [];
    const primaryAddress =
      addresses.find((a: any) => a?.isPrimary) || addresses[0];

    const cityName =
      toSafeText(raw.city) ||
      toSafeText(primaryAddress?.city) ||
      "-";

    const fullAddress =
      toSafeText(raw.address) ||
      toSafeText(primaryAddress?.addressLine) ||
      toSafeText(primaryAddress?.address) ||
      toSafeText(raw.description) ||
      "آدرس ثبت نشده";

    const ownerName =
      toSafeText(raw.ownerName) ||
      toSafeText(raw.managerName) ||
      toSafeText(raw.manager?.fullName) ||
      toSafeText(raw.manager?.name) ||
      toSafeText(raw.owner?.fullName) ||
      toSafeText(raw.owner?.name) ||
      "-";

    const rawPhone =
      toSafeText(raw.ownerPhone) ||
      toSafeText(raw.managerPhone) ||
      toSafeText(raw.phone) ||
      toSafeText(raw.manager?.phone) ||
      toSafeText(raw.owner?.phone);
    const ownerPhone = rawPhone ? cleanPhoneNumber(rawPhone) || rawPhone : "-";

    const logoUrl =
      raw.logoUrl ||
      raw.logo?.url ||
      (Array.isArray(raw.media)
        ? raw.media.find((m: any) => m?.purpose === "LOGO")?.url
        : undefined);

    const coverUrl =
      raw.coverUrl ||
      raw.coverImageUrl ||
      raw.cover?.url ||
      (Array.isArray(raw.media)
        ? raw.media.find((m: any) => m?.purpose === "COVER")?.url
        : undefined);

    const rawRating =
      typeof raw.rating === "number"
        ? raw.rating
        : typeof raw.raiting === "number"
          ? raw.raiting
          : undefined;

    const rawLat =
      typeof raw.lat === "number"
        ? raw.lat
        : typeof raw.latitude === "number"
          ? raw.latitude
          : typeof primaryAddress?.lat === "number"
            ? primaryAddress.lat
            : typeof primaryAddress?.latitude === "number"
              ? primaryAddress.latitude
              : null;

    const rawLng =
      typeof raw.lng === "number"
        ? raw.lng
        : typeof raw.longitude === "number"
          ? raw.longitude
          : typeof primaryAddress?.lng === "number"
            ? primaryAddress.lng
            : typeof primaryAddress?.longitude === "number"
              ? primaryAddress.longitude
              : null;

    return {
      id: String(raw.id ?? raw.gamingCenterId ?? raw.slug ?? ""),
      name: toSafeText(raw.name, "بدون نام"),
      slug: toSafeText(raw.slug, String(raw.id ?? raw.gamingCenterId ?? "")),
      ownerName,
      ownerPhone,
      city: cityName,
      address: fullAddress,
      lat: rawLat !== null && Number.isFinite(rawLat) ? rawLat : null,
      lng: rawLng !== null && Number.isFinite(rawLng) ? rawLng : null,
      primaryAddressId: primaryAddress?.id ? String(primaryAddress.id) : undefined,
      description: toSafeText(raw.description, ""),
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
      rating: rawRating,
      stationsCount:
        typeof raw.stationsCount === "number"
          ? raw.stationsCount
          : Array.isArray(raw.stations)
            ? raw.stations.length
            : 0,
      createdAt: formattedCreatedAt,
      updatedAt: raw.updatedAt ? formatDayLabel(String(raw.updatedAt)) || undefined : undefined,
      phone: toSafeText(raw.phone) || (ownerPhone !== "-" ? ownerPhone : undefined),
      logoUrl: typeof logoUrl === "string" && logoUrl ? normalizeMediaUrl(logoUrl) : undefined,
      coverUrl: typeof coverUrl === "string" && coverUrl ? normalizeMediaUrl(coverUrl) : undefined,
      media: Array.isArray(raw.media) ? raw.media : undefined,
    };
  },

  /**
   * دریافت لیست کلیه گیمنت‌های ثبت‌شده از طریق API پلتفرم ادمین
   * GET /platform-admin/gaming-centers (یا در صورت 403/404: GET /gamingCenters)
   */
  async getGamecenters(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminGamecenter>> {
    const {
      search = "",
      status = "all",
      city = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    const queryPayload: Record<string, string | number> = {
      page,
      limit: Math.min(pageSize, 100),
    };
    if (search.trim()) {
      queryPayload.search = search.trim();
    }

    let resData: any = null;
    let serverTotal: number | undefined;
    let serverTotalPages: number | undefined;

    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.adminList,
        {
          query: queryPayload,
          signal,
        },
      );
      resData = response.data;
      if (response.meta?.pagination) {
        serverTotal = response.meta.pagination.total;
        serverTotalPages = response.meta.pagination.totalPages;
      }
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        const response = await apiClient.get<any>(
          ENDPOINTS.gamingCenter.list,
          {
            query: queryPayload,
            signal,
          },
        );
        resData = response.data;
        if (response.meta?.pagination) {
          serverTotal = response.meta.pagination.total;
          serverTotalPages = response.meta.pagination.totalPages;
        }
      } else {
        throw err;
      }
    }

    let rawArray: any[] = [];
    if (Array.isArray(resData)) {
      rawArray = resData;
    } else if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) rawArray = resData.data;
      else if (Array.isArray(resData.items)) rawArray = resData.items;
    }

    let items = rawArray.map((item) => adminService.mapRawGamingCenterToAdmin(item));

    if (status === "active") {
      items = items.filter((gc) => gc.isActive);
    } else if (status === "inactive") {
      items = items.filter((gc) => !gc.isActive);
    }
    if (city && city !== "all") {
      items = items.filter((gc) => gc.city === city);
    }

    items.sort((a, b) => {
      const valA =
        (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB =
        (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });

    const total = serverTotal ?? items.length;
    const totalPages = serverTotalPages ?? (Math.ceil(total / pageSize) || 1);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * دریافت اطلاعات تکمیلی یک گیمنت با شناسه
   */
  async getGamecenterById(
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminGamecenter | null> {
    let resolved: AdminGamecenter | null = null;

    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.byId(id),
        { signal },
      );
      const resData = response.data?.data || response.data;
      if (resData && typeof resData === "object" && !Array.isArray(resData)) {
        resolved = adminService.mapRawGamingCenterToAdmin(resData);
      }
    } catch {
      // ادامه به اندپوینت بعدی
    }

    if (!resolved) {
      try {
        const response = await apiClient.get<any>(
          ENDPOINTS.gamingCenter.detail(id),
          { signal },
        );
        const resData = response.data?.data || response.data;
        if (resData && typeof resData === "object" && !Array.isArray(resData)) {
          resolved = adminService.mapRawGamingCenterToAdmin(resData);
        }
      } catch {
        // ادامه به لیست پلتفرم ادمین
      }
    }

    if (!resolved) {
      try {
        const listRes = await adminService.getGamecenters({ pageSize: 100 }, signal);
        const found = listRes.items.find((g) => g.id === id || g.slug === id);
        if (found) resolved = found;
      } catch {
        // ignore
      }
    }

    if (resolved && (resolved.lat == null || resolved.lng == null) && resolved.slug) {
      try {
        const addrRes = await apiClient.get<any>(
          ENDPOINTS.gamingCenter.addresses(resolved.slug),
          { signal },
        );
        const addrList = Array.isArray(addrRes.data)
          ? addrRes.data
          : Array.isArray(addrRes.data?.data)
            ? addrRes.data.data
            : [];
        const primary = addrList.find((a: any) => a?.isPrimary) || addrList[0];
        if (primary) {
          const lat = typeof primary.lat === "number" ? primary.lat : typeof primary.latitude === "number" ? primary.latitude : null;
          const lng = typeof primary.lng === "number" ? primary.lng : typeof primary.longitude === "number" ? primary.longitude : null;
          if (lat !== null && lng !== null) {
            resolved.lat = lat;
            resolved.lng = lng;
          }
          if (primary.id && !resolved.primaryAddressId) {
            resolved.primaryAddressId = String(primary.id);
          }
          if (primary.city && (!resolved.city || resolved.city === "-")) {
            resolved.city = toSafeText(primary.city, resolved.city);
          }
        }
      } catch {
        // ignore address lookup failure
      }
    }

    return resolved;
  },

  /**
   * ثبت گیمنت جدید از طریق اندپوینت رسمی:
   * POST /gamingCenters
   * Body: { name, slug, ownerId, games? }
   */

/**
 * ثبت گیمنت جدید از طریق اندپوینت رسمی:
 * POST /gamingCenters
 * Body: { name, slug, ownerId, games? }
 */
async createGamecenter(input: AdminGamecenterInput): Promise<AdminGamecenter> {
  const name = input.name?.trim();
  const slug = input.slug?.trim().toLowerCase();
  const ownerId = input.ownerId?.trim();

  // اعتبارسنجی اطلاعات ضروری
  if (!name) {
    throw new Error("نام فارسی گیم‌نت الزامی است.");
  }

  if (!slug) {
    throw new Error("نام لاتین گیم‌نت (Slug) الزامی است.");
  }

  if (!ownerId) {
    throw new Error("شناسه واقعی مالک انتخاب نشده است.");
  }

  // اسلاگ باید لاتین و شامل حروف، اعداد و خط تیره باشد.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      "نام لاتین گیم‌نت باید فقط شامل حروف انگلیسی، اعداد و خط تیره باشد."
    );
  }

  // فقط فیلدهای مورد تأیید API ارسال می‌شوند.
  // ownerPhone و englishName نباید به‌جای ownerId یا به API ارسال شوند.
  const payload = {
    name,
    slug,
    ownerId,
    games: [] as string[],
  };

  // در صورت خطای سرور، خطا به صفحه فراخواننده منتقل می‌شود.
  // ثبت محلی جعلی انجام نمی‌دهیم.
  const response = await apiClient.post<any>(
    ENDPOINTS.gamingCenter.list,
    payload
  );

  const resData =
    response.data?.data ??
    response.data;

  if (!resData || typeof resData !== "object") {
    throw new Error("پاسخ معتبری از سرور برای ثبت گیم‌نت دریافت نشد.");
  }

  const created = this.mapRawGamingCenterToAdmin({
    ...resData,
    ...input,
    name,
    slug,
    id: resData.id ?? resData.gamingCenterId ?? resData.slug,
  });

  if (!created.id) {
    throw new Error("گیم‌نت ثبت شد، اما شناسه آن از سرور دریافت نشد.");
  }

  // ذخیره آدرس و مختصات نقشه (lat, lng) در صورت ارسال
  const hasCoords =
    typeof input.lat === "number" &&
    Number.isFinite(input.lat) &&
    typeof input.lng === "number" &&
    Number.isFinite(input.lng);

  if (hasCoords || (input.city?.trim() && input.address?.trim())) {
    const addressBody: Record<string, unknown> = {
      city: input.city?.trim() || "ارومیه",
      addressLine: input.address?.trim() || "ثبت نشده",
      isPrimary: true,
    };
    if (hasCoords) {
      addressBody.lat = input.lat;
      addressBody.lng = input.lng;
    }
    try {
      await apiClient.post(ENDPOINTS.owner.addresses(created.id), addressBody);
    } catch {
      // اگر ثبت آدرس به هر دلیل با خطا مواجه شد، گیم‌نت ثبت‌شده را برمی‌گردانیم
    }
  }

  return created;
},

  /**
   * ویرایش کامل گیمنت شامل نام، اسلاگ، آدرس، تلفن و تنظیمات:
   * PATCH /gamingCenters/{id}
   * و در صورت تغییر وضعیت: PATCH /platform-admin/gaming-centers/{id}/status
   */
  async updateGamecenter(
    id: string,
    input: Partial<AdminGamecenterInput>,
  ): Promise<AdminGamecenter> {
    const patchBody: Record<string, unknown> = {};
    if (input.name !== undefined) patchBody.name = input.name;
    if (input.address !== undefined) patchBody.address = input.address;
    if (input.phone !== undefined || input.ownerPhone !== undefined) {
      patchBody.phone = input.phone || input.ownerPhone;
    }
    if (input.slug !== undefined) patchBody.slug = input.slug;
    if (input.description !== undefined) patchBody.description = input.description;

    let latestRaw: any = null;

    if (Object.keys(patchBody).length > 0) {
      const patchRes = await apiClient.patch<any>(ENDPOINTS.gamingCenter.byId(id), patchBody);
      latestRaw = patchRes.data?.data || patchRes.data;
    }

    const hasCoords =
      typeof input.lat === "number" &&
      Number.isFinite(input.lat) &&
      typeof input.lng === "number" &&
      Number.isFinite(input.lng);

    if (hasCoords) {
      const addressBody: Record<string, unknown> = {
        lat: input.lat,
        lng: input.lng,
        isPrimary: true,
      };
      if (input.city?.trim()) addressBody.city = input.city.trim();
      if (input.address?.trim()) addressBody.addressLine = input.address.trim();

      if (input.primaryAddressId) {
        await apiClient.patch(
          ENDPOINTS.owner.addressDetail(id, input.primaryAddressId),
          addressBody
        );
      } else {
        await apiClient.post(ENDPOINTS.owner.addresses(id), {
          city: input.city?.trim() || "ارومیه",
          addressLine: input.address?.trim() || "ثبت نشده",
          ...addressBody,
        });
      }
    }

    if (input.isActive !== undefined) {
      const statusRes = await apiClient.patch<any>(ENDPOINTS.gamingCenter.adminStatus(id), {
        isActive: input.isActive,
      });
      latestRaw = statusRes.data?.data || statusRes.data || latestRaw;
    }

    if (latestRaw && typeof latestRaw === "object") {
      return adminService.mapRawGamingCenterToAdmin(latestRaw);
    }

    const refreshed = await adminService.getGamecenterById(id);
    if (refreshed) return refreshed;

    return {
      id,
      name: input.name || "گیمنت",
      slug: input.slug || id,
      ownerName: input.ownerName || "-",
      ownerPhone: cleanPhoneNumber(input.ownerPhone) || "-",
      city: input.city || "-",
      address: input.address || "",
      description: input.description,
      isActive: input.isActive ?? true,
      createdAt: "-",
    };
  },

  /**
   * تغییر سریع وضعیت فعال/غیرفعال گیمنت
   * PATCH /platform-admin/gaming-centers/{id}/status
   */
  async toggleGamecenterStatus(id: string): Promise<AdminGamecenter> {
    const current = await this.getGamecenterById(id);
    const newStatus = !(current?.isActive ?? true);

    const response = await apiClient.patch<any>(ENDPOINTS.gamingCenter.adminStatus(id), {
      isActive: newStatus,
    });
    const resData = response.data?.data || response.data;
    if (resData && typeof resData === "object") {
      return adminService.mapRawGamingCenterToAdmin({ ...current, ...resData, isActive: newStatus });
    }
    if (current) {
      return { ...current, isActive: newStatus };
    }
    const refreshed = await adminService.getGamecenterById(id);
    if (refreshed) return { ...refreshed, isActive: newStatus };
    throw new Error("بروزرسانی وضعیت گیمنت انجام نشد.");
  },

  /**
   * حذف گیمنت طبق اندپوینت رسمی OpenAPI:
   * DELETE /gamingCenters/{id}
   */
  async deleteGamecenter(id: string): Promise<boolean> {
    await apiClient.delete(ENDPOINTS.gamingCenter.byId(id));
    return true;
  },

  /**
   * دریافت لیست تصاویر گالری یک گیمنت
   * GET /public/gamingCenters/{slug}/media
   */
  async getGamecenterMedia(
    slugOrId: string,
    signal?: AbortSignal,
  ): Promise<
    Array<{ id: string; url: string; altText?: string; purpose?: string }>
  > {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.media(slugOrId),
        { signal },
      );
      const items = extractMediaItems<any>(response.data, "GALLERY");
      return items.map((m: any) => ({
        id: String(m.id || m.url),
        url: normalizeMediaUrl(m.url),
        altText: m.altText || "",
        purpose: m.purpose || "GALLERY",
      }));
    } catch {
      return [];
    }
  },

  /**
   * آپلود تصویر برای گیمنت
   * POST /gamingCenters/{gamingCenterId}/media/upload
   * یا POST /platform-admin/media/upload
   */
  async uploadGamecenterMedia(
    gamingCenterId: string,
    file: File,
    purpose: "COVER" | "GALLERY" | "LOGO" | "STATION" = "GALLERY",
    altText?: string,
  ): Promise<{ id: string; url: string; altText?: string; purpose?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    if (altText) formData.append("altText", altText);

    try {
      const response = await apiClient.post<any>(
        ENDPOINTS.owner.mediaUpload(gamingCenterId),
        formData,
      );
      const rawData = response.data;
      const extractedUrl = extractMediaUrl(rawData);

      return {
        id: rawData?.id || rawData?.data?.id || `media-${Date.now()}`,
        url: normalizeMediaUrl(extractedUrl),
        altText: altText || file.name,
        purpose,
      };
    } catch {
      // تلاش از طریق اندپوینت اختصاصی آپلود مدیا پلتفرم ادمین
      try {
        const response = await apiClient.post<any>(
          "/platform-admin/media/upload",
          formData,
        );
        const rawData = response.data;
        const extractedUrl = extractMediaUrl(rawData);
        return {
          id: rawData?.id || rawData?.data?.id || `media-${Date.now()}`,
          url: normalizeMediaUrl(extractedUrl),
          altText: altText || file.name,
          purpose,
        };
      } catch (err: any) {
        throw new Error(err?.message || "خطا در آپلود تصویر در سرور.");
      }
    }
  },

  /**
   * حذف تصویر گیمنت
   * مستندات OpenAPI در نسخه v1.0-LOCKED متد DELETE برای تصاویر ثبت نکرده است.
   * به همین دلیل تا پیاده‌سازی متد اختصاصی سرور، از حدس زدن اندپوینت جلوگیری شده و پیام شفاف بازمی‌گرداند.
   */
  async deleteGamecenterMedia(
    _gamingCenterId: string,
    _mediaId: string,
  ): Promise<void> {
    throw new Error(
      "عملیات حذف تصویر در نسخه فعلی OpenAPI v1.0-LOCKED فاقد اندپوینت است و پس از ارائه توسط تیم بک‌اند فعال خواهد شد.",
    );
  },

  // ==================== TICKETS ====================

  /**
   * دریافت لیست تیکت‌های پلتفرم از اندپوینت رسمی GET /admin/tickets یا /support/tickets
   */
  async getTickets(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminTicket>> {
    const {
      search = "",
      status = "all",
      senderType = "all",
      assignedAdminId = "all",
      needingResponseOnly = false,
      sortBy = "lastUpdate",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    let rawList: any[] = [];
    let serverTotal: number | undefined;
    let serverTotalPages: number | undefined;

    try {
      const response = await apiClient.get<unknown>(
        ENDPOINTS.adminTickets.list,
        { signal },
      );
      const resData = response.data;
      rawList = unwrapTicketsList(resData);
      if (response.meta?.pagination) {
        serverTotal = response.meta.pagination.total;
        serverTotalPages = response.meta.pagination.totalPages;
      }
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        const response = await apiClient.get<unknown>(
          ENDPOINTS.support.tickets,
          { signal },
        );
        rawList = unwrapTicketsList(response.data);
      } else {
        throw err;
      }
    }

    let mapped = rawList.map(mapApiTicketToAdminTicket);

    if (needingResponseOnly) {
      mapped = mapped.filter(
        (t) => t.status === "OPEN" || t.status === "PENDING",
      );
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      mapped = mapped.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          (t.userName && t.userName.toLowerCase().includes(query)) ||
          (t.gamecenterName &&
            t.gamecenterName.toLowerCase().includes(query)) ||
          (t.reservationCode &&
            t.reservationCode.toLowerCase().includes(query)),
      );
    }

    if (status && status !== "all") {
      mapped = mapped.filter((t) => t.status === status);
    }

    if (senderType && senderType !== "all") {
      mapped = mapped.filter((t) => (t.userRole || "USER") === senderType);
    }

    if (assignedAdminId && assignedAdminId !== "all") {
      if (assignedAdminId === "unassigned") {
        mapped = mapped.filter((t) => !t.assignedAdminId);
      } else {
        mapped = mapped.filter((t) => t.assignedAdminId === assignedAdminId);
      }
    }

    mapped.sort((a, b) => {
      const valA =
        (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB =
        (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      return 0;
    });

    const total = serverTotal ?? mapped.length;
    const totalPages = serverTotalPages ?? (Math.ceil(total / pageSize) || 1);
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = mapped.slice(start, start + pageSize);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  },

  /**
   * دریافت جزئیات تیکت از اندپوینت‌های رسمی پشتیبانی /support/tickets/{id} یا کاربر /tickets/{id}
   */
  async getTicketById(
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminTicket | null> {
    try {
      const response = await apiClient.get<unknown>(
        ENDPOINTS.support.ticketDetail(id),
        { signal },
      );
      const resData = (response.data as any)?.data || response.data;
      if (resData) {
        return mapApiTicketToAdminTicket(resData);
      }
    } catch (err: any) {
      if (err?.status === 404) return null;
      try {
        const response = await apiClient.get<unknown>(
          ENDPOINTS.tickets.detail(id),
          { signal },
        );
        const resData = (response.data as any)?.data || response.data;
        if (resData) return mapApiTicketToAdminTicket(resData);
      } catch (custErr: any) {
        if (custErr?.status === 404) return null;
        throw custErr;
      }
    }
    return null;
  },

  /**
   * ارسال پاسخ به تیکت از طرف پشتیبانی:
   * POST /support/tickets/{id}/messages
   */
  async replyToTicket(
    ticketId: string,
    messageText: string,
    _senderAdminId?: string,
  ): Promise<AdminTicket> {
    const trimmed = messageText.trim();
    if (!trimmed) {
      throw new Error("متن پاسخ نمی‌تواند خالی باشد.");
    }

    try {
      await apiClient.post(ENDPOINTS.support.ticketMessages(ticketId), {
        text: trimmed,
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 403) {
        await apiClient.post(ENDPOINTS.tickets.messages(ticketId), {
          text: trimmed,
        });
      } else {
        throw err;
      }
    }

    const refreshed = await adminService.getTicketById(ticketId);
    if (!refreshed) {
      throw new Error("دریافت تیکت پس از ثبت پاسخ با خطا مواجه شد.");
    }
    return refreshed;
  },

  /**
   * تغییر وضعیت تیکت:
   * PATCH /admin/tickets/{id}/status یا PATCH /support/tickets/{id}/status
   */
  async updateTicketStatus(
    ticketId: string,
    status: AdminTicket["status"],
  ): Promise<AdminTicket> {
    try {
      await apiClient.patch(ENDPOINTS.adminTickets.status(ticketId), {
        status,
      });
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        await apiClient.patch(ENDPOINTS.support.ticketStatus(ticketId), {
          status,
        });
      } else {
        throw err;
      }
    }

    const refreshed = await adminService.getTicketById(ticketId);
    if (!refreshed) {
      throw new Error("دریافت تیکت پس از تغییر وضعیت با خطا مواجه شد.");
    }
    return refreshed;
  },

  /**
   * ارجاع تیکت به ادمین/پشتیبان:
   * PATCH /admin/tickets/{id}/assign یا PATCH /support/tickets/{id}/assign
   */
  async assignTicket(
    ticketId: string,
    adminId: string | null,
  ): Promise<AdminTicket> {
    const payload = { assignedToUserId: adminId || "" };

    try {
      await apiClient.patch(ENDPOINTS.adminTickets.assign(ticketId), payload);
    } catch (err: any) {
      if (err?.status === 403 || err?.status === 404) {
        await apiClient.patch(
          ENDPOINTS.support.ticketAssign(ticketId),
          payload,
        );
      } else {
        throw err;
      }
    }

    const refreshed = await adminService.getTicketById(ticketId);
    if (!refreshed) {
      throw new Error("دریافت تیکت پس از ارجاع با خطا مواجه شد.");
    }
    return refreshed;
  },

  async getCannedResponses(): Promise<CannedResponse[]> {
    return Promise.resolve([]);
  },

  /**
   * دریافت لیست ادمین‌ها جهت انتساب تیکت
   * GET /platform-admin/users?role=ADMIN
   */
  async getAdmins(signal?: AbortSignal): Promise<AdminUser[]> {
    try {
      const res = await adminService.getUsers(
        { role: "ADMIN", pageSize: 50 },
        signal,
      );
      return res.items;
    } catch {
      return [];
    }
  },

  async getGamecenterTickets(
    gamecenterId: string,
    signal?: AbortSignal,
  ): Promise<AdminTicket[]> {
    try {
      const res = await adminService.getTickets({ pageSize: 100 }, signal);
      return res.items.filter((t) => t.gamecenterId === gamecenterId);
    } catch {
      return [];
    }
  },

  async getGamecenterReviews(
    gamecenterIdOrSlug: string,
    signal?: AbortSignal,
  ): Promise<AdminReview[]> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.gamingCenter.ratings(gamecenterIdOrSlug),
        { signal },
      );
      const rawArray = unwrapTicketsList(response.data);
      return rawArray.map((r: any, idx: number) => ({
        id: String(r.id ?? `rev-${idx}`),
        userId: String(r.userId ?? r.customerId ?? ""),
        userName: toSafeText(r.userName || r.customerName || r.authorName, "کاربر"),
        gamecenterId: String(r.gamingCenterId ?? gamecenterIdOrSlug),
        gamecenterName: toSafeText(r.gamingCenterName, ""),
        rating: Number(r.rating ?? r.score ?? 0),
        comment: toSafeText(r.comment || r.text || r.content, ""),
        createdAt: r.createdAt ? formatDayLabel(String(r.createdAt)) || String(r.createdAt) : "-",
        status: (r.status || "APPROVED") as AdminReview["status"],
      }));
    } catch {
      return [];
    }
  },

  async getGamecenterReservations(
    gamecenterId: string,
    signal?: AbortSignal,
  ): Promise<AdminUserReservation[]> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.platformAdmin.reservations,
        {
          query: { page: 1, limit: 50, gamingCenterId: gamecenterId },
          signal,
        },
      );
      const rawArray = unwrapTicketsList(response.data);
      return rawArray
        .filter(
          (r: any) =>
            !r.gamingCenter?.id ||
            r.gamingCenter.id === gamecenterId ||
            r.gamingCenterId === gamecenterId,
        )
        .map((r: any) => ({
          id: String(r.id ?? ""),
          reservationCode: String(r.reservationCode || r.id || "-"),
          userId: String(r.customer?.id ?? r.userId ?? ""),
          gamecenterId: String(r.gamingCenter?.id ?? r.gamingCenterId ?? gamecenterId),
          gamecenterName: toSafeText(r.gamingCenter?.name ?? r.gamecenterName, "-"),
          deviceName: toSafeText(r.station?.name ?? r.station?.type ?? r.deviceName, "-"),
          date: r.reservationDate
            ? formatDayLabel(String(r.reservationDate))
            : r.startTime
              ? formatDayLabel(String(r.startTime))
              : "-",
          timeSlot: r.startTime
            ? `${formatClock(String(r.startTime), true)}${r.endTime ? ` تا ${formatClock(String(r.endTime), true)}` : ""}`
            : "-",
          amount: Number(r.finalPrice ?? r.totalPrice ?? r.amount ?? 0),
          status: (r.status || "PENDING") as AdminUserReservation["status"],
          paymentStatus: (r.payment?.status || "PENDING") as AdminUserReservation["paymentStatus"],
        }));
    } catch {
      return [];
    }
  },

  // ==================== USERS ====================

  /**
   * تبدیل کاربر خام سرور به فرمت AdminUser
   */
  mapRawUserToAdmin(raw: any): AdminUser {
    if (!raw || typeof raw !== "object") return raw;
    const createdAtFormatted = raw.createdAt
      ? formatDayLabel(String(raw.createdAt)) || String(raw.createdAt)
      : "-";

    const fullName =
      toSafeText(raw.fullName) ||
      toSafeText(raw.name) ||
      ([toSafeText(raw.firstName), toSafeText(raw.lastName)].filter(Boolean).join(" ") || "کاربر");

    return {
      id: String(raw.id ?? ""),
      fullName,
      phone: toSafeText(raw.phone, "-"),
      email: toSafeText(raw.email) || undefined,
      nationalId: toSafeText(raw.nationalId) || undefined,
      role: (raw.role || "USER") as AdminUser["role"],
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
      registeredVia: toSafeText(raw.registeredVia, "OTP"),
      reservationsCount: Number(raw.reservationsCount ?? 0),
      totalSpentAmount: Number(raw.totalSpentAmount ?? 0),
      createdAt: createdAtFormatted,
      lastLogin: raw.lastLogin ? formatDayLabel(String(raw.lastLogin)) || undefined : undefined,
      gamingCenterId: raw.gamingCenterId ? String(raw.gamingCenterId) : undefined,
      gamingCenterName: toSafeText(raw.gamingCenterName) || undefined,
    };
  },

  /**
   * دریافت لیست کاربران پلتفرم:
   * GET /platform-admin/users
   */
  async getUsers(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminUser>> {
    const {
      search = "",
      status = "all",
      role = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    const queryPayload: Record<string, string | number | boolean> = {
      page,
      limit: Math.min(pageSize, 100),
    };
    if (search.trim()) queryPayload.search = search.trim();
    if (role && role !== "all") queryPayload.role = role;
    if (status === "active") queryPayload.isActive = true;
    if (status === "inactive") queryPayload.isActive = false;

    const response = await apiClient.get<any>(ENDPOINTS.platformAdmin.users, {
      query: queryPayload,
      signal,
    });

    const resData = response.data;
    let rawArray: any[] = [];
    if (Array.isArray(resData)) rawArray = resData;
    else if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) rawArray = resData.data;
      else if (Array.isArray(resData.items)) rawArray = resData.items;
    }

    const items = rawArray.map((u) => adminService.mapRawUserToAdmin(u));

    items.sort((a, b) => {
      const valA =
        (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB =
        (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }
      return 0;
    });

    const total = response.meta?.pagination?.total ?? items.length;
    const totalPages =
      response.meta?.pagination?.totalPages ??
      (Math.ceil(total / pageSize) || 1);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getUserById(
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminUser | null> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.platformAdmin.userById(id),
        { signal },
      );
      const resData = response.data?.data || response.data;
      if (resData && typeof resData === "object") {
        return adminService.mapRawUserToAdmin(resData);
      }
    } catch {
      // GET /platform-admin/users/{id} may not exist in OpenAPI; look up via list
    }

    try {
      const listRes = await adminService.getUsers({ pageSize: 100 }, signal);
      return listRes.items.find((u) => u.id === id) || null;
    } catch {
      return null;
    }
  },

  async createUser(input: AdminUserInput): Promise<AdminUser> {
    const parts = (input.fullName || "").trim().split(" ");
    const firstName = parts[0] || input.fullName || "کاربر";
    const lastName = parts.slice(1).join(" ") || "";

    const payload = {
      gamingCenterId: input.gamingCenterId || "platform-wide",
      firstName,
      lastName,
      phone: cleanPhoneNumber(input.phone) || input.phone,
      email: input.email,
      role: input.role === "ADMIN" ? "ADMIN" : "MANAGER",
      isActive: input.isActive ?? true,
    };

    const response = await apiClient.post<any>(
      ENDPOINTS.platformAdmin.users,
      payload,
    );
    const resData = response.data?.data || response.data;
    if (!resData || typeof resData !== "object") {
      throw new Error("پاسخ معتبری از سرور برای ایجاد کاربر دریافت نشد.");
    }
    return adminService.mapRawUserToAdmin({ ...resData, ...input });
  },

  async updateUser(
    id: string,
    input: Partial<AdminUserInput>,
  ): Promise<AdminUser> {
    const payload: Record<string, unknown> = {};
    if (input.fullName) {
      const parts = input.fullName.trim().split(" ");
      payload.firstName = parts[0] || input.fullName;
      payload.lastName = parts.slice(1).join(" ") || "";
    }
    if (input.phone) payload.phone = cleanPhoneNumber(input.phone);
    if (input.email !== undefined) payload.email = input.email;
    if (input.isActive !== undefined) payload.isActive = input.isActive;

    const response = await apiClient.patch<any>(
      ENDPOINTS.platformAdmin.userById(id),
      payload,
    );
    const resData = response.data?.data || response.data;
    if (resData && typeof resData === "object") {
      return adminService.mapRawUserToAdmin(resData);
    }

    const refreshed = await adminService.getUserById(id);
    if (refreshed) return refreshed;

    return {
      id,
      fullName: input.fullName || "کاربر",
      phone: input.phone || "-",
      email: input.email,
      role: input.role || "USER",
      isActive: input.isActive ?? true,
      createdAt: "-",
    };
  },

  async toggleUserStatus(id: string): Promise<AdminUser> {
    const current = await this.getUserById(id);
    const newStatus = !(current?.isActive ?? true);

    const response = await apiClient.patch<any>(
      ENDPOINTS.platformAdmin.userStatus(id),
      { isActive: newStatus },
    );
    const resData = response.data?.data || response.data;
    if (resData && typeof resData === "object") {
      return adminService.mapRawUserToAdmin({ ...current, ...resData, isActive: newStatus });
    }
    if (current) {
      return { ...current, isActive: newStatus };
    }
    throw new Error("بروزرسانی وضعیت کاربر انجام نشد.");
  },

  async deleteUser(id: string): Promise<boolean> {
    await apiClient.delete(ENDPOINTS.platformAdmin.userById(id));
    return true;
  },

  async getUserReservations(
    userId: string,
    signal?: AbortSignal,
  ): Promise<AdminUserReservation[]> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.platformAdmin.reservations,
        {
          query: { page: 1, limit: 50, customerId: userId },
          signal,
        },
      );
      const rawArray = unwrapTicketsList(response.data);
      return rawArray
        .filter(
          (r: any) =>
            !r.customer?.id ||
            r.customer.id === userId ||
            r.userId === userId,
        )
        .map((r: any) => ({
          id: String(r.id ?? ""),
          reservationCode: String(r.reservationCode || r.id || "-"),
          userId: String(r.customer?.id ?? r.userId ?? userId),
          gamecenterId: String(r.gamingCenter?.id ?? r.gamingCenterId ?? ""),
          gamecenterName: toSafeText(r.gamingCenter?.name ?? r.gamecenterName, "-"),
          deviceName: toSafeText(r.station?.name ?? r.station?.type ?? r.deviceName, "-"),
          date: r.reservationDate
            ? formatDayLabel(String(r.reservationDate))
            : r.startTime
              ? formatDayLabel(String(r.startTime))
              : "-",
          timeSlot: r.startTime
            ? `${formatClock(String(r.startTime), true)}${r.endTime ? ` تا ${formatClock(String(r.endTime), true)}` : ""}`
            : "-",
          amount: Number(r.finalPrice ?? r.totalPrice ?? r.amount ?? 0),
          status: (r.status || "PENDING") as AdminUserReservation["status"],
          paymentStatus: (r.payment?.status || "PENDING") as AdminUserReservation["paymentStatus"],
        }));
    } catch {
      return [];
    }
  },

  async getUserTickets(
    userId: string,
    signal?: AbortSignal,
  ): Promise<AdminTicket[]> {
    try {
      const res = await adminService.getTickets({ pageSize: 100 }, signal);
      return res.items.filter((t) => t.userId === userId);
    } catch {
      return [];
    }
  },

  async getUserReviews(_userId: string): Promise<AdminReview[]> {
    return Promise.resolve([]);
  },

  // ==================== OWNER VERIFICATION ====================

  mapRawVerificationToAdmin(raw: any): AdminOwnerVerification {
    const formatDateTime = (iso?: string | null): string => {
      if (!iso) return "";
      const day = formatDayLabel(String(iso));
      const clock = formatClock(String(iso), true);
      if (day && clock) return `${day} - ${clock}`;
      return day || clock || String(iso);
    };

    const detectDocType = (url: string): AdminVerificationDocument["type"] => {
      const clean = url.split("?")[0].toLowerCase();
      if (clean.endsWith(".pdf")) return "pdf";
      return "image";
    };

    const statusRaw = String(raw?.status ?? "PENDING").toUpperCase();
    const status: AdminOwnerVerification["status"] =
      statusRaw === "APPROVED" ||
      statusRaw === "REJECTED" ||
      statusRaw === "NOT_SUBMITTED"
        ? (statusRaw as AdminOwnerVerification["status"])
        : "PENDING";

    const gamingCenterObj =
      raw?.gamingCenter && typeof raw.gamingCenter === "object"
        ? raw.gamingCenter
        : null;
    const addresses = Array.isArray(gamingCenterObj?.addresses)
      ? gamingCenterObj.addresses
      : [];
    const primaryAddress =
      addresses.find((a: any) => a?.isPrimary) || addresses[0];

    const ownerName =
      toSafeText(raw?.ownerFullName) ||
      toSafeText(raw?.ownerName) ||
      toSafeText(raw?.owner?.fullName) ||
      toSafeText(raw?.user?.fullName) ||
      "نامشخص";

    const rawPhone =
      toSafeText(raw?.phoneNumber) ||
      toSafeText(raw?.ownerPhone) ||
      toSafeText(raw?.owner?.phone) ||
      toSafeText(raw?.user?.phone);
    const ownerPhone = rawPhone ? cleanPhoneNumber(rawPhone) || rawPhone : "-";

    const gamecenterId = String(
      raw?.gamingCenterId ?? gamingCenterObj?.id ?? ""
    );
    const gamecenterName =
      toSafeText(raw?.gamingCenterName) ||
      toSafeText(gamingCenterObj?.name) ||
      toSafeText(raw?.gamecenterName) ||
      "گیم‌نت";

    const cityName =
      toSafeText(raw?.city) ||
      toSafeText(primaryAddress?.city) ||
      "-";

    const fullAddress =
      toSafeText(raw?.address) ||
      toSafeText(primaryAddress?.addressLine) ||
      toSafeText(primaryAddress?.address) ||
      "-";

    const businessLicenseUrl = normalizeMediaUrl(
      raw?.businessLicenseUrl || raw?.licenseImageUrl
    );
    const nationalCardUrl = normalizeMediaUrl(raw?.nationalCardUrl);
    const idWithSelfieUrl = normalizeMediaUrl(raw?.idWithSelfieUrl);

    const documents: AdminVerificationDocument[] = [];
    if (businessLicenseUrl) {
      documents.push({
        id: `${raw?.id || "verif"}-license`,
        name: "پروانه کسب گیم‌نت",
        url: businessLicenseUrl,
        type: detectDocType(businessLicenseUrl),
      });
    }
    if (nationalCardUrl) {
      documents.push({
        id: `${raw?.id || "verif"}-national-card`,
        name: "تصویر کارت ملی",
        url: nationalCardUrl,
        type: detectDocType(nationalCardUrl),
      });
    }
    if (idWithSelfieUrl) {
      documents.push({
        id: `${raw?.id || "verif"}-selfie`,
        name: "سلفی با مدرک هویتی",
        url: idWithSelfieUrl,
        type: detectDocType(idWithSelfieUrl),
      });
    }

    const reviewLogs: AdminVerificationReviewLog[] = Array.isArray(raw?.reviewLogs)
      ? raw.reviewLogs.map((log: any, idx: number) => ({
          id: String(log?.id ?? `log-${idx}`),
          adminName: toSafeText(log?.adminName || log?.reviewedBy, "ادمین پلتفرم"),
          action: (String(log?.action || status).toUpperCase() as AdminVerificationReviewLog["action"]),
          note: log?.note || log?.rejectionReason || undefined,
          date: formatDateTime(log?.date || log?.createdAt) || "-",
        }))
      : [];

    if (
      reviewLogs.length === 0 &&
      (status === "APPROVED" || status === "REJECTED") &&
      (raw?.reviewedAt || raw?.updatedAt)
    ) {
      reviewLogs.push({
        id: `${raw?.id || "verif"}-decision`,
        adminName: "ادمین پلتفرم",
        action: status,
        note: raw?.rejectionReason || (status === "APPROVED" ? "درخواست تایید شد" : undefined),
        date: formatDateTime(raw?.reviewedAt || raw?.updatedAt) || "-",
      });
    }

    return {
      id: String(raw?.id ?? raw?.verificationId ?? ""),
      ownerId: String(raw?.ownerId ?? raw?.userId ?? gamingCenterObj?.ownerId ?? "-"),
      ownerName,
      ownerPhone,
      ownerNationalId: toSafeText(raw?.nationalId, "-"),
      gamecenterId,
      gamecenterName,
      gamecenterAddress: fullAddress,
      gamecenterCity: cityName,
      status,
      submittedAt: formatDateTime(raw?.createdAt) || "-",
      updatedAt:
        raw?.updatedAt && raw.updatedAt !== raw.createdAt
          ? formatDateTime(raw.updatedAt)
          : undefined,
      reviewedAt: raw?.reviewedAt ? formatDateTime(raw.reviewedAt) : undefined,
      createdAtIso: raw?.createdAt ? String(raw.createdAt) : "",
      businessLicenseUrl: businessLicenseUrl || undefined,
      verificationData: {
        centerName: gamecenterName,
        centerAddress: fullAddress,
        licenseImageUrl: businessLicenseUrl || undefined,
        documents,
        submittedAnswers: [
          { question: "نام و نام خانوادگی مالک/مدیر", answer: ownerName },
          { question: "شماره موبایل", answer: ownerPhone },
          { question: "نام گیم‌نت", answer: gamecenterName },
        ],
      },
      rejectionReason: raw?.rejectionReason ? String(raw.rejectionReason) : undefined,
      reviewLogs,
    };
  },

  /**
   * GET /platform-admin/verifications
   */
  async getOwnerVerifications(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminOwnerVerification>> {
    const {
      search = "",
      status = "all",
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 20,
    } = params;

    const queryPayload: Record<string, string | number> = {
      page,
      limit: Math.min(pageSize, 100),
    };
    if (status && status !== "all") {
      queryPayload.status = status;
    }

    const response = await apiClient.get<any>(
      ENDPOINTS.platformAdmin.verifications,
      {
        query: queryPayload,
        signal,
      },
    );

    const resData = response.data;
    let rawArray: any[] = [];
    if (Array.isArray(resData)) rawArray = resData;
    else if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) rawArray = resData.data;
      else if (Array.isArray(resData.items)) rawArray = resData.items;
    }

    let items = rawArray.map((item) =>
      adminService.mapRawVerificationToAdmin(item)
    );

    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (v) =>
          v.ownerName.toLowerCase().includes(q) ||
          v.ownerPhone.toLowerCase().includes(q) ||
          v.gamecenterName.toLowerCase().includes(q) ||
          v.gamecenterId.toLowerCase().includes(q) ||
          v.id.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      if (sortBy === "ownerName") {
        const cmp = a.ownerName.localeCompare(b.ownerName, "fa");
        return sortOrder === "asc" ? cmp : -cmp;
      }
      const timeA = Date.parse(a.createdAtIso || "") || 0;
      const timeB = Date.parse(b.createdAtIso || "") || 0;
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    const metaPagination =
      response.meta?.pagination || (resData?.pagination as any) || {};
    const total = q
      ? items.length
      : Number(
          metaPagination.total ??
            metaPagination.totalItems ??
            resData?.total ??
            items.length
        );
    const currentPage = Number(metaPagination.page ?? page);
    const limit = Number(metaPagination.limit ?? metaPagination.pageSize ?? pageSize);
    const totalPages = Math.max(
      1,
      Number(metaPagination.totalPages ?? Math.ceil(total / Math.max(1, limit)))
    );

    return {
      items,
      total,
      page: currentPage,
      pageSize: limit,
      totalPages,
    };
  },

  /**
   * GET /platform-admin/verifications/{id}
   */
  async getOwnerVerificationById(
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminOwnerVerification | null> {
    if (!id) return null;
    const response = await apiClient.get<any>(
      ENDPOINTS.platformAdmin.verificationById(id),
      { signal }
    );
    const raw = response.data?.data ?? response.data;
    if (!raw || typeof raw !== "object") return null;
    return adminService.mapRawVerificationToAdmin(raw);
  },

  /**
   * تایید یا رد درخواست احراز هویت گیم‌نت مطابق OpenAPI:
   * - POST /platform-admin/verifications/{id}/approve
   * - POST /platform-admin/verifications/{id}/reject (body: { rejectionReason })
   */
  async updateOwnerVerificationStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    reason?: string,
  ): Promise<AdminOwnerVerification> {
    if (!id) {
      throw new Error("شناسه درخواست احراز هویت نامعتبر است.");
    }

    if (status === "APPROVED") {
      await apiClient.post<any>(
        ENDPOINTS.platformAdmin.approveVerification(id),
        {}
      );
    } else {
      const trimmedReason = reason?.trim() || "";
      if (trimmedReason.length < 3) {
        throw new Error("دلیل لغو/رد درخواست باید حداقل ۳ کاراکتر باشد.");
      }
      await apiClient.post<any>(
        ENDPOINTS.platformAdmin.rejectVerification(id),
        { rejectionReason: trimmedReason }
      );
    }

    const updated = await adminService.getOwnerVerificationById(id).catch(() => null);
    if (updated) return updated;

    return {
      id,
      ownerId: "-",
      ownerName: "-",
      ownerPhone: "-",
      ownerNationalId: "-",
      gamecenterId: "",
      gamecenterName: "-",
      gamecenterAddress: "-",
      gamecenterCity: "-",
      status,
      submittedAt: "-",
      reviewedAt: "اکنون",
      verificationData: {
        centerName: "-",
        centerAddress: "-",
        documents: [],
        submittedAnswers: [],
      },
      rejectionReason: status === "REJECTED" ? reason?.trim() : undefined,
      reviewLogs: [],
    };
  },

  // ==================== ADVERTISING REQUESTS ====================

  /**
   * تبدیل شی خام تبلیغ سرور به فرمت AdminAdRequest
   */
  mapRawAdRequestToAdmin(raw: any): AdminAdRequest {
    if (!raw || typeof raw !== "object") return raw;
    const submittedAtFormatted = raw.createdAt
      ? formatDayLabel(String(raw.createdAt)) || String(raw.createdAt)
      : "-";

    return {
      id: String(raw.id ?? ""),
      title: toSafeText(raw.title, "درخواست تبلیغات"),
      description: toSafeText(raw.description, ""),
      bannerUrl: raw.bannerUrl ? normalizeMediaUrl(String(raw.bannerUrl)) : "",
      destinationUrl: toSafeText(raw.destinationUrl, ""),
      targetPosition: "HOMEPAGE_BANNER",
      durationDays: Number(raw.durationDays || raw.proposedDurationDays || 30),
      priority: Number(raw.priority ?? 0),
      price: Number(raw.price ?? 0),
      status: (raw.status || "PENDING") as AdminAdRequest["status"],
      decisionReason: toSafeText(raw.decisionReason) || undefined,
      adminNote: toSafeText(raw.adminNote) || undefined,
      startDate: raw.startDate ? formatDayLabel(String(raw.startDate)) || undefined : undefined,
      endDate: raw.endDate ? formatDayLabel(String(raw.endDate)) || undefined : undefined,
      submittedAt: submittedAtFormatted,
      updatedAt: raw.updatedAt ? formatDayLabel(String(raw.updatedAt)) || undefined : undefined,
      gamecenterId: String(raw.gamingCenterId ?? raw.gamingCenter?.id ?? ""),
      gamecenterName: toSafeText(raw.gamingCenterName ?? raw.gamingCenter?.name, "-"),
      ownerName: toSafeText(raw.ownerName ?? raw.owner?.fullName, "-"),
      ownerPhone: cleanPhoneNumber(toSafeText(raw.ownerPhone ?? raw.owner?.phone)) || "-",
    };
  },

  /**
   * دریافت لیست درخواست‌های تبلیغات:
   * GET /platform-admin/ad-requests
   */
  async getAdRequests(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminAdRequest>> {
    const {
      search = "",
      status = "all",
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    const queryPayload: Record<string, string | number> = {
      page,
      limit: Math.min(pageSize, 100),
    };
    if (search.trim()) queryPayload.search = search.trim();
    if (status && status !== "all") queryPayload.status = status;

    const response = await apiClient.get<any>(
      ENDPOINTS.platformAdmin.adRequests,
      {
        query: queryPayload,
        signal,
      },
    );

    const resData = response.data;
    let rawArray: any[] = [];
    if (Array.isArray(resData)) rawArray = resData;
    else if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) rawArray = resData.data;
      else if (Array.isArray(resData.items)) rawArray = resData.items;
    }

    const items = rawArray.map((item) => adminService.mapRawAdRequestToAdmin(item));

    items.sort((a, b) => {
      const valA =
        (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB =
        (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }
      return 0;
    });

    const total = response.meta?.pagination?.total ?? items.length;
    const totalPages =
      response.meta?.pagination?.totalPages ??
      (Math.ceil(total / pageSize) || 1);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * آپلود بنر تبلیغاتی برای ایجاد مستقیم تبلیغ توسط ادمین
   * از فرمت‌های تصویری از جمله AVIF، WebP، PNG و JPG پشتیبانی می‌کند.
   */
  async uploadAdBanner(gamingCenterId: string, file: File): Promise<string> {
    const extractUrl = (payload: unknown): string => {
      const direct = extractMediaUrl(payload);
      if (direct) return direct;
      if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        const nested =
          obj.data && typeof obj.data === "object"
            ? (obj.data as Record<string, unknown>).bannerUrl
            : undefined;
        const candidate = obj.bannerUrl || nested;
        if (typeof candidate === "string" && candidate) {
          return normalizeMediaUrl(candidate);
        }
      }
      return "";
    };

    const tryAdminMediaUpload = async (): Promise<string> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiClient.post<unknown>(
        ENDPOINTS.platformAdmin.mediaUpload,
        fd,
      );
      const url = extractUrl(res.data);
      if (!url) {
        throw new Error("آپلود تصویر بنر با خطا مواجه شد.");
      }
      return url;
    };

    const trimmedGcId = gamingCenterId?.trim();
    if (trimmedGcId) {
      try {
        const fd = new FormData();
        fd.append("banner", file);
        const res = await apiClient.post<unknown>(
          ENDPOINTS.advertisements.centerUpload(trimmedGcId),
          fd,
        );
        const url = extractUrl(res.data);
        if (url) return url;
      } catch (err: unknown) {
        const errStatus = (err as { status?: number })?.status;
        try {
          return await tryAdminMediaUpload();
        } catch {
          if (errStatus !== 403 && errStatus !== 404 && errStatus !== 405) {
            throw err;
          }
        }
      }
    }

    return await tryAdminMediaUpload();
  },

  /**
   * ایجاد مستقیم تبلیغ توسط ادمین در دو مرحله خودکار:
   * ۱. ارسال درخواست تبلیغ ادمین: POST /platform-admin/ad-requests
   *    (در صورت عدم پشتیبانی و وجود گیمنت، فال‌بک به POST /gamingCenters/{gamingCenterId}/advertisements)
   * ۲. ارسال خودکار درخواست دوم برای تأیید و انتشار بنر:
   *    PATCH /platform-admin/ad-requests/{id}/status -> APPROVED
   */
  async createApprovedAd(input: {
    gamingCenterId?: string;
    title: string;
    description?: string;
    bannerUrl: string;
    destinationUrl?: string;
    durationDays?: number;
    priority?: number;
    startDate?: string;
    endDate?: string;
    adminNote?: string;
    onProgress?: (step: "creating" | "approving") => void;
  }): Promise<AdminAdRequest> {
    const durationDays = Math.max(1, Number(input.durationDays) || 30);
    const priority = Number(input.priority ?? 0) || 0;
    const trimmedCenterId = input.gamingCenterId?.trim() || undefined;

    input.onProgress?.("creating");

    const basePayload: Record<string, unknown> = {
      title: input.title.trim(),
      bannerUrl: input.bannerUrl.trim(),
      proposedDurationDays: durationDays,
    };
    if (input.description?.trim()) basePayload.description = input.description.trim();
    if (input.destinationUrl?.trim()) basePayload.destinationUrl = input.destinationUrl.trim();
    if (trimmedCenterId) basePayload.gamingCenterId = trimmedCenterId;

    const fullAdminPayload: Record<string, unknown> = {
      ...basePayload,
      durationDays,
      priority,
    };
    if (input.startDate) fullAdminPayload.startDate = input.startDate;
    if (input.endDate) fullAdminPayload.endDate = input.endDate;
    if (input.adminNote?.trim()) fullAdminPayload.adminNote = input.adminNote.trim();

    const unwrapRecord = (val: unknown): Record<string, unknown> => {
      if (!val || typeof val !== "object") return {};
      const rec = val as Record<string, unknown>;
      if (rec.data && typeof rec.data === "object") {
        return rec.data as Record<string, unknown>;
      }
      return rec;
    };

    let createRes: { data: unknown };
    try {
      createRes = await apiClient.post<unknown>(
        ENDPOINTS.platformAdmin.adRequests,
        fullAdminPayload,
      );
    } catch (err: unknown) {
      const errStatus = (err as { status?: number })?.status;
      if (errStatus === 400) {
        // Retry with minimal DTO fields in case backend uses strict DTO whitelisting
        try {
          createRes = await apiClient.post<unknown>(
            ENDPOINTS.platformAdmin.adRequests,
            basePayload,
          );
        } catch (retryErr: unknown) {
          const retryStatus = (retryErr as { status?: number })?.status;
          if (
            (retryStatus === 404 || retryStatus === 405) &&
            trimmedCenterId
          ) {
            const centerPayload = { ...basePayload };
            delete centerPayload.gamingCenterId;
            createRes = await apiClient.post<unknown>(
              ENDPOINTS.advertisements.centerAds(trimmedCenterId),
              centerPayload,
            );
          } else {
            throw retryErr;
          }
        }
      } else if ((errStatus === 404 || errStatus === 405) && trimmedCenterId) {
        const centerPayload = { ...basePayload };
        delete centerPayload.gamingCenterId;
        createRes = await apiClient.post<unknown>(
          ENDPOINTS.advertisements.centerAds(trimmedCenterId),
          centerPayload,
        );
      } else {
        throw err;
      }
    }

    const createdRaw = unwrapRecord(createRes.data);
    const nestedAdRequest =
      createdRaw.adRequest && typeof createdRaw.adRequest === "object"
        ? (createdRaw.adRequest as Record<string, unknown>)
        : undefined;
    const nestedAdvertisement =
      createdRaw.advertisement && typeof createdRaw.advertisement === "object"
        ? (createdRaw.advertisement as Record<string, unknown>)
        : undefined;

    const createdId = String(
      createdRaw.id ??
        createdRaw._id ??
        nestedAdRequest?.id ??
        nestedAdvertisement?.id ??
        "",
    );
    if (!createdId) {
      throw new Error("درخواست تبلیغ ارسال شد اما شناسه آن از سرور دریافت نشد.");
    }

    input.onProgress?.("approving");

    const decisionReason = input.adminNote?.trim() || "تأیید خودکار توسط ادمین";
    const statusPayload: Record<string, unknown> = {
      status: "APPROVED",
      decisionReason,
      durationDays,
      priority,
    };
    if (input.startDate) statusPayload.startDate = input.startDate;
    if (input.endDate) statusPayload.endDate = input.endDate;
    if (input.adminNote?.trim()) statusPayload.adminNote = input.adminNote.trim();

    let approveRes: { data: unknown };
    try {
      approveRes = await apiClient.patch<unknown>(
        ENDPOINTS.platformAdmin.adRequestStatus(createdId),
        statusPayload,
      );
    } catch (approveErr: unknown) {
      const approveStatus = (approveErr as { status?: number })?.status;
      const approveMsg = (approveErr as { message?: string })?.message;
      if (approveStatus === 400) {
        try {
          approveRes = await apiClient.patch<unknown>(
            ENDPOINTS.platformAdmin.adRequestStatus(createdId),
            { status: "APPROVED", decisionReason },
          );
        } catch (fallbackApproveErr: unknown) {
          const fallbackMsg = (fallbackApproveErr as { message?: string })?.message;
          const wrapped = new Error(
            `درخواست تبلیغ با شناسه ${createdId} ثبت شد، اما در مرحله تأیید خودکار خطا رخ داد: ${fallbackMsg || "خطای نامشخص"}. می‌توانید از لیست تبلیغات آن را تأیید کنید.`,
          ) as Error & { createdAdId?: string };
          wrapped.createdAdId = createdId;
          throw wrapped;
        }
      } else {
        const wrapped = new Error(
          `درخواست تبلیغ با شناسه ${createdId} ثبت شد، اما در مرحله تأیید خودکار خطا رخ داد: ${approveMsg || "خطای نامشخص"}. می‌توانید از لیست تبلیغات آن را تأیید کنید.`,
        ) as Error & { createdAdId?: string };
        wrapped.createdAdId = createdId;
        throw wrapped;
      }
    }

    const approvedRaw = unwrapRecord(approveRes.data);
    return adminService.mapRawAdRequestToAdmin({
      ...createdRaw,
      ...approvedRaw,
      status:
        typeof approvedRaw.status === "string" && approvedRaw.status
          ? approvedRaw.status
          : "APPROVED",
    });
  },

  /**
   * تأیید یا رد درخواست تبلیغات:
   * PATCH /platform-admin/ad-requests/{id}/status
   */
  async updateAdRequestStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    decisionReason?: string,
    options?: {
      durationDays?: number;
      priority?: number;
      adminNote?: string;
    },
  ): Promise<AdminAdRequest> {
    const payload: Record<string, unknown> = {
      status,
      decisionReason:
        decisionReason || (status === "APPROVED" ? "تأیید شد" : "رد شد"),
    };
    if (options?.durationDays !== undefined) {
      payload.durationDays = Number(options.durationDays);
    }
    if (options?.priority !== undefined) {
      payload.priority = Number(options.priority);
    }
    if (options?.adminNote) {
      payload.adminNote = options.adminNote;
    }

    const response = await apiClient.patch<any>(
      ENDPOINTS.platformAdmin.adRequestStatus(id),
      payload,
    );
    const resData = response.data?.data || response.data;
    if (resData && typeof resData === "object") {
      return adminService.mapRawAdRequestToAdmin(resData);
    }
    return {
      id,
      title: "-",
      description: "",
      bannerUrl: "",
      targetPosition: "HOMEPAGE_BANNER",
      durationDays: options?.durationDays ?? 30,
      price: 0,
      status,
      decisionReason,
      submittedAt: "-",
      gamecenterId: "",
      gamecenterName: "-",
      ownerName: "-",
      ownerPhone: "-",
    };
  },

  /**
   * برداشتن دستی / حذف تبلیغ:
   * DELETE /platform-admin/ad-requests/{id}
   */
  async deleteAdRequest(id: string): Promise<boolean> {
    await apiClient.delete(ENDPOINTS.platformAdmin.adRequestById(id));
    return true;
  },

  // ==================== BLOG POSTS ====================

  /**
   * Helper: map UI sort keys to backend DRF ordering
   */
  mapAdminSortToOrdering(
    sortBy: string = "createdAt",
    sortOrder: "asc" | "desc" = "desc",
  ): string {
    const prefix = sortOrder === "desc" ? "-" : "";
    switch (sortBy) {
      case "publishedAt":
        return `${prefix}published_at`;
      case "viewsCount":
        return `${prefix}views_count`;
      case "readingMinutes":
        return `${prefix}reading_time_sec`;
      case "title":
        return `${prefix}title`;
      case "createdAt":
      default:
        // Backend stores published_at / creation date; ordering by published_at or id
        return `${prefix}published_at`;
    }
  },

  /**
   * GET /api/articles/
   * List articles for Admin Panel with real backend API pagination, search, category, and sorting.
   */
  async getBlogPosts(
    params: AdminListQueryParams & { category?: string } = {},
  ): Promise<AdminPaginatedResult<BlogPostDetail>> {
    const {
      search = "",
      status = "all",
      category = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    const queryParams: ArticleListQueryParams = {
      page,
      page_size: pageSize,
      search: search.trim() || undefined,
      ordering: this.mapAdminSortToOrdering(sortBy, sortOrder),
    };

    if (category && category !== "all") {
      queryParams.category = category;
    }

    // Contract note: Blog-Platform-API.yaml query parameters do not include 'status' in GET /articles/.
    // We send status to backend query if specified and not 'all', so if backend supports it, it applies server-side.
    if (status && status !== "all") {
      const apiStatus = mapUiStatusToApi(status as BlogPostStatus);
      queryParams.status = apiStatus;
    }

    const res = await blogApiService.getArticles(queryParams);

    let items = (res.items || []).map((dto) =>
      mapArticleDetailToUi(dto as unknown as ArticleDetailDto),
    );

    // If client requested a specific status filter and backend did not filter (or returned mixed statuses),
    // we safely ensure the UI status filter consistency.
    if (status && status !== "all") {
      items = items.filter((item) => item.status === status);
    }

    return {
      items,
      total: res.pagination?.total ?? items.length,
      page: res.pagination?.page ?? page,
      pageSize: res.pagination?.pageSize ?? pageSize,
      totalPages: res.pagination?.totalPages ?? (items.length ? 1 : 0),
    };
  },

  /**
   * GET /api/articles/{slug}/
   * Retrieves single article detail from backend by slug or ID.
   */
  async getBlogPostById(idOrSlug: string): Promise<BlogPostDetail | null> {
    try {
      const dto = await blogApiService.getArticleBySlug(idOrSlug);
      if (!dto) return null;
      return mapArticleDetailToUi(dto);
    } catch {
      return null;
    }
  },

  /**
   * POST /api/articles/
   * Creates a new blog article in the backend.
   */
  async createBlogPost(input: AdminBlogPostInput): Promise<BlogPostDetail> {
    if (!input.title || !input.title.trim()) {
      throw new Error("عنوان مقاله نمی‌تواند خالی باشد.");
    }
    if (!input.slug || !input.slug.trim()) {
      throw new Error("شناسه (Slug) مقاله نمی‌تواند خالی باشد.");
    }
    if (!input.excerpt || !input.excerpt.trim()) {
      throw new Error("خلاصه یا چکیده مقاله الزامی است.");
    }

    // Resolve categoryId if category string is numeric
    const parsedCatId = Number(input.category);
    const categoryId =
      !isNaN(parsedCatId) && parsedCatId > 0 ? parsedCatId : undefined;

    // Resolve or sync tags if tagIds not provided directly
    let resolvedTagIds = input.tagIds;
    if (
      (!resolvedTagIds || resolvedTagIds.length === 0) &&
      input.tags &&
      input.tags.length > 0
    ) {
      try {
        resolvedTagIds = await adminService.ensureTagsExist(input.tags);
      } catch {
        // Tag sync error should not block article creation if network fails
      }
    }

    const coverImageId =
      input.coverImageId != null &&
      String(input.coverImageId).trim() !== "" &&
      String(input.coverImageId).trim() !== "0"
        ? String(input.coverImageId).trim()
        : undefined;
    const requestBody = mapAdminInputToCreateRequest(
      input,
      categoryId,
      resolvedTagIds,
      coverImageId,
    );

    const createdDto = await blogApiService.createArticle(requestBody);
    return mapArticleDetailToUi(createdDto);
  },

  /**
   * PATCH /api/articles/{slug}/
   * Partially updates a blog article without overriding untouched fields.
   */
  async updateBlogPost(
    idOrSlug: string,
    input: Partial<AdminBlogPostInput>,
  ): Promise<BlogPostDetail> {
    // Resolve target slug
    let targetSlug = idOrSlug;

    // Check if input provides a new/current slug
    if (input.slug && input.slug.trim()) {
      targetSlug = input.slug.trim();
    }

    // First fetch current article to ensure slug is valid and verify state
    let currentArticle: ArticleDetailDto | null = null;
    try {
      currentArticle = await blogApiService.getArticleBySlug(idOrSlug);
      if (currentArticle?.slug) {
        targetSlug = currentArticle.slug;
      }
    } catch {
      // If fetching by ID failed, proceed with idOrSlug as slug
    }

    const parsedCatId = input.category ? Number(input.category) : undefined;
    const categoryId =
      parsedCatId && !isNaN(parsedCatId) && parsedCatId > 0
        ? parsedCatId
        : undefined;

    // Resolve or sync tags if tags were provided
    let resolvedTagIds = input.tagIds;
    if (resolvedTagIds === undefined && input.tags !== undefined) {
      if (input.tags.length > 0) {
        try {
          resolvedTagIds = await adminService.ensureTagsExist(input.tags);
        } catch {
          // Keep unresolved
        }
      } else {
        resolvedTagIds = [];
      }
    }

    const coverImageId =
      input.coverImageId !== undefined
        ? input.coverImageId != null &&
          String(input.coverImageId).trim() !== "" &&
          String(input.coverImageId).trim() !== "0"
          ? String(input.coverImageId).trim()
          : null
        : undefined;
    const patchBody = mapAdminInputToPatchRequest(
      input,
      categoryId,
      resolvedTagIds,
      coverImageId,
    );

    const updatedDto = await blogApiService.patchArticle(targetSlug, patchBody);
    return mapArticleDetailToUi(updatedDto);
  },

  /**
   * Updates article status:
   * - If newStatus is PUBLISHED, invokes POST /api/articles/{slug}/publish/
   * - Otherwise invokes PATCH /api/articles/{slug}/ with status: draft | archived
   */
  async updateBlogPostStatus(
    idOrSlug: string,
    status: BlogPostStatus,
  ): Promise<BlogPostDetail> {
    // Resolve slug from backend first
    let slug = idOrSlug;
    try {
      const current = await blogApiService.getArticleBySlug(idOrSlug);
      if (current?.slug) slug = current.slug;
    } catch {
      // Use idOrSlug as fallback
    }

    if (status === "PUBLISHED") {
      const publishedDto = await blogApiService.publishArticle(slug);
      return mapArticleDetailToUi(publishedDto);
    }

    const apiStatus = mapUiStatusToApi(status);
    const updatedDto = await blogApiService.patchArticle(slug, {
      status: apiStatus,
    });
    return mapArticleDetailToUi(updatedDto);
  },

  /**
   * DELETE /api/articles/{slug}/
   * Deletes an article from backend upon 204 No Content.
   */
  async deleteBlogPost(idOrSlug: string): Promise<boolean> {
    let slug = idOrSlug;
    try {
      const current = await blogApiService.getArticleBySlug(idOrSlug);
      if (current?.slug) slug = current.slug;
    } catch {
      // Use idOrSlug as slug
    }

    await blogApiService.deleteArticle(slug);
    return true;
  },

  /**
   * GET /api/categories/
   * Retrieves categories directly from real Backend API.
   */
  async getBlogCategories(): Promise<BlogCategory[]> {
    const dtos = await blogApiService.getCategories();
    return (dtos || []).map(mapCategoryToUi);
  },

  /**
   * Full CRUD operations for Blog Categories
   */
  async getCategoryList(): Promise<CategoryDto[]> {
    return blogApiService.getCategories();
  },

  async createCategory(body: CategoryRequestDto): Promise<CategoryDto> {
    return blogApiService.createCategory(body);
  },

  async updateCategory(
    id: number | string,
    body: CategoryRequestDto,
  ): Promise<CategoryDto> {
    return blogApiService.updateCategory(id, body);
  },

  async patchCategory(
    id: number | string,
    body: PatchedCategoryRequestDto,
  ): Promise<CategoryDto> {
    return blogApiService.patchCategory(id, body);
  },

  async deleteCategory(id: number | string): Promise<void> {
    return blogApiService.deleteCategory(id);
  },

  /**
   * Full CRUD operations for Blog Tags
   */
  async getTagsList(): Promise<TagDto[]> {
    return blogApiService.getTags();
  },

  async createTag(body: TagRequestDto): Promise<TagDto> {
    return blogApiService.createTag(body);
  },

  async updateTag(id: number | string, body: TagRequestDto): Promise<TagDto> {
    return blogApiService.updateTag(id, body);
  },

  async deleteTag(id: number | string): Promise<void> {
    return blogApiService.deleteTag(id);
  },

  /**
   * Checks for existing tags by name/slug and creates any missing tags,
   * returning unique tag IDs (tag_ids) for the article.
   */
  async ensureTagsExist(tagNames: string[]): Promise<number[]> {
    const trimmedNames = Array.from(
      new Set(tagNames.map((t) => t.trim()).filter((t) => t.length > 0)),
    );
    if (trimmedNames.length === 0) return [];

    const existingTags = await blogApiService.getTags();
    const tagIds: number[] = [];

    for (const name of trimmedNames) {
      // Find matching tag by name or slug (case-insensitive)
      const found = existingTags.find(
        (t) =>
          t.name.trim().toLowerCase() === name.toLowerCase() ||
          t.slug.trim().toLowerCase() === name.toLowerCase(),
      );

      if (found) {
        tagIds.push(found.id);
      } else {
        // Generate valid slug
        const rawSlug = name
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        const finalSlug =
          rawSlug.length > 0 ? rawSlug : `tag-${Date.now().toString(36)}`;

        try {
          const created = await blogApiService.createTag({
            name,
            slug: finalSlug,
          });
          tagIds.push(created.id);
          existingTags.push(created);
        } catch (err) {
          // If creation fails due to unique conflict, try to fetch again
          const refreshed = await blogApiService.getTags();
          const matchAfter = refreshed.find(
            (t) =>
              t.name.trim().toLowerCase() === name.toLowerCase() ||
              t.slug.trim().toLowerCase() === finalSlug.toLowerCase(),
          );
          if (matchAfter) {
            tagIds.push(matchAfter.id);
          }
        }
      }
    }

    return Array.from(new Set(tagIds));
  },

  /**
   * Media upload via POST /api/media/ using FormData
   */
  async uploadMedia(input: MediaCreateRequestDto): Promise<MediaDetailDto> {
    return blogApiService.uploadMedia(input);
  },

  /**
   * Authors list from GET /api/authors/
   */
  async getAuthorsList(): Promise<AuthorProfileDto[]> {
    return blogApiService.getAuthors();
  },

  /**
   * Content block definitions inspection:
   * GET /api/articles/block-definitions/
   */
  async getBlockDefinitions(): Promise<BlockDefinitionDto[]> {
    return blogApiService.getBlockDefinitions();
  },

  // ==================== CAMPAIGNS & DISCOUNTS ====================

  /**
   * تبدیل شی خام کمپین سرور به فرمت AdminCampaign
   */
  mapRawCampaignToAdmin(raw: any): AdminCampaign {
    if (!raw) return raw;
    const createdAtFormatted = raw.createdAt
      ? formatDayLabel(raw.createdAt)
      : new Date().toLocaleDateString("fa-IR");

    return {
      id: String(raw.id),
      title: raw.title || "کمپین تخفیف",
      code: (raw.code || "").toUpperCase(),
      description: raw.description,
      discountType: (raw.discountType ||
        "PERCENTAGE") as AdminCampaign["discountType"],
      discountValue: Number(raw.discountValue) || 0,
      maxDiscountAmount: raw.maxDiscountAmount
        ? Number(raw.maxDiscountAmount)
        : undefined,
      minOrderAmount: raw.minOrderAmount
        ? Number(raw.minOrderAmount)
        : undefined,
      scopeType: (raw.scopeType || "GLOBAL") as AdminCampaign["scopeType"],
      applicableGamecenterIds: raw.applicableGamecenterIds,
      applicableDeviceTypes: raw.applicableDeviceTypes,
      targetAudience: (raw.targetAudience ||
        "ALL_USERS") as AdminCampaign["targetAudience"],
      specificUserIds: raw.specificUserIds,
      totalUsageLimit: raw.totalUsageLimit,
      perUserUsageLimit: raw.perUserUsageLimit,
      usedCount: raw.usedCount || 0,
      startDate: raw.startDate
        ? formatDayLabel(raw.startDate)
        : createdAtFormatted,
      endDate: raw.endDate ? formatDayLabel(raw.endDate) : createdAtFormatted,
      status: (raw.status || "ACTIVE") as AdminCampaign["status"],
      createdAt: createdAtFormatted,
      updatedAt: raw.updatedAt ? formatDayLabel(raw.updatedAt) : undefined,
    };
  },

  /**
   * دریافت لیست کمپین‌ها:
   * GET /platform-admin/campaigns
   */
  async getCampaigns(
    params: AdminListQueryParams = {},
    signal?: AbortSignal,
  ): Promise<AdminPaginatedResult<AdminCampaign>> {
    const {
      search = "",
      status = "all",
      discountType = "all",
      scopeType = "all",
      targetAudience = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    const queryPayload: Record<string, string | number> = {
      page,
      limit: Math.min(pageSize, 100),
    };
    if (search.trim()) queryPayload.search = search.trim();
    if (status && status !== "all") queryPayload.status = status;
    if (discountType && discountType !== "all")
      queryPayload.discountType = discountType;
    if (scopeType && scopeType !== "all") queryPayload.scopeType = scopeType;

    const response = await apiClient.get<any>(
      ENDPOINTS.platformAdmin.campaigns,
      {
        query: queryPayload,
        signal,
      },
    );

    const resData = response.data;
    let rawArray: any[] = [];
    if (Array.isArray(resData)) rawArray = resData;
    else if (resData && typeof resData === "object") {
      if (Array.isArray(resData.data)) rawArray = resData.data;
      else if (Array.isArray(resData.items)) rawArray = resData.items;
    }

    let items = rawArray.map((c) => adminService.mapRawCampaignToAdmin(c));

    if (targetAudience && targetAudience !== "all") {
      items = items.filter((c) => c.targetAudience === targetAudience);
    }

    items.sort((a, b) => {
      const valA =
        (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB =
        (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });

    const total = response.meta?.pagination?.total ?? items.length;
    const totalPages =
      response.meta?.pagination?.totalPages ??
      (Math.ceil(total / pageSize) || 1);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getCampaignById(
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminCampaign | null> {
    try {
      const response = await apiClient.get<any>(
        ENDPOINTS.platformAdmin.campaignById(id),
        { signal },
      );
      const resData = response.data?.data || response.data;
      if (resData && typeof resData === "object") {
        return adminService.mapRawCampaignToAdmin(resData);
      }
    } catch {
      // Fallback to searching list
    }

    try {
      const listRes = await adminService.getCampaigns({ pageSize: 100 }, signal);
      return listRes.items.find((c) => c.id === id) || null;
    } catch {
      return null;
    }
  },

  /**
   * ایجاد کمپین طبق CreatePlatformCampaignInput در openapi.json
   */
  async createCampaign(input: AdminCampaignInput): Promise<AdminCampaign> {
    const payload = {
      title: input.title.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description,
      discountType: input.discountType,
      discountValue: Number(input.discountValue),
      maxDiscountAmount: input.maxDiscountAmount
        ? Number(input.maxDiscountAmount)
        : undefined,
      minOrderAmount: input.minOrderAmount
        ? Number(input.minOrderAmount)
        : undefined,
      scopeType: input.scopeType,
      applicableGamecenterIds: input.applicableGamecenterIds,
      applicableDeviceTypes: input.applicableDeviceTypes,
      targetAudience: input.targetAudience,
      specificUserIds: input.specificUserIds,
      totalUsageLimit: input.totalUsageLimit,
      perUserUsageLimit: input.perUserUsageLimit,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: input.status || "ACTIVE",
    };

    const response = await apiClient.post<any>(
      ENDPOINTS.platformAdmin.campaigns,
      payload,
    );
    const resData = response.data?.data || response.data;
    if (!resData || typeof resData !== "object") {
      throw new Error("پاسخ معتبری از سرور برای ایجاد کمپین دریافت نشد.");
    }
    return adminService.mapRawCampaignToAdmin({ ...resData, ...input });
  },

  /**
   * به‌روزرسانی کمپین طبق UpdatePlatformCampaignInput در openapi.json
   */
  async updateCampaign(
    id: string,
    input: Partial<AdminCampaignInput>,
  ): Promise<AdminCampaign> {
    const payload: Record<string, unknown> = {};
    if (input.title) payload.title = input.title;
    if (input.code) payload.code = input.code.trim().toUpperCase();
    if (input.description !== undefined)
      payload.description = input.description;
    if (input.discountType) payload.discountType = input.discountType;
    if (input.discountValue !== undefined)
      payload.discountValue = Number(input.discountValue);
    if (input.status) payload.status = input.status;

    const response = await apiClient.patch<any>(
      ENDPOINTS.platformAdmin.campaignById(id),
      payload,
    );
    const resData = response.data?.data || response.data;
    if (resData && typeof resData === "object") {
      return adminService.mapRawCampaignToAdmin(resData);
    }

    const refreshed = await adminService.getCampaignById(id);
    if (refreshed) return refreshed;

    return {
      id,
      title: input.title || "کمپین",
      code: (input.code || id).toUpperCase(),
      discountType: input.discountType || "PERCENTAGE",
      discountValue: input.discountValue || 10,
      scopeType: input.scopeType || "GLOBAL",
      targetAudience: input.targetAudience || "ALL_USERS",
      usedCount: 0,
      startDate: "-",
      endDate: "-",
      status: input.status || "ACTIVE",
      createdAt: "-",
    };
  },

  async toggleCampaignStatus(id: string): Promise<AdminCampaign> {
    const current = await this.getCampaignById(id);
    const newStatus = current?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return this.updateCampaign(id, { status: newStatus });
  },

  async deleteCampaign(id: string): Promise<boolean> {
    await apiClient.delete(ENDPOINTS.platformAdmin.campaignById(id));
    return true;
  },

  // ==================== SITE SETTINGS ====================

  /**
   * تبدیل تنظیمات سرور (PlatformSettingsWithInfrastructure یا PlatformSetting) به فرمت ساختاریافته UI (SiteSettings)
   */
  mapApiSettingsToUi(apiData: any): SiteSettings {
    const rawSettings = apiData?.settings || apiData || {};
    const rawInfra = apiData?.infrastructure || {};

    return {
      general: {
        siteTitle: toSafeText(rawSettings.siteTitle, ""),
        supportPhone: toSafeText(rawSettings.supportPhone, ""),
        supportEmail: toSafeText(rawSettings.supportEmail, ""),
        centralAddress: toSafeText(rawSettings.centralAddress, ""),
        maintenanceMode: Boolean(rawSettings.maintenanceMode),
        maintenanceMessage: toSafeText(rawSettings.maintenanceMessage, ""),
      },
      reservation: {
        platformCommissionPercent:
          typeof rawSettings.platformCommissionPercent === "number"
            ? rawSettings.platformCommissionPercent
            : 0,
        maxAdvanceBookingDays:
          typeof rawSettings.maxAdvanceBookingDays === "number"
            ? rawSettings.maxAdvanceBookingDays
            : 0,
        onlinePaymentTimeoutMinutes:
          typeof rawSettings.onlinePaymentTimeoutMinutes === "number"
            ? rawSettings.onlinePaymentTimeoutMinutes
            : 0,
        cancellationPenaltyPercent:
          typeof rawSettings.cancellationPenaltyPercent === "number"
            ? rawSettings.cancellationPenaltyPercent
            : 0,
        freeCancellationHours:
          typeof rawSettings.freeCancellationHours === "number"
            ? rawSettings.freeCancellationHours
            : 0,
      },
      notification: {
        autoSendBookingSms: Boolean(rawSettings.autoSendBookingSms),
        autoSendReminderSms: Boolean(rawSettings.autoSendReminderSms),
        welcomeSmsTemplate: toSafeText(rawSettings.welcomeSmsTemplate, ""),
        reviewApprovalPolicy:
          rawSettings.reviewApprovalPolicy === "MANUAL" ? "MANUAL" : "AUTO",
      },
      securityInfo: {
        smsGatewayConnected:
          rawInfra.smsGatewayStatus === "OPERATIONAL" ||
          rawInfra.smsGatewayStatus === "ACTIVE",
        smsGatewayProvider: toSafeText(rawInfra.smsProvider, "-"),
        paymentGatewayConnected:
          rawInfra.paymentGatewayStatus === "OPERATIONAL" ||
          rawInfra.paymentGatewayStatus === "ACTIVE",
        paymentGatewayProvider: toSafeText(rawInfra.paymentProvider, "-"),
        sslCertificateStatus: toSafeText(rawInfra.sslStatus, "-"),
        apiVersion: toSafeText(rawInfra.apiVersion, "-"),
        lastBackupDate: rawInfra.lastSuccessfulBackupAt
          ? formatDayLabel(String(rawInfra.lastSuccessfulBackupAt)) || "-"
          : "-",
      },
    };
  },

  /**
   * تبدیل تنظیمات UI به بدنه استاندارد UpdatePlatformSettingsInput طبق openapi.json
   */
  mapUiSettingsToApiInput(settings: SiteSettings): Record<string, unknown> {
    return {
      siteTitle: settings.general.siteTitle?.trim(),
      supportPhone: settings.general.supportPhone?.trim(),
      supportEmail: settings.general.supportEmail?.trim(),
      centralAddress: settings.general.centralAddress?.trim(),
      maintenanceMode: Boolean(settings.general.maintenanceMode),
      maintenanceMessage: settings.general.maintenanceMessage?.trim(),
      platformCommissionPercent: Number(
        settings.reservation.platformCommissionPercent,
      ),
      maxAdvanceBookingDays: Number(settings.reservation.maxAdvanceBookingDays),
      onlinePaymentTimeoutMinutes: Number(
        settings.reservation.onlinePaymentTimeoutMinutes,
      ),
      cancellationPenaltyPercent: Number(
        settings.reservation.cancellationPenaltyPercent,
      ),
      freeCancellationHours: Number(settings.reservation.freeCancellationHours),
      autoSendBookingSms: Boolean(settings.notification.autoSendBookingSms),
      autoSendReminderSms: Boolean(settings.notification.autoSendReminderSms),
      welcomeSmsTemplate: settings.notification.welcomeSmsTemplate?.trim(),
      reviewApprovalPolicy: settings.notification.reviewApprovalPolicy,
    };
  },

  /**
   * دریافت تنظیمات پلتفرم از طریق API رسمی:
   * GET /platform-admin/settings
   */
  async getSiteSettings(signal?: AbortSignal): Promise<SiteSettings> {
    const response = await apiClient.get<any>(
      ENDPOINTS.platformAdmin.settings,
      { signal },
    );
    const apiData = response.data?.data || response.data;
    if (!apiData || typeof apiData !== "object") {
      throw new Error("پاسخ معتبری برای تنظیمات سیستم از سرور دریافت نشد.");
    }
    return this.mapApiSettingsToUi(apiData);
  },

  /**
   * به‌روزرسانی تنظیمات پلتفرم با اعتبارسنجی و ارسال بدنه دقیق طبق schema:
   * PUT /platform-admin/settings
   */
  async updateSiteSettings(newSettings: SiteSettings): Promise<SiteSettings> {
    const payload = this.mapUiSettingsToApiInput(newSettings);
    const response = await apiClient.put<any>(
      ENDPOINTS.platformAdmin.settings,
      payload,
    );
    const apiData = response.data?.data || response.data;
    if (apiData && typeof apiData === "object") {
      return this.mapApiSettingsToUi({
        settings: apiData,
        infrastructure: {
          smsProvider: newSettings.securityInfo.smsGatewayProvider,
          paymentProvider: newSettings.securityInfo.paymentGatewayProvider,
          sslStatus: newSettings.securityInfo.sslCertificateStatus,
          apiVersion: newSettings.securityInfo.apiVersion,
        },
      });
    }
    return newSettings;
  },
};
