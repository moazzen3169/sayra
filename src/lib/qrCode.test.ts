import { describe, it, expect } from "bun:test";
import { generateQrMatrix, generateQrSvg } from "./qrCode";

describe("qrCode generator", () => {
  it("generates a valid QR matrix with 7x7 finder patterns in three corners", () => {
    const matrix = generateQrMatrix("https://sayragame.ir/r/abc123");
    const n = matrix.length;
    expect(n).toBeGreaterThanOrEqual(21);
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][6]).toBe(true);
    expect(matrix[6][0]).toBe(true);
    expect(matrix[3][3]).toBe(true); // top-left finder core
    expect(matrix[3][n - 4]).toBe(true); // top-right finder core
    expect(matrix[n - 4][3]).toBe(true); // bottom-left finder core
  });

  it("generates valid SVG markup for both short and long gamenet URLs", () => {
    const shortSvg = generateQrSvg("https://sayragame.ir/s/vip1");
    expect(shortSvg.startsWith("<svg ")).toBe(true);
    expect(shortSvg.endsWith("</svg>")).toBe(true);
    expect(shortSvg).toContain("<path d=");

    const longSvg = generateQrSvg(
      "https://sayragame.ir/gamecenter/tehran-vip-gaming-lounge-branch-1"
    );
    expect(longSvg.startsWith("<svg ")).toBe(true);
    expect(longSvg).toContain("<path d=");
  });
});
