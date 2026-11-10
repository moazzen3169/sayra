import { describe, it, expect } from "bun:test";
import { cleanPhoneNumber, isValidIranPhone, formatPhoneDisplay } from "./format";

describe("Phone number normalization and validation", () => {
  it("normalizes standard 11-digit mobile numbers starting with 09", () => {
    expect(cleanPhoneNumber("09123456789")).toBe("09123456789");
    expect(isValidIranPhone("09123456789")).toBe(true);
  });

  it("removes +98 prefix and converts to standard 09xxxxxxxx format", () => {
    expect(cleanPhoneNumber("+989123456789")).toBe("09123456789");
    expect(isValidIranPhone("+989123456789")).toBe(true);
  });

  it("removes 0098 prefix and converts to standard 09xxxxxxxx format", () => {
    expect(cleanPhoneNumber("00989123456789")).toBe("09123456789");
    expect(isValidIranPhone("00989123456789")).toBe(true);
  });

  it("removes 98 prefix and converts to standard 09xxxxxxxx format", () => {
    expect(cleanPhoneNumber("989123456789")).toBe("09123456789");
    expect(isValidIranPhone("989123456789")).toBe(true);
  });

  it("prepends 0 if user enters 10 digits starting with 9", () => {
    expect(cleanPhoneNumber("9123456789")).toBe("09123456789");
    expect(isValidIranPhone("9123456789")).toBe(true);
  });

  it("handles Persian and Arabic numerals properly", () => {
    expect(cleanPhoneNumber("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(cleanPhoneNumber("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
    expect(cleanPhoneNumber("+۹۸۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(isValidIranPhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe(true);
    expect(isValidIranPhone("+۹۸۹۱۲۳۴۵۶۷۸۹")).toBe(true);
  });

  it("handles numbers with spaces, dashes, or brackets", () => {
    expect(cleanPhoneNumber(" 0912-345-6789 ")).toBe("09123456789");
    expect(cleanPhoneNumber("0912 345 6789")).toBe("09123456789");
    expect(cleanPhoneNumber("(0912) 345 6789")).toBe("09123456789");
    expect(isValidIranPhone(" 0912-345-6789 ")).toBe(true);
  });

  it("rejects phone numbers with incorrect length (not 11 digits)", () => {
    expect(isValidIranPhone("0912345678")).toBe(false); // 10 digits
    expect(isValidIranPhone("091234567890")).toBe(false); // 12 digits
    expect(isValidIranPhone("09")).toBe(false);
    expect(isValidIranPhone("")).toBe(false);
    expect(isValidIranPhone(null)).toBe(false);
  });

  it("rejects numbers not starting with 09", () => {
    expect(isValidIranPhone("02188888888")).toBe(false);
    expect(isValidIranPhone("03133333333")).toBe(false);
    expect(isValidIranPhone("08123456789")).toBe(false);
  });

  it("formats phone for display correctly", () => {
    expect(formatPhoneDisplay("09123456789")).toBe("09123456789");
    expect(formatPhoneDisplay("+989123456789")).toBe("09123456789");
    expect(formatPhoneDisplay("+989123456789", true)).toBe("۰۹۱۲۳۴۵۶۷۸۹");
  });
});
