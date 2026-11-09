import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";

describe("Terms and Rules Page Verification", () => {
  const filePath = path.resolve(process.cwd(), "src/app/terms/page.tsx");

  it("terms page file exists", () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("contains all 22 articles verbatim with Sayra branding", () => {
    const content = fs.readFileSync(filePath, "utf-8");

    // Check all 22 articles are present (with Persian numerals)
    const persianNums = ["۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۱۰", "۱۱", "۱۲", "۱۳", "۱۴", "۱۵", "۱۶", "۱۷", "۱۸", "۱۹", "۲۰", "۲۱", "۲۲"];
    for (const num of persianNums) {
      expect(content).toContain(`ماده ${num}`);
    }

    // Check placeholders were filled with Sayra
    expect(content).toContain("پلتفرم سایرا");
    expect(content).toContain("شرکت توسعه بازی و فناوری سایرا (پلتفرم سایرا)");
    expect(content).toContain("sayra-booking.ir");
    expect(content).not.toContain("[نام سایت]");
    expect(content).not.toContain("[نام شخص حقوقی یا حقیقی]");
    expect(content).not.toContain("[اطلاعات ثبتی]");
    expect(content).not.toContain("[نشانی قانونی]");
    expect(content).not.toContain("[شماره تماس]");
    expect(content).not.toContain("[دامنه سایت]");
    expect(content).not.toContain("[تاریخ]");
  });

  it("contains key legal definitions and terms", () => {
    const content = fs.readFileSync(filePath, "utf-8");

    expect(content).toContain("پلتفرم واسطه‌ای اینترنتی برای معرفی گیم‌نت‌های مستقل");
    expect(content).toContain("۳۰ دقیقه");
    expect(content).toContain("۲۴ ساعت");
    expect(content).toContain("کیف پول");
    expect(content).toContain("پایان شرایط استفاده و قوانین رزرو پلتفرم سایرا");
  });
});
