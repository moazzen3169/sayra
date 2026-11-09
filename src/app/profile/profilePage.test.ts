import { describe, it, expect, beforeEach } from "bun:test";
import fs from "fs";
import path from "path";

describe("Profile Page Component & Contract Verification", () => {
  const profilePagePath = path.resolve(process.cwd(), "src/app/profile/page.tsx");
  let fileContent = "";

  beforeEach(() => {
    fileContent = fs.readFileSync(profilePagePath, "utf-8");
  });

  describe("1. UI Button Placement and Layout Changes", () => {
    it("renders edit profile button inside the user card instead of static badge", () => {
      // Must NOT contain static badge <span ...>کاربر سایرا</span> in user info card
      expect(fileContent).not.toMatch(/<span[^>]*>\s*کاربر سایرا\s*<\/span>/);

      // Must contain edit button with title or text 'ویرایش اطلاعات' and handleOpenEditModal
      expect(fileContent).toContain("onClick={handleOpenEditModal}");
      expect(fileContent).toContain("ویرایش اطلاعات");
      expect(fileContent).toContain('title="ویرایش اطلاعات کاربر"');
    });

    it("removes edit profile link from bottom menu list", () => {
      // The menu options group should only contain:
      // - ثبت و ایجاد گیم‌نت جدید (/owner/new)
      // - پشتیبانی (/support)
      // - کیف پول (setIsWalletModalOpen)
      // - خروج از حساب (logout)
      // And must NOT have handleOpenEditModal inside the menu group
      const menuStartIndex = fileContent.indexOf("{/* Menu Options Group */}");
      const menuEndIndex = fileContent.indexOf("</main>", menuStartIndex);
      expect(menuStartIndex).toBeGreaterThan(-1);
      expect(menuEndIndex).toBeGreaterThan(-1);

      const menuContent = fileContent.substring(menuStartIndex, menuEndIndex);
      expect(menuContent).not.toContain("handleOpenEditModal");
      expect(menuContent).not.toContain("ویرایش نام و اطلاعات کاربری");
    });
  });

  describe("2. Profile Editing Flow & Phone Change OTP Handlers", () => {
    it("includes editStep state supporting 'form' and 'otp' modes", () => {
      expect(fileContent).toContain('editStep === "form"');
      expect(fileContent).toContain('editStep === "otp"');
    });

    it("triggers OTP request when phone number is changed", () => {
      expect(fileContent).toContain("cleanInputPhone !== cleanCurrentPhone");
      expect(fileContent).toContain("authService.requestOtp");
      expect(fileContent).toContain("pendingPhone");
      expect(fileContent).toContain('setEditStep("otp")');
    });

    it("verifies OTP and hydrates login session with updated phone and tokens", () => {
      expect(fileContent).toContain("authService.verifyOtp(pendingPhone, fullCode)");
      expect(fileContent).toContain("handleVerifyEditPhoneOtp");
      expect(fileContent).toContain("handleResendEditOtp");
      expect(fileContent).toContain("setEditOtpTimer");
    });

    it("handles name update without phone OTP if phone number is unchanged", () => {
      expect(fileContent).toContain("login(");
      expect(fileContent).toContain("cleanFullName");
      expect(fileContent).toContain("setEditSuccess(true)");
    });
  });
});
