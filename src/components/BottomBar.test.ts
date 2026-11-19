import { describe, it, expect } from "bun:test";
import { BOTTOM_BAR_TABS, TAB_ROUTES, getActiveTabFromPathname } from "@/components/BottomBar";

describe("BottomBar navigation contract", () => {
  it("defines the bottom bar routes correctly", () => {
    expect(TAB_ROUTES.home).toBe("/");
    expect(TAB_ROUTES.gamecenters).toBe("/gamecenters");
    expect(TAB_ROUTES.news).toBe("/blog");
    expect(TAB_ROUTES.profile).toBe("/profile");
    expect(TAB_ROUTES.reservations).toBe("/reservations");
  });

  it("shows profile (حساب) instead of reservations in mobile bottom bar tabs", () => {
    expect(BOTTOM_BAR_TABS.map((t) => t.id)).toEqual([
      "home",
      "gamecenters",
      "news",
      "profile",
    ]);
    const profileTab = BOTTOM_BAR_TABS.find((t) => t.id === "profile");
    expect(profileTab?.label).toBe("حساب");
    expect(profileTab?.href).toBe("/profile");
    expect(BOTTOM_BAR_TABS.some((t) => t.id === "reservations")).toBe(false);
  });

  it("preserves backward compatibility for legacy history tab", () => {
    expect(TAB_ROUTES.history).toBe("/reservations");
  });

  describe("getActiveTabFromPathname helper", () => {
    it("resolves root / to home", () => {
      expect(getActiveTabFromPathname("/")).toBe("home");
    });

    it("resolves /gamecenters and subpaths to gamecenters", () => {
      expect(getActiveTabFromPathname("/gamecenters")).toBe("gamecenters");
      expect(getActiveTabFromPathname("/gamecenters/123")).toBe("gamecenters");
    });

    it("resolves /blog and subpaths to news", () => {
      expect(getActiveTabFromPathname("/blog")).toBe("news");
      expect(getActiveTabFromPathname("/blog/article-slug")).toBe("news");
    });

    it("resolves /profile and subpaths to profile", () => {
      expect(getActiveTabFromPathname("/profile")).toBe("profile");
      expect(getActiveTabFromPathname("/profile/wallet")).toBe("profile");
    });

    it("resolves /reservations and subpaths to reservations", () => {
      expect(getActiveTabFromPathname("/reservations")).toBe("reservations");
      expect(getActiveTabFromPathname("/reservations/group-123")).toBe("reservations");
    });

    it("returns null for paths not matching any bottom bar tab", () => {
      expect(getActiveTabFromPathname("/owner")).toBeNull();
      expect(getActiveTabFromPathname("/support")).toBeNull();
      expect(getActiveTabFromPathname(null)).toBeNull();
      expect(getActiveTabFromPathname("")).toBeNull();
    });
  });
});
