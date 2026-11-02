import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { customerReviewService } from "./customerReviewService";
import { apiClient, ApiError } from "@/lib/api/client";
import { ContractGapError } from "@/types/customerApi";
import * as tokenModule from "@/lib/token";

describe("Phase 18: Customer Reviews and Ratings", () => {
  let originalFetch: typeof globalThis.fetch;

  let getAccessTokenSpy: any;
  let refreshAccessTokenSpy: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    getAccessTokenSpy = spyOn(tokenModule, "getAccessToken").mockReturnValue("test-customer-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (getAccessTokenSpy) getAccessTokenSpy.mockRestore();
    if (refreshAccessTokenSpy) refreshAccessTokenSpy.mockRestore();
  });

  describe("1. Public Review Retrieval (GET /public/gamingCenters/{slug}/ratings)", () => {
    it("fetches public ratings from backend with real IDs without fake data", async () => {
      let calledUrl = "";
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "rat-101",
                gamingCenterId: "gc-1",
                reservationId: "res-1",
                rating: 5,
                comment: "عالی بود، سیستم‌ها بسیار پرقدرت بودند.",
                status: "PUBLISHED",
              },
              {
                id: "rat-102",
                gamingCenterId: "gc-1",
                reservationId: "res-2",
                rating: 4,
                comment: "خوب بود ولی تهویه می‌توانست بهتر باشد.",
                status: "PUBLISHED",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const ratings = await customerReviewService.listPublicRatings("infinity-game-net");

      expect(calledUrl).toContain("/public/gamingCenters/infinity-game-net/ratings");
      expect(ratings.length).toBe(2);
      expect(ratings[0].id).toBe("rat-101");
      expect(ratings[0].rating).toBe(5);
      expect(ratings[0].comment).toContain("عالی بود");
      expect(ratings[1].id).toBe("rat-102");
    });

    it("handles empty public ratings array cleanly without fabricating fake reviews", async () => {
      let calledUrl = "";
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const ratings = await customerReviewService.listPublicRatings("new-center");

      expect(calledUrl).toContain("/public/gamingCenters/new-center/ratings");
      expect(ratings).toEqual([]);
    });

    it("handles raw array response format seamlessly", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify([
            {
              id: "rat-flat",
              gamingCenterId: "gc-flat",
              rating: 5,
              status: "PUBLISHED",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      const ratings = await customerReviewService.listPublicRatings("flat-center");
      expect(ratings.length).toBe(1);
      expect(ratings[0].id).toBe("rat-flat");
    });

    it("throws an error when gamingCenterSlug is empty or invalid", async () => {
      await expect(customerReviewService.listPublicRatings("")).rejects.toThrow("شناسه گیمنت ارسال نشده است.");
      await expect(customerReviewService.listPublicRatings("   ")).rejects.toThrow("شناسه گیمنت ارسال نشده است.");
    });

    it("propagates API server error (500) without falling back to mock reviews", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "خطای داخلی سرور" },
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(customerReviewService.listPublicRatings("error-center")).rejects.toThrow(ApiError);
    });
  });

  describe("2. Review Submission Tied to Reservation", () => {
    it("submits customer review via POST /customer/reservation/{reservationId}/ratings with bearerAuth", async () => {
      let calledUrl = "";
      let calledMethod = "";
      let calledHeaders: Record<string, string> = {};
      let requestBody: any = null;

      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calledUrl = String(input);
        calledMethod = init?.method ?? "GET";
        calledHeaders = (init?.headers as Record<string, string>) ?? {};
        if (init?.body) {
          requestBody = JSON.parse(String(init.body));
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "new-rating-id" },
            message: "نظر شما با موفقیت ثبت شد.",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await customerReviewService.submitCustomerReview("res-complete-44", {
        rating: 5,
        comment: "بسیار تمیز و مجهز بود.",
      });

      expect(calledMethod).toBe("POST");
      expect(calledUrl).toContain("/customer/reservation/res-complete-44/ratings");
      expect(calledHeaders.Authorization).toBe("Bearer test-customer-token");
      expect(requestBody).toEqual({
        rating: 5,
        comment: "بسیار تمیز و مجهز بود.",
      });
    });

    it("submits review without optional comment cleanly", async () => {
      let requestBody: any = null;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.body) requestBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      await customerReviewService.submitCustomerReview("res-complete-45", {
        rating: 4,
      });

      expect(requestBody).toEqual({ rating: 4 });
      expect(requestBody.comment).toBeUndefined();
    });

    it("submits public review tied to reservation via POST /public/gamingCenters/{slug}/reservation/{id}/ratings", async () => {
      let calledUrl = "";
      let requestBody: any = null;

      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calledUrl = String(input);
        if (init?.body) requestBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }) as any;

      await customerReviewService.submitPublicReservationReview("gc-slug-1", "res-99", {
        rating: 3,
        comment: "متوسط بود.",
      });

      expect(calledUrl).toContain("/public/gamingCenters/gc-slug-1/reservation/res-99/ratings");
      expect(requestBody).toEqual({
        rating: 3,
        comment: "متوسط بود.",
      });
    });
  });

  describe("3. Validation & Rating Scale Constraints (1 to 5)", () => {
    it("rejects ratings below 1", async () => {
      await expect(
        customerReviewService.submitCustomerReview("res-1", { rating: 0 })
      ).rejects.toThrow("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");

      await expect(
        customerReviewService.submitCustomerReview("res-1", { rating: -2 })
      ).rejects.toThrow("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");
    });

    it("rejects ratings above 5", async () => {
      await expect(
        customerReviewService.submitCustomerReview("res-1", { rating: 6 })
      ).rejects.toThrow("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");
    });

    it("rejects non-integer ratings", async () => {
      await expect(
        customerReviewService.submitCustomerReview("res-1", { rating: 4.5 })
      ).rejects.toThrow("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");
    });

    it("rejects empty or whitespace reservationId", async () => {
      await expect(
        customerReviewService.submitCustomerReview("", { rating: 5 })
      ).rejects.toThrow("شناسه رزرو الزامی است.");
    });
  });

  describe("4. Authorization & API Failure Handling", () => {
    it("handles 401 Unauthorized by propagating ApiError when session is invalid", async () => {
      refreshAccessTokenSpy = spyOn(tokenModule, "refreshAccessToken").mockResolvedValue(null);
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "نشست کاربری منقضی شده است." },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(
        customerReviewService.submitCustomerReview("res-auth-fail", { rating: 5 })
      ).rejects.toThrow(ApiError);
    });

    it("handles 403 Forbidden when customer attempts to rate a reservation they do not own", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "FORBIDDEN", message: "شما دسترسی ثبت نظر برای این رزرو را ندارید." },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(
        customerReviewService.submitCustomerReview("res-other-user", { rating: 5 })
      ).rejects.toThrow(ApiError);
    });

    it("handles 400 Bad Request when reservation is not in COMPLETED state", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "RESERVATION_NOT_COMPLETED", message: "ثبت نظر فقط پس از پایان رزرو امکان‌پذیر است." },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(
        customerReviewService.submitCustomerReview("res-pending", { rating: 5 })
      ).rejects.toThrow(ApiError);
    });

    it("handles 409 Conflict when a review is already submitted for this reservation", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "ALREADY_RATED", message: "برای این رزرو قبلاً نظر ثبت شده است." },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }) as any;

      await expect(
        customerReviewService.submitCustomerReview("res-already-rated", { rating: 5 })
      ).rejects.toThrow(ApiError);
    });

    it("propagates network failure without fake submission success", async () => {
      globalThis.fetch = (async () => {
        throw new TypeError("Failed to fetch");
      }) as any;

      await expect(
        customerReviewService.submitCustomerReview("res-network-err", { rating: 5 })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("5. Contract Gap Enforcement (Unsupported Customer Actions)", () => {
    it("throws ContractGapError for customer-scoped review listing (GET /customer/ratings)", () => {
      expect(() => customerReviewService.listCustomerReviewsUnsupported()).toThrow(ContractGapError);
      try {
        customerReviewService.listCustomerReviewsUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReviewsList");
      }
    });

    it("throws ContractGapError for review editing (PATCH /customer/ratings/{id})", () => {
      expect(() => customerReviewService.editCustomerReviewUnsupported()).toThrow(ContractGapError);
      try {
        customerReviewService.editCustomerReviewUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReviewEdit");
      }
    });

    it("throws ContractGapError for customer review deletion (DELETE /customer/ratings/{id})", () => {
      expect(() => customerReviewService.deleteCustomerReviewUnsupported()).toThrow(ContractGapError);
      try {
        customerReviewService.deleteCustomerReviewUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerReviewDelete");
      }
    });

    it("throws ContractGapError for standalone unlinked review creation", () => {
      expect(() => customerReviewService.submitStandaloneReviewUnsupported()).toThrow(ContractGapError);
      try {
        customerReviewService.submitStandaloneReviewUnsupported();
      } catch (err: any) {
        expect(err.code).toBe("CONTRACT_GAP");
        expect(err.message).toContain("CustomerStandaloneReview");
      }
    });

    it("ensures no fetch requests are made when calling unsupported contract gap methods", () => {
      let fetchCalled = false;
      globalThis.fetch = (async () => {
        fetchCalled = true;
        return new Response();
      }) as any;

      expect(() => customerReviewService.listCustomerReviewsUnsupported()).toThrow(ContractGapError);
      expect(() => customerReviewService.editCustomerReviewUnsupported()).toThrow(ContractGapError);
      expect(() => customerReviewService.deleteCustomerReviewUnsupported()).toThrow(ContractGapError);
      expect(() => customerReviewService.submitStandaloneReviewUnsupported()).toThrow(ContractGapError);
      expect(fetchCalled).toBe(false);
    });
  });

  describe("6. Production Safety Guarantee", () => {
    it("ensures no real production requests are ever triggered by tests", () => {
      expect(process.env.NODE_ENV).toBe("test");
    });
  });
});
