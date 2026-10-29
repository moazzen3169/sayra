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
  AdminAdRequest,
} from "@/types/admin";
import {
  ADMIN_DASHBOARD_MOCK_DATA,
  MOCK_ADMIN_GAMECENTERS,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_TICKETS,
  MOCK_CANNED_RESPONSES,
  MOCK_ADMIN_REVIEWS,
  MOCK_ADMIN_USER_RESERVATIONS,
  MOCK_ADMIN_OWNER_VERIFICATIONS,
  MOCK_ADMIN_AD_REQUESTS,
} from "@/lib/mocks/admin.mock";

// In-memory / LocalStorage state store for mock administrative data
let gamecentersStore: AdminGamecenter[] = [...MOCK_ADMIN_GAMECENTERS];
let usersStore: AdminUser[] = [...MOCK_ADMIN_USERS];
let ticketsStore: AdminTicket[] = [...MOCK_ADMIN_TICKETS];
let reviewsStore: AdminReview[] = [...MOCK_ADMIN_REVIEWS];
let reservationsStore: AdminUserReservation[] = [...MOCK_ADMIN_USER_RESERVATIONS];
let verificationsStore: AdminOwnerVerification[] = [...MOCK_ADMIN_OWNER_VERIFICATIONS];
let adRequestsStore: AdminAdRequest[] = [...MOCK_ADMIN_AD_REQUESTS];

// Load from localStorage on client side if available
if (typeof window !== "undefined") {
  try {
    const gcSaved = localStorage.getItem("sayra_admin_gamecenters");
    if (gcSaved) gamecentersStore = JSON.parse(gcSaved);

    const usrSaved = localStorage.getItem("sayra_admin_users");
    if (usrSaved) usersStore = JSON.parse(usrSaved);

    const tktSaved = localStorage.getItem("sayra_admin_tickets");
    if (tktSaved) ticketsStore = JSON.parse(tktSaved);

    const revSaved = localStorage.getItem("sayra_admin_reviews");
    if (revSaved) reviewsStore = JSON.parse(revSaved);

    const resSaved = localStorage.getItem("sayra_admin_reservations");
    if (resSaved) reservationsStore = JSON.parse(resSaved);

    const verifSaved = localStorage.getItem("sayra_admin_verifications");
    if (verifSaved) verificationsStore = JSON.parse(verifSaved);

    const adsSaved = localStorage.getItem("sayra_admin_ads");
    if (adsSaved) adRequestsStore = JSON.parse(adsSaved);
  } catch (e) {
    console.warn("Failed to load admin mock store from localStorage", e);
  }
}

function persistStore(key: string, data: unknown) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to persist admin store", e);
    }
  }
}

/**
 * Service for handling Admin Panel operations.
 * Operates purely with mock data isolated from presentation components.
 */
export const adminService = {
  /**
   * Retrieves dashboard summary metrics, trends, pending action items, and recent reservations.
   */
  async getDashboardData(): Promise<AdminDashboardData> {
    const updatedStats = ADMIN_DASHBOARD_MOCK_DATA.stats.map((s) => {
      if (s.id === "gamecenters_count") {
        return { ...s, value: String(gamecentersStore.length) };
      }
      if (s.id === "users_count") {
        return { ...s, value: String(usersStore.length) };
      }
      return s;
    });

    return Promise.resolve({
      ...ADMIN_DASHBOARD_MOCK_DATA,
      stats: updatedStats,
    });
  },

  // ==================== GAMECENTERS ====================

  async getGamecenters(
    params: AdminListQueryParams = {}
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

    let filtered = [...gamecentersStore];

    // Filter by Search (Name, Slug, Owner Name, Owner Phone)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (gc) =>
          gc.name.toLowerCase().includes(query) ||
          gc.slug.toLowerCase().includes(query) ||
          gc.ownerName.toLowerCase().includes(query) ||
          gc.ownerPhone.includes(query) ||
          gc.city.toLowerCase().includes(query)
      );
    }

    // Filter by Status
    if (status === "active") {
      filtered = filtered.filter((gc) => gc.isActive);
    } else if (status === "inactive") {
      filtered = filtered.filter((gc) => !gc.isActive);
    }

    // Filter by City
    if (city && city !== "all") {
      filtered = filtered.filter((gc) => gc.city === city);
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB = (b as unknown as Record<string, string | number>)[sortBy] ?? "";

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

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return Promise.resolve({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  },

  async getGamecenterById(id: string): Promise<AdminGamecenter | null> {
    const gc = gamecentersStore.find((item) => item.id === id || item.slug === id);
    return Promise.resolve(gc || null);
  },

  async createGamecenter(input: AdminGamecenterInput): Promise<AdminGamecenter> {
    const newId = `gc-${Date.now()}`;
    const newGc: AdminGamecenter = {
      id: newId,
      ...input,
      rating: 5.0,
      stationsCount: 0,
      createdAt: new Date().toLocaleDateString("fa-IR"),
    };

    gamecentersStore.unshift(newGc);
    persistStore("sayra_admin_gamecenters", gamecentersStore);
    return Promise.resolve(newGc);
  },

  async updateGamecenter(
    id: string,
    input: Partial<AdminGamecenterInput>
  ): Promise<AdminGamecenter> {
    const index = gamecentersStore.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("گیمنت مورد نظر یافت نشد.");
    }

    const updated: AdminGamecenter = {
      ...gamecentersStore[index],
      ...input,
      updatedAt: new Date().toLocaleDateString("fa-IR"),
    };

    gamecentersStore[index] = updated;
    persistStore("sayra_admin_gamecenters", gamecentersStore);
    return Promise.resolve(updated);
  },

  async toggleGamecenterStatus(id: string): Promise<AdminGamecenter> {
    const index = gamecentersStore.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("گیمنت مورد نظر یافت نشد.");
    }

    const updated: AdminGamecenter = {
      ...gamecentersStore[index],
      isActive: !gamecentersStore[index].isActive,
      updatedAt: new Date().toLocaleDateString("fa-IR"),
    };

    gamecentersStore[index] = updated;
    persistStore("sayra_admin_gamecenters", gamecentersStore);
    return Promise.resolve(updated);
  },

  async deleteGamecenter(id: string): Promise<boolean> {
    const initialLength = gamecentersStore.length;
    gamecentersStore = gamecentersStore.filter((item) => item.id !== id);
    if (gamecentersStore.length === initialLength) {
      throw new Error("گیمنت مورد نظر یافت نشد.");
    }

    persistStore("sayra_admin_gamecenters", gamecentersStore);
    return Promise.resolve(true);
  },

  // ==================== TICKETS ====================

  async getTickets(
    params: AdminListQueryParams = {}
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

    let filtered = [...ticketsStore];

    // Filter needing response (OPEN or PENDING)
    if (needingResponseOnly) {
      filtered = filtered.filter((t) => t.status === "OPEN" || t.status === "PENDING");
    }

    // Filter by Search (ID, Subject, User Name, Gamecenter Name, Reservation Code)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          (t.userName && t.userName.toLowerCase().includes(query)) ||
          (t.gamecenterName && t.gamecenterName.toLowerCase().includes(query)) ||
          (t.reservationCode && t.reservationCode.toLowerCase().includes(query))
      );
    }

    // Filter by Status
    if (status && status !== "all") {
      filtered = filtered.filter((t) => t.status === status);
    }

    // Filter by Sender Type (USER / OWNER)
    if (senderType && senderType !== "all") {
      filtered = filtered.filter((t) => (t.userRole || "USER") === senderType);
    }

    // Filter by Assigned Admin
    if (assignedAdminId && assignedAdminId !== "all") {
      if (assignedAdminId === "unassigned") {
        filtered = filtered.filter((t) => !t.assignedAdminId);
      } else {
        filtered = filtered.filter((t) => t.assignedAdminId === assignedAdminId);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB = (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      return 0;
    });

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return Promise.resolve({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  },

  async getTicketById(id: string): Promise<AdminTicket | null> {
    const t = ticketsStore.find((item) => item.id === id);
    return Promise.resolve(t || null);
  },

  async replyToTicket(
    ticketId: string,
    messageText: string,
    senderAdminId?: string
  ): Promise<AdminTicket> {
    const index = ticketsStore.findIndex((t) => t.id === ticketId);
    if (index === -1) {
      throw new Error("تیکت مورد نظر یافت نشد.");
    }

    const trimmed = messageText.trim();
    if (!trimmed) {
      throw new Error("متن پاسخ نمی‌تواند خالی باشد.");
    }

    const currentTicket = ticketsStore[index];
    const adminUser = usersStore.find((u) => u.id === senderAdminId) ||
      usersStore.find((u) => u.role === "ADMIN") || {
        id: "usr-8",
        fullName: "مدیر پشتیبانی سایرا",
      };

    const nowFormatted = new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const newMessage: AdminTicketMessage = {
      id: `msg-${ticketId}-${Date.now()}`,
      ticketId,
      senderId: adminUser.id,
      senderName: adminUser.fullName,
      senderRole: "ADMIN",
      message: trimmed,
      createdAt: nowFormatted,
    };

    const updatedMessages = [...(currentTicket.messages || []), newMessage];

    const updatedTicket: AdminTicket = {
      ...currentTicket,
      status: "ANSWERED",
      lastUpdate: nowFormatted,
      messagesCount: updatedMessages.length,
      messages: updatedMessages,
      assignedAdminId: currentTicket.assignedAdminId || adminUser.id,
      assignedAdminName: currentTicket.assignedAdminName || adminUser.fullName,
    };

    ticketsStore[index] = updatedTicket;
    persistStore("sayra_admin_tickets", ticketsStore);
    return Promise.resolve(updatedTicket);
  },

  async updateTicketStatus(
    ticketId: string,
    status: AdminTicket["status"]
  ): Promise<AdminTicket> {
    const index = ticketsStore.findIndex((t) => t.id === ticketId);
    if (index === -1) {
      throw new Error("تیکت مورد نظر یافت نشد.");
    }

    const nowFormatted = new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const updatedTicket: AdminTicket = {
      ...ticketsStore[index],
      status,
      lastUpdate: nowFormatted,
    };

    ticketsStore[index] = updatedTicket;
    persistStore("sayra_admin_tickets", ticketsStore);
    return Promise.resolve(updatedTicket);
  },

  async assignTicket(
    ticketId: string,
    adminId: string | null
  ): Promise<AdminTicket> {
    const index = ticketsStore.findIndex((t) => t.id === ticketId);
    if (index === -1) {
      throw new Error("تیکت مورد نظر یافت نشد.");
    }

    let adminName: string | undefined = undefined;
    if (adminId) {
      const adminUser = usersStore.find((u) => u.id === adminId && u.role === "ADMIN");
      if (!adminUser) {
        throw new Error("کاربر مدیریتی یافت نشد.");
      }
      adminName = adminUser.fullName;
    }

    const nowFormatted = new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const updatedTicket: AdminTicket = {
      ...ticketsStore[index],
      assignedAdminId: adminId || undefined,
      assignedAdminName: adminName,
      lastUpdate: nowFormatted,
    };

    ticketsStore[index] = updatedTicket;
    persistStore("sayra_admin_tickets", ticketsStore);
    return Promise.resolve(updatedTicket);
  },

  async getCannedResponses(): Promise<CannedResponse[]> {
    return Promise.resolve(MOCK_CANNED_RESPONSES);
  },

  async getAdmins(): Promise<AdminUser[]> {
    const admins = usersStore.filter((u) => u.role === "ADMIN");
    return Promise.resolve(admins);
  },

  async getGamecenterTickets(gamecenterId: string): Promise<AdminTicket[]> {
    const items = ticketsStore.filter((t) => t.gamecenterId === gamecenterId);
    return Promise.resolve(items);
  },

  async getGamecenterReviews(gamecenterId: string): Promise<AdminReview[]> {
    const items = reviewsStore.filter((r) => r.gamecenterId === gamecenterId);
    return Promise.resolve(items);
  },

  async getGamecenterReservations(gamecenterId: string): Promise<AdminUserReservation[]> {
    const items = reservationsStore.filter((r) => r.gamecenterId === gamecenterId);
    return Promise.resolve(items);
  },

  // ==================== USERS ====================

  async getUsers(
    params: AdminListQueryParams = {}
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

    let filtered = [...usersStore];

    // Filter by Search (Name, Phone, Email, National ID)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.phone.includes(query) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.nationalId && u.nationalId.includes(query))
      );
    }

    // Filter by Status
    if (status === "active") {
      filtered = filtered.filter((u) => u.isActive);
    } else if (status === "inactive") {
      filtered = filtered.filter((u) => !u.isActive);
    }

    // Filter by Role
    if (role && role !== "all") {
      filtered = filtered.filter((u) => u.role === role);
    }

    // Sort
    filtered.sort((a, b) => {
      let valA = (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      let valB = (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      return 0;
    });

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return Promise.resolve({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  },

  async getUserById(id: string): Promise<AdminUser | null> {
    const usr = usersStore.find((u) => u.id === id);
    return Promise.resolve(usr || null);
  },

  async createUser(input: AdminUserInput): Promise<AdminUser> {
    const newId = `usr-${Date.now()}`;
    const newUser: AdminUser = {
      id: newId,
      ...input,
      createdAt: new Date().toLocaleDateString("fa-IR"),
    };

    usersStore.unshift(newUser);
    persistStore("sayra_admin_users", usersStore);
    return Promise.resolve(newUser);
  },

  async updateUser(id: string, input: Partial<AdminUserInput>): Promise<AdminUser> {
    const index = usersStore.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error("کاربر مورد نظر یافت نشد.");
    }

    const updated: AdminUser = {
      ...usersStore[index],
      ...input,
      updatedAt: new Date().toLocaleDateString("fa-IR"),
    };

    usersStore[index] = updated;
    persistStore("sayra_admin_users", usersStore);
    return Promise.resolve(updated);
  },

  async toggleUserStatus(id: string): Promise<AdminUser> {
    const index = usersStore.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error("کاربر مورد نظر یافت نشد.");
    }

    const updated: AdminUser = {
      ...usersStore[index],
      isActive: !usersStore[index].isActive,
      updatedAt: new Date().toLocaleDateString("fa-IR"),
    };

    usersStore[index] = updated;
    persistStore("sayra_admin_users", usersStore);
    return Promise.resolve(updated);
  },

  async deleteUser(id: string): Promise<boolean> {
    const initialLength = usersStore.length;
    usersStore = usersStore.filter((u) => u.id !== id);
    if (usersStore.length === initialLength) {
      throw new Error("کاربر مورد نظر یافت نشد.");
    }

    persistStore("sayra_admin_users", usersStore);
    return Promise.resolve(true);
  },

  async getUserReservations(userId: string): Promise<AdminUserReservation[]> {
    const items = reservationsStore.filter((r) => r.userId === userId);
    return Promise.resolve(items);
  },

  async getUserTickets(userId: string): Promise<AdminTicket[]> {
    const items = ticketsStore.filter((t) => t.userId === userId);
    return Promise.resolve(items);
  },

  async getUserReviews(userId: string): Promise<AdminReview[]> {
    const items = reviewsStore.filter((r) => r.userId === userId);
    return Promise.resolve(items);
  },

  // ==================== OWNER VERIFICATION ====================

  async getOwnerVerifications(
    params: AdminListQueryParams = {}
  ): Promise<AdminPaginatedResult<AdminOwnerVerification>> {
    const {
      search = "",
      status = "all",
      city = "all",
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    let filtered = [...verificationsStore];

    // Filter by Search (Owner Name, Gamecenter Name, Phone, National ID)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.ownerName.toLowerCase().includes(query) ||
          v.gamecenterName.toLowerCase().includes(query) ||
          v.ownerPhone.includes(query) ||
          v.ownerNationalId.includes(query) ||
          v.gamecenterCity.toLowerCase().includes(query)
      );
    }

    // Filter by Status
    if (status && status !== "all") {
      filtered = filtered.filter((v) => v.status === status);
    }

    // Filter by City
    if (city && city !== "all") {
      filtered = filtered.filter((v) => v.gamecenterCity === city);
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB = (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      return 0;
    });

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return Promise.resolve({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  },

  async getOwnerVerificationById(id: string): Promise<AdminOwnerVerification | null> {
    const item = verificationsStore.find((v) => v.id === id);
    return Promise.resolve(item || null);
  },

  async updateOwnerVerificationStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    reason?: string,
    adminName: string = "مدیر پشتیبانی سایرا"
  ): Promise<AdminOwnerVerification> {
    const index = verificationsStore.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new Error("درخواست احراز هویت مورد نظر یافت نشد.");
    }

    const current = verificationsStore[index];
    const isModification = current.status !== "PENDING" && current.status !== status;
    const nowFormatted = new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const newLog = {
      id: `log-${Date.now()}`,
      adminName,
      action: isModification ? ("MODIFIED" as const) : status,
      note: reason || (status === "APPROVED" ? "درخواست احراز هویت تأیید شد." : "درخواست احراز هویت رد شد."),
      date: nowFormatted,
    };

    const updated: AdminOwnerVerification = {
      ...current,
      status,
      rejectionReason: status === "REJECTED" ? reason : undefined,
      updatedAt: nowFormatted,
      reviewLogs: [newLog, ...(current.reviewLogs || [])],
    };

    verificationsStore[index] = updated;
    persistStore("sayra_admin_verifications", verificationsStore);
    return Promise.resolve(updated);
  },

  // ==================== ADVERTISING REQUESTS ====================

  async getAdRequests(
    params: AdminListQueryParams = {}
  ): Promise<AdminPaginatedResult<AdminAdRequest>> {
    const {
      search = "",
      status = "all",
      sortBy = "submittedAt",
      sortOrder = "desc",
      page = 1,
      pageSize = 10,
    } = params;

    let filtered = [...adRequestsStore];

    // Filter by Search (Title, Description, Gamecenter Name, Owner Name, Owner Phone)
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (ad) =>
          ad.title.toLowerCase().includes(query) ||
          ad.description.toLowerCase().includes(query) ||
          ad.gamecenterName.toLowerCase().includes(query) ||
          ad.ownerName.toLowerCase().includes(query) ||
          ad.ownerPhone.includes(query)
      );
    }

    // Filter by Status
    if (status && status !== "all") {
      filtered = filtered.filter((ad) => ad.status === status);
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = (a as unknown as Record<string, string | number>)[sortBy] ?? "";
      const valB = (b as unknown as Record<string, string | number>)[sortBy] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "fa")
          : valB.localeCompare(valA, "fa");
      }

      return 0;
    });

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return Promise.resolve({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  },

  async updateAdRequestStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    decisionReason?: string
  ): Promise<AdminAdRequest> {
    const index = adRequestsStore.findIndex((ad) => ad.id === id);
    if (index === -1) {
      throw new Error("درخواست تبلیغ مورد نظر یافت نشد.");
    }

    const nowFormatted = new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

    const updated: AdminAdRequest = {
      ...adRequestsStore[index],
      status,
      decisionReason,
      updatedAt: nowFormatted,
    };

    adRequestsStore[index] = updated;
    persistStore("sayra_admin_ads", adRequestsStore);
    return Promise.resolve(updated);
  },
};
