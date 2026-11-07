import { describe, it, expect } from "bun:test";
import { TAB_ROUTES } from "@/components/BottomBar";

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
});
