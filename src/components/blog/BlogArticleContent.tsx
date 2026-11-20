
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BLOG_API_BASE_URL } from "@/lib/api/config";
import type { BlogPostSummary } from "@/types/blog";

type UnknownRecord = Record<string, unknown>;

interface BlogArticleContentProps {
  blocks: unknown[];
  relatedArticles?: BlogPostSummary[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(
  record: UnknownRecord,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getNumber(
  record: UnknownRecord,
  key: string,
  fallback: number
): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/** Only allow web URLs and safe relative paths. */
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const url = value.trim();

  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\")
  ) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url;
    }
  } catch {
    return null;
  }

  return null;
}

function externalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function resolveMediaUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\")
  ) {
    try {
      return new URL(trimmed, BLOG_API_BASE_URL).toString();
    } catch {
      return trimmed;
    }
  }
  return safeUrl(trimmed);
}

function toVideoEmbedUrl(url: string, provider?: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (
      provider === "youtube" ||
      host.includes("youtube.com") ||
      host.includes("youtu.be")
    ) {
      if (host.includes("youtu.be")) {
        const videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const videoId = parsed.pathname.replace("/shorts/", "").split("/")[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }

    if (provider === "vimeo" || host.includes("vimeo.com")) {
      if (!host.includes("player.vimeo.com")) {
        const videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId && /^\d+$/.test(videoId)) {
          return `https://player.vimeo.com/video/${videoId}`;
        }
      }
    }
  } catch {
    // Fallback to original URL
  }
  return url;
}

function RichTextNodes({ nodes }: { nodes: unknown[] }) {
  return (
    <>
      {nodes.map((rawNode, index) => {
        if (!isRecord(rawNode)) {
          return typeof rawNode === "string" ? (
            <React.Fragment key={index}>{rawNode}</React.Fragment>
          ) : null;
        }

        const type = asString(rawNode.type, "text");
        const value = asString(rawNode.value);
        const children = asArray(rawNode.children);
        const content = children.length > 0 ? (
          <RichTextNodes nodes={children} />
        ) : (
          value
        );

        switch (type) {
          case "strong":
            return <strong key={index}>{content}</strong>;

          case "italic":
            return <em key={index}>{content}</em>;

          case "underline":
            return <u key={index}>{content}</u>;

          case "strike":
            return <s key={index}>{content}</s>;

          case "code":
          case "inline_code":
            return (
              <code
                key={index}
                className="rounded bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-[0.9em]"
              >
                {content}
              </code>
            );

          case "link": {
            const href = safeUrl(rawNode.href);
            if (!href) return <React.Fragment key={index}>{content}</React.Fragment>;

            const target =
              rawNode.target === "_blank" ? "_blank" : undefined;

            return (
              <a
                key={index}
                href={href}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
                title={asString(rawNode.title) || undefined}
                className="text-[var(--primary)] underline underline-offset-4 hover:opacity-80"
              >
                {content}
              </a>
            );
          }

          case "emoji":
            return <span key={index}>{value}</span>;

          case "mention":
            return (
              <span key={index} className="font-semibold text-[var(--primary)]">
                {content}
              </span>
            );

          case "highlight":
          case "mark":
            return (
              <mark
                key={index}
                className="rounded bg-yellow-300/20 px-1 text-inherit"
              >
                {content}
              </mark>
            );

          case "subscript":
            return <sub key={index}>{content}</sub>;

          case "superscript":
            return <sup key={index}>{content}</sup>;

          case "keyboard":
            return (
              <kbd
                key={index}
                className="rounded border border-[var(--border-subtle)] bg-[var(--foreground)] px-1.5 py-0.5 font-mono text-xs"
              >
                {content}
              </kbd>
            );

          case "small":
            return (
              <small key={index} className="text-xs">
                {content}
              </small>
            );

          case "text":
          default:
            return <React.Fragment key={index}>{content}</React.Fragment>;
        }
      })}
    </>
  );
}

function ParagraphContent({ block }: { block: UnknownRecord }) {
  const content = block.content;

  if (typeof content === "string") {
    return <>{content}</>;
  }

  if (Array.isArray(content)) {
    return <RichTextNodes nodes={content} />;
  }

  // Backward compatibility with the old UI model.
  if (typeof block.text === "string") {
    return <>{block.text}</>;
  }

  return null;
}

function ImageBlock({ block }: { block: UnknownRecord }) {
  const media = isRecord(block.media) ? block.media : {};
  const src = resolveMediaUrl(
    getString(block, "url", "src", "image_url") ||
      getString(media, "url", "src")
  );

  const alt =
    getString(block, "alt", "alt_text") ||
    getString(media, "alt_text") ||
    "تصویر مقاله";

  const caption = getString(block, "caption");
  const objectFit =
    block.object_fit === "contain" ||
    block.object_fit === "cover" ||
    block.object_fit === "fill" ||
    block.object_fit === "none" ||
    block.object_fit === "scale-down"
      ? block.object_fit
      : "cover";

  if (!src) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        تصویر با شناسهٔ رسانهٔ {String(block.media_id ?? "نامشخص")} ثبت شده است؛
        برای نمایش آن باید URL رسانه در پاسخ API موجود باشد.
      </div>
    );
  }

  const focalPoint = isRecord(block.focal_point)
    ? block.focal_point
    : null;
  const objectPosition =
    focalPoint &&
    typeof focalPoint.x === "number" &&
    typeof focalPoint.y === "number"
      ? `${focalPoint.x}% ${focalPoint.y}%`
      : undefined;

  const fetchPriority =
    block.fetch_priority === "high" ||
    block.fetch_priority === "low" ||
    block.fetch_priority === "auto"
      ? block.fetch_priority
      : undefined;

  const image = (
    <img
      src={src}
      alt={alt}
      loading={block.lazy === false || block.loading === "eager" ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={fetchPriority}
      className="max-h-[680px] w-full rounded-card"
      style={{ objectFit, ...(objectPosition ? { objectPosition } : {}) }}
    />
  );

  const link = safeUrl(block.link);

  return (
    <figure className="flex flex-col gap-2">
      {link ? (
        <a
          href={link}
          target={block.target === "_blank" ? "_blank" : undefined}
          rel={block.target === "_blank" ? "noopener noreferrer" : undefined}
        >
          {image}
        </a>
      ) : (
        image
      )}

      {caption && (
        <figcaption className="text-center text-xs leading-6 text-[var(--text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function getAspectClass(ratio?: unknown): string {
  switch (ratio) {
    case "16:9":
      return "aspect-video";
    case "1:1":
      return "aspect-square";
    case "3:4":
      return "aspect-[3/4]";
    case "4:3":
    default:
      return "aspect-[4/3]";
  }
}

function GalleryBlock({ block }: { block: UnknownRecord }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const medias = asArray(block.medias);
  const images = asArray(block.images);
  const mediaItems = asArray(block.media);
  const mediaIds = asArray(block.media_ids);

  const rawItems =
    medias.length > 0 ? medias : images.length > 0 ? images : mediaItems;

  const resolvedItems = rawItems
    .map((item, index) => {
      const media = isRecord(item) ? item : {};
      const src = resolveMediaUrl(
        typeof item === "string"
          ? item
          : getString(media, "url", "src", "image_url")
      );
      if (!src) return null;
      return {
        key: String(media.id ?? index),
        src,
        alt: getString(media, "alt", "alt_text") || `تصویر ${index + 1}`,
      };
    })
    .filter((item): item is { key: string; src: string; alt: string } => item !== null);

  if (resolvedItems.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        گالری شامل {mediaIds.length} رسانه است؛ برای نمایش تصاویر باید URL
        رسانه‌ها از API دریافت شود.
      </div>
    );
  }

  const layout = block.layout === "slider" ? "slider" : "grid";
  const aspectClass = getAspectClass(block.aspect_ratio);

  return (
    <>
      <div
        className={
          layout === "slider"
            ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
            : "grid grid-cols-2 gap-3 md:grid-cols-3"
        }
      >
        {resolvedItems.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className={
              layout === "slider"
                ? "group relative h-64 w-[80%] shrink-0 snap-start overflow-hidden rounded-card sm:w-[60%]"
                : `group relative ${aspectClass} w-full overflow-hidden rounded-card`
            }
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && resolvedItems[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolvedItems[lightboxIndex].src}
              alt={resolvedItems[lightboxIndex].alt}
              className="max-h-[80vh] w-auto rounded-card object-contain"
            />
            <div className="flex items-center gap-3 text-xs text-white">
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null
                      ? (prev - 1 + resolvedItems.length) % resolvedItems.length
                      : 0
                  )
                }
                className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
              >
                قبلی
              </button>
              <span>
                {lightboxIndex + 1} / {resolvedItems.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % resolvedItems.length : 0
                  )
                }
                className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
              >
                بعدی
              </button>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function VideoBlock({ block }: { block: UnknownRecord }) {
  const media = isRecord(block.media) ? block.media : {};
  const provider = asString(block.provider);
  const external = externalUrl(block.external_url);
  const localSrc = resolveMediaUrl(
    getString(block, "url", "src", "video_url") ||
      getString(media, "url", "src")
  );

  if (provider === "youtube" || provider === "vimeo" || external) {
    if (!external) {
      return (
        <p className="text-xs text-[var(--text-muted)]">
          نشانی ویدئو معتبر نیست.
        </p>
      );
    }

    const embedSrc = toVideoEmbedUrl(external, provider);

    return (
      <div className="aspect-video overflow-hidden rounded-card bg-black">
        <iframe
          src={embedSrc}
          title="ویدئوی مقاله"
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (!localSrc) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
        ویدئو با شناسهٔ رسانهٔ {String(block.media_id ?? "نامشخص")} ثبت شده،
        اما نشانی فایل ویدئو در دادهٔ دریافتی وجود ندارد.
      </div>
    );
  }

  return (
    <video
      src={localSrc}
      controls={block.controls !== false}
      autoPlay={block.autoplay === true}
      playsInline
      className="w-full rounded-card bg-black"
    />
  );
}

function TableBlock({ block }: { block: UnknownRecord }) {
  const headers = asArray(block.headers).map((item) => asString(item));
  const rows = asArray(block.rows).map((row) =>
    asArray(row).map((cell) => asString(cell))
  );

  if (headers.length === 0 && rows.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto rounded-card border border-[var(--border-subtle)]">
      <table className="w-full min-w-[420px] border-collapse text-start text-sm">
        {headers.length > 0 && (
          <thead className="bg-[var(--foreground)]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="border-b border-[var(--border-subtle)] px-4 py-3 font-bold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="even:bg-[var(--foreground)]/40">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[var(--border-subtle)] px-4 py-3 leading-7"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ block }: { block: UnknownRecord }) {
  const [copied, setCopied] = useState(false);
  const code = asString(block.code);
  const language = asString(block.language);
  const showLineNumbers = block.show_line_numbers === true;
  if (!code) return null;

  const lines = code.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[#111827] text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-300">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? "کپی شد ✓" : "کپی کد"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-left text-xs leading-7" dir="ltr">
        <code>
          {showLineNumbers
            ? lines.map((line, i) => (
                <span key={i} className="table-row">
                  <span className="table-cell select-none pe-4 text-right text-slate-500">
                    {i + 1}
                  </span>
                  <span className="table-cell">{line + "\n"}</span>
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}

function EmbedBlock({ block }: { block: UnknownRecord }) {
  const url = externalUrl(block.url);
  if (!url) {
    return (
      <p className="text-xs text-[var(--text-muted)]">
        نشانی محتوای تعبیه‌شده معتبر نیست.
      </p>
    );
  }

  const width = getNumber(block, "width", 800);
  const height = getNumber(block, "height", 450);

  return (
    <div className="w-full overflow-hidden rounded-card border border-[var(--border-subtle)]">
      <iframe
        src={url}
        title="محتوای تعبیه‌شده"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full"
        style={{
          height: `min(${Math.max(180, Math.min(height, 1200))}px, 75vh)`,
          maxWidth: Math.max(280, Math.min(width, 1600)),
        }}
        allowFullScreen
      />
    </div>
  );
}

function AccordionBlock({ block }: { block: UnknownRecord }) {
  const items = asArray(block.items).filter(isRecord);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <details
          key={String(item.id ?? index)}
          className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-4"
        >
          <summary className="cursor-pointer font-semibold leading-7">
            {asString(item.title, "بدون عنوان")}
          </summary>
          <div className="pt-3 text-sm leading-8 text-[var(--text-muted)]">
            {asString(item.content)}
          </div>
        </details>
      ))}
    </div>
  );
}

function FaqBlock({ block }: { block: UnknownRecord }) {
  const questions = asArray(block.questions).filter(isRecord);
  if (questions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-bold">سؤالات متداول</h3>
      {questions.map((item, index) => (
        <details
          key={String(item.id ?? index)}
          className="group rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold leading-7">
            <span>{asString(item.q, "سؤال")}</span>
            <span className="text-xs text-[var(--primary)] transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <p className="mt-2 border-t border-[var(--border-subtle)] pt-3 text-sm leading-8 text-[var(--text-muted)]">
            {asString(item.a)}
          </p>
        </details>
      ))}
    </section>
  );
}

const PERSIAN_DAY_LABELS: Record<string, string> = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنج‌شنبه",
  friday: "جمعه",
};

function getLocationMapUrl(
  provider: string,
  latitude: number,
  longitude: number,
  zoom: number
): string {
  switch (provider) {
    case "balad":
      return `https://balad.ir/#${zoom}/${latitude}/${longitude}`;
    case "google":
      return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`;
    case "openstreetmap":
    case "leaflet":
    case "neshan":
    default:
      return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
  }
}

function LocationBlock({ block }: { block: UnknownRecord }) {
  const address = isRecord(block.address) ? block.address : {};
  const coordinates = isRecord(block.coordinates) ? block.coordinates : {};
  const contact = isRecord(block.contact) ? block.contact : {};
  const map = isRecord(block.map) ? block.map : {};
  const media = isRecord(block.media) ? block.media : {};

  const latitude = coordinates.latitude;
  const longitude = coordinates.longitude;

  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  const mapProvider = asString(map.provider, "google");
  const mapZoom = getNumber(map, "zoom", 15);
  const mapUrl = hasCoordinates
    ? getLocationMapUrl(mapProvider, latitude, longitude, mapZoom)
    : null;

  const addressText = [
    address.country,
    address.province,
    address.city,
    address.street,
  ]
    .filter((item) => typeof item === "string" && item.trim())
    .join("، ");
  const postalCode = asString(address.postal_code);

  const hours = asArray(block.opening_hours).filter(isRecord);

  const description = asString(block.description);
  const phone = asString(contact.phone);
  const email = asString(contact.email);
  const website = safeUrl(contact.website);
  const embedUrl = externalUrl(map.embed_url);
  const imageSrc = resolveMediaUrl(getString(media, "url", "src"));

  return (
    <section className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] p-4">
      {imageSrc && (
        <img
          src={imageSrc}
          alt={asString(block.title, "تصویر موقعیت مکانی")}
          loading="lazy"
          className="max-h-56 w-full rounded-card object-cover"
        />
      )}

      <h3 className="text-base font-bold">
        {asString(block.title, "موقعیت مکانی")}
      </h3>

      {description && (
        <p className="text-sm leading-7 text-[var(--text-muted)]">
          {description}
        </p>
      )}

      {addressText && (
        <p className="text-sm leading-7">
          {addressText}
          {postalCode ? ` (کد پستی: ${postalCode})` : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="text-[var(--primary)] hover:underline"
            dir="ltr"
          >
            تلفن: {phone}
          </a>
        )}

        {email && (
          <a
            href={`mailto:${email}`}
            className="text-[var(--primary)] hover:underline"
            dir="ltr"
          >
            ایمیل: {email}
          </a>
        )}

        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] hover:underline"
          >
            وب‌سایت
          </a>
        )}
      </div>

      {hours.length > 0 && (
        <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-white)]">ساعات کاری</span>
          {hours.map((item, index) => {
            const dayKey = asString(item.day).toLowerCase();
            return (
              <span key={index}>
                {PERSIAN_DAY_LABELS[dayKey] || asString(item.day)}: {asString(item.open)} تا{" "}
                {asString(item.close)}
              </span>
            );
          })}
        </div>
      )}

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-semibold text-[var(--primary)] underline underline-offset-4"
        >
          مشاهده روی نقشه
        </a>
      )}

      {embedUrl && (
        <iframe
          src={embedUrl}
          title="نقشه موقعیت"
          loading="lazy"
          className="h-64 w-full rounded-card border-0"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}

function TimelineBlock({ block }: { block: UnknownRecord }) {
  const events = asArray(block.events).filter(isRecord);
  if (events.length === 0) return null;

  const horizontal = block.orientation === "horizontal";

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-base font-bold">
        {asString(block.title, "خط زمانی")}
      </h3>

      <div
        className={
          horizontal
            ? "flex snap-x gap-4 overflow-x-auto pb-3"
            : "relative flex flex-col gap-5 border-s-2 border-[var(--border-subtle)] ps-5"
        }
      >
        {events.map((event, index) => {
          const date = isRecord(event.date) ? event.date : {};
          const media = isRecord(event.media) ? event.media : {};
          const metadata = isRecord(event.metadata) ? event.metadata : {};
          const imageSrc = resolveMediaUrl(
            getString(event, "image_url", "url") ||
              getString(media, "url")
          );
          const eventDescription = asString(event.description);
          const eventLocation = asString(metadata.location);
          const eventCategory = asString(metadata.category);

          return (
            <article
              key={String(event.id ?? index)}
              className={
                horizontal
                  ? "w-[min(82vw,320px)] shrink-0 snap-start rounded-card border border-[var(--border-subtle)] p-4"
                  : "relative flex flex-col gap-2"
              }
            >
              {!horizontal && (
                <span className="absolute -start-[27px] top-2 h-3 w-3 rounded-full border-2 border-[var(--primary)] bg-[var(--bg-body)]" />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--primary)]">
                  {asString(date.value)}
                </span>
                {eventCategory && (
                  <span className="rounded-full bg-[var(--foreground)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                    {eventCategory}
                  </span>
                )}
                {eventLocation && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    • {eventLocation}
                  </span>
                )}
              </div>

              <h4 className="font-bold leading-7">
                {asString(event.title)}
              </h4>

              {eventDescription && (
                <p className="text-sm leading-8 text-[var(--text-muted)]">
                  {eventDescription}
                </p>
              )}

              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={asString(event.title, "تصویر رویداد")}
                  loading="lazy"
                  className="mt-2 max-h-52 w-full rounded-card object-cover"
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function renderBlockContent(
  block: UnknownRecord,
  relatedArticles?: BlogPostSummary[]
): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const text = getString(block, "text");
      if (!text) return null;

      const level = Math.max(1, Math.min(6, getNumber(block, "level", 2)));
      const className =
        "pt-3 font-bold leading-8 text-[var(--text-white)] " +
        (level === 1
          ? "text-2xl"
          : level === 2
            ? "text-xl"
            : level === 3
              ? "text-lg"
              : "text-base");

      const commonProps = {
        id: getString(block, "anchor_id") || undefined,
        className,
      };

      switch (level) {
        case 1:
          return <h1 {...commonProps}>{text}</h1>;
        case 2:
          return <h2 {...commonProps}>{text}</h2>;
        case 3:
          return <h3 {...commonProps}>{text}</h3>;
        case 4:
          return <h4 {...commonProps}>{text}</h4>;
        case 5:
          return <h5 {...commonProps}>{text}</h5>;
        default:
          return <h6 {...commonProps}>{text}</h6>;
      }
    }

    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-md leading text-[var(--text-white)]/90">
          <ParagraphContent block={block} />
        </p>
      );

    case "quote": {
      const citation = asString(block.citation);

      return (
        <blockquote className="flex flex-col gap-2 border-s-2 border-[var(--primary)] py-1 ps-4 text-sm leading-8 text-[var(--text-muted)]">
          <p>{asString(block.text)}</p>
          {citation && (
            <cite className="text-xs not-italic">{citation}</cite>
          )}
        </blockquote>
      );
    }

    // Backward compatibility for old UI content.
    case "list": {
      const items = asArray(block.items).filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      );

      return items.length > 0 ? (
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm leading-7 marker:text-[var(--primary)]">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : null;
    }

    case "image":
      return <ImageBlock block={block} />;

    case "gallery":
      return <GalleryBlock block={block} />;

    case "table":
      return <TableBlock block={block} />;

    case "code":
      return <CodeBlock block={block} />;

    case "divider": {
      const style = block.style;
      const borderStyle =
        style === "dashed" || style === "dots" ? style : "solid";

      return (
        <hr
          className="my-3 border-0 border-t border-[var(--border-subtle)]"
          style={{
            borderTopStyle: borderStyle === "dots" ? "dotted" : borderStyle,
          }}
        />
      );
    }

    case "video":
      return <VideoBlock block={block} />;

    case "embed":
      return <EmbedBlock block={block} />;

    case "button": {
      const href = safeUrl(block.url);
      if (!href) return null;

      return (
        <div className="py-2">
          <a
            href={href}
            target={block.target === "_blank" ? "_blank" : undefined}
            rel={block.target === "_blank" ? "noopener noreferrer" : undefined}
            className="inline-flex min-h-11 items-center justify-center rounded-card bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-85"
          >
            {asString(block.label, "مشاهده")}
          </a>
        </div>
      );
    }

    case "accordion":
      return <AccordionBlock block={block} />;

    case "faq":
      return <FaqBlock block={block} />;

    case "location":
      return <LocationBlock block={block} />;

    case "timeline":
      return <TimelineBlock block={block} />;

    case "related_articles": {
      const ids = asArray(block.article_ids).filter(
        (id) =>
          (typeof id === "number" && Number.isFinite(id)) ||
          (typeof id === "string" && id.trim().length > 0)
      );

      const expandedArticles = asArray(block.articles).filter(isRecord);
      const matchedFromContext = (relatedArticles || []).filter((item) =>
        ids.some((id) => String(id) === String(item.id))
      );

      if (ids.length === 0 && expandedArticles.length === 0) return null;

      return (
        <aside className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] p-4">
          <h3 className="text-sm font-bold">مقاله‌های مرتبط</h3>
          {matchedFromContext.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matchedFromContext.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${encodeURIComponent(item.slug)}`}
                  className="flex flex-col gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-3 transition-colors hover:border-[var(--primary)]"
                >
                  <span className="text-sm font-semibold text-[var(--text-white)]">
                    {item.title}
                  </span>
                  {item.excerpt && (
                    <span className="line-clamp-2 text-xs text-[var(--text-muted)]">
                      {item.excerpt}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : expandedArticles.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {expandedArticles.map((item, idx) => {
                const slug = asString(item.slug);
                const title = asString(item.title, `مقاله ${idx + 1}`);
                return slug ? (
                  <Link
                    key={String(item.id ?? idx)}
                    href={`/blog/${encodeURIComponent(slug)}`}
                    className="rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-3 text-sm font-semibold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]"
                  >
                    {title}
                  </Link>
                ) : (
                  <div
                    key={String(item.id ?? idx)}
                    className="rounded-card border border-[var(--border-subtle)] p-3 text-sm"
                  >
                    {title}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs leading-6 text-[var(--text-muted)]">
              شناسهٔ مقاله‌های مرتبط: {ids.map(String).join("، ")}
            </p>
          )}
        </aside>
      );
    }

    default:
      // Unknown block types are intentionally not rendered.
      // The mapper should preserve their raw data for future support.
      return null;
  }
}

function getBlockWrapperClasses(settings: UnknownRecord): string {
  const classes: string[] = [];

  switch (settings.align) {
    case "left":
      classes.push("text-left");
      break;
    case "center":
      classes.push("text-center");
      break;
    case "right":
      classes.push("text-right");
      break;
    case "justify":
      classes.push("text-justify");
      break;
  }

  switch (settings.spacing) {
    case "none":
      classes.push("my-0");
      break;
    case "xs":
      classes.push("my-1");
      break;
    case "sm":
      classes.push("my-2");
      break;
    case "lg":
      classes.push("my-4");
      break;
    case "xl":
      classes.push("my-6");
      break;
  }

  switch (settings.width) {
    case "narrow":
      classes.push("mx-auto w-full max-w-xl");
      break;
    case "full_width":
      classes.push("w-full");
      break;
  }

  if (typeof settings.custom_class === "string" && settings.custom_class.trim()) {
    classes.push(settings.custom_class.trim());
  }

  return classes.join(" ");
}

function BlockRenderer({
  block,
  relatedArticles,
}: {
  block: UnknownRecord;
  relatedArticles?: BlogPostSummary[];
}) {
  const settings = isRecord(block.settings) ? block.settings : {};
  if (settings.visibility === "hidden") {
    return null;
  }

  const content = renderBlockContent(block, relatedArticles);
  if (!content) return null;

  const wrapperClass = getBlockWrapperClasses(settings);
  return wrapperClass ? <div className={wrapperClass}>{content}</div> : content;
}

export const BlogArticleContent: React.FC<BlogArticleContentProps> = ({
  blocks,
  relatedArticles,
}) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((rawBlock, index) => {
        if (!isRecord(rawBlock)) return null;

        const key =
          typeof rawBlock.id === "string" && rawBlock.id.trim()
            ? rawBlock.id
            : `${String(rawBlock.type ?? "block")}-${index}`;

        return (
          <BlockRenderer
            key={key}
            block={rawBlock}
            relatedArticles={relatedArticles}
          />
        );
      })}
    </div>
  );
};