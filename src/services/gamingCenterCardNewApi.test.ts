import { describe, it, expect } from "bun:test";
import {
  mapPublicGamingCenterToListItem,
  resolveCenterCoverImage,
  gamecentersPageService,
} from "./gamecentersPageService";
import { PublicGamingCenter } from "@/types/customerApi";
import { normalizeMediaUrl, getMediaBaseOrigin } from "@/lib/media";

describe("Updated Gaming Center Card API Structure & Mapping", () => {
  const baseOrigin = getMediaBaseOrigin();

  it("extracts coverImageUrl when present", () => {
    const raw: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیمنت صدف",
      slug: "sadaf-game",
      coverImageUrl: "/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg",
    };

    const imageUrl = resolveCenterCoverImage(raw);
    expect(imageUrl).toBe(`${baseOrigin}/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg`);

    const item = mapPublicGamingCenterToListItem(raw);
    expect(item.imageUrl).toBe(`${baseOrigin}/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg`);
  });

  it("extracts first item of coverImages array when coverImageUrl is absent", () => {
    const raw: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیمنت مدرن",
      slug: "modern-game",
      coverImages: [
        "/uploads/5a799585-d6c2-4b10-ac4d-4cd0b489f61b.jpg",
        "/uploads/1b14841b-f7d1-4ae2-8fa4-000f30a594fe.jpg",
      ],
    };

    const imageUrl = resolveCenterCoverImage(raw);
    expect(imageUrl).toBe(`${baseOrigin}/uploads/5a799585-d6c2-4b10-ac4d-4cd0b489f61b.jpg`);

    const item = mapPublicGamingCenterToListItem(raw);
    expect(item.imageUrl).toBe(`${baseOrigin}/uploads/5a799585-d6c2-4b10-ac4d-4cd0b489f61b.jpg`);
    expect(item.coverImages).toHaveLength(2);
  });

  it("extracts banner when coverImageUrl and coverImages are absent", () => {
    const raw: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیمنت آریا",
      slug: "arya-game",
      banner: "/uploads/banner-123.jpg",
    };

    const imageUrl = resolveCenterCoverImage(raw);
    expect(imageUrl).toBe(`${baseOrigin}/uploads/banner-123.jpg`);

    const item = mapPublicGamingCenterToListItem(raw);
    expect(item.imageUrl).toBe(`${baseOrigin}/uploads/banner-123.jpg`);
  });

  it("falls back to default image when cover fields are null or empty", () => {
    const raw: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیمنت بدون تصویر",
      slug: "no-image-game",
      coverImageUrl: null,
      coverImages: [],
      banner: "",
    };

    const imageUrl = resolveCenterCoverImage(raw);
    expect(imageUrl).toBe("/img/gamnet-1.webp");

    const item = mapPublicGamingCenterToListItem(raw);
    expect(item.imageUrl).toBe("/img/gamnet-1.webp");
  });

  it("maps complete new API response structure with discount pricing", () => {
    const rawCenter: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیم‌نت المپیک",
      isActive: true,
      slug: "olympic-game",
      description: "مرکز بازی‌های رایانه‌ای",
      pcCount: 20,
      consoleCount: 10,
      ps4: true,
      ps5: true,
      pc: true,
      xbox: false,
      is_open: true,
      hourlyRate: 150000,
      raiting: 4.8,
      comment_count: 35,
      createdAt: "2026-11-05T17:39:26.057Z",
      updatedAt: "2026-11-05T17:39:26.057Z",
      addresses: [
        {
          id: "addr-1",
          city: "تهران",
          addressLine: "خیابان ولیعصر، پلاک ۱۰",
          isPrimary: true,
        },
      ],
      hasDiscount: true,
      has_discount: true,
      coverImages: [
        "/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg",
        "/uploads/5a799585-d6c2-4b10-ac4d-4cd0b489f61b.jpg",
      ],
      coverImageUrl: "/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg",
      banner: "/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg",
      pricing: {
        originalPrice: 150000,
        discountPercentage: 20,
        discountAmount: 30000,
        finalPrice: 120000,
        hasDiscount: true,
      },
      deviceCounts: {
        PC: 20,
        PLAYSTATION: 10,
        XBOX: 0,
        SWITCH: 0,
        VR: 0,
      },
    };

    const item = mapPublicGamingCenterToListItem(rawCenter);

    expect(item.id).toBe("olympic-game");
    expect(item.name).toBe("گیم‌نت المپیک");
    expect(item.imageUrl).toBe(`${baseOrigin}/uploads/ca859088-0bf1-4800-b79a-a15c53907a8f.jpg`);
    expect(item.hourlyPrice).toBe(150000);
    expect(item.discountedHourlyPrice).toBe(120000);
    expect(item.discountPercent).toBe(20);
    expect(item.isDiscounted).toBe(true);
    expect(item.discount).toEqual({
      valueType: "PERCENTAGE",
      value: 20,
    });
    expect(item.rating).toBe(4.8);
    expect(item.reviewsCount).toBe(35);
    expect(item.city).toBe("تهران");
    expect(item.location).toBe("خیابان ولیعصر، پلاک ۱۰");
  });

  it("handles pricing when hasDiscount is false", () => {
    const rawCenter: PublicGamingCenter = {
      id: "cmw3tyl7t004f123lkzaskrgy",
      name: "گیم‌نت بدون تخفیف",
      slug: "no-discount-center",
      hourlyRate: 100000,
      hasDiscount: false,
      has_discount: false,
      coverImageUrl: "/uploads/cover.jpg",
      pricing: {
        originalPrice: 100000,
        discountPercentage: 0,
        discountAmount: 0,
        finalPrice: 100000,
        hasDiscount: false,
      },
    };

    const item = mapPublicGamingCenterToListItem(rawCenter);

    expect(item.hourlyPrice).toBe(100000);
    expect(item.discountedHourlyPrice).toBeUndefined();
    expect(item.discountPercent).toBeUndefined();
    expect(item.discount).toBeUndefined();
    expect(item.isDiscounted).toBe(false);
  });

  it("filters discounted centers correctly via gamecentersPageService.getDiscountedCenters", () => {
    const centerWithDiscount: PublicGamingCenter = {
      id: "gc-discounted",
      name: "تخفیف‌دار",
      slug: "gc-discounted",
      hasDiscount: true,
      pricing: {
        originalPrice: 200000,
        discountPercentage: 15,
        finalPrice: 170000,
        hasDiscount: true,
      },
    };

    const centerWithoutDiscount: PublicGamingCenter = {
      id: "gc-normal",
      name: "عادی",
      slug: "gc-normal",
      hasDiscount: false,
      pricing: {
        originalPrice: 200000,
        discountPercentage: 0,
        finalPrice: 200000,
        hasDiscount: false,
      },
    };

    const listItems = [
      mapPublicGamingCenterToListItem(centerWithDiscount),
      mapPublicGamingCenterToListItem(centerWithoutDiscount),
    ];

    const discountedOnly = gamecentersPageService.getDiscountedCenters(listItems);
    expect(discountedOnly).toHaveLength(1);
    expect(discountedOnly[0].id).toBe("gc-discounted");
  });
});
