import React from "react";
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppImage } from "@/components/common/AppImage";
import {
  DEFAULT_IMAGE_PATH,
  TERMINAL_TRANSPARENT_PIXEL,
  MAX_IMAGE_RETRIES,
  isValidImageSource,
  normalizeImageSource,
  resolveInitialImageSource,
} from "@/lib/imageUtils";

describe("Centralized Image Infrastructure & AppImage", () => {
  describe("imageUtils Unit Tests", () => {
    it("validates image sources accurately", () => {
      expect(isValidImageSource(null)).toBe(false);
      expect(isValidImageSource(undefined)).toBe(false);
      expect(isValidImageSource("")).toBe(false);
      expect(isValidImageSource("   ")).toBe(false);
      expect(isValidImageSource("null")).toBe(false);
      expect(isValidImageSource("undefined")).toBe(false);
      expect(isValidImageSource("/img/pc.png")).toBe(true);
      expect(isValidImageSource("https://example.com/photo.jpg")).toBe(true);
    });

    it("normalizes image sources correctly", () => {
      expect(normalizeImageSource(null)).toBe("");
      expect(normalizeImageSource(undefined)).toBe("");
      expect(normalizeImageSource("")).toBe("");
      expect(normalizeImageSource("   ")).toBe("");
      expect(normalizeImageSource("/images/default-image.png")).toBe("/images/default-image.png");
      expect(normalizeImageSource("/img/ps5.png")).toBe("/img/ps5.png");
      expect(normalizeImageSource("https://cdn.sayra.ir/image.png")).toBe("https://cdn.sayra.ir/image.png");
    });

    it("resolves initial image source with fallback defaults", () => {
      const resNull = resolveInitialImageSource(null);
      expect(resNull.isFallback).toBe(true);
      expect(resNull.resolvedSrc).toBe(DEFAULT_IMAGE_PATH);

      const resEmpty = resolveInitialImageSource("");
      expect(resEmpty.isFallback).toBe(true);
      expect(resEmpty.resolvedSrc).toBe(DEFAULT_IMAGE_PATH);

      const resCustom = resolveInitialImageSource(null, "/images/custom.png");
      expect(resCustom.isFallback).toBe(true);
      expect(resCustom.resolvedSrc).toBe("/images/custom.png");

      const resValid = resolveInitialImageSource("/img/pc.png");
      expect(resValid.isFallback).toBe(false);
      expect(resValid.resolvedSrc).toBe("/img/pc.png");
    });
  });

  describe("AppImage Component Rendering Requirements", () => {
    it("1. renders an image with a valid URL", () => {
      const html = renderToStaticMarkup(
        <AppImage src="/img/pc.png" alt="Gaming PC" className="test-image" />
      );
      expect(html).toContain('src="/img/pc.png"');
      expect(html).toContain('alt="Gaming PC"');
      expect(html).toContain('class="test-image"');
    });

    it("2. renders local default image immediately when src is null without making remote requests", () => {
      const html = renderToStaticMarkup(<AppImage src={null} alt="Empty null src" />);
      expect(html).toContain(`src="${DEFAULT_IMAGE_PATH}"`);
      expect(html).toContain('alt="Empty null src"');
    });

    it("3. renders local default image immediately when src is empty string or whitespace", () => {
      const htmlEmpty = renderToStaticMarkup(<AppImage src="" alt="Empty string" />);
      expect(htmlEmpty).toContain(`src="${DEFAULT_IMAGE_PATH}"`);

      const htmlWhitespace = renderToStaticMarkup(<AppImage src="    " alt="Whitespace" />);
      expect(htmlWhitespace).toContain(`src="${DEFAULT_IMAGE_PATH}"`);
    });

    it("4. supports custom local fallback image when provided", () => {
      const html = renderToStaticMarkup(
        <AppImage src="" fallbackSrc="/img/ps5.png" alt="PS5 Fallback" />
      );
      expect(html).toContain('src="/img/ps5.png"');
    });

    it("5. renders with styling, objectFit, and dimensions correctly", () => {
      const html = renderToStaticMarkup(
        <AppImage
          src="/img/xbox.png"
          alt="Xbox"
          width={120}
          height={80}
          objectFit="contain"
          className="rounded-md"
        />
      );
      expect(html).toContain('width="120"');
      expect(html).toContain('height="80"');
      expect(html).toContain("object-fit:contain");
      expect(html).toContain('class="rounded-md"');
    });

    it("6. supports multiple image components independently on the same page", () => {
      const html = renderToStaticMarkup(
        <div>
          <AppImage src="/img/pc.png" alt="Device 1" />
          <AppImage src={null} alt="Device 2" />
          <AppImage src="" fallbackSrc="/img/ps4.png" alt="Device 3" />
        </div>
      );
      expect(html).toContain('src="/img/pc.png"');
      expect(html).toContain(`src="${DEFAULT_IMAGE_PATH}"`);
      expect(html).toContain('src="/img/ps4.png"');
    });

    it("7. enforces max retry constant is 5", () => {
      expect(MAX_IMAGE_RETRIES).toBe(5);
    });

    it("8. terminal transparent pixel is configured to protect against fallback loops", () => {
      expect(TERMINAL_TRANSPARENT_PIXEL).toContain("data:image/gif;base64");
    });
  });
});
