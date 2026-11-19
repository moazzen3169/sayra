import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";
import { adminService } from "./adminService";
import { clearAdminTokens, clearTokens, setAdminTokens, setTokens } from "@/lib/token";

describe("Gaming Center KYC Verification Flow (OpenAPI v1.0)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearTokens();
    clearAdminTokens();
    setTokens("owner-access-token", "owner-refresh-token");
    setAdminTokens("admin-access-token", "admin-refresh-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearTokens();
    clearAdminTokens();
  });

  it("fetches gaming center verification status via GET /gamingCenters/{id}/verification", async () => {
    let capturedUrl = "";
    let capturedMethod = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "GET";
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            gamingCenterId: "gc_123",
            name: "گیم نت شتاب",
            verificationStatus: "REJECTED",
            verifiedAt: null,
            rejectionReason: "تصویر پروانه کسب تار است",
            latestVerification: {
              id: "ver_1",
              gamingCenterId: "gc_123",
              ownerFullName: "علی رضایی",
              phoneNumber: "09123456789",
              gamingCenterName: "گیم نت شتاب",
              businessLicenseUrl: "/uploads/licenses/license.jpg",
              status: "REJECTED",
              rejectionReason: "تصویر پروانه کسب تار است",
              reviewedAt: "2026-11-19T12:00:00.000Z",
              createdAt: "2026-11-19T10:00:00.000Z",
              updatedAt: "2026-11-19T12:00:00.000Z",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await ownerService.getVerificationStatus("gc_123");

    expect(capturedMethod).toBe("GET");
    expect(capturedUrl).toContain("/gamingCenters/gc_123/verification");
    expect(res.verificationStatus).toBe("REJECTED");
    expect(res.rejectionReason).toBe("تصویر پروانه کسب تار است");
    expect(res.latestVerification?.ownerFullName).toBe("علی رضایی");
    expect(res.latestVerification?.businessLicenseUrl).toContain("/uploads/licenses/license.jpg");
  });

  it("submits verification FormData via POST /gamingCenters/{id}/verification", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: FormData | null = null;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "GET";
      capturedBody = init?.body instanceof FormData ? init.body : null;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            verificationId: "ver_2",
            gamingCenterId: "gc_123",
            status: "PENDING",
            ownerFullName: "علی رضایی",
            phoneNumber: "09123456789",
            gamingCenterName: "گیم نت شتاب",
            businessLicenseUrl: "/uploads/licenses/new.png",
            message: "درخواست احراز هویت با موفقیت ثبت شد",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const fakeFile = new File(["dummy-image"], "license.png", { type: "image/png" });
    const result = await ownerService.submitVerification("gc_123", {
      ownerFullName: "علی رضایی",
      phoneNumber: "۰۹۱۲۳۴۵۶۷۸۹",
      gamingCenterName: "گیم نت شتاب",
      businessLicense: fakeFile,
    });

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toContain("/gamingCenters/gc_123/verification");
    expect(capturedBody).not.toBeNull();
    expect(capturedBody?.get("ownerFullName")).toBe("علی رضایی");
    expect(capturedBody?.get("phoneNumber")).toBe("09123456789");
    expect(capturedBody?.get("gamingCenterName")).toBe("گیم نت شتاب");
    expect(capturedBody?.get("businessLicense")).toBeInstanceOf(File);
    expect(result.status).toBe("PENDING");
    expect(result.verificationId).toBe("ver_2");
  });

  it("rejects invalid phone or oversized license before submitting", async () => {
    const smallFile = new File(["ok"], "ok.png", { type: "image/png" });

    await expect(
      ownerService.submitVerification("gc_123", {
        ownerFullName: "علی رضایی",
        phoneNumber: "12345",
        gamingCenterName: "گیم نت شتاب",
        businessLicense: smallFile,
      })
    ).rejects.toThrow();

    const oversizedFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });

    await expect(
      ownerService.submitVerification("gc_123", {
        ownerFullName: "علی رضایی",
        phoneNumber: "09123456789",
        gamingCenterName: "گیم نت شتاب",
        businessLicense: oversizedFile,
      })
    ).rejects.toThrow();
  });

  it("lists platform admin verifications via GET /platform-admin/verifications", async () => {
    let capturedUrl = "";

    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: "ver_10",
              gamingCenterId: "gc_10",
              ownerFullName: "سارا احمدی",
              phoneNumber: "09120001122",
              gamingCenterName: "آرنا کلاب",
              businessLicenseUrl: "/uploads/licenses/arena.jpg",
              status: "PENDING",
              createdAt: "2026-11-19T08:00:00.000Z",
              updatedAt: "2026-11-19T08:00:00.000Z",
            },
          ],
          meta: {
            pagination: {
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const list = await adminService.getOwnerVerifications({
      status: "PENDING",
      page: 1,
      pageSize: 20,
    });

    expect(capturedUrl).toContain("/platform-admin/verifications");
    expect(capturedUrl).toContain("status=PENDING");
    expect(list.items.length).toBe(1);
    expect(list.items[0].ownerName).toBe("سارا احمدی");
    expect(list.items[0].gamecenterName).toBe("آرنا کلاب");
    expect(list.items[0].verificationData.documents.length).toBe(1);
  });

  it("approves and rejects verifications via platform-admin endpoints", async () => {
    const calls: Array<{ url: string; method: string; body: Record<string, unknown> | undefined }> = [];

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      const method = init?.method || "GET";
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ url: urlStr, method, body });

      if (urlStr.endsWith("/approve")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { status: "APPROVED", gamingCenterId: "gc_10" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.endsWith("/reject")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: "REJECTED",
              gamingCenterId: "gc_10",
              rejectionReason: body?.rejectionReason,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "ver_10",
            gamingCenterId: "gc_10",
            ownerFullName: "سارا احمدی",
            phoneNumber: "09120001122",
            gamingCenterName: "آرنا کلاب",
            businessLicenseUrl: "/uploads/licenses/arena.jpg",
            status: calls.some((c) => c.url.endsWith("/reject"))
              ? "REJECTED"
              : "APPROVED",
            rejectionReason: calls.some((c) => c.url.endsWith("/reject"))
              ? "تصویر ناخوانا است"
              : null,
            createdAt: "2026-11-19T08:00:00.000Z",
            updatedAt: "2026-11-19T09:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const approved = await adminService.updateOwnerVerificationStatus(
      "ver_10",
      "APPROVED"
    );
    expect(calls[0].url).toContain("/platform-admin/verifications/ver_10/approve");
    expect(calls[0].method).toBe("POST");
    expect(approved.status).toBe("APPROVED");

    await expect(
      adminService.updateOwnerVerificationStatus("ver_10", "REJECTED", "ab")
    ).rejects.toThrow();

    const rejected = await adminService.updateOwnerVerificationStatus(
      "ver_10",
      "REJECTED",
      "تصویر ناخوانا است"
    );
    const rejectCall = calls.find((c) => c.url.endsWith("/reject"));
    expect(rejectCall?.method).toBe("POST");
    expect(rejectCall?.body).toEqual({ rejectionReason: "تصویر ناخوانا است" });
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("تصویر ناخوانا است");
  });
});
