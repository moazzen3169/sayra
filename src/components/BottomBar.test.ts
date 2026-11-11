import { describe, it, expect } from "bun:test";
import { TAB_ROUTES, getActiveTabFromPathname } from "@/components/BottomBar";

describe("BottomBar navigation contract", () => {
  it("defines the 4 required bottom bar routes correctly", () => {
    expect(TAB_ROUTES.home).toBe("/");
    expect(TAB_ROUTES.gamecenters).toBe("/gamecenters");
    expect(TAB_ROUTES.news).toBe("/blog");
    expect(TAB_ROUTES.reservations).toBe("/reservations");
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
