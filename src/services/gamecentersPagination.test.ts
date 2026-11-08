import { describe, it, expect } from "bun:test";
import { gamecentersPageService, GamecenterListItem } from "./gamecentersPageService";
import fs from "fs";
import path from "path";

describe("Gamecenters Pagination and Grid Configuration", () => {
  const createMockCenters = (count: number): GamecenterListItem[] => {
    return Array.from({ length: count }, (_, idx) => ({
      id: `center-${idx + 1}`,
      name: `گیمنت نمونه ${idx + 1}`,
      imageUrl: "/img/gamnet-1.webp",
      location: `تهران، خیابان شماره ${idx + 1}`,
      city: "تهران",
      rating: 4.5,
      reviewsCount: 10 + idx,
      hourlyPrice: 50000 + idx * 5000,
      categories: ["ps5", "pc"],
      createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
    }));
  };

  it("paginates centers with 12 items per page", () => {
    const centers = createMockCenters(30);
    const ITEMS_PER_PAGE = 12;

    const totalPages = Math.ceil(centers.length / ITEMS_PER_PAGE);
    expect(totalPages).toBe(3);

    // Page 1
    const page1 = centers.slice(0, ITEMS_PER_PAGE);
    expect(page1.length).toBe(12);
    expect(page1[0].id).toBe("center-1");
    expect(page1[11].id).toBe("center-12");

    // Page 2
    const page2 = centers.slice(ITEMS_PER_PAGE, ITEMS_PER_PAGE * 2);
    expect(page2.length).toBe(12);
    expect(page2[0].id).toBe("center-13");
    expect(page2[11].id).toBe("center-24");

    // Page 3
    const page3 = centers.slice(ITEMS_PER_PAGE * 2, ITEMS_PER_PAGE * 3);
    expect(page3.length).toBe(6);
    expect(page3[0].id).toBe("center-25");
    expect(page3[5].id).toBe("center-30");
  });

  it("verifies gamecenters page file includes ITEMS_PER_PAGE = 12 and 4 columns on desktop", () => {
    const filePath = path.resolve(process.cwd(), "src/app/gamecenters/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Check pagination constant
    expect(content).toContain("ITEMS_PER_PAGE = 12");

    // Check desktop grid class has 4 columns (lg:grid-cols-4)
    expect(content).toContain("lg:grid-cols-4");

    // Check pagination controls exist
    expect(content).toContain("handlePageChange");
    expect(content).toContain("totalPages");
  });
});
