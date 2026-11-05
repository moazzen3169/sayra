import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";

describe("SafeImage Component Logic & Rendering", () => {
  it("renders valid image source correctly", () => {
    const html = renderToStaticMarkup(
      <SafeImage src="/img/gamnet-1.webp" alt="تست گیمنت" />
    );
    expect(html).toContain('src="/img/gamnet-1.webp"');
    expect(html).toContain('alt="تست گیمنت"');
  });

  it("falls back to default placeholder when src is null, undefined, or empty", () => {
    const htmlNull = renderToStaticMarkup(
      <SafeImage src={null} alt="بدون آدرس" />
    );
    expect(htmlNull).toContain(`src="${PLACEHOLDERS.center}"`);

    const htmlEmpty = renderToStaticMarkup(
      <SafeImage src="" alt="آدرس خالی" />
    );
    expect(htmlEmpty).toContain(`src="${PLACEHOLDERS.center}"`);

    const htmlCustomFallback = renderToStaticMarkup(
      <SafeImage src="" fallbackSrc={PLACEHOLDERS.gallery} alt="گالری پیش‌فرض" />
    );
    expect(htmlCustomFallback).toContain(`src="${PLACEHOLDERS.gallery}"`);
  });

  it("handles whitespace src by treating it as empty and falling back", () => {
    const htmlWhitespace = renderToStaticMarkup(
      <SafeImage src="   " fallbackSrc={PLACEHOLDERS.gallery} alt="اسپیس" />
    );
    expect(htmlWhitespace).toContain(`src="${PLACEHOLDERS.gallery}"`);
  });

  it("applies className, objectFit and style correctly", () => {
    const html = renderToStaticMarkup(
      <SafeImage
        src="/img/ps5.png"
        className="w-full h-full"
        objectFit="cover"
        style={{ opacity: 0.8 }}
      />
    );
    expect(html).toContain('class="w-full h-full"');
    expect(html).toContain("object-fit:cover");
    expect(html).toContain("opacity:0.8");
  });
});

import { BannerSlider } from "@/components/BannerSlider";

describe("BannerSlider Fallback & Slide Retention", () => {
  it("renders all slides without removing items if image fails or is empty", () => {
    const banners = [
      { id: "b1", imageUrl: "https://invalid-image.test/404.jpg", alt: "اسلاید ۱" },
      { id: "b2", imageUrl: "/img/gamnet-2.webp", alt: "اسلاید ۲" },
      { id: "b3", imageUrl: "", alt: "اسلاید ۳" },
    ];

    const html = renderToStaticMarkup(
      <BannerSlider banners={banners} fallbackSrc={PLACEHOLDERS.gallery} />
    );

    // All 3 slides must exist in markup
    expect(html).toContain('alt="اسلاید ۱"');
    expect(html).toContain('alt="اسلاید ۲"');
    expect(html).toContain('alt="اسلاید ۳"');
    // b3 (empty src) rendered fallback directly
    expect(html).toContain(`src="${PLACEHOLDERS.gallery}"`);
  });
});
