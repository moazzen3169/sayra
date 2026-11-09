import { describe, it, expect } from "bun:test";
import { normalizeUserRole } from "@/context/AuthContext";

describe("Header Account Menu Role-Managed Navigation", () => {
  it("resolves correct reservations href and label for USER role", () => {
    const role = normalizeUserRole("USER");
    const isOwner = role === "MANAGER" || role === "ADMIN";
    const reservationsHref = isOwner ? "/owner/reservations" : "/reservations";
    const reservationsLabel = isOwner ? "رزروهای گیم‌نت" : "رزروهای من";

    expect(reservationsHref).toBe("/reservations");
    expect(reservationsLabel).toBe("رزروهای من");
  });

  it("resolves correct reservations href and label for MANAGER role", () => {
    const role = normalizeUserRole("MANAGER");
    const isOwner = role === "MANAGER" || role === "ADMIN";
    const reservationsHref = isOwner ? "/owner/reservations" : "/reservations";
    const reservationsLabel = isOwner ? "رزروهای گیم‌نت" : "رزروهای من";

    expect(reservationsHref).toBe("/owner/reservations");
    expect(reservationsLabel).toBe("رزروهای گیم‌نت");
  });

  it("resolves correct reservations href and label for ADMIN role", () => {
    const role = normalizeUserRole("ADMIN");
    const isOwner = role === "MANAGER" || role === "ADMIN";
    const reservationsHref = isOwner ? "/owner/reservations" : "/reservations";
    const reservationsLabel = isOwner ? "رزروهای گیم‌نت" : "رزروهای من";

    expect(reservationsHref).toBe("/owner/reservations");
    expect(reservationsLabel).toBe("رزروهای گیم‌نت");
  });

  it("resolves correct reservations href and label for OWNER role synonym", () => {
    const role = normalizeUserRole("OWNER");
    const isOwner = role === "MANAGER" || role === "ADMIN";
    const reservationsHref = isOwner ? "/owner/reservations" : "/reservations";
    const reservationsLabel = isOwner ? "رزروهای گیم‌نت" : "رزروهای من";

    expect(reservationsHref).toBe("/owner/reservations");
    expect(reservationsLabel).toBe("رزروهای گیم‌نت");
  });
});
